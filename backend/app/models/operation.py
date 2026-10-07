from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.session import Base

class Operation(Base):
    __tablename__ = "operations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Operation type: ORGANIZE_MOVE, DELETE_DUPLICATE, TRASH_FILE, CLEANUP, UNDO_RESTORE
    operation_type = Column(String(64), nullable=False, index=True)
    
    source_path = Column(String(1024), nullable=False)
    destination_path = Column(String(1024), nullable=True) # None for permanent delete
    file_name = Column(String(512), nullable=False)
    file_size = Column(BigInteger, default=0)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    status = Column(String(50), default="SUCCESS") # SUCCESS, FAILED, UNDONE
    can_undo = Column(Boolean, default=False)
    
    batch_id = Column(String(64), nullable=True, index=True) # Groups operations executed together
    details_json = Column(Text, nullable=True) # Extra info, e.g. error message, original category
    
    # Relationships
    user = relationship("User", back_populates="operations")
    scan = relationship("Scan", back_populates="operations")
