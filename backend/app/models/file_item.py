from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.session import Base

class FileItem(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    
    name = Column(String(512), nullable=False, index=True)
    path = Column(String(1024), nullable=False, index=True)
    directory = Column(String(1024), nullable=False, index=True)
    extension = Column(String(64), nullable=False, index=True)
    mime_type = Column(String(128), nullable=True)
    category = Column(String(64), nullable=False, index=True)
    
    size = Column(BigInteger, nullable=False, default=0, index=True)
    created_at = Column(DateTime, nullable=True)
    modified_at = Column(DateTime, nullable=True)
    
    sha256_hash = Column(String(64), nullable=True, index=True)
    is_duplicate = Column(Boolean, default=False, index=True)
    duplicate_group_id = Column(String(64), nullable=True, index=True)
    is_original = Column(Boolean, default=False) # For duplicates, one file is tagged as original

    # Relationships
    scan = relationship("Scan", back_populates="files")

    __table_args__ = (
        Index("ix_files_scan_cat", "scan_id", "category"),
        Index("ix_files_dup_group", "scan_id", "duplicate_group_id"),
    )
