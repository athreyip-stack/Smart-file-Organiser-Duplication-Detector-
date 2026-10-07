from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database.session import get_db
from app.models.scan import Scan
from app.models.user import User
from app.schemas.duplicate import DuplicateSummary, DuplicateDeleteRequest
from app.services.duplicate_detector import DuplicateDetectorService
from app.services.cleaner import CleanerService
from app.api.deps import get_current_user

router = APIRouter(prefix="/duplicates", tags=["Duplicate Detection"])

@router.get("", response_model=DuplicateSummary)
def get_duplicates(
    scan_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get grouped duplicates with recoverable space calculation.
    """
    if not scan_id:
        latest_scan = db.query(Scan).filter(Scan.status == "COMPLETED").order_by(Scan.id.desc()).first()
        if not latest_scan:
            return DuplicateSummary(
                total_groups=0,
                total_duplicate_files=0,
                total_duplicate_size=0,
                total_recoverable_size=0,
                groups=[]
            )
        scan_id = latest_scan.id

    detector = DuplicateDetectorService(db)
    return detector.get_scan_duplicates(scan_id)

@router.post("/delete")
def delete_duplicates(
    req: DuplicateDeleteRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Safely delete selected duplicate copies (sends to OS trash or quarantine).
    """
    if not req.file_ids:
        raise HTTPException(status_code=400, detail="No files selected for deletion")

    cleaner = CleanerService(db)
    user_id = current_user.id if current_user else None

    # Get scan_id from first file
    result = cleaner.execute_cleanup(
        scan_id=0,
        selected_file_ids=req.file_ids,
        use_trash=req.use_trash,
        user_id=user_id
    )

    return result
