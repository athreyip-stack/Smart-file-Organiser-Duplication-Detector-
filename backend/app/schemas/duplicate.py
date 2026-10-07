from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.file_item import FileItemResponse

class DuplicateGroup(BaseModel):
    group_id: str
    sha256_hash: str
    file_size: int
    file_count: int
    recoverable_size: int # (file_count - 1) * file_size
    category: str
    files: List[FileItemResponse]
    suggested_original_id: Optional[int] = None

class DuplicateSummary(BaseModel):
    total_groups: int
    total_duplicate_files: int
    total_duplicate_size: int
    total_recoverable_size: int
    groups: List[DuplicateGroup]

class DuplicateDeleteRequest(BaseModel):
    file_ids: List[int]
    use_trash: bool = True # Send to trash instead of permanent delete
