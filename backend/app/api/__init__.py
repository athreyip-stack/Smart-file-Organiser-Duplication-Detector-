from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.scan import router as scan_router
from app.api.files import router as files_router
from app.api.duplicates import router as duplicates_router
from app.api.organize import router as organize_router
from app.api.storage import router as storage_router
from app.api.cleanup import router as cleanup_router
from app.api.operations import router as operations_router
from app.api.system import router as system_router
from app.api.settings import router as settings_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(scan_router)
api_router.include_router(files_router)
api_router.include_router(duplicates_router)
api_router.include_router(organize_router)
api_router.include_router(storage_router)
api_router.include_router(cleanup_router)
api_router.include_router(operations_router)
api_router.include_router(system_router)
api_router.include_router(settings_router)

__all__ = ["api_router"]
