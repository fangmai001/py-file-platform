"""Serving the built frontend from the same origin as the API.

In production the whole app ships as a single image: the frontend is built during the
Docker build and copied to ``static_dir``, so FastAPI serves both ``/api/...`` and the
SPA itself. There is no reverse proxy in front of it any more.

Native development is unaffected - ``backend/static`` doesn't exist there, so
``mount_frontend()`` does nothing and the Vite dev server keeps serving the frontend on
its own port.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def mount_frontend(app: FastAPI, static_dir: Path) -> bool:
    """Serve the built frontend from ``static_dir``, if it has been built into the image.

    Returns whether the routes were registered, so callers (and tests) can tell the
    "no frontend bundled" case apart from a successful mount.

    Must be called *after* ``include_router()``: the catch-all registered here would
    otherwise shadow every API route, since Starlette matches routes in registration
    order.
    """
    static_dir = static_dir.resolve()
    index_html = static_dir / "index.html"
    if not index_html.is_file():
        return False

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        # Unregistered API paths must still 404 as JSON rather than be swallowed into
        # index.html, which would make a typo'd endpoint look like it returned HTML.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")

        if full_path:
            candidate = (static_dir / full_path).resolve()
            # `..` in the URL could otherwise escape the static dir and serve arbitrary
            # files off the container filesystem.
            if candidate.is_relative_to(static_dir) and candidate.is_file():
                return FileResponse(candidate)

        # react-router-dom does its own routing, so any other path (/admin, /upload, ...)
        # has to load the SPA shell instead of 404ing on a hard refresh.
        return FileResponse(index_html)

    return True
