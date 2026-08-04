import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import SmtpSetting

logger = logging.getLogger(__name__)

_SETTINGS_ROW_ID = 1


def get_smtp_settings(db: Session) -> SmtpSetting:
    """取出單列的 SMTP 設定，第一次使用時以 SMTP_* 環境變數填入初始值。

    這讓既有那些靠 .env 設定的部署維持原樣運作，直到管理員透過管理後台 UI
    修改這些值為止（見 app/api/smtp_settings.py）。
    """
    settings_row = db.get(SmtpSetting, _SETTINGS_ROW_ID)
    if settings_row is None:
        settings_row = SmtpSetting(
            id=_SETTINGS_ROW_ID,
            enabled=bool(settings.smtp_host),
            host=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            from_address=settings.smtp_from_address or settings.smtp_from,
            use_tls=settings.smtp_use_tls,
        )
        db.add(settings_row)
        db.flush()
    return settings_row


def warn_if_smtp_env_config_ignored(db: Session) -> None:
    """SMTP_HOST 雖然有設，卻因為 smtp_settings 資料列已存在且具最終權威而被靜默忽略時
    （見 get_smtp_settings），記錄一則警告。

    該資料列尚未存在時什麼都不做——那是預期中的首次啟動路徑，
    get_smtp_settings 會在下一次讀取時以 SMTP_* 環境變數把它填好。
    """
    if db.get(SmtpSetting, _SETTINGS_ROW_ID) is None:
        return
    if settings.smtp_host is not None:
        logger.warning(
            "SMTP_HOST (and other SMTP_* env vars) is set in .env, but the "
            "smtp_settings DB row already exists and is authoritative, so the env "
            'value is being ignored. Manage SMTP configuration via the "Email SMTP '
            '設定" tab in the admin UI instead.'
        )


@dataclass(frozen=True)
class SmtpConfig:
    """SmtpSetting 各欄位的純資料快照，可以安全地交給 BackgroundTask——
    與 ORM 資料列不同，請求結束後讀取它並不需要一個仍開著的 session。"""

    enabled: bool
    host: str | None
    port: int
    username: str | None
    password: str | None
    from_address: str
    use_tls: bool


def to_smtp_config(settings_row: SmtpSetting) -> SmtpConfig:
    return SmtpConfig(
        enabled=settings_row.enabled,
        host=settings_row.host,
        port=settings_row.port,
        username=settings_row.username,
        password=settings_row.password,
        from_address=settings_row.from_address,
        use_tls=settings_row.use_tls,
    )
