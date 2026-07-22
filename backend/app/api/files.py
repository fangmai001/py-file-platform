import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi import File as UploadFileParam
from fastapi.responses import FileResponse as FileDownloadResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.config import settings
from app.core.database import get_db
from app.models import File, FileVersion, User
from app.schemas.file import FileResponse, FileUpdate, FolderGroup

router = APIRouter()

_UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1 MiB

# Magic-byte signatures for the office document types this platform accepts, so a
# renamed-extension attack (e.g. malware.exe -> report.pdf) gets caught, not just trusted
# by filename. docx/xlsx are zip containers so they share the same signature.
_MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    ".pdf": (b"%PDF-",),
    ".doc": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    ".xls": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    ".docx": (b"PK\x03\x04",),
    ".xlsx": (b"PK\x03\x04",),
}


def _content_matches_extension(extension: str, header: bytes) -> bool:
    return any(header.startswith(sig) for sig in _MAGIC_SIGNATURES[extension])


@router.post("/upload", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
def upload_file(
    upload: UploadFile = UploadFileParam(...),
    is_public: bool = Form(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> File:
    if not upload.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少檔案名稱")

    extension = Path(upload.filename).suffix.lower()
    if extension not in _MAGIC_SIGNATURES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支援的檔案類型：{extension or '(無副檔名)'}",
        )

    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
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
                        detail=f"檔案超過大小上限（{settings.max_upload_size_mb} MB）",
                    )
                if len(header) < 8:
                    header += chunk
                dest.write(chunk)

        if not _content_matches_extension(extension, header):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="檔案內容與副檔名不符")
    except HTTPException:
        dest_path.unlink(missing_ok=True)
        raise

    file_row = File(owner_id=current_user.id, filename=upload.filename, size=size, is_public=is_public)
    db.add(file_row)
    db.flush()

    stored_path = f"{current_user.id}/{stored_name}"
    db.add(FileVersion(file_id=file_row.id, version_no=1, stored_path=stored_path))
    db.commit()
    db.refresh(file_row)
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

    if not file_row.is_public:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="需要登入才能下載此檔案",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if current_user.id != file_row.owner_id and current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="沒有權限下載此檔案")

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

    if payload.is_public is not None:
        file_row.is_public = payload.is_public

    db.commit()
    db.refresh(file_row)
    return file_row


@router.get("", response_model=list[FolderGroup])
def list_files(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[FolderGroup]:
    query = db.query(File)
    if current_user is None:
        query = query.filter(File.is_public.is_(True))
    else:
        query = query.filter(or_(File.is_public.is_(True), File.owner_id == current_user.id))

    files = query.order_by(File.folder.asc().nulls_first(), File.filename.asc()).all()

    groups: dict[str | None, list[File]] = {}
    for f in files:
        groups.setdefault(f.folder, []).append(f)

    return [FolderGroup(folder=folder, files=items) for folder, items in groups.items()]
