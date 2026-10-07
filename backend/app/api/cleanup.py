from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database.session import get_db
from app.models.user import User
from app.models.scan import Scan
from app.schemas.cleanup import (
    CleanupPreviewResponse,
    CleanupExecuteRequest,
    CleanupExecuteResponse
)
from app.services.cleaner import CleanerService
from app.api.deps import get_current_user

router = APIRouter(prefix="/cleanup", tags=["Safe Cleanup"])

@router.post("/preview", response_model=CleanupPreviewResponse)
def preview_cleanup(
    scan_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Analyze scanned folder for safe cleanup opportunities.
    """
    if not scan_id:
        scan = db.query(Scan).filter(Scan.status == "COMPLETED").order_by(Scan.id.desc()).first()
        if not scan:
            raise HTTPException(status_code=404, detail="No completed scan found")
        scan_id = scan.id

    cleaner = CleanerService(db)
    try:
        return cleaner.generate_cleanup_preview(scan_id=scan_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup analysis failed: {str(e)}")

@router.post("/execute", response_model=CleanupExecuteResponse)
def execute_cleanup(
    req: CleanupExecuteRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Execute confirmed cleanup items (safe trash deletion).
    """
    if not req.selected_file_ids and not req.selected_empty_folders:
        raise HTTPException(status_code=400, detail="No items selected for cleanup")

    cleaner = CleanerService(db)
    user_id = current_user.id if current_user else None

    return cleaner.execute_cleanup(
        scan_id=req.scan_id,
        selected_file_ids=req.selected_file_ids,
        selected_empty_folders=req.selected_empty_folders,
        use_trash=req.use_trash,
        user_id=user_id
    )
