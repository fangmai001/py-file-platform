from app.models import AuditLog, Folder, LinkCard
from tests.conftest import auth_headers, make_user


def test_guest_only_sees_public_link_cards(client, db_session):
    db_session.add_all(
        [
            LinkCard(title="社團官網", url="https://example.com", is_public=True),
            LinkCard(title="內部表單", url="https://example.com/internal", is_public=False),
        ]
    )
    db_session.commit()

    response = client.get("/api/link-cards")
    assert response.status_code == 200
    titles = {card["title"] for card in response.json()}
    assert titles == {"社團官網"}


def test_admin_sees_all_link_cards(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    db_session.add_all(
        [
            LinkCard(title="社團官網", url="https://example.com", is_public=True),
            LinkCard(title="內部表單", url="https://example.com/internal", is_public=False),
        ]
    )
    db_session.commit()

    response = client.get("/api/link-cards", headers=auth_headers(admin))
    assert response.status_code == 200
    titles = {card["title"] for card in response.json()}
    assert titles == {"社團官網", "內部表單"}


def test_non_admin_cannot_create_link_card(client, db_session):
    user = make_user(db_session)

    response = client.post(
        "/api/link-cards",
        headers=auth_headers(user),
        json={"title": "社團官網", "url": "https://example.com"},
    )
    assert response.status_code == 403


def test_admin_can_create_link_card_and_audit_log_is_written(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/link-cards",
        headers=auth_headers(admin),
        json={"title": "社團官網", "description": "官方網站", "url": "https://example.com"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "社團官網"
    assert body["description"] == "官方網站"
    assert body["url"] == "https://example.com/"
    assert body["is_public"] is True

    logs = db_session.query(AuditLog).filter(AuditLog.action == "link_card.create").all()
    assert len(logs) == 1
    assert logs[0].actor_id == admin.id
    assert logs[0].target == "社團官網"


def test_create_link_card_rejects_unknown_folder(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/link-cards",
        headers=auth_headers(admin),
        json={"title": "社團官網", "url": "https://example.com", "folder_id": 999},
    )
    assert response.status_code == 400


def test_create_link_card_rejects_invalid_url(client, db_session):
    admin = make_user(db_session, username="root", role="admin")

    response = client.post(
        "/api/link-cards",
        headers=auth_headers(admin),
        json={"title": "社團官網", "url": "not-a-url"},
    )
    assert response.status_code == 422


def test_admin_can_update_link_card(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    link_card = LinkCard(title="社團官網", url="https://example.com")
    db_session.add(link_card)
    db_session.commit()
    db_session.refresh(link_card)

    response = client.patch(
        f"/api/link-cards/{link_card.id}",
        headers=auth_headers(admin),
        json={"title": "官方網站", "is_public": False},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "官方網站"
    assert body["is_public"] is False

    logs = db_session.query(AuditLog).filter(AuditLog.action == "link_card.update").all()
    assert len(logs) == 1


def test_non_admin_cannot_update_link_card(client, db_session):
    user = make_user(db_session)
    link_card = LinkCard(title="社團官網", url="https://example.com")
    db_session.add(link_card)
    db_session.commit()
    db_session.refresh(link_card)

    response = client.patch(
        f"/api/link-cards/{link_card.id}",
        headers=auth_headers(user),
        json={"title": "改名"},
    )
    assert response.status_code == 403


def test_admin_can_delete_link_card(client, db_session):
    admin = make_user(db_session, username="root", role="admin")
    link_card = LinkCard(title="社團官網", url="https://example.com")
    db_session.add(link_card)
    db_session.commit()
    db_session.refresh(link_card)

    response = client.delete(f"/api/link-cards/{link_card.id}", headers=auth_headers(admin))
    assert response.status_code == 204
    assert db_session.get(LinkCard, link_card.id) is None

    logs = db_session.query(AuditLog).filter(AuditLog.action == "link_card.delete").all()
    assert len(logs) == 1


def test_link_cards_can_be_filtered_by_folder(client, db_session):
    folder = Folder(name="財務")
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    db_session.add_all(
        [
            LinkCard(title="有分類", url="https://example.com/a", folder_id=folder.id),
            LinkCard(title="無分類", url="https://example.com/b"),
        ]
    )
    db_session.commit()

    response = client.get("/api/link-cards", params={"folder_id": folder.id})
    assert response.status_code == 200
    titles = {card["title"] for card in response.json()}
    assert titles == {"有分類"}
