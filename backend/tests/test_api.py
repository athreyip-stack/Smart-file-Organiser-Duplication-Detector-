import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import tempfile
import shutil

from app.main import app

client = TestClient(app)

@pytest.fixture
def temp_sample_dir():
    temp_dir = Path(tempfile.mkdtemp(prefix="sortiva_api_test_"))
    (temp_dir / "sample1.txt").write_text("Unique text 1", encoding="utf-8")
    (temp_dir / "sample2.txt").write_text("Duplicate content", encoding="utf-8")
    (temp_dir / "sample2_copy.txt").write_text("Duplicate content", encoding="utf-8")
    (temp_dir / "invoice.pdf").write_bytes(b"%PDF-1.4 dummy pdf")
    yield temp_dir
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_flow():
    import uuid
    rand_suffix = uuid.uuid4().hex[:6]
    username = f"tester_{rand_suffix}"
    email = f"tester_{rand_suffix}@example.com"
    
    reg_data = {
        "username": username,
        "email": email,
        "password": "SecurePassword123!"
    }
    # Register
    res = client.post("/api/auth/register", json=reg_data)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    token = data["access_token"]

    # Login
    login_res = client.post("/api/auth/login", json={
        "username_or_email": username,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # Me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == username

def test_scan_and_explorer_flow(temp_sample_dir):
    # Check folder path check endpoint
    check_res = client.post("/api/system/check-path", json={"path": str(temp_sample_dir)})
    assert check_res.status_code == 200
    assert check_res.json()["exists"] is True

    # Start scan
    scan_res = client.post("/api/scan", json={"folder_path": str(temp_sample_dir)})
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    scan_id = scan_data["scan_id"]
    assert scan_id is not None
    assert scan_data["is_complete"] is True

    # Get files
    files_res = client.get(f"/api/files?scan_id={scan_id}")
    assert files_res.status_code == 200
    files_data = files_res.json()
    assert files_data["total"] == 4

    # Get duplicates
    dup_res = client.get(f"/api/duplicates?scan_id={scan_id}")
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["total_groups"] == 1
    assert dup_data["total_duplicate_files"] == 2

    # Storage summary
    storage_res = client.get(f"/api/storage/summary?scan_id={scan_id}")
    assert storage_res.status_code == 200
    storage_data = storage_res.json()
    assert len(storage_data["categories"]) > 0

    # Organize preview
    org_prev = client.post("/api/organize/preview", json={
        "scan_id": scan_id,
        "rule": {"strategy": "CATEGORY"}
    })
    assert org_prev.status_code == 200
    assert len(org_prev.json()["planned_moves"]) > 0
