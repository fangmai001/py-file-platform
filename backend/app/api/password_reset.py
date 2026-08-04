import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.config import settings
from app.core.database import get_db
from app.core.mailer import send_email
from app.core.security import hash_password
from app.core.smtp_config import get_smtp_settings, to_smtp_config
from app.models import PasswordResetToken, User
from app.schemas.password_reset import PasswordResetConfirm, PasswordResetMessage, PasswordResetRequest

router = APIRouter()

# 不論帳號／email 是否存在都回同一則籠統訊息，避免洩漏有哪些帳號或信箱存在
# （與 app/api/auth.py 登入端點的防列舉做法一致）。
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

    # 自助重設只適用於有登記 email 的本機帳號；LDAP 帳號在這裡根本不存密碼（見 #21），
    # 沒有 email 的帳號則沒有寄送地址——這兩種情況都會靜默地落到下方同一則
    # 籠統回應。
    if user is not None and user.is_active and user.email:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_token_expire_minutes)
        db.add(PasswordResetToken(user_id=user.id, token_hash=_hash_token(raw_token), expires_at=expires_at))
        smtp_config = to_smtp_config(get_smtp_settings(db))
        db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password?token={raw_token}"
        background_tasks.add_task(
            send_email,
            smtp_config,
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

    # 刻意與管理員重設他人密碼的情況區分開來（那種在 app/api/admin.py 記為 "user.update"
    # 並附帶 "password reset" 說明）——這裡的 actor_id 就是使用者本人。
    write_audit_log(db, actor_id=user.id, action="user.self_password_reset", target=user.username)

    db.commit()
    return PasswordResetMessage(message="密碼已重設，請使用新密碼登入")
