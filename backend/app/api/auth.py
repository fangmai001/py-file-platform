from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.core.ldap import authenticate_ldap
from app.core.ldap_config import get_ldap_settings
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
        # 「查無此使用者」與「密碼錯誤」回傳同一種錯誤，這樣就無法靠回應內容
        # 逐一列舉出有哪些帳號存在。
        if not user.is_active or not verify_password(payload.password, user.password_hash):
            raise _LOGIN_ERROR
    else:
        # 還沒有本機帳號，或帳號來源是 LDAP：退回去做一次 LDAP bind。已存在但被停用的
        # 本機帳號永遠不會走到這個分支（上面的 auth_source == "local" 已攔下），
        # 因此無法透過 LDAP 把它復活。
        if user is not None and not user.is_active:
            raise _LOGIN_ERROR
        ldap_config = get_ldap_settings(db)
        if not ldap_config.enabled or not authenticate_ldap(payload.username, payload.password, ldap_config):
            raise _LOGIN_ERROR

        if user is None:
            # 第一次 LDAP 登入成功：建立一列本機 User，讓既有的 File.owner_id 與
            # 管理員相關邏輯從此都能沿用同一個 User.id，而且完全不需要存下密碼本身。
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
    changed = False
    if payload.full_name is not None and payload.full_name != current_user.full_name:
        current_user.full_name = payload.full_name or None
        changed = True
    if payload.email is not None and payload.email != current_user.email:
        if db.query(User).filter(User.email == payload.email, User.id != current_user.id).first() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email 已被使用")
        current_user.email = payload.email or None
        changed = True
    if payload.notify_by_email is not None and payload.notify_by_email != current_user.notify_by_email:
        current_user.notify_by_email = payload.notify_by_email
        changed = True

    if changed:
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
    # 刻意與走 token 的「忘記密碼」流程（app/api/password_reset.py 的
    # "user.self_password_reset"）區分開來，因為這條路徑要求的是知道目前密碼，
    # 而不是一封信裡的 token。
    write_audit_log(db, actor_id=current_user.id, action="user.self_password_change", target=current_user.username)
    db.commit()

    return PasswordChangeResponse(message="密碼已更新")
