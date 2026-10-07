from pydantic import BaseModel
from typing import List, Dict, Any
from app.schemas.file_item import FileItemResponse

class CategoryStorageItem(BaseModel):
    category: str
    file_count: int
    total_bytes: int
    percentage: float
    color: str
    icon: str

class ExtensionStorageItem(BaseModel):
    extension: str
    file_count: int
    total_bytes: int
    category: str

class StorageSummaryResponse(BaseModel):
    scan_id: int
    folder_path: str
    total_files: int
    total_size_bytes: int
    duplicate_files_count: int
    duplicate_size_bytes: int
    recoverable_bytes: int
    categories: List[CategoryStorageItem]
    top_extensions: List[ExtensionStorageItem]
    largest_files: List[FileItemResponse]
    scan_date: str
