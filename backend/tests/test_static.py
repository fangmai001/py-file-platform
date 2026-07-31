from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.static import mount_frontend


def _build_dist(tmp_path: Path) -> Path:
    """A minimal stand-in for what `vite build` writes to frontend/dist/."""
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><div id=root></div>")
    (dist / "assets" / "index-abc123.js").write_text("console.log('app')")
    (dist / "favicon.ico").write_bytes(b"\x00icon")
    return dist


def _client(dist: Path) -> TestClient:
    app = FastAPI()

    @app.get("/api/files")
    def list_files():
        return {"items": []}

    assert mount_frontend(app, dist) is True
    return TestClient(app)


def test_root_serves_index_html(tmp_path):
    client = _client(_build_dist(tmp_path))
    response = client.get("/")
    assert response.status_code == 200
    assert "<div id=root>" in response.text


def test_deep_link_falls_back_to_index_html(tmp_path):
    """A hard refresh on a react-router path must load the SPA, not 404."""
    client = _client(_build_dist(tmp_path))
    for path in ("/admin", "/upload", "/about"):
        response = client.get(path)
        assert response.status_code == 200
        assert "<div id=root>" in response.text


def test_real_static_files_are_served(tmp_path):
    client = _client(_build_dist(tmp_path))

    asset = client.get("/assets/index-abc123.js")
    assert asset.status_code == 200
    assert asset.text == "console.log('app')"

    favicon = client.get("/favicon.ico")
    assert favicon.status_code == 200
    assert favicon.content == b"\x00icon"


def test_api_routes_still_win_over_the_catch_all(tmp_path):
    client = _client(_build_dist(tmp_path))
    response = client.get("/api/files")
    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_unknown_api_path_404s_instead_of_returning_index_html(tmp_path):
    client = _client(_build_dist(tmp_path))
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert "<div id=root>" not in response.text


def test_path_traversal_falls_back_to_index_html(tmp_path):
    secret = tmp_path / "secret.txt"
    secret.write_text("do not serve me")
    client = _client(_build_dist(tmp_path))

    # httpx normalises `..` in the URL, so the traversal is sent pre-encoded the way an
    # attacker would have to send it to reach the app at all.
    response = client.get("/%2e%2e/secret.txt")
    assert response.status_code == 200
    assert "do not serve me" not in response.text


def test_mount_is_skipped_when_the_frontend_was_not_built(tmp_path):
    """Native dev has no backend/static, and must keep behaving exactly as before."""
    app = FastAPI()
    route_count = len(app.routes)

    assert mount_frontend(app, tmp_path / "missing") is False
    assert len(app.routes) == route_count
    assert TestClient(app).get("/").status_code == 404
