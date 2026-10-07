from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict
from collections import defaultdict
from datetime import datetime, timezone

from app.database.session import get_db
from app.models.scan import Scan
from app.models.file_item import FileItem
from app.schemas.storage import StorageSummaryResponse, CategoryStorageItem, ExtensionStorageItem
from app.schemas.file_item import FileItemResponse
from app.core.categories import CATEGORY_DEFINITIONS, get_category_color

router = APIRouter(prefix="/storage", tags=["Storage Analytics"])

@router.get("/summary", response_model=StorageSummaryResponse)
def get_storage_summary(
    scan_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get storage metrics and breakdown for Recharts visualizations.
    """
    if not scan_id:
        scan = db.query(Scan).filter(Scan.status == "COMPLETED").order_by(Scan.id.desc()).first()
        if not scan:
            return StorageSummaryResponse(
                scan_id=0,
                folder_path="",
                total_files=0,
                total_size_bytes=0,
                duplicate_files_count=0,
                duplicate_size_bytes=0,
                recoverable_bytes=0,
                categories=[],
                top_extensions=[],
                largest_files=[],
                scan_date=""
            )
    else:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")

    # Category aggregation
    category_stats = (
        db.query(
            FileItem.category,
            func.count(FileItem.id).label("file_count"),
            func.sum(FileItem.size).label("total_bytes")
        )
        .filter(FileItem.scan_id == scan.id)
        .group_by(FileItem.category)
        .all()
    )

    total_bytes = scan.total_size if scan.total_size > 0 else 1 # Avoid div by 0

    categories_list: List[CategoryStorageItem] = []
    for cat_name, count, cat_bytes in category_stats:
        cat_bytes = cat_bytes or 0
        percentage = round((cat_bytes / total_bytes) * 100, 2)
        cat_meta = CATEGORY_DEFINITIONS.get(cat_name, CATEGORY_DEFINITIONS["Others"])
        
        categories_list.append(
            CategoryStorageItem(
                category=cat_name,
                file_count=count,
                total_bytes=cat_bytes,
                percentage=percentage,
                color=cat_meta["color"],
                icon=cat_meta["icon"]
            )
        )

    # Sort categories by total bytes descending
    categories_list.sort(key=lambda c: c.total_bytes, reverse=True)

    # Top extensions aggregation
    ext_stats = (
        db.query(
            FileItem.extension,
            FileItem.category,
            func.count(FileItem.id).label("file_count"),
            func.sum(FileItem.size).label("total_bytes")
        )
        .filter(FileItem.scan_id == scan.id)
        .group_by(FileItem.extension, FileItem.category)
        .order_by(func.sum(FileItem.size).desc())
        .limit(10)
        .all()
    )

    top_extensions = [
        ExtensionStorageItem(
            extension=ext if ext else "no_ext",
            file_count=count,
            total_bytes=size_bytes or 0,
            category=cat
        )
        for ext, cat, count, size_bytes in ext_stats
    ]

    # Largest files
    largest_files = (
        db.query(FileItem)
        .filter(FileItem.scan_id == scan.id)
        .order_by(FileItem.size.desc())
        .limit(10)
        .all()
    )

    # Recoverable duplicate space (sum of duplicates minus one original per group)
    duplicate_copies = (
        db.query(FileItem)
        .filter(FileItem.scan_id == scan.id, FileItem.is_duplicate == True, FileItem.is_original == False)
        .all()
    )
    recoverable_bytes = sum(f.size for f in duplicate_copies)

    scan_dt = scan.completed_at or scan.started_at
    if scan_dt and scan_dt.tzinfo is None:
        scan_dt = scan_dt.replace(tzinfo=timezone.utc)
    scan_date_iso = scan_dt.isoformat() if scan_dt else ""

    return StorageSummaryResponse(
        scan_id=scan.id,
        folder_path=scan.folder_path,
        total_files=scan.total_files,
        total_size_bytes=scan.total_size,
        duplicate_files_count=scan.duplicate_files_count,
        duplicate_size_bytes=scan.duplicate_size,
        recoverable_bytes=recoverable_bytes,
        categories=categories_list,
        top_extensions=top_extensions,
        largest_files=[FileItemResponse.model_validate(f) for f in largest_files],
        scan_date=scan_date_iso
    )
