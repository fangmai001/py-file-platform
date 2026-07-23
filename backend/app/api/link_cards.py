from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional, require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.models import Folder, LinkCard, User
from app.schemas.link_card import LinkCardCreate, LinkCardResponse, LinkCardUpdate

router = APIRouter()


@router.get("", response_model=list[LinkCardResponse])
def list_link_cards(
    folder_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[LinkCard]:
    query = db.query(LinkCard)
    if current_user is None or current_user.role != "admin":
        query = query.filter(LinkCard.is_public.is_(True))

    if folder_id is not None:
        query = query.filter(LinkCard.folder_id == folder_id)

    return query.order_by(LinkCard.title.asc()).all()


@router.post("", response_model=LinkCardResponse, status_code=status.HTTP_201_CREATED)
def create_link_card(
    payload: LinkCardCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LinkCard:
    if payload.folder_id is not None and db.get(Folder, payload.folder_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="卡片不存在")

    link_card = LinkCard(
        title=payload.title,
        description=payload.description,
        url=str(payload.url),
        folder_id=payload.folder_id,
        is_public=payload.is_public,
    )
    db.add(link_card)
    db.flush()

    write_audit_log(db, actor_id=admin.id, action="link_card.create", target=link_card.title)
    db.commit()
    db.refresh(link_card)
    return link_card


@router.patch("/{link_card_id}", response_model=LinkCardResponse)
def update_link_card(
    link_card_id: int,
    payload: LinkCardUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LinkCard:
    link_card = db.get(LinkCard, link_card_id)
    if link_card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="連結卡片不存在")

    fields_set = payload.model_fields_set
    changes: list[str] = []

    if "title" in fields_set and payload.title is not None and payload.title != link_card.title:
        changes.append(f"title: {link_card.title} -> {payload.title}")
        link_card.title = payload.title

    if "description" in fields_set and payload.description != link_card.description:
        changes.append("description updated")
        link_card.description = payload.description

    if "url" in fields_set and payload.url is not None and str(payload.url) != link_card.url:
        changes.append("url updated")
        link_card.url = str(payload.url)

    if "folder_id" in fields_set and payload.folder_id != link_card.folder_id:
        if payload.folder_id is not None and db.get(Folder, payload.folder_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="卡片不存在")
        changes.append("folder_id updated")
        link_card.folder_id = payload.folder_id

    if "is_public" in fields_set and payload.is_public is not None and payload.is_public != link_card.is_public:
        changes.append(f"is_public -> {payload.is_public}")
        link_card.is_public = payload.is_public

    if changes:
        write_audit_log(
            db, actor_id=admin.id, action="link_card.update", target=link_card.title, detail="; ".join(changes)
        )

    db.commit()
    db.refresh(link_card)
    return link_card


@router.delete("/{link_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link_card(
    link_card_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    link_card = db.get(LinkCard, link_card_id)
    if link_card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="連結卡片不存在")

    write_audit_log(db, actor_id=admin.id, action="link_card.delete", target=link_card.title)
    db.delete(link_card)
    db.commit()
