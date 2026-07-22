from tests.conftest import auth_headers, make_user

PDF_BYTES = b"%PDF-1.4\nfake content\n%%EOF"


def _upload(client, user, filename="report.pdf", is_public=True):
    return client.post(
        "/api/files/upload",
        headers=auth_headers(user),
        files={"upload": (filename, PDF_BYTES, "application/pdf")},
        data={"is_public": str(is_public).lower()},
    )


def test_upload_requires_auth(client):
    response = client.post(
        "/api/files/upload",
        files={"upload": ("report.pdf", PDF_BYTES, "application/pdf")},
    )
    assert response.status_code == 401


def test_upload_rejects_content_extension_mismatch(client, db_session):
    user = make_user(db_session)
    response = client.post(
        "/api/files/upload",
        headers=auth_headers(user),
        files={"upload": ("report.pdf", b"not really a pdf", "application/pdf")},
        data={"is_public": "true"},
    )
    assert response.status_code == 400


def test_upload_defaults_to_public(client, db_session):
    user = make_user(db_session)
    response = _upload(client, user)
    assert response.status_code == 201
    assert response.json()["is_public"] is True


def test_upload_can_be_private(client, db_session):
    user = make_user(db_session)
    response = _upload(client, user, is_public=False)
    assert response.status_code == 201
    assert response.json()["is_public"] is False


def test_guest_cannot_download_private_file(client, db_session):
    owner = make_user(db_session, username="owner")
    file_id = _upload(client, owner, is_public=False).json()["id"]

    response = client.get(f"/api/files/{file_id}/download")
    assert response.status_code == 401


def test_other_user_cannot_download_private_file(client, db_session):
    owner = make_user(db_session, username="owner")
    other = make_user(db_session, username="other")
    file_id = _upload(client, owner, is_public=False).json()["id"]

    response = client.get(f"/api/files/{file_id}/download", headers=auth_headers(other))
    assert response.status_code == 403


def test_owner_can_download_own_private_file(client, db_session):
    owner = make_user(db_session, username="owner")
    file_id = _upload(client, owner, is_public=False).json()["id"]

    response = client.get(f"/api/files/{file_id}/download", headers=auth_headers(owner))
    assert response.status_code == 200


def test_admin_can_download_others_private_file(client, db_session):
    owner = make_user(db_session, username="owner")
    admin = make_user(db_session, username="root", role="admin")
    file_id = _upload(client, owner, is_public=False).json()["id"]

    response = client.get(f"/api/files/{file_id}/download", headers=auth_headers(admin))
    assert response.status_code == 200


def test_guest_list_only_sees_public_files(client, db_session):
    owner = make_user(db_session, username="owner")
    _upload(client, owner, filename="public.pdf", is_public=True)
    _upload(client, owner, filename="private.pdf", is_public=False)

    response = client.get("/api/files")
    assert response.status_code == 200
    names = {f["filename"] for group in response.json() for f in group["files"]}
    assert names == {"public.pdf"}


def test_owner_list_sees_own_private_files(client, db_session):
    owner = make_user(db_session, username="owner")
    _upload(client, owner, filename="private.pdf", is_public=False)

    response = client.get("/api/files", headers=auth_headers(owner))
    names = {f["filename"] for group in response.json() for f in group["files"]}
    assert names == {"private.pdf"}


def test_owner_can_toggle_visibility(client, db_session):
    owner = make_user(db_session, username="owner")
    file_id = _upload(client, owner, is_public=True).json()["id"]

    response = client.patch(
        f"/api/files/{file_id}", headers=auth_headers(owner), json={"is_public": False}
    )
    assert response.status_code == 200
    assert response.json()["is_public"] is False


def test_non_owner_cannot_toggle_visibility(client, db_session):
    owner = make_user(db_session, username="owner")
    other = make_user(db_session, username="other")
    file_id = _upload(client, owner, is_public=True).json()["id"]

    response = client.patch(
        f"/api/files/{file_id}", headers=auth_headers(other), json={"is_public": False}
    )
    assert response.status_code == 403


def test_admin_can_toggle_others_visibility(client, db_session):
    owner = make_user(db_session, username="owner")
    admin = make_user(db_session, username="root", role="admin")
    file_id = _upload(client, owner, is_public=True).json()["id"]

    response = client.patch(
        f"/api/files/{file_id}", headers=auth_headers(admin), json={"is_public": False}
    )
    assert response.status_code == 200
    assert response.json()["is_public"] is False
