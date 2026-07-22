from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.core.security import hash_password
from app.models import File, User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[User]:
    return db.query(User).order_by(User.id).all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    if db.query(User).filter(User.username == payload.username).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="帳號已存在")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()

    write_audit_log(db, actor_id=admin.id, action="user.create", target=user.username, detail=f"role={user.role}")
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="使用者不存在")

    changes: list[str] = []
    if payload.role is not None and payload.role != user.role:
        changes.append(f"role: {user.role} -> {payload.role}")
        user.role = payload.role
    if payload.is_active is not None and payload.is_active != user.is_active:
        changes.append(f"is_active: {user.is_active} -> {payload.is_active}")
        user.is_active = payload.is_active
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
        changes.append("password reset")

    if changes:
        write_audit_log(db, actor_id=admin.id, action="user.update", target=user.username, detail="; ".join(changes))

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="使用者不存在")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="無法刪除自己的帳號")
    if db.query(File).filter(File.owner_id == user.id).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="使用者仍有上傳的檔案，請先刪除或移轉後再刪除帳號")

    write_audit_log(db, actor_id=admin.id, action="user.delete", target=user.username)
    db.delete(user)
    db.commit()
