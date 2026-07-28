from pathlib import Path

from app.core.config import settings
from app.models import AuditLog
from tests.conftest import auth_headers, make_user

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
SVG_BYTES = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"></svg>'


def branding_dir() -> Path:
    return Path(settings.upload_dir) / "branding"


def upload_favicon(client, admin, *, filename="icon.png", content=PNG_BYTES):
    return client.post(
        "/api/site-settings/favicon",
        headers=auth_headers(admin),
        files={"upload": (filename, content, "application/octet-stream")},
    )


def test_guest_can_read_site_settings_with_defaults(client):
    response = client.get("/api/site-settings")
    assert response.status_code == 200
    body = response.json()
    assert body["brand_name"] is None
    assert body["browser_title"] is None
    assert body["hero_title"] is None
    assert body["hero_subtitle"] is None
    assert body["favicon_url"] is None
    assert body["hero_image_url"] is None


def test_non_admin_cannot_update_site_settings(client, db_session):
    user = make_user(db_session)

    response = client.patch(
        "/api/site-settings",
        headers=auth_headers(user),
        json={"brand_name": "我的社團"},
    )
    assert response.status_code == 403


def test_admin_can_update_site_settings_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        "/api/site-settings",
        headers=auth_headers(admin),
        json={
            "brand_name": "我的社團",
            "browser_title": "我的社團官網",
            "hero_title": "歡迎光臨",
            "hero_subtitle": "社團公開檔案牆",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["brand_name"] == "我的社團"
    assert body["browser_title"] == "我的社團官網"
    assert body["hero_title"] == "歡迎光臨"
    assert body["hero_subtitle"] == "社團公開檔案牆"

    logs = db_session.query(AuditLog).filter(AuditLog.action == "site_settings.update").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id


def test_updated_site_settings_are_publicly_readable(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    client.patch(
        "/api/site-settings",
        headers=auth_headers(admin),
        json={"brand_name": "我的社團"},
    )

    response = client.get("/api/site-settings")
    assert response.status_code == 200
    assert response.json()["brand_name"] == "我的社團"


def test_update_only_writes_audit_log_when_something_changes(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch("/api/site-settings", headers=auth_headers(admin), json={})
    assert response.status_code == 200

    logs = db_session.query(AuditLog).filter(AuditLog.action == "site_settings.update").all()
    assert len(logs) == 0


def test_non_admin_cannot_upload_favicon(client, db_session):
    user = make_user(db_session)

    assert upload_favicon(client, user).status_code == 403


def test_admin_uploads_favicon_and_guest_can_fetch_it(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = upload_favicon(client, admin)
    assert response.status_code == 200
    favicon_url = response.json()["favicon_url"]
    assert favicon_url.startswith("/api/site-settings/assets/")

    # The raw filename stays server-side - clients only ever see the URL.
    assert "favicon_filename" not in response.json()

    asset = client.get(favicon_url)
    assert asset.status_code == 200
    assert asset.content == PNG_BYTES
    assert asset.headers["content-type"] == "image/png"
    assert asset.headers["x-content-type-options"] == "nosniff"
    assert "default-src 'none'" in asset.headers["content-security-policy"]

    logs = db_session.query(AuditLog).filter(AuditLog.action == "site_settings.favicon.update").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id


def test_uploading_a_new_favicon_removes_the_previous_file(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    first_url = upload_favicon(client, admin).json()["favicon_url"]
    second_url = upload_favicon(client, admin, filename="new.svg", content=SVG_BYTES).json()["favicon_url"]

    assert first_url != second_url
    assert client.get(first_url).status_code == 404
    assert client.get(second_url).status_code == 200
    assert len(list(branding_dir().iterdir())) == 1


def test_favicon_and_hero_image_are_stored_independently(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    upload_favicon(client, admin)
    response = client.post(
        "/api/site-settings/hero-image",
        headers=auth_headers(admin),
        files={"upload": ("hero.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 200

    body = client.get("/api/site-settings").json()
    assert body["favicon_url"] is not None
    assert body["hero_image_url"] is not None
    assert body["favicon_url"] != body["hero_image_url"]


def test_upload_rejects_unsupported_extension(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = upload_favicon(client, admin, filename="icon.exe", content=PNG_BYTES)
    assert response.status_code == 400
    assert "不支援的圖片格式" in response.json()["detail"]


def test_upload_rejects_content_that_does_not_match_the_extension(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = upload_favicon(client, admin, filename="icon.png", content=b"MZ\x90\x00 not a png")
    assert response.status_code == 400
    assert response.json()["detail"] == "檔案內容與副檔名不符"
    assert not branding_dir().exists()


def test_upload_rejects_oversized_image(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    oversized = PNG_BYTES + b"\x00" * (512 * 1024)
    response = upload_favicon(client, admin, content=oversized)
    assert response.status_code == 400
    assert "超過大小上限" in response.json()["detail"]


def test_asset_route_rejects_filenames_outside_the_branding_directory(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    upload_favicon(client, admin)

    assert client.get("/api/site-settings/assets/..%2F..%2Fetc%2Fpasswd").status_code == 404
    assert client.get("/api/site-settings/assets/secret.pdf").status_code == 404
    assert client.get("/api/site-settings/assets/deadbeef.png").status_code == 404


def test_deleting_hero_image_clears_the_field_and_removes_the_file(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    upload_response = client.post(
        "/api/site-settings/hero-image",
        headers=auth_headers(admin),
        files={"upload": ("hero.png", PNG_BYTES, "image/png")},
    )
    hero_url = upload_response.json()["hero_image_url"]

    response = client.delete("/api/site-settings/hero-image", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["hero_image_url"] is None
    assert client.get(hero_url).status_code == 404

    logs = db_session.query(AuditLog).filter(AuditLog.action == "site_settings.hero_image.delete").all()
    assert len(logs) == 1


def test_deleting_an_unset_image_is_a_no_op(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.delete("/api/site-settings/favicon", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["favicon_url"] is None

    logs = db_session.query(AuditLog).filter(AuditLog.action == "site_settings.favicon.delete").all()
    assert len(logs) == 0


def test_non_admin_cannot_delete_branding_images(client, db_session):
    user = make_user(db_session)

    assert client.delete("/api/site-settings/favicon", headers=auth_headers(user)).status_code == 403
    assert client.delete("/api/site-settings/hero-image", headers=auth_headers(user)).status_code == 403
