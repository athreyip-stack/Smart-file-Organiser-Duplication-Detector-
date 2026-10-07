from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.models.file_item import FileItem
from app.schemas.duplicate import DuplicateGroup, DuplicateSummary, DuplicateDeleteRequest
from app.schemas.file_item import FileItemResponse

class DuplicateDetectorService:
    def __init__(self, db: Session):
        self.db = db

    def get_scan_duplicates(self, scan_id: int) -> DuplicateSummary:
        """
        Group duplicate files for a given scan and compute recoverable storage.
        """
        # Fetch duplicate files for the scan
        duplicate_files = (
            self.db.query(FileItem)
            .filter(FileItem.scan_id == scan_id, FileItem.is_duplicate == True)
            .order_by(FileItem.duplicate_group_id, FileItem.is_original.desc(), FileItem.id)
            .all()
        )

        groups_dict: Dict[str, List[FileItem]] = {}
        for f in duplicate_files:
            if f.duplicate_group_id:
                if f.duplicate_group_id not in groups_dict:
                    groups_dict[f.duplicate_group_id] = []
                groups_dict[f.duplicate_group_id].append(f)

        groups_list: List[DuplicateGroup] = []
        total_dup_files = 0
        total_dup_size = 0
        total_recoverable_size = 0

        for group_id, files in groups_dict.items():
            if len(files) < 2:
                continue

            file_size = files[0].size
            file_count = len(files)
            recoverable = (file_count - 1) * file_size

            # Identify original
            original_file = next((f for f in files if f.is_original), files[0])

            group_obj = DuplicateGroup(
                group_id=group_id,
                sha256_hash=files[0].sha256_hash or "",
                file_size=file_size,
                file_count=file_count,
                recoverable_size=recoverable,
                category=files[0].category,
                files=[FileItemResponse.model_validate(f) for f in files],
                suggested_original_id=original_file.id
            )
            groups_list.append(group_obj)

            total_dup_files += file_count
            total_dup_size += (file_count * file_size)
            total_recoverable_size += recoverable

        # Sort groups by recoverable space descending
        groups_list.sort(key=lambda g: g.recoverable_size, reverse=True)

        return DuplicateSummary(
            total_groups=len(groups_list),
            total_duplicate_files=total_dup_files,
            total_duplicate_size=total_dup_size,
            total_recoverable_size=total_recoverable_size,
            groups=groups_list
        )
