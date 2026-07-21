from fastapi import APIRouter

# Placeholder router for future endpoints (auth, files, admin).
# Sub-routers get included here in later phases, e.g.:
#   from app.api import auth, files, admin
#   router.include_router(auth.router, prefix="/auth", tags=["auth"])
router = APIRouter(prefix="/api")
