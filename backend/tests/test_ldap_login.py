from unittest.mock import MagicMock

from app.models import AuditLog, User
from tests.conftest import auth_headers, configure_ldap, make_ldap_user, make_user


def test_login_ldap_disabled_unknown_user_still_401(client, db_session, monkeypatch):
    mock_authenticate = MagicMock(return_value=True)
    monkeypatch.setattr("app.api.auth.authenticate_ldap", mock_authenticate)

    response = client.post("/api/auth/login", json={"username": "nobody", "password": "whatever"})

    assert response.status_code == 401
    mock_authenticate.assert_not_called()


def test_login_creates_local_user_on_first_ldap_success(client, db_session, monkeypatch):
    configure_ldap(db_session)
    monkeypatch.setattr("app.api.auth.authenticate_ldap", MagicMock(return_value=True))

    response = client.post("/api/auth/login", json={"username": "newldapuser", "password": "whatever"})

    assert response.status_code == 200
    user = db_session.query(User).filter(User.username == "newldapuser").one()
    assert user.auth_source == "ldap"
    assert user.password_hash is None
    assert user.is_active is True

    # 這是唯一一條會憑空生出帳號的路徑，少了稽核紀錄就看不出某個帳號是何時、如何出現的。
    log = db_session.query(AuditLog).filter(AuditLog.action == "user.create").one()
    assert log.actor_id == user.id
    assert log.target == "newldapuser"
    assert "ldap" in log.detail


def test_existing_ldap_user_logging_in_again_is_not_audited(client, db_session, monkeypatch):
    configure_ldap(db_session)
    monkeypatch.setattr("app.api.auth.authenticate_ldap", MagicMock(return_value=True))
    make_ldap_user(db_session, username="olduser")

    response = client.post("/api/auth/login", json={"username": "olduser", "password": "whatever"})

    assert response.status_code == 200
    # 只有「建立帳號」該留紀錄；每次登入都記會把稽核紀錄淹掉。
    assert db_session.query(AuditLog).filter(AuditLog.action == "user.create").count() == 0


def test_login_ldap_bind_failure_401(client, db_session, monkeypatch):
    configure_ldap(db_session)
    monkeypatch.setattr("app.api.auth.authenticate_ldap", MagicMock(return_value=False))

    response = client.post("/api/auth/login", json={"username": "someone", "password": "wrong"})

    assert response.status_code == 401
    assert db_session.query(User).filter(User.username == "someone").first() is None


def test_login_local_user_bypasses_ldap_even_when_enabled(client, db_session, monkeypatch):
    make_user(db_session, username="alice", password="s3cret-pw")
    configure_ldap(db_session)
    mock_authenticate = MagicMock(return_value=False)
    monkeypatch.setattr("app.api.auth.authenticate_ldap", mock_authenticate)

    response = client.post("/api/auth/login", json={"username": "alice", "password": "s3cret-pw"})

    assert response.status_code == 200
    mock_authenticate.assert_not_called()


def test_login_existing_ldap_user_reuses_same_record(client, db_session, monkeypatch):
    existing = make_ldap_user(db_session, username="bob")
    configure_ldap(db_session)
    monkeypatch.setattr("app.api.auth.authenticate_ldap", MagicMock(return_value=True))

    response = client.post("/api/auth/login", json={"username": "bob", "password": "whatever"})

    assert response.status_code == 200
    assert db_session.query(User).filter(User.username == "bob").count() == 1
    assert db_session.query(User).filter(User.username == "bob").one().id == existing.id


def test_login_inactive_ldap_user_blocked_without_calling_ldap(client, db_session, monkeypatch):
    make_ldap_user(db_session, username="bob", is_active=False)
    configure_ldap(db_session)
    mock_authenticate = MagicMock(return_value=True)
    monkeypatch.setattr("app.api.auth.authenticate_ldap", mock_authenticate)

    response = client.post("/api/auth/login", json={"username": "bob", "password": "whatever"})

    assert response.status_code == 401
    mock_authenticate.assert_not_called()


def test_admin_cannot_reset_ldap_user_password(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    ldap_user = make_ldap_user(db_session, username="bob")

    response = client.post(f"/api/admin/users/{ldap_user.id}/reset-password", headers=auth_headers(admin))

    assert response.status_code == 400
    assert db_session.get(User, ldap_user.id).password_hash is None


def test_admin_can_still_deactivate_ldap_user(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    ldap_user = make_ldap_user(db_session, username="bob")

    response = client.patch(
        f"/api/admin/users/{ldap_user.id}", headers=auth_headers(admin), json={"is_active": False}
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False
