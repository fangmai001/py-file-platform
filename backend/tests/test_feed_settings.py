from app.core.feed_schedule import get_feed_settings
from app.models import AuditLog, FeedSetting
from tests.conftest import auth_headers, make_user


def test_get_feed_settings_requires_admin(client, db_session):
    user = make_user(db_session)

    assert client.get("/api/feed-settings").status_code == 401
    assert client.get("/api/feed-settings", headers=auth_headers(user)).status_code == 403


def test_patch_feed_settings_requires_admin(client, db_session):
    user = make_user(db_session)

    assert client.patch("/api/feed-settings", json={"fetch_enabled": True}).status_code == 401
    assert (
        client.patch("/api/feed-settings", json={"fetch_enabled": True}, headers=auth_headers(user)).status_code == 403
    )


def test_get_creates_the_row_with_defaults(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    assert db_session.query(FeedSetting).count() == 0

    response = client.get("/api/feed-settings", headers=auth_headers(admin))

    assert response.status_code == 200
    body = response.json()
    # 預設關閉，既有部署升級之後行為不變（部署主機上的 crontab 繼續跑）。
    assert body["fetch_enabled"] is False
    assert body["fetch_interval_minutes"] == 60
    assert body["last_run_at"] is None
    assert body["last_run_status"] is None
    # 讀取本身就要把這一列留下來，否則每次讀都會重建一次。
    assert db_session.query(FeedSetting).count() == 1


def test_admin_can_update_settings_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        "/api/feed-settings",
        json={"fetch_enabled": True, "fetch_interval_minutes": 15},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fetch_enabled"] is True
    assert body["fetch_interval_minutes"] == 15

    audit = db_session.query(AuditLog).filter(AuditLog.action == "feed_settings.update").one()
    assert "fetch_interval_minutes: 60 -> 15" in audit.detail


def test_interval_outside_the_allowed_range_is_rejected(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    too_short = client.patch("/api/feed-settings", json={"fetch_interval_minutes": 1}, headers=auth_headers(admin))
    too_long = client.patch("/api/feed-settings", json={"fetch_interval_minutes": 10000}, headers=auth_headers(admin))

    assert too_short.status_code == 422
    assert too_long.status_code == 422


def test_omitted_fields_keep_their_current_value(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    settings_row = get_feed_settings(db_session)
    settings_row.fetch_enabled = True
    settings_row.fetch_interval_minutes = 30
    db_session.commit()

    response = client.patch("/api/feed-settings", json={"fetch_enabled": False}, headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.json()["fetch_interval_minutes"] == 30


def test_explicit_null_does_not_clear_a_non_nullable_field(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        "/api/feed-settings",
        json={"fetch_enabled": None, "fetch_interval_minutes": None},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["fetch_enabled"] is False
    assert response.json()["fetch_interval_minutes"] == 60


def test_no_op_patch_writes_no_audit_log_and_does_not_wake_the_scheduler(client, db_session, monkeypatch):
    admin = make_user(db_session, username="root", role="admin")
    calls: list[int] = []
    monkeypatch.setattr("app.api.feed_settings.request_wakeup", lambda: calls.append(1))

    response = client.patch("/api/feed-settings", json={"fetch_interval_minutes": 60}, headers=auth_headers(admin))

    assert response.status_code == 200
    assert db_session.query(AuditLog).count() == 0
    assert calls == []


def test_changing_settings_wakes_the_scheduler(client, db_session, monkeypatch):
    """少了這一步，新間隔要等排程器睡完上一輪（最長一天）才生效，管理員會以為儲存沒作用。"""
    admin = make_user(db_session, username="root", role="admin")
    calls: list[int] = []
    monkeypatch.setattr("app.api.feed_settings.request_wakeup", lambda: calls.append(1))

    client.patch("/api/feed-settings", json={"fetch_interval_minutes": 15}, headers=auth_headers(admin))

    assert calls == [1]
