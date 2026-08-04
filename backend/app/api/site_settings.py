import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi import File as UploadFileParam
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.audit import write_audit_log
from app.core.config import settings
from app.core.database import get_db
from app.models import SiteSetting, User
from app.schemas.site_setting import SiteSettingResponse, SiteSettingUpdate

router = APIRouter()

_SETTINGS_ROW_ID = 1

# 品牌圖片放在專屬目錄而不是與使用者上傳的檔案混在一起，因為它們和上傳的文件不同，
# 是公開提供的（favicon 必須在登入前就能載入）。
_BRANDING_DIR_NAME = "branding"

_FAVICON_MAX_BYTES = 512 * 1024
_HERO_IMAGE_MAX_BYTES = 2 * 1024 * 1024

_IMAGE_MEDIA_TYPES: dict[str, str] = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
}

# 與 app/api/files.py 相同的改副檔名防禦，只是換成這裡接受的圖片格式簽章。
# SVG 是純文字、沒有 magic bytes，因此另外有自己的檢查。
_IMAGE_MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".gif": (b"GIF87a", b"GIF89a"),
    ".ico": (b"\x00\x00\x01\x00",),
}

# 檔名一律由伺服器端以 uuid4().hex 加副檔名產生；在碰檔案系統之前先驗證是否符合這個形狀，
# 就能把 "../" 之類的東西擋在 asset 路由之外。
_ASSET_FILENAME_RE = re.compile(r"^[0-9a-f]{32}\.[a-z0-9]{2,4}$")


def _branding_dir() -> Path:
    return Path(settings.upload_dir) / _BRANDING_DIR_NAME


def _get_or_create_settings(db: Session) -> SiteSetting:
    settings_row = db.get(SiteSetting, _SETTINGS_ROW_ID)
    if settings_row is None:
        settings_row = SiteSetting(id=_SETTINGS_ROW_ID)
        db.add(settings_row)
    # 以 MAX_UPLOAD_SIZE_MB 填入上傳上限的初始值，讓靠 .env 設定的部署在管理員動手修改之前
    # 都維持原有的上限，與 app/core/smtp_config.py 是同一套延遲填值的想法。把「這個欄位還不存在時
    # 建立的資料列」放在這裡回填（而不是在 migration 裡），可以讓環境變數維持為預設值的唯一來源。
    if settings_row.max_upload_size_mb is None:
        settings_row.max_upload_size_mb = settings.max_upload_size_mb
    db.flush()
    return settings_row


def _looks_like_svg(content: bytes) -> bool:
    head = content.lstrip(b"\xef\xbb\xbf").lstrip()[:512].lower()
    return head.startswith(b"<?xml") or head.startswith(b"<svg")


def _is_webp(content: bytes) -> bool:
    return content.startswith(b"RIFF") and content[8:12] == b"WEBP"


def _validated_extension(filename: str | None, content: bytes) -> str:
    extension = Path(filename or "").suffix.lower()
    if extension not in _IMAGE_MEDIA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支援的圖片格式：{extension or '(無副檔名)'}",
        )

    if extension == ".svg":
        content_ok = _looks_like_svg(content)
    elif extension == ".webp":
        content_ok = _is_webp(content)
    else:
        content_ok = any(content.startswith(sig) for sig in _IMAGE_MAGIC_SIGNATURES[extension])

    if not content_ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="檔案內容與副檔名不符")

    return extension


async def _store_branding_image(
    upload: UploadFile,
    max_bytes: int,
    max_label: str,
) -> str:
    content = await upload.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="檔案內容為空")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"圖片超過大小上限（{max_label}）",
        )

    extension = _validated_extension(upload.filename, content)

    dest_dir = _branding_dir()
    dest_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    (dest_dir / stored_name).write_bytes(content)
    return stored_name


def _remove_stored_image(filename: str | None) -> None:
    if filename and _ASSET_FILENAME_RE.match(filename):
        (_branding_dir() / filename).unlink(missing_ok=True)


@router.get("", response_model=SiteSettingResponse)
def get_site_settings(db: Session = Depends(get_db)) -> SiteSetting:
    return _get_or_create_settings(db)


@router.patch("", response_model=SiteSettingResponse)
def update_site_settings(
    payload: SiteSettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSetting:
    settings_row = _get_or_create_settings(db)

    fields_set = payload.model_fields_set
    changes: list[str] = []

    for field in ("brand_name", "browser_title", "hero_title", "hero_subtitle", "max_upload_size_mb"):
        if field in fields_set:
            value = getattr(payload, field)
            if value != getattr(settings_row, field):
                changes.append(f"{field} updated")
                setattr(settings_row, field, value)

    # 明確傳入 null 代表清掉覆寫值；此時退回環境變數的預設，讓這次的回應與之後每一次上傳
    # 都還是有一個具體數字可用。
    if settings_row.max_upload_size_mb is None:
        settings_row.max_upload_size_mb = settings.max_upload_size_mb

    if changes:
        write_audit_log(db, actor_id=admin.id, action="site_settings.update", detail="; ".join(changes))

    db.commit()
    db.refresh(settings_row)
    return settings_row


@router.get("/assets/{filename}")
def get_branding_asset(filename: str) -> FileResponse:
    """公開路由：favicon 與 hero 圖片對未登入的訪客也必須載得到。"""
    if not _ASSET_FILENAME_RE.match(filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="圖片不存在")

    disk_path = _branding_dir() / filename
    if not disk_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="圖片不存在")

    return FileResponse(
        disk_path,
        media_type=_IMAGE_MEDIA_TYPES.get(disk_path.suffix.lower(), "application/octet-stream"),
        headers={
            "X-Content-Type-Options": "nosniff",
            # 上傳的 SVG 是由我方 origin 提供的 markup，所以要鎖死：即使是心懷不軌的管理員
            # 放上來的檔案，也無法從這裡執行 script 或對外回傳資料。
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        },
    )


@router.post("/favicon", response_model=SiteSettingResponse)
async def upload_favicon(
    upload: UploadFile = UploadFileParam(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSetting:
    stored_name = await _store_branding_image(upload, _FAVICON_MAX_BYTES, "512 KB")

    settings_row = _get_or_create_settings(db)
    previous = settings_row.favicon_filename
    settings_row.favicon_filename = stored_name
    write_audit_log(db, actor_id=admin.id, action="site_settings.favicon.update", detail=stored_name)
    db.commit()
    db.refresh(settings_row)

    _remove_stored_image(previous)
    return settings_row


@router.delete("/favicon", response_model=SiteSettingResponse)
def delete_favicon(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSetting:
    settings_row = _get_or_create_settings(db)
    previous = settings_row.favicon_filename
    settings_row.favicon_filename = None
    if previous:
        write_audit_log(db, actor_id=admin.id, action="site_settings.favicon.delete", detail=previous)
    db.commit()
    db.refresh(settings_row)

    _remove_stored_image(previous)
    return settings_row


@router.post("/hero-image", response_model=SiteSettingResponse)
async def upload_hero_image(
    upload: UploadFile = UploadFileParam(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSetting:
    stored_name = await _store_branding_image(upload, _HERO_IMAGE_MAX_BYTES, "2 MB")

    settings_row = _get_or_create_settings(db)
    previous = settings_row.hero_image_filename
    settings_row.hero_image_filename = stored_name
    write_audit_log(db, actor_id=admin.id, action="site_settings.hero_image.update", detail=stored_name)
    db.commit()
    db.refresh(settings_row)

    _remove_stored_image(previous)
    return settings_row


@router.delete("/hero-image", response_model=SiteSettingResponse)
def delete_hero_image(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSetting:
    settings_row = _get_or_create_settings(db)
    previous = settings_row.hero_image_filename
    settings_row.hero_image_filename = None
    if previous:
        write_audit_log(db, actor_id=admin.id, action="site_settings.hero_image.delete", detail=previous)
    db.commit()
    db.refresh(settings_row)

    _remove_stored_image(previous)
    return settings_row
