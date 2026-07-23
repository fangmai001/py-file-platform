from app.models import AuditLog, User
from tests.conftest import auth_headers, make_user


def test_non_admin_cannot_access_admin_routes(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.get("/api/admin/users", headers=auth_headers(user))
    assert response.status_code == 403


def test_admin_can_create_user_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/admin/users",
        headers=auth_headers(admin),
        json={"username": "bob", "password": "s3cret-pw", "role": "user"},
    )
    assert response.status_code == 201
    assert response.json()["username"] == "bob"

    logs = db_session.query(AuditLog).filter(AuditLog.action == "user.create").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id
    assert logs[0].target == "bob"


def test_admin_can_set_email_on_create_and_update(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    create_response = client.post(
        "/api/admin/users",
        headers=auth_headers(admin),
        json={"username": "bob", "password": "s3cret-pw", "email": "bob@example.com"},
    )
    assert create_response.status_code == 201
    assert create_response.json()["email"] == "bob@example.com"

    bob = db_session.query(User).filter(User.username == "bob").one()
    update_response = client.patch(
        f"/api/admin/users/{bob.id}", headers=auth_headers(admin), json={"email": "new@example.com"}
    )
    assert update_response.status_code == 200
    assert update_response.json()["email"] == "new@example.com"


def test_create_user_duplicate_username_conflicts(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    make_user(db_session, username="bob")

    response = client.post(
        "/api/admin/users",
        headers=auth_headers(admin),
        json={"username": "bob", "password": "s3cret-pw"},
    )
    assert response.status_code == 409


def test_admin_can_deactivate_user_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    bob = make_user(db_session, username="bob")

    response = client.patch(
        f"/api/admin/users/{bob.id}", headers=auth_headers(admin), json={"is_active": False}
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    logs = db_session.query(AuditLog).filter(AuditLog.action == "user.update").all()
    assert len(logs) == 1
    assert logs[0].target == "bob"


def test_admin_can_delete_user(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    bob = make_user(db_session, username="bob")

    response = client.delete(f"/api/admin/users/{bob.id}", headers=auth_headers(admin))
    assert response.status_code == 204
    assert db_session.get(User, bob.id) is None

    logs = db_session.query(AuditLog).filter(AuditLog.action == "user.delete").all()
    assert len(logs) == 1


def test_admin_cannot_delete_self(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.delete(f"/api/admin/users/{admin.id}", headers=auth_headers(admin))
    assert response.status_code == 400


def test_admin_cannot_demote_self(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        f"/api/admin/users/{admin.id}", headers=auth_headers(admin), json={"role": "user"}
    )
    assert response.status_code == 400
    assert db_session.get(User, admin.id).role == "admin"


def test_admin_cannot_deactivate_self(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        f"/api/admin/users/{admin.id}", headers=auth_headers(admin), json={"is_active": False}
    )
    assert response.status_code == 400
    assert db_session.get(User, admin.id).is_active is True


def test_admin_can_update_own_password(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch(
        f"/api/admin/users/{admin.id}", headers=auth_headers(admin), json={"password": "new-s3cret-pw"}
    )
    assert response.status_code == 200


def test_admin_cannot_delete_user_who_owns_files(client, db_session):
    from tests.test_files import _upload

    admin = make_user(db_session, username="root", role="admin")
    bob = make_user(db_session, username="bob")
    _upload(client, bob)

    response = client.delete(f"/api/admin/users/{bob.id}", headers=auth_headers(admin))
    assert response.status_code == 409


def test_non_admin_cannot_list_audit_logs(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.get("/api/admin/audit-logs", headers=auth_headers(user))
    assert response.status_code == 403


def test_admin_can_list_audit_logs(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    client.post(
        "/api/admin/users",
        headers=auth_headers(admin),
        json={"username": "bob", "password": "s3cret-pw"},
    )
    bob = db_session.query(User).filter(User.username == "bob").one()
    client.patch(f"/api/admin/users/{bob.id}", headers=auth_headers(admin), json={"is_active": False})

    response = client.get("/api/admin/audit-logs", headers=auth_headers(admin))
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) == 2
    # newest first
    assert logs[0]["action"] == "user.update"
    assert logs[1]["action"] == "user.create"
    assert logs[0]["actor_username"] == "root"
    assert logs[1]["target"] == "bob"


def test_audit_logs_pagination_limit_is_clamped(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    for i in range(3):
        client.post(
            "/api/admin/users",
            headers=auth_headers(admin),
            json={"username": f"user{i}", "password": "s3cret-pw"},
        )

    response = client.get("/api/admin/audit-logs?limit=2", headers=auth_headers(admin))
    assert response.status_code == 200
    assert len(response.json()) == 2
