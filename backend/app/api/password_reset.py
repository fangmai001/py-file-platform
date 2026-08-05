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

    # 自助重設只適用於有登記 email 的本機帳號。auth_source 這一項不能省：LDAP 帳號的密碼由
    # LDAP 伺服器管理，本地的 password_hash 從頭到尾不會被 login 讀取（見 app/api/auth.py），
    # 所以替它寄出重設信，只會讓使用者一路「重設成功」卻永遠登不進去。管理員替 LDAP 帳號設定
    # email 是允許的（上傳通知需要），因此「有 email」並不足以判斷這是本機帳號。
    # 以上每一種情況都會靜默地落到下方同一則籠統回應，不讓呼叫端據此列舉帳號。
    if user is not None and user.is_active and user.email and user.auth_source == "local":
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

    # request 端已經擋過同樣的條件，這裡再擋一次是刻意的防禦深度：token 有效期內
    #（預設 30 分鐘）帳號有可能才剛被改成 LDAP 或被停用，那張已經寄出去的連結不該還能用。
    if user.auth_source == "ldap":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="LDAP 帳號的密碼由 LDAP 伺服器管理，無法在此變更"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="此帳號已停用")

    user.password_hash = hash_password(payload.new_password)
    reset_token.used_at = now

    # 刻意與管理員重設他人密碼的情況區分開來（那種在 app/api/admin.py 記為
    # "user.password_reset"）——這裡的 actor_id 就是使用者本人。
    write_audit_log(db, actor_id=user.id, action="user.self_password_reset", target=user.username)

    db.commit()
    return PasswordResetMessage(message="密碼已重設，請使用新密碼登入")
