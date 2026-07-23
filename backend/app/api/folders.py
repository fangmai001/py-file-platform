from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.models import File, Folder, User
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate

router = APIRouter()


@router.get("", response_model=list[FolderResponse])
def list_folders(db: Session = Depends(get_db)) -> list[Folder]:
    return db.query(Folder).order_by(Folder.name.asc()).all()


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Folder:
    if db.query(Folder).filter(Folder.name == payload.name).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="卡片名稱已存在")

    folder = Folder(name=payload.name, description=payload.description)
    db.add(folder)
    db.flush()

    write_audit_log(db, actor_id=admin.id, action="folder.create", target=folder.name)
    db.commit()
    db.refresh(folder)
    return folder


@router.patch("/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    payload: FolderUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Folder:
    folder = db.get(Folder, folder_id)
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="卡片不存在")

    fields_set = payload.model_fields_set
    changes: list[str] = []

    if "name" in fields_set and payload.name is not None and payload.name != folder.name:
        if db.query(Folder).filter(Folder.name == payload.name, Folder.id != folder_id).first() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="卡片名稱已存在")
        changes.append(f"name: {folder.name} -> {payload.name}")
        folder.name = payload.name

    if "description" in fields_set and payload.description != folder.description:
        changes.append("description updated")
        folder.description = payload.description

    if changes:
        write_audit_log(db, actor_id=admin.id, action="folder.update", target=folder.name, detail="; ".join(changes))

    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    folder = db.get(Folder, folder_id)
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="卡片不存在")

    # Files that belonged to this card fall back to "未分類" rather than being blocked or
    # cascade-deleted - the card is just display metadata, not the files' owner.
    db.query(File).filter(File.folder_id == folder_id).update({File.folder_id: None})
    write_audit_log(db, actor_id=admin.id, action="folder.delete", target=folder.name)
    db.delete(folder)
    db.commit()
