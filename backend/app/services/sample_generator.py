import os
import shutil
from pathlib import Path
from typing import Dict, Any

# Minimal 1x1 transparent PNG bytes
VALID_PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082"
)

# Minimal valid PDF header and content
DUMMY_PDF_CONTENT = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Sortiva Real Sample Document) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
295
%%EOF
"""

class SampleGeneratorService:
    @staticmethod
    def create_sample_sandbox(base_directory: Path) -> Dict[str, Any]:
        """
        Create a rich, realistic test directory filled with actual files and duplicates.
        """
        sandbox_dir = base_directory / "sortiva_demo_sandbox"
        
        # If exists, clean up to start fresh
        if sandbox_dir.exists():
            shutil.rmtree(sandbox_dir)

        sandbox_dir.mkdir(parents=True, exist_ok=True)

        # 1. Documents
        doc_content_1 = "Sortiva Project Technical Specification\nVersion 1.0\nHigh performance local file organization."
        (sandbox_dir / "project_specs.txt").write_text(doc_content_1, encoding="utf-8")
        (sandbox_dir / "notes.md").write_text("# Meeting Notes\n- Review storage metrics\n- Check duplicate engine", encoding="utf-8")
        (sandbox_dir / "quarterly_report.pdf").write_bytes(DUMMY_PDF_CONTENT)

        # 2. Spreadsheets
        csv_content_1 = "Employee,Department,Salary,Year\nAlice,Engineering,125000,2026\nBob,Design,110000,2026\nCharlie,Product,130000,2026\n"
        (sandbox_dir / "payroll_q1.csv").write_text(csv_content_1, encoding="utf-8")
        (sandbox_dir / "expenses_2026.csv").write_text("Category,Amount,Date\nHosting,450.00,2026-01-15\nSoftware,120.00,2026-02-01\n", encoding="utf-8")

        # 3. Code files
        py_content = "def calculate_savings(total, used):\n    return total - used\n\nif __name__ == '__main__':\n    print(calculate_savings(1000, 450))\n"
        (sandbox_dir / "calculator.py").write_text(py_content, encoding="utf-8")
        (sandbox_dir / "app_config.json").write_text('{"theme": "dark", "auto_clean": false, "version": "1.0"}', encoding="utf-8")
        (sandbox_dir / "styles.css").write_text("body { font-family: Inter, sans-serif; background: #f8fafc; }", encoding="utf-8")

        # 4. Images
        (sandbox_dir / "logo_main.png").write_bytes(VALID_PNG_BYTES)
        (sandbox_dir / "banner.png").write_bytes(VALID_PNG_BYTES)

        # 5. Temp / logs
        (sandbox_dir / "debug_build.log").write_text("DEBUG 2026-03-10: System initialized successfully\n", encoding="utf-8")
        (sandbox_dir / "backup.tmp").write_text("Temporary cached build files\n", encoding="utf-8")

        # 6. Create subdirectories with duplicates to simulate messy folders
        downloads_sub = sandbox_dir / "Old_Downloads"
        downloads_sub.mkdir(exist_ok=True)
        # Duplicate #1: exact copy of quarterly_report.pdf
        (downloads_sub / "quarterly_report_copy.pdf").write_bytes(DUMMY_PDF_CONTENT)
        # Duplicate #2: another copy in downloads
        (downloads_sub / "quarterly_report (1).pdf").write_bytes(DUMMY_PDF_CONTENT)

        desktop_sub = sandbox_dir / "Desktop_Dump"
        desktop_sub.mkdir(exist_ok=True)
        # Duplicate #3: exact copy of payroll_q1.csv
        (desktop_sub / "payroll_backup.csv").write_text(csv_content_1, encoding="utf-8")
        # Duplicate #4: exact copy of logo_main.png
        (desktop_sub / "logo_copy.png").write_bytes(VALID_PNG_BYTES)

        # 7. Empty folder to test empty folder cleanup
        (sandbox_dir / "Empty_Legacy_Folder").mkdir(exist_ok=True)

        return {
            "sandbox_path": str(sandbox_dir),
            "message": "Sample test sandbox created with realistic documents, spreadsheets, images, code files, and exact duplicates."
        }
