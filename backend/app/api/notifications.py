from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Notification, User
from app.schemas.notification import NotificationReadAllResponse, NotificationResponse, NotificationUpdate

router = APIRouter()


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notification]:
    skip = max(skip, 0)
    limit = min(max(limit, 1), 200)
    return (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# 宣告在 "/{notification_id}" 之前，免得 FastAPI 先拿 "read-all" 去解析成那條路由的
# int path param。
@router.patch("/read-all", response_model=NotificationReadAllResponse)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationReadAllResponse:
    updated = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return NotificationReadAllResponse(updated=updated)


@router.patch("/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: int,
    payload: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Notification:
    notification = db.get(Notification, notification_id)
    # 別人的通知一律回 404（而非 403），理由與登入錯誤訊息相同：
    # 不要讓回應洩漏哪些 notification ID 屬於其他人。
    if notification is None or notification.recipient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知不存在")

    if payload.is_read is not None:
        notification.is_read = payload.is_read

    db.commit()
    db.refresh(notification)
    return notification
