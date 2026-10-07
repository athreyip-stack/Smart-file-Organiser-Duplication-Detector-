from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.models.user import User
from app.schemas.operation import OperationResponse, BatchUndoRequest, UndoResult
from app.services.history_service import HistoryService
from app.api.deps import get_current_user

router = APIRouter(prefix="/operations", tags=["History & Undo"])

@router.get("", response_model=List[OperationResponse])
def get_operations(
    batch_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Retrieve history of file operations (organize moves, deletions, restorations).
    """
    service = HistoryService(db)
    user_id = current_user.id if current_user else None
    return service.get_operations(user_id=user_id, limit=limit, batch_id=batch_id)

@router.post("/{operation_id}/undo", response_model=UndoResult)
def undo_single_operation(
    operation_id: int,
    db: Session = Depends(get_db)
):
    """
    Undo a specific operation (e.g. Move the organized file back to its exact original location).
    """
    service = HistoryService(db)
    result = service.undo_operation(operation_id)
    if not result.success and result.failed_count > 0 and not result.errors:
        raise HTTPException(status_code=400, detail=result.message)
    return result

@router.post("/undo-batch", response_model=UndoResult)
def undo_batch_operations(
    req: BatchUndoRequest,
    db: Session = Depends(get_db)
):
    """
    Undo all operations belonging to a batch (e.g. reverse an entire organization run).
    """
    if not req.batch_id:
        raise HTTPException(status_code=400, detail="batch_id is required")

    service = HistoryService(db)
    result = service.undo_batch(req.batch_id)
    return result
