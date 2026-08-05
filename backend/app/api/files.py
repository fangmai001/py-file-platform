import mimetypes
import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from fastapi import File as UploadFileParam
from fastapi.responses import FileResponse as FileDownloadResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.audit import write_audit_log
from app.core.config import settings
from app.core.database import get_db
from app.core.notifications import notify_file_uploaded
from app.core.upload_limit import get_max_upload_size_mb
from app.models import File, FileVersion, Folder, Notification, User
from app.schemas.file import FileResponse, FileUpdate, FileVersionResponse, FolderGroup
from app.schemas.folder import FolderResponse

router = APIRouter()

_UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1 MiB

# 本平台接受的 office 文件類型對應的 magic byte 簽章，用來擋下改副檔名的攻擊
# （例如把 malware.exe 改名成 report.pdf），而不是單純相信檔名。docx／xlsx 都是 zip
# 容器，因此共用同一組簽章。
_MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    ".pdf": (b"%PDF-",),
    ".doc": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    ".xls": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    ".docx": (b"PK\x03\x04",),
    ".xlsx": (b"PK\x03\x04",),
}


def _content_matches_extension(extension: str, header: bytes) -> bool:
    return any(header.startswith(sig) for sig in _MAGIC_SIGNATURES[extension])


def _assert_can_view(file_row: File, current_user: User | None) -> None:
    if file_row.is_public:
        return
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要登入才能檢視此檔案",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if current_user.id != file_row.owner_id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="沒有權限檢視此檔案")


@router.post("/upload", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
def upload_file(
    background_tasks: BackgroundTasks,
    upload: UploadFile = UploadFileParam(...),
    # None 代表「沒有送出」而非「false」——multipart 表單無法分辨欄位是被省略還是被清空，
    # 所以這裡每個欄位都只在有值時才套用。下方的新檔案分支會退回原本的預設值 public；
    # 若真的要清掉某個欄位，請改用 PATCH /api/files/{id}，它會透過 model_fields_set
    # 區分這兩種情況。
    is_public: bool | None = Form(None),
    folder_id: int | None = Form(None),
    display_name: str | None = Form(None),
    announced_at: date | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> File:
    if not upload.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少檔案名稱")

    if folder_id is not None and db.get(Folder, folder_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="資料夾不存在")

    extension = Path(upload.filename).suffix.lower()
    if extension not in _MAGIC_SIGNATURES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支援的檔案類型：{extension or '(無副檔名)'}",
        )

    max_size_mb = get_max_upload_size_mb(db)
    max_size_bytes = max_size_mb * 1024 * 1024
    dest_dir = Path(settings.upload_dir) / str(current_user.id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    dest_path = dest_dir / stored_name

    size = 0
    header = b""
    try:
        with dest_path.open("wb") as dest:
            while chunk := upload.file.read(_UPLOAD_CHUNK_SIZE):
                size += len(chunk)
                if size > max_size_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"檔案超過大小上限（{max_size_mb} MB）",
                    )
                if len(header) < 8:
                    header += chunk
                dest.write(chunk)

        if not _content_matches_extension(extension, header):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="檔案內容與副檔名不符")
    except HTTPException:
        dest_path.unlink(missing_ok=True)
        raise

    stored_path = f"{current_user.id}/{stored_name}"

    # 同一位擁有者上傳同名檔案時，視為既有檔案的新版本而非另一次獨立上傳，
    # 這樣過去的版本仍可下載，不會被覆蓋掉。
    existing_file = (
        db.query(File)
        .filter(File.owner_id == current_user.id, File.filename == upload.filename)
        .first()
    )
    if existing_file is not None:
        latest_version_no = (
            db.query(func.max(FileVersion.version_no)).filter(FileVersion.file_id == existing_file.id).scalar()
            or 0
        )
        db.add(FileVersion(file_id=existing_file.id, version_no=latest_version_no + 1, stored_path=stored_path))
        existing_file.size = size
        # 新檔案分支會採用的那些表單欄位，這裡同樣要套用。以前靜默丟棄它們，會讓結果取決於
        # 這個檔名先前有沒有被上傳過——而上傳者根本看不到這件事。更糟的是，把一個公開檔案
        # 重新上傳成私密時，它會維持公開，接著又透過下方的 notify_file_uploaded 再廣播給所有人。
        if is_public is not None:
            existing_file.is_public = is_public
        if folder_id is not None:
            existing_file.folder_id = folder_id
        if display_name is not None:
            existing_file.display_name = display_name
        if announced_at is not None:
            existing_file.announced_at = announced_at
        db.commit()
        db.refresh(existing_file)
        notify_file_uploaded(db, background_tasks, existing_file, current_user)
        return existing_file

    file_row = File(
        owner_id=current_user.id,
        filename=upload.filename,
        display_name=display_name,
        folder_id=folder_id,
        announced_at=announced_at,
        size=size,
        is_public=True if is_public is None else is_public,
    )
    db.add(file_row)
    db.flush()

    db.add(FileVersion(file_id=file_row.id, version_no=1, stored_path=stored_path))
    db.commit()
    db.refresh(file_row)
    notify_file_uploaded(db, background_tasks, file_row, current_user)
    return file_row


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> FileDownloadResponse:
    file_row = db.get(File, file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案不存在")

    _assert_can_view(file_row, current_user)

    latest_version = (
        db.query(FileVersion)
        .filter(FileVersion.file_id == file_row.id)
        .order_by(FileVersion.version_no.desc())
        .first()
    )
    if latest_version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案內容不存在")

    disk_path = Path(settings.upload_dir) / latest_version.stored_path
    if not disk_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案內容不存在")

    media_type = mimetypes.guess_type(file_row.filename)[0] or "application/octet-stream"
    return FileDownloadResponse(disk_path, media_type=media_type, filename=file_row.filename)


@router.patch("/{file_id}", response_model=FileResponse)
def update_file(
    file_id: int,
    payload: FileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> File:
    file_row = db.get(File, file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案不存在")

    if current_user.id != file_row.owner_id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="沒有權限編輯此檔案")

    fields_set = payload.model_fields_set

    if payload.is_public is not None:
        file_row.is_public = payload.is_public

    if "folder_id" in fields_set:
        if payload.folder_id is not None and db.get(Folder, payload.folder_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="資料夾不存在")
        file_row.folder_id = payload.folder_id

    if "display_name" in fields_set:
        file_row.display_name = payload.display_name

    if "announced_at" in fields_set:
        file_row.announced_at = payload.announced_at

    db.commit()
    db.refresh(file_row)
    return file_row


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    file_row = db.get(File, file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案不存在")

    is_owner = current_user.id == file_row.owner_id
    if not is_owner and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="沒有權限刪除此檔案")

    versions = db.query(FileVersion).filter(FileVersion.file_id == file_id).all()
    for version in versions:
        (Path(settings.upload_dir) / version.stored_path).unlink(missing_ok=True)
        db.delete(version)
    for notification in db.query(Notification).filter(Notification.file_id == file_id).all():
        db.delete(notification)
    # 先把子資料列的刪除 flush 出去，再刪檔案本身——file_versions.file_id 與
    # notifications.file_id 都有指向 files.id 的 FK，而 model 之間沒有明確的 ORM
    # relationship()，SQLAlchemy 的 unit-of-work 無法自行推導出「先子後父」的刪除順序
    # （Postgres 因此會拒絕；測試用的 SQLite 則根本不強制 FK）。
    db.flush()

    # 只有管理員才刪得掉別人的檔案，而這正是稽核紀錄存在的目的——高權限操作（見 #7）；
    # 擁有者刪自己的檔案屬於日常行為，不需要留下紀錄。
    if not is_owner:
        write_audit_log(
            db,
            actor_id=current_user.id,
            action="file.delete",
            target=file_row.filename,
            detail=f"owner_id={file_row.owner_id}",
        )

    db.delete(file_row)
    db.commit()


@router.get("/{file_id}/versions", response_model=list[FileVersionResponse])
def list_file_versions(
    file_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> list[FileVersion]:
    file_row = db.get(File, file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案不存在")

    _assert_can_view(file_row, current_user)

    return (
        db.query(FileVersion)
        .filter(FileVersion.file_id == file_id)
        .order_by(FileVersion.version_no.desc())
        .all()
    )


@router.get("/{file_id}/versions/{version_no}/download")
def download_file_version(
    file_id: int,
    version_no: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> FileDownloadResponse:
    file_row = db.get(File, file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案不存在")

    _assert_can_view(file_row, current_user)

    version = (
        db.query(FileVersion)
        .filter(FileVersion.file_id == file_id, FileVersion.version_no == version_no)
        .first()
    )
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="版本不存在")

    disk_path = Path(settings.upload_dir) / version.stored_path
    if not disk_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="檔案內容不存在")

    media_type = mimetypes.guess_type(file_row.filename)[0] or "application/octet-stream"
    return FileDownloadResponse(disk_path, media_type=media_type, filename=file_row.filename)


@router.get("", response_model=list[FolderGroup])
def list_files(
    search: str | None = None,
    folder_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[FolderGroup]:
    query = db.query(File)
    if current_user is None:
        query = query.filter(File.is_public.is_(True))
    elif current_user.role != "admin":
        query = query.filter(or_(File.is_public.is_(True), File.owner_id == current_user.id))
    # 管理員：不加任何過濾條件，不論擁有者與可見性都看得到每一個檔案

    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(or_(File.filename.ilike(keyword), File.display_name.ilike(keyword)))

    if folder_id is not None:
        query = query.filter(File.folder_id == folder_id)

    folders_by_id = {f.id: f for f in db.query(Folder).all()}

    files = (
        query.outerjoin(Folder, File.folder_id == Folder.id)
        .order_by(Folder.name.asc().nulls_first(), File.filename.asc())
        .all()
    )

    groups: dict[int | None, list[File]] = {}
    for f in files:
        groups.setdefault(f.folder_id, []).append(f)

    return [
        FolderGroup(
            folder=FolderResponse.model_validate(folders_by_id[folder_id]) if folder_id is not None else None,
            files=items,
        )
        for folder_id, items in groups.items()
    ]
