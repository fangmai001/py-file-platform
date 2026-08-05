from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.static import has_bundled_frontend, mount_frontend


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

    # httpx 會把 URL 裡的 `..` 正規化掉，所以這裡改用預先編碼過的形式送出——攻擊者
    # 想讓請求真的抵達應用程式，本來也只能這樣送。
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


def test_has_bundled_frontend_needs_index_html_not_just_the_directory(tmp_path):
    empty = tmp_path / "static"
    empty.mkdir()

    # 空目錄不算——這個判斷同時被 CORS 設定（app/main.py）與啟動檢查
    # （app/core/startup_checks.py）拿來認定「正在正式環境的 image 內執行」，
    # 把一個剛好存在的空 static/ 誤判成正式部署，會讓 dev 環境莫名其妙拒絕啟動。
    assert has_bundled_frontend(empty) is False
    assert has_bundled_frontend(tmp_path / "does-not-exist") is False
    assert has_bundled_frontend(_build_dist(tmp_path)) is True
