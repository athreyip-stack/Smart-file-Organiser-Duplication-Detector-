#!/usr/bin/env python3
"""
Sortiva Single-Application Runner
Starts the unified server hosting both the React UI and FastAPI REST endpoints on http://127.0.0.1:8000
"""
import uvicorn
import os
import sys
from pathlib import Path

# Set up python path for backend
PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  SORTIVA: Smart File Organization & Duplicate Detection")
    print("="*60)
    print("  Application URL: http://127.0.0.1:8000")
    print("  API Docs:        http://127.0.0.1:8000/docs")
    print("  Database:        backend/data/sortiva.db")
    print("="*60 + "\n")
    
    uvicorn.run("app.main:app", app_dir=str(BACKEND_DIR), host="127.0.0.1", port=8000, reload=True)
