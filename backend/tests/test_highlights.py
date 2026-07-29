from app.models import AuditLog, Highlight
from tests.conftest import auth_headers, make_user


def test_guest_only_sees_public_highlights(client, db_session):
    db_session.add_all(
        [
            Highlight(icon="shield-check", title="公開／私密控管", is_public=True),
            Highlight(icon="history", title="草稿項目", is_public=False),
        ]
    )
    db_session.commit()

    response = client.get("/api/highlights")
    assert response.status_code == 200
    titles = {item["title"] for item in response.json()}
    assert titles == {"公開／私密控管"}


def test_admin_sees_all_highlights(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    db_session.add_all(
        [
            Highlight(icon="shield-check", title="公開／私密控管", is_public=True),
            Highlight(icon="history", title="草稿項目", is_public=False),
        ]
    )
    db_session.commit()

    response = client.get("/api/highlights", headers=auth_headers(admin))
    assert response.status_code == 200
    titles = {item["title"] for item in response.json()}
    assert titles == {"公開／私密控管", "草稿項目"}


def test_highlights_are_ordered_by_sort_order_then_id(client, db_session):
    first = Highlight(icon="history", title="第二順位", sort_order=20)
    second = Highlight(icon="star", title="同分先建立", sort_order=10)
    third = Highlight(icon="bell", title="同分後建立", sort_order=10)
    db_session.add_all([first, second, third])
    db_session.commit()

    response = client.get("/api/highlights")
    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["同分先建立", "同分後建立", "第二順位"]


def test_non_admin_cannot_create_highlight(client, db_session):
    user = make_user(db_session)

    response = client.post(
        "/api/highlights",
        headers=auth_headers(user),
        json={"icon": "shield-check", "title": "新特色"},
    )
    assert response.status_code == 403


def test_admin_can_create_highlight_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/highlights",
        headers=auth_headers(admin),
        json={"icon": "shield-check", "title": "新特色", "description": "說明文字", "sort_order": 50},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["icon"] == "shield-check"
    assert body["title"] == "新特色"
    assert body["description"] == "說明文字"
    assert body["sort_order"] == 50
    assert body["is_public"] is True

    logs = db_session.query(AuditLog).filter(AuditLog.action == "highlight.create").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id
    assert logs[0].target == "新特色"


def test_create_highlight_defaults_to_the_fallback_icon(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post("/api/highlights", headers=auth_headers(admin), json={"title": "沒指定圖示"})
    assert response.status_code == 201
    assert response.json()["icon"] == "sparkles"


def test_create_highlight_rejects_unknown_icon(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/highlights",
        headers=auth_headers(admin),
        json={"icon": "not-a-real-icon", "title": "新特色"},
    )
    assert response.status_code == 422


def test_admin_can_update_highlight(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    highlight = Highlight(icon="shield-check", title="舊標題", sort_order=10)
    db_session.add(highlight)
    db_session.commit()
    db_session.refresh(highlight)

    response = client.patch(
        f"/api/highlights/{highlight.id}",
        headers=auth_headers(admin),
        json={"icon": "lock", "title": "新標題", "sort_order": 5, "is_public": False},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["icon"] == "lock"
    assert body["title"] == "新標題"
    assert body["sort_order"] == 5
    assert body["is_public"] is False

    logs = db_session.query(AuditLog).filter(AuditLog.action == "highlight.update").all()
    assert len(logs) == 1
    assert logs[0].target == "新標題"


def test_update_only_writes_audit_log_when_something_changes(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    highlight = Highlight(icon="shield-check", title="標題", sort_order=10)
    db_session.add(highlight)
    db_session.commit()
    db_session.refresh(highlight)

    response = client.patch(f"/api/highlights/{highlight.id}", headers=auth_headers(admin), json={})
    assert response.status_code == 200
    assert db_session.query(AuditLog).count() == 0


def test_non_admin_cannot_update_highlight(client, db_session):
    user = make_user(db_session)
    highlight = Highlight(icon="shield-check", title="標題")
    db_session.add(highlight)
    db_session.commit()
    db_session.refresh(highlight)

    response = client.patch(
        f"/api/highlights/{highlight.id}",
        headers=auth_headers(user),
        json={"title": "被改掉"},
    )
    assert response.status_code == 403


def test_update_unknown_highlight_returns_404(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.patch("/api/highlights/999", headers=auth_headers(admin), json={"title": "不存在"})
    assert response.status_code == 404


def test_admin_can_delete_highlight(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    highlight = Highlight(icon="shield-check", title="要刪掉的特色")
    db_session.add(highlight)
    db_session.commit()
    db_session.refresh(highlight)
    highlight_id = highlight.id

    response = client.delete(f"/api/highlights/{highlight_id}", headers=auth_headers(admin))
    assert response.status_code == 204
    assert db_session.get(Highlight, highlight_id) is None

    logs = db_session.query(AuditLog).filter(AuditLog.action == "highlight.delete").all()
    assert len(logs) == 1
    assert logs[0].target == "要刪掉的特色"


def test_non_admin_cannot_delete_highlight(client, db_session):
    user = make_user(db_session)
    highlight = Highlight(icon="shield-check", title="標題")
    db_session.add(highlight)
    db_session.commit()
    db_session.refresh(highlight)

    response = client.delete(f"/api/highlights/{highlight.id}", headers=auth_headers(user))
    assert response.status_code == 403


def test_delete_unknown_highlight_returns_404(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.delete("/api/highlights/999", headers=auth_headers(admin))
    assert response.status_code == 404
