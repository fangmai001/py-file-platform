from fastapi import APIRouter

from app.api import admin, auth, files, folders, ldap_settings, link_cards, notifications, password_reset, site_settings

router = APIRouter(prefix="/api")
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(files.router, prefix="/files", tags=["files"])
router.include_router(folders.router, prefix="/folders", tags=["folders"])
router.include_router(link_cards.router, prefix="/link-cards", tags=["link-cards"])
router.include_router(site_settings.router, prefix="/site-settings", tags=["site-settings"])
router.include_router(ldap_settings.router, prefix="/ldap-settings", tags=["ldap-settings"])
router.include_router(password_reset.router, prefix="/password-reset", tags=["password-reset"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
