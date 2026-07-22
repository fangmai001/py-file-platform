from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router

app = FastAPI(title="py-file-platform")

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

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
