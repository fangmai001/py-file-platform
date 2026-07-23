from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.audit import write_audit_log
from app.core.config import settings
from app.core.database import get_db
from app.core.ldap import authenticate_ldap
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import PasswordChangeRequest, PasswordChangeResponse, ProfileUpdateRequest, UserResponse

router = APIRouter()

_LOGIN_ERROR = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()

    if user is not None and user.auth_source == "local":
        # Same error for "no such user" and "wrong password" so the response can't be
        # used to enumerate accounts.
        if not user.is_active or not verify_password(payload.password, user.password_hash):
            raise _LOGIN_ERROR
    else:
        # No local account yet, or the account is LDAP-sourced: fall back to an LDAP
        # bind. A local account that's inactive but exists never reaches this branch
        # (auth_source == "local" above), so it can't be revived via LDAP.
        if user is not None and not user.is_active:
            raise _LOGIN_ERROR
        if not settings.ldap_enabled or not authenticate_ldap(payload.username, payload.password):
            raise _LOGIN_ERROR

        if user is None:
            # First successful LDAP login: provision a local User row so existing
            # File.owner_id / admin-management logic can key off the same User.id from
            # here on, without storing the password itself.
            user = User(username=payload.username, password_hash=None, auth_source="ldap")
            db.add(user)
            db.commit()
            db.refresh(user)

    access_token = create_access_token(subject=user.username)
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if payload.full_name is not None and payload.full_name != current_user.full_name:
        current_user.full_name = payload.full_name or None
        write_audit_log(db, actor_id=current_user.id, action="user.self_update", target=current_user.username)
        db.commit()
        db.refresh(current_user)

    return current_user


@router.post("/me/password", response_model=PasswordChangeResponse)
def change_current_user_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PasswordChangeResponse:
    if current_user.auth_source == "ldap":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="LDAP 帳號的密碼由 LDAP 伺服器管理，無法在此變更"
        )
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="目前密碼錯誤")

    current_user.password_hash = hash_password(payload.new_password)
    # Distinguished from the token-based "forgot password" flow
    # (app/api/password_reset.py's "user.self_password_reset") since this one requires
    # knowing the current password rather than an emailed token.
    write_audit_log(db, actor_id=current_user.id, action="user.self_password_change", target=current_user.username)
    db.commit()

    return PasswordChangeResponse(message="密碼已更新")
