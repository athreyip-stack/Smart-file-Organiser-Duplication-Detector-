from pydantic import BaseModel
from typing import List, Optional
from app.schemas.file_item import FileItemResponse

class CleanupCategorySummary(BaseModel):
    category_type: str # "DUPLICATES", "LARGE_FILES", "TEMP_FILES", "EMPTY_FOLDERS"
    title: str
    description: str
    count: int
    total_size: int
    items: List[FileItemResponse] = []

class CleanupPreviewResponse(BaseModel):
    scan_id: int
    duplicates: CleanupCategorySummary
    large_files: CleanupCategorySummary
    temp_files: CleanupCategorySummary
    empty_folders: List[str] = []
    total_potential_savings: int

class CleanupExecuteRequest(BaseModel):
    scan_id: int
    selected_file_ids: List[int]
    selected_empty_folders: Optional[List[str]] = None
    use_trash: bool = True # Send to trash for safety

class CleanupExecuteResponse(BaseModel):
    batch_id: str
    deleted_files_count: int
    deleted_folders_count: int
    freed_bytes: int
    errors: List[str]
