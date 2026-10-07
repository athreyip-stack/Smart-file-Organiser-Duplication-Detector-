import os
import shutil
import tempfile
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base
from app.models.user import User
from app.models.scan import Scan
from app.models.file_item import FileItem
from app.models.operation import Operation
from app.services.scanner import FileScannerService
from app.services.duplicate_detector import DuplicateDetectorService
from app.services.organizer import OrganizerService
from app.services.cleaner import CleanerService
from app.services.history_service import HistoryService
from app.services.sample_generator import SampleGeneratorService
from app.schemas.organize import OrganizeRule

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_files_dir():
    temp_dir = Path(tempfile.mkdtemp(prefix="sortiva_test_"))
    
    # Create sample files
    (temp_dir / "doc1.txt").write_text("Hello World Sortiva Content A", encoding="utf-8")
    (temp_dir / "doc2.txt").write_text("Hello World Sortiva Content A", encoding="utf-8") # Duplicate
    (temp_dir / "unique_image.png").write_bytes(b"\x89PNG\r\n\x1a\nTestImageData123")
    (temp_dir / "report.pdf").write_bytes(b"%PDF-1.4 sample pdf content")
    (temp_dir / "code.py").write_text("print('Sortiva')", encoding="utf-8")
    
    # Subdir
    sub = temp_dir / "subfolder"
    sub.mkdir()
    (sub / "doc3.txt").write_text("Hello World Sortiva Content A", encoding="utf-8") # Triplicate
    (sub / "data.csv").write_text("a,b,c\n1,2,3", encoding="utf-8")

    yield temp_dir
    
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_scanning_and_duplicate_detection(test_db, test_files_dir):
    scanner = FileScannerService(test_db)
    scan = scanner.scan_directory(str(test_files_dir))
    
    assert scan.id is not None
    assert scan.status == "COMPLETED"
    assert scan.total_files == 7
    assert scan.duplicate_files_count == 2 # 3 copies in group -> 1 original + 2 duplicates
    
    detector = DuplicateDetectorService(test_db)
    summary = detector.get_scan_duplicates(scan.id)
    assert summary.total_groups == 1
    assert summary.groups[0].file_count == 3
    assert summary.groups[0].recoverable_size == summary.groups[0].file_size * 2

def test_organization_and_undo(test_db, test_files_dir):
    scanner = FileScannerService(test_db)
    scan = scanner.scan_directory(str(test_files_dir))
    
    organizer = OrganizerService(test_db)
    rule = OrganizeRule(strategy="CATEGORY")
    
    # Preview
    preview = organizer.generate_preview(scan.id, rule)
    assert len(preview.planned_moves) > 0
    
    # Execute
    res = organizer.execute_organization(scan.id, preview.planned_moves)
    assert res.successful_moves > 0
    assert res.can_undo is True
    
    # Verify files moved
    assert (test_files_dir / "Documents").exists() or (test_files_dir / "Code").exists()
    
    # Undo
    history = HistoryService(test_db)
    undo_res = history.undo_batch(res.batch_id)
    assert undo_res.success is True
    assert undo_res.restored_count == res.successful_moves

def test_sample_sandbox_generation():
    temp_parent = Path(tempfile.mkdtemp(prefix="sortiva_sandbox_parent_"))
    try:
        res = SampleGeneratorService.create_sample_sandbox(temp_parent)
        sandbox = Path(res["sandbox_path"])
        assert sandbox.exists()
        assert (sandbox / "quarterly_report.pdf").exists()
        assert (sandbox / "Old_Downloads" / "quarterly_report_copy.pdf").exists()
        assert (sandbox / "payroll_q1.csv").exists()
    finally:
        shutil.rmtree(temp_parent, ignore_errors=True)
