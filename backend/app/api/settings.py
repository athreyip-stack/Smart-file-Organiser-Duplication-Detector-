from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json

from app.database.session import get_db
from app.models.user import User
from app.core.categories import get_all_categories, CATEGORY_DEFINITIONS
from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/settings", tags=["Application Settings"])

class SettingsUpdate(BaseModel):
    theme: str = "light"
    safe_delete_method: str = "trash" # "trash", "quarantine", "permanent"
    auto_check_duplicates: bool = True
    default_excluded_dirs: List[str] = list(settings.DEFAULT_EXCLUDED_DIRS)
    default_organization_strategy: str = "CATEGORY"

@router.get("/categories")
def get_categories():
    """Get all file category definitions and rules."""
    return get_all_categories()

@router.get("")
def get_user_settings(
    current_user: User = Depends(get_current_user)
):
    """Get application configuration and user preferences."""
    default_prefs = {
        "theme": "light",
        "safe_delete_method": "trash",
        "auto_check_duplicates": True,
        "default_excluded_dirs": sorted(list(settings.DEFAULT_EXCLUDED_DIRS)),
        "default_organization_strategy": "CATEGORY",
        "version": settings.VERSION,
        "data_dir": str(settings.DATA_DIR)
    }

    if current_user and current_user.settings_json:
        try:
            user_prefs = json.loads(current_user.settings_json)
            default_prefs.update(user_prefs)
        except Exception:
            pass

    return default_prefs

@router.post("")
def update_user_settings(
    update_in: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user preferences."""
    if current_user:
        current_user.settings_json = json.dumps(update_in.model_dump())
        db.commit()
    return {"message": "Settings updated successfully", "settings": update_in.model_dump()}
