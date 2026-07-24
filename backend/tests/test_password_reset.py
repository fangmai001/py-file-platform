import re

from app.models import AuditLog, PasswordResetToken
from tests.conftest import auth_headers, make_user

TOKEN_RE = re.compile(r"token=([^\s]+)")


def _capture_sent_email(monkeypatch):
    sent = {}

    def _fake_send_email(smtp_config, to, subject, body):
        sent["to"] = to
        sent["subject"] = subject
        sent["body"] = body

    monkeypatch.setattr("app.api.password_reset.send_email", _fake_send_email)
    return sent


def _extract_token(body: str) -> str:
    match = TOKEN_RE.search(body)
    assert match is not None
    return match.group(1)


def test_request_reset_for_unknown_account_returns_generic_message(client, db_session, monkeypatch):
    sent = _capture_sent_email(monkeypatch)

    response = client.post("/api/password-reset/request", json={"username_or_email": "nobody"})
    assert response.status_code == 200
    body = response.json()
    assert "message" in body
    assert sent == {}
    assert db_session.query(PasswordResetToken).count() == 0


def test_request_reset_for_account_without_email_returns_same_generic_message(client, db_session, monkeypatch):
    sent = _capture_sent_email(monkeypatch)
    make_user(db_session, username="alice")

    response = client.post("/api/password-reset/request", json={"username_or_email": "alice"})
    assert response.status_code == 200
    body_without_email = response.json()["message"]

    sent2 = _capture_sent_email(monkeypatch)
    response2 = client.post("/api/password-reset/request", json={"username_or_email": "nobody-else"})
    assert response2.json()["message"] == body_without_email

    assert sent == {}
    assert sent2 == {}


def test_request_reset_by_username_sends_email_and_stores_token(client, db_session, monkeypatch):
    sent = _capture_sent_email(monkeypatch)
    make_user(db_session, username="alice", email="alice@example.com")

    response = client.post("/api/password-reset/request", json={"username_or_email": "alice"})
    assert response.status_code == 200
    assert sent["to"] == "alice@example.com"
    assert "token=" in sent["body"]
    assert db_session.query(PasswordResetToken).count() == 1


def test_request_reset_by_email_works_too(client, db_session, monkeypatch):
    sent = _capture_sent_email(monkeypatch)
    make_user(db_session, username="alice", email="alice@example.com")

    response = client.post("/api/password-reset/request", json={"username_or_email": "alice@example.com"})
    assert response.status_code == 200
    assert sent["to"] == "alice@example.com"


def test_confirm_with_valid_token_resets_password_and_logs_in(client, db_session, monkeypatch):
    sent = _capture_sent_email(monkeypatch)
    make_user(db_session, username="alice", password="old-password", email="alice@example.com")
    client.post("/api/password-reset/request", json={"username_or_email": "alice"})
    token = _extract_token(sent["body"])

    response = client.post(
        "/api/password-reset/confirm", json={"token": token, "new_password": "new-password-123"}
    )
    assert response.status_code == 200

    login_response = client.post(
        "/api/auth/login", json={"username": "alice", "password": "new-password-123"}
    )
    assert login_response.status_code == 200

    old_login_response = client.post(
        "/api/auth/login", json={"username": "alice", "password": "old-password"}
    )
    assert old_login_response.status_code == 401

    logs = db_session.query(AuditLog).filter(AuditLog.action == "user.self_password_reset").all()
    assert len(logs) == 1


def test_confirm_writes_audit_log_with_user_as_actor(client, db_session, monkeypatch):
    sent = _capture_sent_email(monkeypatch)
    alice = make_user(db_session, username="alice", email="alice@example.com")
    client.post("/api/password-reset/request", json={"username_or_email": "alice"})
    token = _extract_token(sent["body"])

    client.post("/api/password-reset/confirm", json={"token": token, "new_password": "new-password-123"})

    log = db_session.query(AuditLog).filter(AuditLog.action == "user.self_password_reset").one()
    assert log.actor_id == alice.id
    assert log.target == "alice"


def test_confirm_token_cannot_be_reused(client, db_session, monkeypatch):
    sent = _capture_sent_email(monkeypatch)
    make_user(db_session, username="alice", email="alice@example.com")
    client.post("/api/password-reset/request", json={"username_or_email": "alice"})
    token = _extract_token(sent["body"])

    first = client.post("/api/password-reset/confirm", json={"token": token, "new_password": "new-password-1"})
    assert first.status_code == 200

    second = client.post("/api/password-reset/confirm", json={"token": token, "new_password": "new-password-2"})
    assert second.status_code == 400


def test_confirm_rejects_invalid_token(client, db_session):
    response = client.post(
        "/api/password-reset/confirm", json={"token": "not-a-real-token", "new_password": "new-password-123"}
    )
    assert response.status_code == 400


def test_confirm_rejects_expired_token(client, db_session, monkeypatch):
    from datetime import datetime, timedelta, timezone

    sent = _capture_sent_email(monkeypatch)
    make_user(db_session, username="alice", email="alice@example.com")
    client.post("/api/password-reset/request", json={"username_or_email": "alice"})
    token = _extract_token(sent["body"])

    reset_token = db_session.query(PasswordResetToken).one()
    reset_token.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    response = client.post(
        "/api/password-reset/confirm", json={"token": token, "new_password": "new-password-123"}
    )
    assert response.status_code == 400
