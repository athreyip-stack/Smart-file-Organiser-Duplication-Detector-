from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional, List
from datetime import datetime, timezone

class OperationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    operation_type: str
    source_path: str
    destination_path: Optional[str] = None
    file_name: str
    file_size: int
    timestamp: datetime
    status: str
    can_undo: bool
    batch_id: Optional[str] = None
    details_json: Optional[str] = None

    @field_serializer("timestamp", when_used="always")
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class BatchUndoRequest(BaseModel):
    batch_id: Optional[str] = None
    operation_ids: Optional[List[int]] = None

class UndoResult(BaseModel):
    success: bool
    message: str
    restored_count: int
    failed_count: int
    errors: List[str] = []
