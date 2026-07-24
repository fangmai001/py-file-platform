from app.models import AuditLog, SmtpSetting
from tests.conftest import auth_headers, configure_smtp, make_user


def test_guest_cannot_read_smtp_settings(client):
    response = client.get("/api/smtp-settings")
    assert response.status_code == 401


def test_non_admin_cannot_read_smtp_settings(client, db_session):
    user = make_user(db_session)
    response = client.get("/api/smtp-settings", headers=auth_headers(user))
    assert response.status_code == 403


def test_admin_can_read_smtp_settings_with_defaults(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.get("/api/smtp-settings", headers=auth_headers(admin))
    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is False
    assert body["host"] is None
    assert body["port"] == 587
    assert body["username"] is None
    assert body["password_set"] is False
    assert body["from_address"] == "noreply@example.com"
    assert body["use_tls"] is True
    assert "password" not in body


def test_non_admin_cannot_update_smtp_settings(client, db_session):
    user = make_user(db_session)

    response = client.patch(
        "/api/smtp-settings",
        headers=auth_headers(user),
        json={"enabled": True},
    )
    assert response.status_code == 403


def test_admin_can_update_smtp_settings_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        "/api/smtp-settings",
        headers=auth_headers(admin),
        json={
            "enabled": True,
            "host": "smtp.example.internal",
            "port": 2525,
            "username": "mailer",
            "password": "mail-pw",
            "from_address": "notify@example.internal",
            "use_tls": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True
    assert body["host"] == "smtp.example.internal"
    assert body["port"] == 2525
    assert body["username"] == "mailer"
    assert body["password_set"] is True
    assert body["from_address"] == "notify@example.internal"
    assert body["use_tls"] is False
    assert "password" not in body

    stored = db_session.get(SmtpSetting, 1)
    assert stored.password == "mail-pw"

    logs = db_session.query(AuditLog).filter(AuditLog.action == "smtp_settings.update").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id


def test_omitting_password_keeps_existing_value(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    configure_smtp(db_session, password="original-pw")

    response = client.patch(
        "/api/smtp-settings",
        headers=auth_headers(admin),
        json={"host": "smtp.new.internal"},
    )
    assert response.status_code == 200
    assert response.json()["password_set"] is True

    stored = db_session.get(SmtpSetting, 1)
    assert stored.password == "original-pw"
    assert stored.host == "smtp.new.internal"


def test_update_only_writes_audit_log_when_something_changes(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch("/api/smtp-settings", headers=auth_headers(admin), json={})
    assert response.status_code == 200

    logs = db_session.query(AuditLog).filter(AuditLog.action == "smtp_settings.update").all()
    assert len(logs) == 0
