import logging
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

# 與它要比對的那個 Settings 預設值保持同步（app/core/config.py）。
_FRONTEND_BASE_URL_DEV_DEFAULT = "http://localhost:5173"


def warn_if_frontend_base_url_is_dev_default() -> None:
    """正式環境的 image 仍在使用開發用的 FRONTEND_BASE_URL 時，記錄一則警告。

    重設密碼的連結是由這個值組出來的（app/api/password_reset.py），而正式環境的前端由
    應用程式本身提供——那裡沒有 :5173，因此每一封重設信寄出的連結都會指向收件者自己的機器。
    麻煩之處在於它在開發環境裡完全看不出來，因為 5173 在那裡本來就正確；只有當真實使用者
    在真實部署上忘記密碼時才會浮現，而且傳到維運者耳裡時只會變成「那個連結按了沒反應」。

    以 static_dir 是否存在作為「正在正式環境 image 內執行」的判斷依據——Dockerfile 會把前端
    建置到這個目錄，而原生開發沒有這個目錄（見 app/core/static.py，它基於同樣理由跳過掛載）。
    """
    if not Path(settings.static_dir).is_dir():
        return
    if settings.frontend_base_url != _FRONTEND_BASE_URL_DEV_DEFAULT:
        return
    logger.warning(
        "FRONTEND_BASE_URL is still the development default (%s), but this looks like a "
        "production deployment. Password reset emails will contain links nobody can open - "
        "set FRONTEND_BASE_URL in .env to the address users actually reach this site at "
        "(e.g. http://files.example.internal).",
        _FRONTEND_BASE_URL_DEV_DEFAULT,
    )
