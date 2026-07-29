from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional, require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.models import Highlight, User
from app.schemas.highlight import HighlightCreate, HighlightResponse, HighlightUpdate

router = APIRouter()


@router.get("", response_model=list[HighlightResponse])
def list_highlights(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[Highlight]:
    query = db.query(Highlight)
    if current_user is None or current_user.role != "admin":
        query = query.filter(Highlight.is_public.is_(True))

    return query.order_by(Highlight.sort_order.asc(), Highlight.id.asc()).all()


@router.post("", response_model=HighlightResponse, status_code=status.HTTP_201_CREATED)
def create_highlight(
    payload: HighlightCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Highlight:
    highlight = Highlight(
        icon=payload.icon,
        title=payload.title,
        description=payload.description,
        sort_order=payload.sort_order,
        is_public=payload.is_public,
    )
    db.add(highlight)
    db.flush()

    write_audit_log(db, actor_id=admin.id, action="highlight.create", target=highlight.title)
    db.commit()
    db.refresh(highlight)
    return highlight


@router.patch("/{highlight_id}", response_model=HighlightResponse)
def update_highlight(
    highlight_id: int,
    payload: HighlightUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Highlight:
    highlight = db.get(Highlight, highlight_id)
    if highlight is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="特色項目不存在")

    fields_set = payload.model_fields_set
    changes: list[str] = []

    if "icon" in fields_set and payload.icon is not None and payload.icon != highlight.icon:
        changes.append(f"icon: {highlight.icon} -> {payload.icon}")
        highlight.icon = payload.icon

    if "title" in fields_set and payload.title is not None and payload.title != highlight.title:
        changes.append(f"title: {highlight.title} -> {payload.title}")
        highlight.title = payload.title

    if "description" in fields_set and payload.description != highlight.description:
        changes.append("description updated")
        highlight.description = payload.description

    if "sort_order" in fields_set and payload.sort_order is not None and payload.sort_order != highlight.sort_order:
        changes.append(f"sort_order: {highlight.sort_order} -> {payload.sort_order}")
        highlight.sort_order = payload.sort_order

    if "is_public" in fields_set and payload.is_public is not None and payload.is_public != highlight.is_public:
        changes.append(f"is_public -> {payload.is_public}")
        highlight.is_public = payload.is_public

    if changes:
        write_audit_log(
            db, actor_id=admin.id, action="highlight.update", target=highlight.title, detail="; ".join(changes)
        )

    db.commit()
    db.refresh(highlight)
    return highlight


@router.delete("/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_highlight(
    highlight_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    highlight = db.get(Highlight, highlight_id)
    if highlight is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="特色項目不存在")

    write_audit_log(db, actor_id=admin.id, action="highlight.delete", target=highlight.title)
    db.delete(highlight)
    db.commit()
