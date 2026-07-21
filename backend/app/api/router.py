from fastapi import APIRouter

from app.api import auth

# Future feature routers (files, admin) get included here alongside auth.
router = APIRouter(prefix="/api")
router.include_router(auth.router, prefix="/auth", tags=["auth"])
