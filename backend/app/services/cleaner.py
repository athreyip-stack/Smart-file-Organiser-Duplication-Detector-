import os
import shutil
import uuid
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

try:
    from send2trash import send2trash
    HAS_SEND2TRASH = True
except ImportError:
    HAS_SEND2TRASH = False

from app.core.config import settings
from app.models.scan import Scan
from app.models.file_item import FileItem
from app.models.operation import Operation
from app.schemas.cleanup import (
    CleanupCategorySummary,
    CleanupPreviewResponse,
    CleanupExecuteResponse
)
from app.schemas.file_item import FileItemResponse

class CleanerService:
    def __init__(self, db: Session):
        self.db = db

    def generate_cleanup_preview(
        self,
        scan_id: int,
        large_file_threshold_bytes: int = 50 * 1024 * 1024 # 50 MB
    ) -> CleanupPreviewResponse:
        """
        Analyze scanned files to find duplicate candidates, large files, temp files, and empty folders.
        """
        scan = self.db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise ValueError("Scan not found")

        # 1. Duplicates (excluding originals)
        duplicates = (
            self.db.query(FileItem)
            .filter(FileItem.scan_id == scan_id, FileItem.is_duplicate == True, FileItem.is_original == False)
            .all()
        )
        dup_size = sum(f.size for f in duplicates)
        dup_summary = CleanupCategorySummary(
            category_type="DUPLICATES",
            title="Duplicate Files",
            description="Redundant copies of files that have identical SHA-256 content hashes.",
            count=len(duplicates),
            total_size=dup_size,
            items=[FileItemResponse.model_validate(f) for f in duplicates[:100]]
        )

        # 2. Large files
        large_files = (
            self.db.query(FileItem)
            .filter(FileItem.scan_id == scan_id, FileItem.size >= large_file_threshold_bytes)
            .order_by(FileItem.size.desc())
            .all()
        )
        large_size = sum(f.size for f in large_files)
        large_summary = CleanupCategorySummary(
            category_type="LARGE_FILES",
            title="Large Files (>50 MB)",
            description="Files occupying significant disk space that you may want to review.",
            count=len(large_files),
            total_size=large_size,
            items=[FileItemResponse.model_validate(f) for f in large_files[:100]]
        )

        # 3. Temp / log / cache files
        temp_extensions = {".tmp", ".temp", ".log", ".bak", ".swp", ".old", ".cache", ".dmp"}
        all_files = self.db.query(FileItem).filter(FileItem.scan_id == scan_id).all()
        temp_files = [f for f in all_files if f.extension.lower() in temp_extensions]
        temp_size = sum(f.size for f in temp_files)
        temp_summary = CleanupCategorySummary(
            category_type="TEMP_FILES",
            title="Temporary & Log Files",
            description="Backup files, logs, and temporary files that can typically be safely purged.",
            count=len(temp_files),
            total_size=temp_size,
            items=[FileItemResponse.model_validate(f) for f in temp_files[:100]]
        )

        # 4. Empty folders
        empty_folders: List[str] = []
        scan_root = Path(scan.folder_path)
        if scan_root.exists() and scan_root.is_dir():
            for root, dirs, files in os.walk(scan_root, topdown=False):
                current_p = Path(root)
                if current_p != scan_root:
                    try:
                        # If folder has no files and no subdirs
                        if not os.listdir(current_p):
                            empty_folders.append(str(current_p))
                    except Exception:
                        pass

        total_savings = dup_size + temp_size

        return CleanupPreviewResponse(
            scan_id=scan_id,
            duplicates=dup_summary,
            large_files=large_summary,
            temp_files=temp_summary,
            empty_folders=empty_folders[:50],
            total_potential_savings=total_savings
        )

    def execute_cleanup(
        self,
        scan_id: int,
        selected_file_ids: List[int],
        selected_empty_folders: Optional[List[str]] = None,
        use_trash: bool = True,
        user_id: Optional[int] = None
    ) -> CleanupExecuteResponse:
        """
        Safely delete or send selected files/folders to trash with full audit logging.
        """
        batch_id = f"batch_clean_{uuid.uuid4().hex[:10]}"
        deleted_files_count = 0
        deleted_folders_count = 0
        freed_bytes = 0
        errors: List[str] = []

        files_to_delete = (
            self.db.query(FileItem)
            .filter(FileItem.id.in_(selected_file_ids))
            .all()
        )

        quarantine_dir = settings.DATA_DIR / ".sortiva_trash"
        quarantine_dir.mkdir(parents=True, exist_ok=True)

        for file_item in files_to_delete:
            file_path = Path(file_item.path)
            file_size = file_item.size

            if not file_path.exists():
                errors.append(f"File not found: {file_path}")
                # Remove from database since it's already gone
                self.db.delete(file_item)
                continue

            try:
                destination_path = None
                if use_trash and HAS_SEND2TRASH:
                    send2trash(str(file_path))
                    dest_desc = "OS Trash"
                elif use_trash:
                    # Quarantine backup
                    q_dest = quarantine_dir / f"{uuid.uuid4().hex[:8]}_{file_path.name}"
                    shutil.move(str(file_path), str(q_dest))
                    destination_path = str(q_dest)
                    dest_desc = str(q_dest)
                else:
                    file_path.unlink()
                    dest_desc = "Permanent Delete"

                # Record in Operation log
                op = Operation(
                    user_id=user_id,
                    scan_id=scan_id,
                    operation_type="CLEANUP_DELETE" if not file_item.is_duplicate else "DELETE_DUPLICATE",
                    source_path=str(file_path),
                    destination_path=destination_path,
                    file_name=file_item.name,
                    file_size=file_size,
                    timestamp=datetime.now(timezone.utc),
                    status="SUCCESS",
                    can_undo=bool(destination_path and Path(destination_path).exists()),
                    batch_id=batch_id,
                    details_json=json.dumps({
                        "method": dest_desc,
                        "category": file_item.category,
                        "sha256": file_item.sha256_hash
                    })
                )
                self.db.add(op)
                self.db.delete(file_item)

                deleted_files_count += 1
                freed_bytes += file_size

            except Exception as e:
                errors.append(f"Could not delete {file_path.name}: {str(e)}")

        # Delete selected empty folders
        if selected_empty_folders:
            for folder_str in selected_empty_folders:
                folder_p = Path(folder_str)
                if folder_p.exists() and folder_p.is_dir():
                    try:
                        if not os.listdir(folder_p):
                            folder_p.rmdir()
                            deleted_folders_count += 1
                    except Exception as e:
                        errors.append(f"Could not remove folder {folder_p.name}: {str(e)}")

        self.db.commit()

        return CleanupExecuteResponse(
            batch_id=batch_id,
            deleted_files_count=deleted_files_count,
            deleted_folders_count=deleted_folders_count,
            freed_bytes=freed_bytes,
            errors=errors
        )
