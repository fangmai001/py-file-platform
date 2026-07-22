from tests.conftest import auth_headers, make_user
from tests.test_files import PDF_BYTES, _upload


def test_reupload_same_name_creates_new_version_not_new_file(client, db_session):
    owner = make_user(db_session)

    first = _upload(client, owner, filename="report.pdf")
    second = _upload(client, owner, filename="report.pdf")

    assert first.json()["id"] == second.json()["id"]

    response = client.get(f"/api/files/{first.json()['id']}/versions", headers=auth_headers(owner))
    assert response.status_code == 200
    version_numbers = [v["version_no"] for v in response.json()]
    assert version_numbers == [2, 1]


def test_different_filenames_create_separate_files(client, db_session):
    owner = make_user(db_session)

    first = _upload(client, owner, filename="a.pdf")
    second = _upload(client, owner, filename="b.pdf")

    assert first.json()["id"] != second.json()["id"]


def test_download_specific_version(client, db_session):
    owner = make_user(db_session)
    file_id = _upload(client, owner, filename="report.pdf").json()["id"]
    _upload(client, owner, filename="report.pdf")

    response = client.get(f"/api/files/{file_id}/versions/1/download", headers=auth_headers(owner))
    assert response.status_code == 200
    assert response.content == PDF_BYTES


def test_download_unknown_version_404s(client, db_session):
    owner = make_user(db_session)
    file_id = _upload(client, owner, filename="report.pdf").json()["id"]

    response = client.get(f"/api/files/{file_id}/versions/99/download", headers=auth_headers(owner))
    assert response.status_code == 404


def test_versions_of_private_file_hidden_from_others(client, db_session):
    owner = make_user(db_session, username="owner")
    other = make_user(db_session, username="other")
    file_id = _upload(client, owner, filename="secret.pdf", is_public=False).json()["id"]

    response = client.get(f"/api/files/{file_id}/versions", headers=auth_headers(other))
    assert response.status_code == 403
