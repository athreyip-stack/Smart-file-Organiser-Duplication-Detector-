import os
import hashlib
import mimetypes
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Callable, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.categories import determine_file_category
from app.models.scan import Scan
from app.models.file_item import FileItem

# Setup structured logger
logger = logging.getLogger("sortiva.scanner")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Global in-memory dictionary for real-time scan progress tracking
ACTIVE_SCANS: Dict[int, Dict] = {}

def calculate_file_sha256(file_path: str, chunk_size: int = 65536) -> str:
    """Calculate SHA-256 hash in streaming chunks for speed and low memory."""
    hasher = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        logger.warning(f"Could not hash file {file_path}: {e}")
        return ""

class FileScannerService:
    def __init__(self, db: Session):
        self.db = db

    def scan_directory(
        self,
        folder_path: str,
        user_id: Optional[int] = None,
        recursive: bool = True,
        max_depth: int = -1,
        excluded_dirs: Optional[List[str]] = None,
        progress_callback: Optional[Callable[[Dict], None]] = None
    ) -> Scan:
        """
        Scan a local folder on disk, extract real metadata, identify duplicates,
        and save a fresh, complete index to SQLite.
        """
        target_path = Path(folder_path).resolve()
        if not target_path.exists():
            raise ValueError(f"Directory path does not exist on disk: {folder_path}")
        if not target_path.is_dir():
            raise ValueError(f"Path is not a directory: {folder_path}")

        scan_start_time = datetime.now(timezone.utc)

        # Merge exclusions
        custom_excluded = set(excluded_dirs) if excluded_dirs else set()
        active_excluded_dirs = settings.DEFAULT_EXCLUDED_DIRS.union(custom_excluded)

        # Create scan record in DB
        scan = Scan(
            user_id=user_id,
            folder_path=str(target_path),
            started_at=scan_start_time,
            status="IN_PROGRESS",
            scan_depth=max_depth
        )
        self.db.add(scan)
        self.db.commit()
        self.db.refresh(scan)

        scan_id = scan.id
        logger.info(
            f"==> Starting scan #{scan_id} for path: {target_path} | "
            f"start_time: {scan_start_time.isoformat()} | recursive: {recursive} | max_depth: {max_depth}"
        )
        ACTIVE_SCANS[scan_id] = {
            "scan_id": scan_id,
            "status": "SCANNING_FILES",
            "current_folder": str(target_path),
            "files_scanned": 0,
            "total_bytes_scanned": 0,
            "duplicates_found": 0,
            "is_complete": False,
            "error": None
        }

        try:
            discovered_files: List[Dict] = []
            size_to_files: Dict[int, List[Dict]] = defaultdict(list)
            total_bytes = 0

            base_depth = len(target_path.parts)

            # Phase 1: Crawl filesystem directly from disk
            for root, dirs, files in os.walk(target_path, topdown=True, followlinks=False):
                current_dir = Path(root)
                
                # Check depth if limit set
                if max_depth >= 0:
                    current_depth = len(current_dir.parts) - base_depth
                    if current_depth > max_depth:
                        dirs[:] = [] # Do not recurse further
                        continue

                # Filter excluded directory names in-place
                dirs[:] = [
                    d for d in dirs 
                    if d not in active_excluded_dirs and not (d.startswith('.') and d not in {".", ".."})
                ]

                # Update progress current directory
                if scan_id in ACTIVE_SCANS:
                    ACTIVE_SCANS[scan_id]["current_folder"] = root

                for file_name in files:
                    # Ignore AppleDouble hidden metadata files and OS garbage files
                    if file_name.startswith('._') or file_name in {".DS_Store", "Thumbs.db", ".localized"}:
                        continue

                    file_full_path = current_dir / file_name
                    
                    try:
                        # Follow stat safely
                        stat = file_full_path.stat()
                        file_size = stat.st_size
                        
                        # Datetimes (UTC)
                        created_at = datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc)
                        modified_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
                        
                        ext = file_full_path.suffix.lower()
                        mime_type, _ = mimetypes.guess_type(str(file_full_path))
                        category = determine_file_category(file_full_path, filename=file_name, extension=ext)

                        file_info = {
                            "name": file_name,
                            "path": str(file_full_path),
                            "directory": str(current_dir),
                            "extension": ext if ext else "no_ext",
                            "mime_type": mime_type,
                            "category": category,
                            "size": file_size,
                            "created_at": created_at,
                            "modified_at": modified_at,
                            "sha256_hash": None,
                            "is_duplicate": False,
                            "duplicate_group_id": None,
                            "is_original": False
                        }

                        discovered_files.append(file_info)
                        if file_size > 0:
                            size_to_files[file_size].append(file_info)

                        total_bytes += file_size
                        
                        if scan_id in ACTIVE_SCANS:
                            ACTIVE_SCANS[scan_id]["files_scanned"] = len(discovered_files)
                            ACTIVE_SCANS[scan_id]["total_bytes_scanned"] = total_bytes

                    except (PermissionError, FileNotFoundError, OSError) as stat_err:
                        logger.warning(f"Skipping inaccessible file {file_full_path}: {stat_err}")
                        continue

                if not recursive:
                    dirs[:] = [] # Only top level directory

            logger.info(f"Discovered {len(discovered_files)} files in {target_path} (Total size: {total_bytes} bytes)")

            # Phase 2: Staged duplicate analysis
            if scan_id in ACTIVE_SCANS:
                ACTIVE_SCANS[scan_id]["status"] = "ANALYZING_DUPLICATES"

            hash_to_files: Dict[str, List[Dict]] = defaultdict(list)
            duplicates_count = 0
            duplicate_bytes = 0

            # Only compute SHA-256 for files that share the exact same byte size (>1 file)
            candidate_size_groups = [group for group in size_to_files.values() if len(group) > 1]
            
            for group in candidate_size_groups:
                for file_info in group:
                    if file_info["sha256_hash"] is None:
                        file_info["sha256_hash"] = calculate_file_sha256(file_info["path"])
                    
                    if file_info["sha256_hash"]:
                        hash_to_files[file_info["sha256_hash"]].append(file_info)

            # Assign duplicate groups and flag original vs duplicates
            for file_hash, matching_files in hash_to_files.items():
                if len(matching_files) > 1:
                    group_id = file_hash[:16]
                    
                    # Sort copies to designate the original (oldest modified date, shortest path)
                    sorted_files = sorted(
                        matching_files,
                        key=lambda f: (f["modified_at"] or datetime.max, len(f["path"]))
                    )
                    
                    for idx, f in enumerate(sorted_files):
                        f["is_duplicate"] = True
                        f["duplicate_group_id"] = group_id
                        f["is_original"] = (idx == 0)
                        if idx > 0:
                            duplicates_count += 1
                            duplicate_bytes += f["size"]

            if scan_id in ACTIVE_SCANS:
                ACTIVE_SCANS[scan_id]["duplicates_found"] = duplicates_count
                ACTIVE_SCANS[scan_id]["status"] = "SAVING_DATABASE"

            # Phase 3: Bulk save to Database
            file_items_to_insert = [
                FileItem(
                    scan_id=scan_id,
                    user_id=user_id,
                    name=f["name"],
                    path=f["path"],
                    directory=f["directory"],
                    extension=f["extension"],
                    mime_type=f["mime_type"],
                    category=f["category"],
                    size=f["size"],
                    created_at=f["created_at"],
                    modified_at=f["modified_at"],
                    sha256_hash=f["sha256_hash"],
                    is_duplicate=f["is_duplicate"],
                    duplicate_group_id=f["duplicate_group_id"],
                    is_original=f["is_original"]
                )
                for f in discovered_files
            ]

            # Bulk save objects into SQLite
            self.db.bulk_save_objects(file_items_to_insert)

            # Update Scan metadata
            scan_completion_time = datetime.now(timezone.utc)
            scan.completed_at = scan_completion_time
            scan.status = "COMPLETED"
            scan.total_files = len(discovered_files)
            scan.total_size = total_bytes
            scan.duplicate_files_count = duplicates_count
            scan.duplicate_size = duplicate_bytes

            self.db.commit()
            self.db.refresh(scan)

            logger.info(
                f"==> Completed scan #{scan.id} for path: {target_path} | "
                f"files_discovered: {len(discovered_files)} | files_indexed: {len(file_items_to_insert)} | "
                f"start_time: {scan.started_at.isoformat()} | completion_time: {scan_completion_time.isoformat()} | "
                f"duplicates_found: {duplicates_count} | total_size: {total_bytes} bytes"
            )

            if scan_id in ACTIVE_SCANS:
                ACTIVE_SCANS[scan_id]["is_complete"] = True
                ACTIVE_SCANS[scan_id]["status"] = "COMPLETED"

            return scan

        except Exception as e:
            self.db.rollback()
            scan.status = "FAILED"
            scan.error_message = str(e)
            scan.completed_at = datetime.now(timezone.utc)
            self.db.commit()

            logger.error(f"Scan failed for {target_path}: {e}")

            if scan_id in ACTIVE_SCANS:
                ACTIVE_SCANS[scan_id]["status"] = "FAILED"
                ACTIVE_SCANS[scan_id]["error"] = str(e)
                ACTIVE_SCANS[scan_id]["is_complete"] = True

            raise e
