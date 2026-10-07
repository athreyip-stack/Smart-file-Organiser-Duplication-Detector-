from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional, List
from datetime import datetime, timezone

class ScanCreate(BaseModel):
    folder_path: str
    recursive: bool = True
    max_depth: Optional[int] = -1
    excluded_dirs: Optional[List[str]] = None

class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folder_path: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    total_files: int
    total_size: int
    duplicate_files_count: int
    duplicate_size: int
    scan_depth: int
    error_message: Optional[str] = None

    @field_serializer("started_at", "completed_at", when_used="always")
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class ScanProgress(BaseModel):
    scan_id: Optional[int] = None
    status: str
    current_folder: str = ""
    files_scanned: int = 0
    total_bytes_scanned: int = 0
    duplicates_found: int = 0
    is_complete: bool = False
    error: Optional[str] = None
