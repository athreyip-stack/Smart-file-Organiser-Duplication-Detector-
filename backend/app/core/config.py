import os
from pathlib import Path

# Resolve project directories
# __file__ -> backend/app/core/config.py
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"

class Settings:
    PROJECT_NAME: str = "Sortiva"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    PROJECT_ROOT: Path = PROJECT_ROOT
    BACKEND_DIR: Path = BACKEND_DIR
    BASE_DIR: Path = PROJECT_ROOT
    DATA_DIR: Path = DATA_DIR
    FRONTEND_DIST_DIR: Path = FRONTEND_DIST_DIR
    
    # Security
    SECRET_KEY: str = os.getenv("SORTIVA_SECRET_KEY", "sortiva-super-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'sortiva.db'}")
    
    # CORS
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # File scanner settings
    DEFAULT_EXCLUDED_DIRS: set = {
        ".git",
        ".svn",
        ".hg",
        "node_modules",
        "__pycache__",
        ".pytest_cache",
        ".venv",
        "venv",
        "env",
        ".idea",
        ".vscode",
        ".DS_Store",
        ".sortiva_trash",
    }
    
    DEFAULT_EXCLUDED_EXTENSIONS: set = {
        ".tmp",
        ".crdownload",
        ".part",
        ".lock",
    }

settings = Settings()
