from fastapi import APIRouter

from app.api import admin, auth, files

router = APIRouter(prefix="/api")
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(files.router, prefix="/files", tags=["files"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
