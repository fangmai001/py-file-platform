from tests.conftest import auth_headers, make_ldap_user, make_user


def test_login_success(client, db_session):
    make_user(db_session, username="alice", password="s3cret-pw")

    response = client.post("/api/auth/login", json={"username": "alice", "password": "s3cret-pw"})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password(client, db_session):
    make_user(db_session, username="alice", password="s3cret-pw")

    response = client.post("/api/auth/login", json={"username": "alice", "password": "wrong"})

    assert response.status_code == 401


def test_login_unknown_user(client, db_session):
    response = client.post("/api/auth/login", json={"username": "nobody", "password": "whatever"})

    assert response.status_code == 401


def test_login_inactive_user(client, db_session):
    make_user(db_session, username="alice", password="s3cret-pw", is_active=False)

    response = client.post("/api/auth/login", json={"username": "alice", "password": "s3cret-pw"})

    assert response.status_code == 401


def test_me_returns_current_user(client, db_session):
    user = make_user(db_session, username="alice", role="admin")

    response = client.get("/api/auth/me", headers=auth_headers(user))

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "alice"
    assert body["role"] == "admin"


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_update_me_sets_full_name(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.patch("/api/auth/me", json={"full_name": "Alice Chen"}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["full_name"] == "Alice Chen"


def test_update_me_can_clear_full_name(client, db_session):
    user = make_user(db_session, username="alice", full_name="Alice Chen")

    response = client.patch("/api/auth/me", json={"full_name": ""}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["full_name"] is None


def test_update_me_requires_auth(client):
    response = client.patch("/api/auth/me", json={"full_name": "Nope"})
    assert response.status_code == 401


def test_change_password_success(client, db_session):
    user = make_user(db_session, username="alice", password="old-pw-123")

    response = client.post(
        "/api/auth/me/password",
        json={"current_password": "old-pw-123", "new_password": "new-pw-456"},
        headers=auth_headers(user),
    )
    assert response.status_code == 200

    login_response = client.post("/api/auth/login", json={"username": "alice", "password": "new-pw-456"})
    assert login_response.status_code == 200

    old_login_response = client.post("/api/auth/login", json={"username": "alice", "password": "old-pw-123"})
    assert old_login_response.status_code == 401


def test_change_password_wrong_current_password(client, db_session):
    user = make_user(db_session, username="alice", password="old-pw-123")

    response = client.post(
        "/api/auth/me/password",
        json={"current_password": "wrong-pw", "new_password": "new-pw-456"},
        headers=auth_headers(user),
    )

    assert response.status_code == 400


def test_change_password_rejected_for_ldap_account(client, db_session):
    user = make_ldap_user(db_session, username="alice")

    response = client.post(
        "/api/auth/me/password",
        json={"current_password": "whatever", "new_password": "new-pw-456"},
        headers=auth_headers(user),
    )

    assert response.status_code == 400


def test_change_password_requires_auth(client):
    response = client.post(
        "/api/auth/me/password", json={"current_password": "a", "new_password": "b"}
    )
    assert response.status_code == 401
