from app.models import AuditLog, Folder
from tests.conftest import auth_headers, make_user


def test_guest_can_list_folders(client, db_session):
    db_session.add(Folder(name="財務"))
    db_session.commit()

    response = client.get("/api/folders")
    assert response.status_code == 200
    assert [f["name"] for f in response.json()] == ["財務"]


def test_non_admin_cannot_create_folder(client, db_session):
    user = make_user(db_session)

    response = client.post("/api/folders", headers=auth_headers(user), json={"name": "財務"})
    assert response.status_code == 403


def test_admin_can_create_folder_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/folders",
        headers=auth_headers(admin),
        json={"name": "財務", "description": "財務相關文件"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "財務"
    assert body["description"] == "財務相關文件"

    logs = db_session.query(AuditLog).filter(AuditLog.action == "folder.create").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id
    assert logs[0].target == "財務"


def test_create_folder_duplicate_name_conflicts(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    db_session.add(Folder(name="財務"))
    db_session.commit()

    response = client.post("/api/folders", headers=auth_headers(admin), json={"name": "財務"})
    assert response.status_code == 409


def test_admin_can_update_folder(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    folder = Folder(name="財務", description="舊描述")
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    response = client.patch(
        f"/api/folders/{folder.id}",
        headers=auth_headers(admin),
        json={"description": "新描述"},
    )
    assert response.status_code == 200
    assert response.json()["description"] == "新描述"
    assert response.json()["name"] == "財務"

    logs = db_session.query(AuditLog).filter(AuditLog.action == "folder.update").all()
    assert len(logs) == 1


def test_non_admin_cannot_update_folder(client, db_session):
    user = make_user(db_session)
    folder = Folder(name="財務")
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    response = client.patch(
        f"/api/folders/{folder.id}", headers=auth_headers(user), json={"name": "改名"}
    )
    assert response.status_code == 403


def test_admin_can_delete_folder_and_files_fall_back_to_unclassified(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    owner = make_user(db_session, username="owner")
    folder = Folder(name="財務")
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    from tests.test_files import _upload

    upload_response = _upload(client, owner)
    file_id = upload_response.json()["id"]
    client.patch(
        f"/api/files/{file_id}", headers=auth_headers(owner), json={"folder_id": folder.id}
    )

    response = client.delete(f"/api/folders/{folder.id}", headers=auth_headers(admin))
    assert response.status_code == 204
    assert db_session.get(Folder, folder.id) is None

    file_response = client.get("/api/files", headers=auth_headers(owner))
    group = file_response.json()[0]
    assert group["folder"] is None
    assert group["files"][0]["folder_id"] is None
