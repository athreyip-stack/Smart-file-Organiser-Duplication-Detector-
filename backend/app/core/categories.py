import mimetypes
from pathlib import Path
from typing import Dict, List, Optional, Union

# Category mappings with extensions and descriptions
CATEGORY_DEFINITIONS: Dict[str, Dict] = {
    "PDFs": {
        "name": "PDFs",
        "extensions": [".pdf"],
        "mime_prefixes": ["application/pdf"],
        "color": "#e11d48", # Rose / Red
        "icon": "FileText",
        "description": "Portable Document Format files"
    },
    "Documents": {
        "name": "Documents",
        "extensions": [
            ".doc", ".docx", ".odt", ".rtf", ".txt", ".md", ".tex", 
            ".wpd", ".wps", ".pages", ".log", ".rst", ".epub", ".mobi"
        ],
        "mime_prefixes": ["text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml"],
        "color": "#2563eb", # Blue
        "icon": "FileText",
        "description": "Word processing and text documents"
    },
    "Spreadsheets": {
        "name": "Spreadsheets",
        "extensions": [
            ".xls", ".xlsx", ".csv", ".tsv", ".ods", ".numbers", 
            ".xlsm", ".xlsb", ".xltx"
        ],
        "mime_prefixes": ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml"],
        "color": "#16a34a", # Green
        "icon": "Sheet",
        "description": "Tabular and spreadsheet data"
    },
    "Presentations": {
        "name": "Presentations",
        "extensions": [
            ".ppt", ".pptx", ".odp", ".key", ".pps", ".ppsx"
        ],
        "mime_prefixes": ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml"],
        "color": "#ea580c", # Orange
        "icon": "Presentation",
        "description": "Slide deck presentations"
    },
    "Images": {
        "name": "Images",
        "extensions": [
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", 
            ".tiff", ".tif", ".ico", ".heic", ".heif", ".raw", ".psd", ".ai", ".eps"
        ],
        "mime_prefixes": ["image/"],
        "color": "#8b5cf6", # Purple
        "icon": "Image",
        "description": "Photos and graphic images"
    },
    "Videos": {
        "name": "Videos",
        "extensions": [
            ".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", 
            ".m4v", ".3gp", ".mpeg", ".mpg", ".ts"
        ],
        "mime_prefixes": ["video/"],
        "color": "#06b6d4", # Cyan
        "icon": "Video",
        "description": "Video clips and movies"
    },
    "Audio": {
        "name": "Audio",
        "extensions": [
            ".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma", 
            ".aiff", ".alac", ".mid", ".midi", ".opus"
        ],
        "mime_prefixes": ["audio/"],
        "color": "#ec4899", # Pink
        "icon": "Music",
        "description": "Music and sound recordings"
    },
    "Archives": {
        "name": "Archives",
        "extensions": [
            ".zip", ".tar", ".gz", ".tgz", ".bz2", ".7z", ".rar", 
            ".xz", ".iso", ".dmg", ".pkg", ".deb", ".rpm", ".cab"
        ],
        "mime_prefixes": ["application/zip", "application/x-tar", "application/x-gzip", "application/x-7z-compressed", "application/x-rar-compressed"],
        "color": "#d97706", # Amber
        "icon": "Archive",
        "description": "Compressed archives and disk images"
    },
    "Code": {
        "name": "Code",
        "extensions": [
            ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", 
            ".scss", ".json", ".yaml", ".yml", ".xml", ".sql", ".sh", 
            ".bash", ".zsh", ".c", ".cpp", ".h", ".hpp", ".cs", 
            ".java", ".kt", ".go", ".rs", ".rb", ".php", ".swift", 
            ".lua", ".r", ".dart", ".vue", ".svelte", ".toml", ".ini", ".env"
        ],
        "mime_prefixes": ["text/x-", "application/json", "application/xml", "application/javascript"],
        "color": "#0d9488", # Teal
        "icon": "Code",
        "description": "Source code and scripts"
    },
    "Others": {
        "name": "Others",
        "extensions": [],
        "mime_prefixes": [],
        "color": "#64748b", # Slate
        "icon": "File",
        "description": "Other unrecognized file formats"
    }
}

# Reverse lookup dictionary for fast O(1) extension mapping
EXTENSION_TO_CATEGORY: Dict[str, str] = {}
for category_name, cat_data in CATEGORY_DEFINITIONS.items():
    for ext in cat_data["extensions"]:
        EXTENSION_TO_CATEGORY[ext.lower()] = category_name

def determine_file_category(file_path: Optional[Union[str, Path]] = None, filename: Optional[str] = None, extension: Optional[str] = None) -> str:
    """
    Determine the category of a file based on extension and fallback MIME type.
    """
    if extension:
        ext = extension.lower()
        if not ext.startswith('.'):
            ext = f".{ext}"
    elif filename:
        ext = Path(filename).suffix.lower()
    elif file_path:
        ext = Path(file_path).suffix.lower()
    else:
        return "Others"

    # Fast check by extension
    if ext in EXTENSION_TO_CATEGORY:
        return EXTENSION_TO_CATEGORY[ext]

    # Fallback to MIME type detection
    try:
        mime_type, _ = mimetypes.guess_type(str(file_path or filename or ""))
        if mime_type:
            for cat_name, cat_data in CATEGORY_DEFINITIONS.items():
                for prefix in cat_data.get("mime_prefixes", []):
                    if mime_type.startswith(prefix):
                        return cat_name
    except Exception:
        pass

    return "Others"

def get_category_color(category_name: str) -> str:
    """Return the theme color hex for a category."""
    return CATEGORY_DEFINITIONS.get(category_name, CATEGORY_DEFINITIONS["Others"])["color"]

def get_all_categories() -> List[Dict]:
    """Return all category metadata."""
    return [
        {
            "id": cat_id,
            "name": cat_data["name"],
            "color": cat_data["color"],
            "icon": cat_data["icon"],
            "description": cat_data["description"],
            "extensions": cat_data["extensions"]
        }
        for cat_id, cat_data in CATEGORY_DEFINITIONS.items()
    ]
