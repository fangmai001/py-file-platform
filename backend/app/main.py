from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.router import router
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.ldap_config import warn_if_ldap_env_config_ignored
from app.core.seed import seed_initial_admin
from app.core.smtp_config import warn_if_smtp_env_config_ignored
from app.core.static import mount_frontend


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_initial_admin(db)
        warn_if_ldap_env_config_ignored(db)
        warn_if_smtp_env_config_ignored(db)
    finally:
        db.close()
    yield


app = FastAPI(title="py-file-platform", lifespan=lifespan)

# The frontend and backend run as separate origins in dev (Vite on :5173, uvicorn on
# :8000) and across docker-compose services, so the browser needs CORS headers to call
# the API at all. Auth is Bearer-token based (no cookies), so a wildcard origin here
# doesn't expose CSRF risk the way it would for cookie-based sessions.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# There is no reverse proxy in production any more (see app/core/static.py), so
# compressing the JS/CSS bundle and the JSON API responses is this app's job now.
# compresslevel is lowered from starlette's default of 9 because file downloads go
# through here too, and paying level-9 CPU to re-compress an already-compressed upload
# (zip, pdf, images) is pure waste.
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Registered last on purpose: the SPA catch-all matches every path, so it has to sit
# behind the API routes and /health.
mount_frontend(app, Path(settings.static_dir))
