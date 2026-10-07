import os
import shutil
import uuid
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.scan import Scan
from app.models.file_item import FileItem
from app.models.operation import Operation
from app.schemas.organize import (
    OrganizeRule,
    PlannedFileMove,
    OrganizePreviewResponse,
    OrganizeExecuteResponse
)

class OrganizerService:
    def __init__(self, db: Session):
        self.db = db

    def generate_preview(
        self,
        scan_id: int,
        rule: OrganizeRule,
        selected_file_ids: Optional[List[int]] = None
    ) -> OrganizePreviewResponse:
        """
        Preview proposed file organization paths without making changes to disk.
        """
        scan = self.db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            raise ValueError("Scan not found")

        query = self.db.query(FileItem).filter(FileItem.scan_id == scan_id)
        if selected_file_ids:
            query = query.filter(FileItem.id.in_(selected_file_ids))

        files = query.all()
        base_dir = Path(rule.target_base_dir).resolve() if rule.target_base_dir else Path(scan.folder_path).resolve()

        planned_moves: List[PlannedFileMove] = []
        target_dirs_set = set()
        conflicts_count = 0
        total_size = 0

        # Track planned destination paths to detect collision across the batch
        planned_dest_paths: Dict[str, int] = {}

        for f in files:
            source_path = Path(f.path)
            # Skip if file no longer exists
            if not source_path.exists() or source_path.is_dir():
                continue

            # Calculate target folder name based on strategy
            folder_name = "Others"
            if rule.strategy == "CATEGORY":
                folder_name = f.category
                if rule.custom_mappings and folder_name in rule.custom_mappings:
                    folder_name = rule.custom_mappings[folder_name]
            elif rule.strategy == "EXTENSION":
                clean_ext = f.extension.lstrip('.').upper()
                folder_name = clean_ext if clean_ext else "NO_EXT"
            elif rule.strategy == "DATE":
                if f.modified_at:
                    folder_name = f.modified_at.strftime("%Y/%m_%B")
                else:
                    folder_name = "Unsorted_Date"
            elif rule.strategy == "CUSTOM" and rule.custom_mappings:
                folder_name = rule.custom_mappings.get(f.category, f.category)

            target_dir = base_dir / folder_name
            target_dirs_set.add(str(target_dir))

            # Desired destination path
            dest_file_path = target_dir / f.name
            
            # Avoid moving if it's already in the target directory
            if source_path == dest_file_path:
                continue

            # Check for conflict
            will_overwrite = False
            dest_str = str(dest_file_path)

            if dest_file_path.exists() or dest_str in planned_dest_paths:
                conflicts_count += 1
                will_overwrite = True
                
                # Auto-rename candidate path for safety preview
                stem = source_path.stem
                suffix = source_path.suffix
                counter = 1
                while (target_dir / f"{stem}_{counter}{suffix}").exists() or str(target_dir / f"{stem}_{counter}{suffix}") in planned_dest_paths:
                    counter += 1
                dest_file_path = target_dir / f"{stem}_{counter}{suffix}"

            planned_dest_paths[str(dest_file_path)] = f.id
            total_size += f.size

            planned_moves.append(
                PlannedFileMove(
                    file_id=f.id,
                    file_name=f.name,
                    current_path=str(source_path),
                    proposed_path=str(dest_file_path),
                    category=f.category,
                    file_size=f.size,
                    target_folder_name=folder_name,
                    will_overwrite=will_overwrite,
                    conflict_resolution="auto_rename"
                )
            )

        return OrganizePreviewResponse(
            total_files=len(planned_moves),
            total_size=total_size,
            target_directories=sorted(list(target_dirs_set)),
            planned_moves=planned_moves,
            conflicts_count=conflicts_count
        )

    def execute_organization(
        self,
        scan_id: int,
        moves: List[PlannedFileMove],
        user_id: Optional[int] = None
    ) -> OrganizeExecuteResponse:
        """
        Execute confirmed file organization: moves actual files on disk,
        records operations in SQLite for Undo support, and updates database records.
        """
        batch_id = f"batch_org_{uuid.uuid4().hex[:10]}"
        successful_moves = 0
        failed_moves = 0
        errors: List[str] = []

        for move in moves:
            src = Path(move.current_path)
            dst = Path(move.proposed_path)

            # Safety validation
            if not src.exists():
                failed_moves += 1
                errors.append(f"Source file not found: {src}")
                continue

            try:
                # Ensure target parent folder exists
                dst.parent.mkdir(parents=True, exist_ok=True)

                # If destination file exists and conflict resolution is auto_rename, find safe name
                actual_dst = dst
                if actual_dst.exists() and actual_dst != src:
                    stem = actual_dst.stem
                    suffix = actual_dst.suffix
                    count = 1
                    while (actual_dst.parent / f"{stem}_{count}{suffix}").exists():
                        count += 1
                    actual_dst = actual_dst.parent / f"{stem}_{count}{suffix}"

                # Real filesystem move operation
                shutil.move(str(src), str(actual_dst))

                # Record in Operation table
                op = Operation(
                    user_id=user_id,
                    scan_id=scan_id,
                    operation_type="ORGANIZE_MOVE",
                    source_path=str(src),
                    destination_path=str(actual_dst),
                    file_name=move.file_name,
                    file_size=move.file_size,
                    timestamp=datetime.now(timezone.utc),
                    status="SUCCESS",
                    can_undo=True,
                    batch_id=batch_id,
                    details_json=json.dumps({
                        "category": move.category,
                        "folder_name": move.target_folder_name
                    })
                )
                self.db.add(op)

                # Update FileItem in database to reflect new location
                file_item = self.db.query(FileItem).filter(FileItem.id == move.file_id).first()
                if file_item:
                    file_item.path = str(actual_dst)
                    file_item.directory = str(actual_dst.parent)
                    file_item.name = actual_dst.name

                successful_moves += 1

            except Exception as e:
                failed_moves += 1
                err_msg = f"Failed to move {src.name}: {str(e)}"
                errors.append(err_msg)

                # Record failed operation
                op = Operation(
                    user_id=user_id,
                    scan_id=scan_id,
                    operation_type="ORGANIZE_MOVE",
                    source_path=str(src),
                    destination_path=str(dst),
                    file_name=move.file_name,
                    file_size=move.file_size,
                    timestamp=datetime.now(timezone.utc),
                    status="FAILED",
                    can_undo=False,
                    batch_id=batch_id,
                    details_json=json.dumps({"error": str(e)})
                )
                self.db.add(op)

        self.db.commit()

        return OrganizeExecuteResponse(
            batch_id=batch_id,
            successful_moves=successful_moves,
            failed_moves=failed_moves,
            errors=errors,
            can_undo=successful_moves > 0
        )
