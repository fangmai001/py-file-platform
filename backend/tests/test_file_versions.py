from app.models import Folder, Notification
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


def test_reupload_as_private_makes_file_private_and_stops_broadcasting(client, db_session):
    """The failure this guards against: re-uploading a public file with is_public=false to
    make it private left it public *and* re-announced it to every other user."""
    owner = make_user(db_session, username="owner")
    make_user(db_session, username="other")

    _upload(client, owner, filename="report.pdf", is_public=True)
    assert db_session.query(Notification).count() == 1

    response = _upload(client, owner, filename="report.pdf", is_public=False)
    assert response.status_code == 201
    assert response.json()["is_public"] is False
    assert db_session.query(Notification).count() == 1


def test_reupload_applies_metadata_fields(client, db_session):
    owner = make_user(db_session)
    folder = Folder(name="規章")
    db_session.add(folder)
    db_session.commit()

    file_id = _upload(client, owner, filename="report.pdf").json()["id"]
    response = _upload(
        client,
        owner,
        filename="report.pdf",
        folder_id=folder.id,
        display_name="年度報告",
        announced_at="2026-08-04",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == file_id
    assert body["folder_id"] == folder.id
    assert body["display_name"] == "年度報告"
    assert body["announced_at"] == "2026-08-04"


def test_reupload_without_metadata_fields_keeps_previous_values(client, db_session):
    owner = make_user(db_session)

    _upload(client, owner, filename="report.pdf", is_public=False, display_name="年度報告")
    response = _upload(client, owner, filename="report.pdf", is_public=None)

    assert response.status_code == 201
    assert response.json()["display_name"] == "年度報告"
    assert response.json()["is_public"] is False


def test_versions_of_private_file_hidden_from_others(client, db_session):
    owner = make_user(db_session, username="owner")
    other = make_user(db_session, username="other")
    file_id = _upload(client, owner, filename="secret.pdf", is_public=False).json()["id"]

    response = client.get(f"/api/files/{file_id}/versions", headers=auth_headers(other))
    assert response.status_code == 403
