# Sortiva – File Organization & Duplicate Detection System

Sortiva is a complete, full-stack, local-first web application designed to help you analyze, categorize, detect duplicates, safely clean, and organize files on your computer with complete **Undo** support.

---

## 🚀 Starting the Complete Application

Sortiva runs as a **single unified local application** hosted on **`http://127.0.0.1:8000`**. You do **NOT** need to run a separate frontend Vite server.

### Single Command Start:

From the project root directory:

```bash
# 1. Activate Python virtual environment
source venv/bin/activate

# 2. Start the unified Sortiva application
python run.py
```

Now open your browser to:
👉 **`http://127.0.0.1:8000`**

- **Sortiva UI**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Healthcheck**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 🏗 Architecture (Single Local Host URL)

```text
       http://127.0.0.1:8000
                │
    ┌───────────┴───────────┐
    ▼                       ▼
Root / SPA Routes      /api/* REST Endpoints
(React UI in dist/)    (FastAPI File Engine)
    │                       │
    └───────────┬───────────┘
                ▼
  SQLite Database + Real Local Filesystem
```

---

## 🌟 Key Features

1. **Local Filesystem Crawler & Staged Scanner**
   - Scans actual local folders and subdirectories on your computer.
   - Extracts real metadata: file sizes, modification/creation dates, MIME types, and categories.
   - Live progress indicator during scans.

2. **Staged Cryptographic Duplicate Detection**
   - Stage 1: Group files by byte size.
   - Stage 2: Calculate SHA-256 hashes only for candidate size collisions.
   - Groups duplicates by hash, designating originals and calculating recoverable disk space.
   - Review and select copies to safely move to OS Trash or quarantine.

3. **File Organization & Live Preview**
   - Organize files by **Category** (Documents, Spreadsheets, Images, Videos, Audio, Code, Archives, PDFs, Others), **Extension**, or **Date (YYYY/MM)**.
   - **Preview Before Moving**: Review proposed file destinations and auto-rename collision resolutions before confirming.
   - Real disk move operation executed using Python `shutil.move`.

4. **1-Click Undo & Operation History**
   - Every file organization move and cleanup is recorded in SQLite.
   - Reverse any single move or an entire organization batch back to its original location with a single click.

5. **Storage Analytics with Recharts**
   - Interactive category storage distribution charts.
   - File count per category histograms.
   - Largest space-consuming files ranking and extension breakdowns.

6. **Safe Cleanup Suite**
   - Review redundant duplicates, large files (>50MB), temporary/log files, and empty residual directories.
   - Native OS Trash integration (`send2trash`) or Sortiva quarantine fallback.

7. **Demo Sandbox Mode**
   - 1-click built-in sandbox generator creating realistic documents, spreadsheets, images, code files, and duplicate copies for instant, safe hands-on testing.

---

## 🧪 Automated Testing

```bash
# Run backend test suite
source venv/bin/activate
PYTHONPATH=backend pytest backend/tests/ -v

# Run full live system end-to-end verification
python backend/tests/verify_full_system.py
```

---

## 📁 Project Structure

```text
sortiva/
├── backend/
│   ├── app/
│   │   ├── api/             # REST API routers (auth, scan, files, duplicates, organize, storage, cleanup, operations, system, settings)
│   │   ├── core/            # Configuration, security, and category definitions
│   │   ├── database/        # SQLite engine and session providers
│   │   ├── models/          # SQLAlchemy ORM models (User, Scan, FileItem, Operation)
│   │   ├── schemas/         # Pydantic schemas and request/response models
│   │   ├── services/        # Business logic (scanner, duplicate detector, organizer, cleaner, history, sandbox)
│   │   └── main.py          # FastAPI application serving both /api and compiled UI
│   ├── data/                # SQLite database and quarantine directory
│   ├── tests/               # Pytest suites and end-to-end verification script
│   └── requirements.txt
│
├── frontend/
│   ├── src/                 # React UI source components, pages, context, and services
│   ├── dist/                # Production distribution bundle served by FastAPI
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── run.py                   # Single-command launcher script
├── README.md
└── .gitignore
```
