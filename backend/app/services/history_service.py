import os
import shutil
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.operation import Operation
from app.models.file_item import FileItem
from app.schemas.operation import OperationResponse, UndoResult

class HistoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_operations(
        self,
        user_id: Optional[int] = None,
        limit: int = 100,
        batch_id: Optional[str] = None
    ) -> List[OperationResponse]:
        """Fetch history of operations."""
        query = self.db.query(Operation)
        if user_id:
            query = query.filter((Operation.user_id == user_id) | (Operation.user_id == None))
        if batch_id:
            query = query.filter(Operation.batch_id == batch_id)

        operations = query.order_by(Operation.timestamp.desc()).limit(limit).all()
        return [OperationResponse.model_validate(op) for op in operations]

    def undo_operation(self, operation_id: int) -> UndoResult:
        """
        Undo a specific operation (e.g. Move the organized file back to its original location).
        """
        op = self.db.query(Operation).filter(Operation.id == operation_id).first()
        if not op:
            return UndoResult(
                success=False,
                message="Operation record not found",
                restored_count=0,
                failed_count=1,
                errors=["Operation not found"]
            )

        if not op.can_undo or op.status == "UNDONE":
            return UndoResult(
                success=False,
                message="Operation cannot be undone or is already undone",
                restored_count=0,
                failed_count=1,
                errors=["Operation cannot be undone"]
            )

        # Handle ORGANIZE_MOVE undo
        if op.operation_type == "ORGANIZE_MOVE":
            src = Path(op.source_path) # Original location
            current_loc = Path(op.destination_path) if op.destination_path else None

            if not current_loc or not current_loc.exists():
                return UndoResult(
                    success=False,
                    message=f"Current file {current_loc} does not exist on disk to restore",
                    restored_count=0,
                    failed_count=1,
                    errors=[f"File not found at destination: {current_loc}"]
                )

            try:
                # Ensure original directory exists
                src.parent.mkdir(parents=True, exist_ok=True)
                
                # Check for collision at original location
                target_restore = src
                if target_restore.exists() and target_restore != current_loc:
                    stem = target_restore.stem
                    suffix = target_restore.suffix
                    count = 1
                    while (target_restore.parent / f"{stem}_restored_{count}{suffix}").exists():
                        count += 1
                    target_restore = target_restore.parent / f"{stem}_restored_{count}{suffix}"

                # Real move back
                shutil.move(str(current_loc), str(target_restore))

                # Clean up empty parent folder if possible
                try:
                    if not os.listdir(current_loc.parent):
                        current_loc.parent.rmdir()
                except Exception:
                    pass

                # Update database
                op.status = "UNDONE"
                op.can_undo = False

                # Update FileItem if exists
                file_item = self.db.query(FileItem).filter(FileItem.path == str(current_loc)).first()
                if file_item:
                    file_item.path = str(target_restore)
                    file_item.directory = str(target_restore.parent)
                    file_item.name = target_restore.name

                self.db.commit()

                return UndoResult(
                    success=True,
                    message=f"Restored '{op.file_name}' back to {target_restore.parent}",
                    restored_count=1,
                    failed_count=0,
                    errors=[]
                )
            except Exception as e:
                return UndoResult(
                    success=False,
                    message=f"Failed to undo move: {str(e)}",
                    restored_count=0,
                    failed_count=1,
                    errors=[str(e)]
                )

        # Handle Quarantine Trash Undo
        elif op.destination_path and Path(op.destination_path).exists():
            current_loc = Path(op.destination_path)
            src = Path(op.source_path)
            try:
                src.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(current_loc), str(src))
                op.status = "UNDONE"
                op.can_undo = False
                self.db.commit()
                return UndoResult(
                    success=True,
                    message=f"Restored '{op.file_name}' from quarantine trash",
                    restored_count=1,
                    failed_count=0,
                    errors=[]
                )
            except Exception as e:
                return UndoResult(
                    success=False,
                    message=f"Failed to restore file: {str(e)}",
                    restored_count=0,
                    failed_count=1,
                    errors=[str(e)]
                )

        return UndoResult(
            success=False,
            message="This operation type does not support undo",
            restored_count=0,
            failed_count=1,
            errors=["Operation type unsupported for undo"]
        )

    def undo_batch(self, batch_id: str) -> UndoResult:
        """Undo all operations in a batch."""
        operations = (
            self.db.query(Operation)
            .filter(Operation.batch_id == batch_id, Operation.can_undo == True, Operation.status == "SUCCESS")
            .all()
        )

        if not operations:
            return UndoResult(
                success=False,
                message=f"No undoable operations found for batch: {batch_id}",
                restored_count=0,
                failed_count=0,
                errors=["Batch not found or already undone"]
            )

        restored = 0
        failed = 0
        errors = []

        for op in operations:
            res = self.undo_operation(op.id)
            if res.success:
                restored += 1
            else:
                failed += 1
                errors.extend(res.errors)

        return UndoResult(
            success=restored > 0,
            message=f"Batch undo completed: {restored} restored, {failed} failed",
            restored_count=restored,
            failed_count=failed,
            errors=errors
        )
