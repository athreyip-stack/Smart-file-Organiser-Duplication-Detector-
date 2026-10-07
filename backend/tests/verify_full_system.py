import requests
import json
import os
import sys
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"

def main():
    print("=== STARTING FULL END-TO-END SORTIVA SYSTEM TEST ===")

    # 1. Check API Health
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("✓ Healthcheck: OK")

    # 2. Test Demo Sandbox Creation
    res = requests.post(f"{BASE_URL}/system/create-sample-sandbox")
    assert res.status_code == 200, f"Create sandbox failed: {res.text}"
    sandbox_data = res.json()
    sandbox_path = Path(sandbox_data["sandbox_path"])
    assert sandbox_path.exists(), f"Sandbox directory {sandbox_path} does not exist on disk"
    print(f"✓ Created real sandbox on disk: {sandbox_path}")

    # 3. Test Path Validator
    res = requests.post(f"{BASE_URL}/system/check-path", json={"path": str(sandbox_path)})
    assert res.status_code == 200
    check_data = res.json()
    assert check_data["exists"] is True
    assert check_data["readable"] is True
    print(f"✓ Path validation check: OK (estimated files: {check_data['file_count_estimate']})")

    # 4. Scan the Sandbox
    res = requests.post(f"{BASE_URL}/scan", json={"folder_path": str(sandbox_path), "recursive": True})
    assert res.status_code == 200, f"Scan failed: {res.text}"
    scan_data = res.json()
    scan_id = scan_data["scan_id"]
    print(f"✓ Scanned folder! Scan ID: {scan_id}, files scanned: {scan_data['files_scanned']}, duplicates found: {scan_data['duplicates_found']}")

    # 5. Test File Explorer query & search
    res = requests.get(f"{BASE_URL}/files?scan_id={scan_id}&page=1&page_size=50")
    assert res.status_code == 200
    files_data = res.json()
    assert files_data["total"] > 0
    print(f"✓ File explorer retrieved {files_data['total']} real indexed files")

    # Search by category
    res = requests.get(f"{BASE_URL}/files?scan_id={scan_id}&category=Spreadsheets")
    assert res.status_code == 200
    sheet_files = res.json()
    assert sheet_files["total"] > 0
    print(f"✓ Category filter (Spreadsheets): {sheet_files['total']} files")

    # 6. Test Duplicate Detection Engine
    res = requests.get(f"{BASE_URL}/duplicates?scan_id={scan_id}")
    assert res.status_code == 200
    dup_summary = res.json()
    assert dup_summary["total_groups"] > 0
    print(f"✓ Duplicate Engine: Found {dup_summary['total_groups']} duplicate groups, {dup_summary['total_duplicate_files']} files, recoverable space: {dup_summary['total_recoverable_size']} bytes")

    # 7. Test Storage Analytics Summary
    res = requests.get(f"{BASE_URL}/storage/summary?scan_id={scan_id}")
    assert res.status_code == 200
    storage_summary = res.json()
    assert len(storage_summary["categories"]) > 0
    assert len(storage_summary["largest_files"]) > 0
    print(f"✓ Storage Analytics: Categories aggregated: {len(storage_summary['categories'])}, Largest files tracked: {len(storage_summary['largest_files'])}")

    # 8. Test Organization Preview
    res = requests.post(f"{BASE_URL}/organize/preview", json={
        "scan_id": scan_id,
        "rule": {"strategy": "CATEGORY", "target_base_dir": str(sandbox_path)}
    })
    assert res.status_code == 200
    preview_data = res.json()
    assert preview_data["total_files"] > 0
    print(f"✓ Organization Preview: Proposed {preview_data['total_files']} moves into {len(preview_data['target_directories'])} subdirectories")

    # 9. Test Organization Execution (actually moving files on disk)
    res = requests.post(f"{BASE_URL}/organize/execute", json={
        "scan_id": scan_id,
        "moves": preview_data["planned_moves"]
    })
    assert res.status_code == 200
    exec_data = res.json()
    assert exec_data["successful_moves"] > 0
    batch_id = exec_data["batch_id"]
    print(f"✓ Executed Organization! Moved {exec_data['successful_moves']} files on disk. Batch ID: {batch_id}")

    # Verify that destination directories actually exist on disk
    assert any((sandbox_path / cat).exists() for cat in ["Documents", "Spreadsheets", "Code", "Images", "PDFs"]), "Categorized folders not created on disk!"
    print("✓ Verified real files physically moved into categorized folders on disk")

    # 10. Test History and Undo
    res = requests.get(f"{BASE_URL}/operations?batch_id={batch_id}")
    assert res.status_code == 200
    ops = res.json()
    assert len(ops) == exec_data["successful_moves"]
    print(f"✓ History Audit Log: {len(ops)} operations recorded in SQLite with undo support")

    # Perform Batch Undo
    res = requests.post(f"{BASE_URL}/operations/undo-batch", json={"batch_id": batch_id})
    assert res.status_code == 200
    undo_data = res.json()
    assert undo_data["success"] is True
    assert undo_data["restored_count"] == exec_data["successful_moves"]
    print(f"✓ Executed 1-Click Batch Undo: {undo_data['restored_count']} files physically restored to original locations!")

    # 11. Test Safe Cleanup Preview
    res = requests.post(f"{BASE_URL}/cleanup/preview?scan_id={scan_id}")
    assert res.status_code == 200
    clean_prev = res.json()
    assert clean_prev["duplicates"]["count"] > 0 or len(clean_prev["empty_folders"]) > 0
    print(f"✓ Safe Cleanup Analysis: Potential space savings: {clean_prev['total_potential_savings']} bytes")

    print("\n=== ALL SORTIVA SYSTEM TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
