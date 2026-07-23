import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.config import settings
from app.core.database import get_db
from app.core.email import send_email
from app.core.security import hash_password
from app.models import PasswordResetToken, User
from app.schemas.password_reset import PasswordResetConfirm, PasswordResetMessage, PasswordResetRequest

router = APIRouter()

# Same generic message regardless of whether the account/email was found, to avoid
# leaking which accounts or emails exist (matches the anti-enumeration pattern in
# app/api/auth.py's login endpoint).
_GENERIC_MESSAGE = "若帳號存在，重設密碼信件已寄出，請至信箱查收。"


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


@router.post("/request", response_model=PasswordResetMessage)
def request_password_reset(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> PasswordResetMessage:
    identifier = payload.username_or_email.strip()
    user = None
    if identifier:
        user = db.query(User).filter(or_(User.username == identifier, User.email == identifier)).first()

    # Self-service reset only applies to local accounts with an email on file; LDAP
    # accounts don't store a password here at all (see #21), and accounts without an
    # email have no delivery address - both cases fall through silently to the same
    # generic response below.
    if user is not None and user.is_active and user.email:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_token_expire_minutes)
        db.add(PasswordResetToken(user_id=user.id, token_hash=_hash_token(raw_token), expires_at=expires_at))
        db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password?token={raw_token}"
        background_tasks.add_task(
            send_email,
            user.email,
            "重設密碼",
            "您好，\n\n"
            f"請於 {settings.password_reset_token_expire_minutes} 分鐘內點擊以下連結重設密碼：\n{reset_link}\n\n"
            "若您沒有申請重設密碼，請忽略此信件。",
        )

    return PasswordResetMessage(message=_GENERIC_MESSAGE)


@router.post("/confirm", response_model=PasswordResetMessage)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)) -> PasswordResetMessage:
    token_hash = _hash_token(payload.token)
    reset_token = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()

    now = datetime.now(timezone.utc)
    expires_at = reset_token.expires_at if reset_token is not None else None
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if reset_token is None or reset_token.used_at is not None or expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="重設連結無效或已過期")

    user = db.get(User, reset_token.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="重設連結無效或已過期")

    user.password_hash = hash_password(payload.new_password)
    reset_token.used_at = now

    # Explicitly distinguished from an admin resetting someone else's password
    # (logged as "user.update" with a "password reset" detail in app/api/admin.py) -
    # here actor_id is the user themself.
    write_audit_log(db, actor_id=user.id, action="user.self_password_reset", target=user.username)

    db.commit()
    return PasswordResetMessage(message="密碼已重設，請使用新密碼登入")
