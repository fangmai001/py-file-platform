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


def test_update_me_sets_email(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.patch("/api/auth/me", json={"email": "alice@example.com"}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_update_me_can_clear_email(client, db_session):
    user = make_user(db_session, username="alice", email="alice@example.com")

    response = client.patch("/api/auth/me", json={"email": ""}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["email"] is None


def test_update_me_sets_notify_by_email(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.patch("/api/auth/me", json={"notify_by_email": False}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["notify_by_email"] is False


def test_update_me_rejects_email_already_in_use(client, db_session):
    make_user(db_session, username="bob", email="bob@example.com")
    alice = make_user(db_session, username="alice")

    response = client.patch(
        "/api/auth/me", json={"email": "bob@example.com"}, headers=auth_headers(alice)
    )

    assert response.status_code == 409


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


def test_update_me_rejects_invalid_email(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.patch("/api/auth/me", json={"email": "not-an-email"}, headers=auth_headers(user))

    assert response.status_code == 422
    db_session.refresh(user)
    assert user.email is None


def test_change_password_rejects_short_new_password(client, db_session):
    user = make_user(db_session, username="alice", password="s3cret-pw")

    response = client.post(
        "/api/auth/me/password",
        json={"current_password": "s3cret-pw", "new_password": "short"},
        headers=auth_headers(user),
    )

    assert response.status_code == 422


def test_login_has_no_password_length_limit(client, db_session):
    # 既有帳號的密碼可能比 MIN_PASSWORD_LENGTH 短。登入端刻意不套長度限制，否則等於把他們
    # 鎖在門外，也會讓「太短」與「密碼錯誤」變成可區分的兩種回應。
    make_user(db_session, username="alice", password="tiny")

    response = client.post("/api/auth/login", json={"username": "alice", "password": "tiny"})

    assert response.status_code == 200


def test_invalid_email_reports_a_single_clean_field_name(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.patch("/api/auth/me", json={"email": "nope"}, headers=auth_headers(user))

    assert response.status_code == 422
    detail = response.json()["detail"]
    # 前端的 lib/validation-errors.ts 取 loc 的最後一段當欄位名。email 若寫成
    # `EmailStr | Literal[""] | None` union，這裡會變成兩筆錯誤、且 loc 尾端是 pydantic 的內部
    # 標籤（function-after[...]／literal['']），畫面上就會出現那串東西當欄位名。
    assert len(detail) == 1
    assert detail[0]["loc"] == ["body", "email"]


def test_update_me_rejects_email_longer_than_the_column(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.patch(
        "/api/auth/me", json={"email": "a" * 250 + "@example.com"}, headers=auth_headers(user)
    )

    # 放行的話會變成 Postgres 的 DataError，也就是一個沒有欄位資訊的 500。
    assert response.status_code == 422


def test_update_me_rejects_full_name_longer_than_the_column(client, db_session):
    user = make_user(db_session, username="alice")

    response = client.patch("/api/auth/me", json={"full_name": "a" * 101}, headers=auth_headers(user))

    # 與過長的 email 同理：放行的話會變成 Postgres 的 DataError（500）。
    assert response.status_code == 422
