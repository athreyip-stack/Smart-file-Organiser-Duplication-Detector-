from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path

from app.database.session import get_db, SessionLocal
from app.models.user import User
from app.models.scan import Scan
from app.schemas.scan import ScanCreate, ScanResponse, ScanProgress
from app.services.scanner import FileScannerService, ACTIVE_SCANS
from app.api.deps import get_current_user

router = APIRouter(prefix="/scan", tags=["Folder Scanning"])

def run_background_scan(
    scan_id: int,
    folder_path: str,
    user_id: Optional[int],
    recursive: bool,
    max_depth: int,
    excluded_dirs: Optional[List[str]]
):
    """Background worker task for scanning folders without blocking API requests."""
    db = SessionLocal()
    try:
        scanner = FileScannerService(db)
        scanner.scan_directory(
            folder_path=folder_path,
            user_id=user_id,
            recursive=recursive,
            max_depth=max_depth,
            excluded_dirs=excluded_dirs
        )
    except Exception as e:
        print(f"Background scan error: {e}")
    finally:
        db.close()

@router.post("", response_model=ScanProgress)
def start_scan(
    scan_in: ScanCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Initiate scan of a real local folder on disk.
    """
    target = Path(scan_in.folder_path).resolve()
    if not target.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Directory path does not exist on disk: {scan_in.folder_path}"
        )
    if not target.is_dir():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Specified path is a file, not a directory: {scan_in.folder_path}"
        )

    # Fast synchronous or background scan
    scanner = FileScannerService(db)
    user_id = current_user.id if current_user else None

    # Run scan synchronously so user receives immediate results, or if very large can be polled
    try:
        scan_result = scanner.scan_directory(
            folder_path=str(target),
            user_id=user_id,
            recursive=scan_in.recursive,
            max_depth=scan_in.max_depth or -1,
            excluded_dirs=scan_in.excluded_dirs
        )
        return ScanProgress(
            scan_id=scan_result.id,
            status="COMPLETED",
            current_folder=str(target),
            files_scanned=scan_result.total_files,
            total_bytes_scanned=scan_result.total_size,
            duplicates_found=scan_result.duplicate_files_count,
            is_complete=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan failed: {str(e)}"
        )

@router.get("/progress/{scan_id}", response_model=ScanProgress)
def get_scan_progress(scan_id: int):
    """Poll progress of an active or recent scan."""
    if scan_id in ACTIVE_SCANS:
        data = ACTIVE_SCANS[scan_id]
        return ScanProgress(**data)
    
    # Check DB
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            return ScanProgress(
                scan_id=scan.id,
                status=scan.status,
                current_folder=scan.folder_path,
                files_scanned=scan.total_files,
                total_bytes_scanned=scan.total_size,
                duplicates_found=scan.duplicate_files_count,
                is_complete=(scan.status == "COMPLETED"),
                error=scan.error_message
            )
    finally:
        db.close()

    raise HTTPException(status_code=404, detail="Scan progress not found")

@router.get("/latest", response_model=Optional[ScanResponse])
def get_latest_scan(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Retrieve the most recent completed scan."""
    query = db.query(Scan).filter(Scan.status == "COMPLETED")
    if current_user:
        query = query.filter((Scan.user_id == current_user.id) | (Scan.user_id == None))
    
    scan = query.order_by(Scan.id.desc()).first()
    if not scan:
        return None
    return ScanResponse.model_validate(scan)

@router.get("/history", response_model=List[ScanResponse])
def get_scan_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Retrieve past scan history."""
    query = db.query(Scan)
    if current_user:
        query = query.filter((Scan.user_id == current_user.id) | (Scan.user_id == None))
    
    scans = query.order_by(Scan.id.desc()).limit(limit).all()
    return [ScanResponse.model_validate(s) for s in scans]

@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan_by_id(scan_id: int, db: Session = Depends(get_db)):
    """Retrieve scan by ID."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanResponse.model_validate(scan)

@router.delete("/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    """Delete a scan index record and associated files."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    db.delete(scan)
    db.commit()
    return {"message": "Scan deleted successfully"}
