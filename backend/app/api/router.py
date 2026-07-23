from fastapi import APIRouter

from app.api import admin, auth, files, folders, link_cards

router = APIRouter(prefix="/api")
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(files.router, prefix="/files", tags=["files"])
router.include_router(folders.router, prefix="/folders", tags=["folders"])
router.include_router(link_cards.router, prefix="/link-cards", tags=["link-cards"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
