from app.models import AuditLog
from tests.conftest import auth_headers, make_user


def test_guest_can_read_site_settings_with_defaults(client):
    response = client.get("/api/site-settings")
    assert response.status_code == 200
    body = response.json()
    assert body["brand_name"] is None
    assert body["browser_title"] is None
    assert body["hero_title"] is None
    assert body["hero_subtitle"] is None


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
