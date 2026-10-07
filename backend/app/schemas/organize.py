from pydantic import BaseModel
from typing import List, Optional, Dict

class OrganizeRule(BaseModel):
    # strategy: "CATEGORY" (Documents, Images, etc.), "EXTENSION" (pdf, jpg), "DATE" (YYYY/MM), "CUSTOM"
    strategy: str = "CATEGORY"
    target_base_dir: Optional[str] = None
    custom_mappings: Optional[Dict[str, str]] = None # {"Images": "Photos", "PDFs": "PDF_Documents"}
    create_subfolders: bool = True
    keep_structure: bool = False

class PlannedFileMove(BaseModel):
    file_id: int
    file_name: str
    current_path: str
    proposed_path: str
    category: str
    file_size: int
    target_folder_name: str
    will_overwrite: bool = False
    conflict_resolution: str = "auto_rename" # "auto_rename", "skip", "overwrite"

class OrganizePreviewRequest(BaseModel):
    scan_id: int
    rule: OrganizeRule
    selected_file_ids: Optional[List[int]] = None # None means all files in scan

class OrganizePreviewResponse(BaseModel):
    total_files: int
    total_size: int
    target_directories: List[str]
    planned_moves: List[PlannedFileMove]
    conflicts_count: int

class OrganizeExecuteRequest(BaseModel):
    scan_id: int
    moves: List[PlannedFileMove]

class OrganizeExecuteResponse(BaseModel):
    batch_id: str
    successful_moves: int
    failed_moves: int
    errors: List[str]
    can_undo: bool = True
