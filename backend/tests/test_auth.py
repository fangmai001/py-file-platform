from tests.conftest import make_user


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
