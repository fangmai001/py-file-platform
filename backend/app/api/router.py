from fastapi import APIRouter

from app.api import auth, files

# Future feature routers (admin) get included here alongside auth/files.
router = APIRouter(prefix="/api")
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(files.router, prefix="/files", tags=["files"])
