from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.session import Base

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    folder_path = Column(String(1024), nullable=False, index=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="IN_PROGRESS") # IN_PROGRESS, COMPLETED, FAILED
    
    total_files = Column(Integer, default=0)
    total_size = Column(BigInteger, default=0)
    duplicate_files_count = Column(Integer, default=0)
    duplicate_size = Column(BigInteger, default=0)
    scan_depth = Column(Integer, default=-1) # -1 = recursive all
    error_message = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="scans")
    files = relationship("FileItem", back_populates="scan", cascade="all, delete-orphan")
    operations = relationship("Operation", back_populates="scan")
