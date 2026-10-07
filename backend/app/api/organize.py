from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database.session import get_db
from app.models.user import User
from app.schemas.organize import (
    OrganizePreviewRequest,
    OrganizePreviewResponse,
    OrganizeExecuteRequest,
    OrganizeExecuteResponse
)
from app.services.organizer import OrganizerService
from app.api.deps import get_current_user

router = APIRouter(prefix="/organize", tags=["Smart File Organization"])

@router.post("/preview", response_model=OrganizePreviewResponse)
def preview_organization(
    req: OrganizePreviewRequest,
    db: Session = Depends(get_db)
):
    """
    Generate preview of proposed file movements without touching files.
    """
    organizer = OrganizerService(db)
    try:
        preview = organizer.generate_preview(
            scan_id=req.scan_id,
            rule=req.rule,
            selected_file_ids=req.selected_file_ids
        )
        return preview
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")

@router.post("/execute", response_model=OrganizeExecuteResponse)
def execute_organization(
    req: OrganizeExecuteRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Execute confirmed file organization, moving actual files and saving history for Undo.
    """
    if not req.moves:
        raise HTTPException(status_code=400, detail="No moves specified to execute")

    organizer = OrganizerService(db)
    user_id = current_user.id if current_user else None

    result = organizer.execute_organization(
        scan_id=req.scan_id,
        moves=req.moves,
        user_id=user_id
    )
    return result
