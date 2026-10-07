import os
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.services.sample_generator import SampleGeneratorService
from app.core.config import settings

router = APIRouter(prefix="/system", tags=["System & Filesystem Helper"])

class BrowseRequest(BaseModel):
    path: Optional[str] = None

class PathCheckRequest(BaseModel):
    path: str

class PathCheckResponse(BaseModel):
    exists: bool
    is_dir: bool
    readable: bool
    absolute_path: str
    file_count_estimate: int = 0
    message: str

@router.get("/common-folders")
def get_common_user_folders():
    """
    Get common accessible user folders (Desktop, Downloads, Documents, Pictures, Home).
    """
    home = Path.home()
    folders = [
        {"name": "Downloads", "path": str(home / "Downloads"), "icon": "Download"},
        {"name": "Documents", "path": str(home / "Documents"), "icon": "FileText"},
        {"name": "Desktop", "path": str(home / "Desktop"), "icon": "Monitor"},
        {"name": "Pictures", "path": str(home / "Pictures"), "icon": "Image"},
        {"name": "Home Directory", "path": str(home), "icon": "Home"},
    ]

    valid_folders = []
    for f in folders:
        p = Path(f["path"])
        if p.exists() and p.is_dir():
            valid_folders.append({
                "name": f["name"],
                "path": str(p.resolve()),
                "icon": f["icon"],
                "exists": True
            })

    # Add demo sandbox option path
    sandbox_path = settings.DATA_DIR / "sortiva_demo_sandbox"
    valid_folders.append({
        "name": "Sortiva Demo Sandbox",
        "path": str(sandbox_path),
        "icon": "FolderCode",
        "exists": sandbox_path.exists(),
        "is_sandbox": True
    })

    return {"folders": valid_folders, "home_dir": str(home)}

@router.post("/browse")
def browse_directory(req: BrowseRequest):
    """
    List subdirectories within a given folder path to power folder browser modals.
    """
    current_path = Path(req.path).resolve() if req.path else Path.home()
    if not current_path.exists() or not current_path.is_dir():
        current_path = Path.home()

    subdirs: List[Dict] = []
    parent_dir = str(current_path.parent) if current_path.parent != current_path else None

    try:
        with os.scandir(current_path) as entries:
            for entry in entries:
                try:
                    if entry.is_dir(follow_symlinks=False) and not entry.name.startswith('.'):
                        if entry.name not in settings.DEFAULT_EXCLUDED_DIRS:
                            subdirs.append({
                                "name": entry.name,
                                "path": entry.path,
                                "is_dir": True
                            })
                except (PermissionError, OSError):
                    continue
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied to browse this directory")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    subdirs.sort(key=lambda x: x["name"].lower())

    return {
        "current_path": str(current_path),
        "parent_path": parent_dir,
        "directories": subdirs[:100]
    }

@router.post("/check-path", response_model=PathCheckResponse)
def check_folder_path(req: PathCheckRequest):
    """
    Validate a user-supplied directory path.
    """
    if not req.path.strip():
        return PathCheckResponse(
            exists=False,
            is_dir=False,
            readable=False,
            absolute_path="",
            message="Path cannot be empty"
        )

    try:
        p = Path(req.path.strip()).resolve()
        if not p.exists():
            return PathCheckResponse(
                exists=False,
                is_dir=False,
                readable=False,
                absolute_path=str(p),
                message="Path does not exist on disk"
            )

        if not p.is_dir():
            return PathCheckResponse(
                exists=True,
                is_dir=False,
                readable=False,
                absolute_path=str(p),
                message="Path points to a file, not a directory"
            )

        # Test readability
        readable = os.access(p, os.R_OK)
        if not readable:
            return PathCheckResponse(
                exists=True,
                is_dir=True,
                readable=False,
                absolute_path=str(p),
                message="Permission denied: folder is not readable"
            )

        # Quick count estimate
        count = 0
        try:
            with os.scandir(p) as entries:
                for _ in entries:
                    count += 1
                    if count > 500:
                        break
        except Exception:
            pass

        return PathCheckResponse(
            exists=True,
            is_dir=True,
            readable=True,
            absolute_path=str(p),
            file_count_estimate=count,
            message="Valid directory ready to scan"
        )
    except Exception as e:
        return PathCheckResponse(
            exists=False,
            is_dir=False,
            readable=False,
            absolute_path=req.path,
            message=f"Invalid path format: {str(e)}"
        )

@router.post("/create-sample-sandbox")
def create_sample_sandbox():
    """
    Create a rich local demo sandbox folder with actual files, duplicate copies, and diverse formats.
    """
    result = SampleGeneratorService.create_sample_sandbox(settings.DATA_DIR)
    return result
