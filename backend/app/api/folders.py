from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional, require_admin
from app.core.audit import write_audit_log
from app.core.database import get_db
from app.models import File, Folder, User
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate

router = APIRouter()


@router.get("", response_model=list[FolderResponse])
def list_folders(
    _current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> list[Folder]:
    # 掛上 get_current_user_optional 是為了讓四個「GET 公開、寫入僅限管理員」的列表端點
    # 形狀一致（link_cards.py、highlights.py、files.py 都是這個依賴），但這裡刻意**不**依身分
    # 過濾：Folder 沒有 is_public 欄位，資料夾名稱一律視為公開資訊，訪客要能看到分組才有辦法
    # 瀏覽公開檔案牆。這是刻意的例外，不是漏掉的過濾——若哪天資料夾名稱本身也算敏感，
    # 該做的是替 Folder 加上 is_public 並與另外兩個 router 對齊，而不是在這裡偷偷加條件。
    return db.query(Folder).order_by(Folder.name.asc()).all()


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Folder:
    if db.query(Folder).filter(Folder.name == payload.name).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="資料夾名稱已存在")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="資料夾不存在")

    fields_set = payload.model_fields_set
    changes: list[str] = []

    if "name" in fields_set and payload.name is not None and payload.name != folder.name:
        if db.query(Folder).filter(Folder.name == payload.name, Folder.id != folder_id).first() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="資料夾名稱已存在")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="資料夾不存在")

    # 原本歸在這個資料夾底下的檔案會退回「未分類」，而不是擋下刪除或被連帶刪掉——
    # 資料夾只是顯示用的 metadata，並不是檔案的擁有者。
    db.query(File).filter(File.folder_id == folder_id).update({File.folder_id: None})
    write_audit_log(db, actor_id=admin.id, action="folder.delete", target=folder.name)
    db.delete(folder)
    db.commit()
