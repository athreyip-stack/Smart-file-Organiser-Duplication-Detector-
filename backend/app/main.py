import os
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database.session import engine, Base
import app.models # Register all models with Base
from app.api import api_router

# Ensure tables exist immediately
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup & shutdown."""
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Sortiva: Smart File Organization & Duplicate Detection System API",
    lifespan=lifespan
)

# CORS configuration (supports local and external origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount main API router under /api
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.api_route("/api/health", methods=["GET", "HEAD"])
def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected"
    }

# Static distribution directory for frontend
DIST_DIR = settings.FRONTEND_DIST_DIR
ASSETS_DIR = DIST_DIR / "assets"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

@app.api_route("/", methods=["GET", "HEAD"])
async def serve_root():
    """Serve the single-page React frontend."""
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse(
        content={
            "status": "online",
            "message": "Sortiva backend running. Frontend dist not found. Run 'npm run build' inside frontend/ to compile UI.",
            "api_docs": "/docs",
            "health": "/api/health"
        }
    )

@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
async def serve_spa_routes(full_path: str):
    """
    Catch-all route handler for Single Page Application client-side routing.
    Serves static files if they exist, or falls back to index.html for React routing.
    """
    # Exclude API and documentation routes
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json") or full_path.startswith("redoc"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    # Check if specific static file requested in dist (e.g. favicon.svg, robots.txt)
    requested_file = DIST_DIR / full_path
    if requested_file.exists() and requested_file.is_file():
        return FileResponse(str(requested_file))

    # Fallback to index.html for React client-side routing
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))

    raise HTTPException(status_code=404, detail="Page not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
