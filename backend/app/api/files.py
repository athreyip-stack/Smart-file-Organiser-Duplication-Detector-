from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from typing import Optional
from pathlib import Path

from app.database.session import get_db
from app.models.file_item import FileItem
from app.models.scan import Scan
from app.schemas.file_item import FileItemResponse, PaginatedFilesResponse

router = APIRouter(prefix="/files", tags=["File Explorer"])

@router.get("", response_model=PaginatedFilesResponse)
def get_files(
    scan_id: Optional[int] = None,
    query: Optional[str] = None,
    category: Optional[str] = None,
    extension: Optional[str] = None,
    min_size: Optional[int] = None,
    max_size: Optional[int] = None,
    is_duplicate: Optional[bool] = None,
    sort_by: str = "modified_at", # name, size, modified_at, category, extension
    sort_desc: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Search, filter, sort, and paginate scanned files.
    """
    # If no scan_id given, use the latest completed scan
    if not scan_id:
        latest_scan = db.query(Scan).filter(Scan.status == "COMPLETED").order_by(Scan.id.desc()).first()
        if latest_scan:
            scan_id = latest_scan.id
        else:
            return PaginatedFilesResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)

    db_query = db.query(FileItem).filter(FileItem.scan_id == scan_id)

    # Search query
    if query:
        search_pattern = f"%{query.strip()}%"
        db_query = db_query.filter(
            or_(
                FileItem.name.ilike(search_pattern),
                FileItem.path.ilike(search_pattern),
                FileItem.extension.ilike(search_pattern)
            )
        )

    # Category filter
    if category and category != "All":
        db_query = db_query.filter(FileItem.category == category)

    # Extension filter
    if extension:
        clean_ext = extension if extension.startswith('.') else f".{extension}"
        db_query = db_query.filter(FileItem.extension.ilike(clean_ext))

    # Size filter
    if min_size is not None:
        db_query = db_query.filter(FileItem.size >= min_size)
    if max_size is not None:
        db_query = db_query.filter(FileItem.size <= max_size)

    # Duplicate filter
    if is_duplicate is not None:
        db_query = db_query.filter(FileItem.is_duplicate == is_duplicate)

    # Total count
    total_count = db_query.count()

    # Sorting
    sort_column = FileItem.modified_at
    if sort_by == "name":
        sort_column = FileItem.name
    elif sort_by == "size":
        sort_column = FileItem.size
    elif sort_by == "category":
        sort_column = FileItem.category
    elif sort_by == "extension":
        sort_column = FileItem.extension

    if sort_desc:
        db_query = db_query.order_by(desc(sort_column))
    else:
        db_query = db_query.order_by(asc(sort_column))

    # Pagination
    offset = (page - 1) * page_size
    items = db_query.offset(offset).limit(page_size).all()

    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0

    return PaginatedFilesResponse(
        items=[FileItemResponse.model_validate(f) for f in items],
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{file_id}", response_model=FileItemResponse)
def get_file_detail(file_id: int, db: Session = Depends(get_db)):
    """Get single file details."""
    file_item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not file_item:
        raise HTTPException(status_code=404, detail="File item not found")
    return FileItemResponse.model_validate(file_item)
