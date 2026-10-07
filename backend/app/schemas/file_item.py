from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional, List
from datetime import datetime, timezone

class FileItemBase(BaseModel):
    name: str
    path: str
    directory: str
    extension: str
    mime_type: Optional[str] = None
    category: str
    size: int
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
    sha256_hash: Optional[str] = None
    is_duplicate: bool = False
    duplicate_group_id: Optional[str] = None
    is_original: bool = False

    @field_serializer("created_at", "modified_at", when_used="always")
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class FileItemResponse(FileItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scan_id: int
    user_id: Optional[int] = None

class FileSearchQuery(BaseModel):
    scan_id: Optional[int] = None
    query: Optional[str] = None
    category: Optional[str] = None
    extension: Optional[str] = None
    min_size: Optional[int] = None
    max_size: Optional[int] = None
    is_duplicate: Optional[bool] = None
    sort_by: str = "modified_at" # name, size, modified_at, category
    sort_desc: bool = True
    page: int = 1
    page_size: int = 50

class PaginatedFilesResponse(BaseModel):
    items: List[FileItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
