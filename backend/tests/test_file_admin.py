from app.models import AuditLog, File
from tests.conftest import auth_headers, make_user
from tests.test_files import _upload


def test_admin_list_sees_all_files_including_others_private(client, db_session):
    owner = make_user(db_session, username="owner")
    admin = make_user(db_session, username="root", role="admin")
    _upload(client, owner, filename="private.pdf", is_public=False)

    response = client.get("/api/files", headers=auth_headers(admin))
    names = {f["filename"] for group in response.json() for f in group["files"]}
    assert names == {"private.pdf"}


def test_owner_can_delete_own_file_without_audit_log(client, db_session):
    owner = make_user(db_session, username="owner")
    file_id = _upload(client, owner).json()["id"]

    response = client.delete(f"/api/files/{file_id}", headers=auth_headers(owner))
    assert response.status_code == 204
    assert db_session.get(File, file_id) is None
    assert db_session.query(AuditLog).filter(AuditLog.action == "file.delete").count() == 0


def test_other_user_cannot_delete_file(client, db_session):
    owner = make_user(db_session, username="owner")
    other = make_user(db_session, username="other")
    file_id = _upload(client, owner).json()["id"]

    response = client.delete(f"/api/files/{file_id}", headers=auth_headers(other))
    assert response.status_code == 403


def test_admin_deleting_others_file_writes_audit_log(client, db_session):
    owner = make_user(db_session, username="owner")
    admin = make_user(db_session, username="root", role="admin")
    file_id = _upload(client, owner).json()["id"]

    response = client.delete(f"/api/files/{file_id}", headers=auth_headers(admin))
    assert response.status_code == 204
    assert db_session.get(File, file_id) is None

    logs = db_session.query(AuditLog).filter(AuditLog.action == "file.delete").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id
    assert logs[0].target == "report.pdf"
