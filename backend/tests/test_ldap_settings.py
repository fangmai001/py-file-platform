from app.models import AuditLog, LdapSetting
from tests.conftest import auth_headers, configure_ldap, make_user


def test_guest_cannot_read_ldap_settings(client):
    response = client.get("/api/ldap-settings")
    assert response.status_code == 401


def test_non_admin_cannot_read_ldap_settings(client, db_session):
    user = make_user(db_session)
    response = client.get("/api/ldap-settings", headers=auth_headers(user))
    assert response.status_code == 403


def test_admin_can_read_ldap_settings_with_defaults(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.get("/api/ldap-settings", headers=auth_headers(admin))
    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is False
    assert body["server_uri"] is None
    assert body["bind_dn"] is None
    assert body["bind_password_set"] is False
    assert body["base_dn"] is None
    assert body["user_search_filter"] == "(uid={username})"
    assert "bind_password" not in body


def test_non_admin_cannot_update_ldap_settings(client, db_session):
    user = make_user(db_session)

    response = client.patch(
        "/api/ldap-settings",
        headers=auth_headers(user),
        json={"enabled": True},
    )
    assert response.status_code == 403


def test_admin_can_update_ldap_settings_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        "/api/ldap-settings",
        headers=auth_headers(admin),
        json={
            "enabled": True,
            "server_uri": "ldap://ldap.example.internal",
            "bind_dn": "cn=service,dc=example",
            "bind_password": "service-pw",
            "base_dn": "ou=people,dc=example",
            "user_search_filter": "(sAMAccountName={username})",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True
    assert body["server_uri"] == "ldap://ldap.example.internal"
    assert body["bind_dn"] == "cn=service,dc=example"
    assert body["bind_password_set"] is True
    assert body["base_dn"] == "ou=people,dc=example"
    assert body["user_search_filter"] == "(sAMAccountName={username})"
    assert "bind_password" not in body

    stored = db_session.get(LdapSetting, 1)
    assert stored.bind_password == "service-pw"

    logs = db_session.query(AuditLog).filter(AuditLog.action == "ldap_settings.update").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id


def test_omitting_bind_password_keeps_existing_value(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    configure_ldap(db_session, bind_password="original-pw")

    response = client.patch(
        "/api/ldap-settings",
        headers=auth_headers(admin),
        json={"server_uri": "ldap://new.example.internal"},
    )
    assert response.status_code == 200
    assert response.json()["bind_password_set"] is True

    stored = db_session.get(LdapSetting, 1)
    assert stored.bind_password == "original-pw"
    assert stored.server_uri == "ldap://new.example.internal"


def test_update_only_writes_audit_log_when_something_changes(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch("/api/ldap-settings", headers=auth_headers(admin), json={})
    assert response.status_code == 200

    logs = db_session.query(AuditLog).filter(AuditLog.action == "ldap_settings.update").all()
    assert len(logs) == 0
