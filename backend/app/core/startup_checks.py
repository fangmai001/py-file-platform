import logging
from pathlib import Path

from app.core.config import settings
from app.core.static import has_bundled_frontend

logger = logging.getLogger(__name__)

# 與它要比對的那個 Settings 預設值保持同步（app/core/config.py）。
_FRONTEND_BASE_URL_DEV_DEFAULT = "http://localhost:5173"

# config.py 的 Settings 預設值，以及 .env.example 裡那個等著被換掉的佔位字串。兩個都要擋：
# 照著範例檔複製卻沒改，跟完全沒設定一樣危險。
_JWT_SECRET_KEY_PLACEHOLDERS = frozenset(
    {
        "change-me",
        "change-me-to-a-long-random-string",
    }
)


def check_jwt_secret_key() -> None:
    """簽章金鑰仍是預設值時發出警告；在正式環境的 image 內則直接拒絕啟動。

    這個字串簽發站上所有的 JWT。留著公開已知的預設值，等於任何人都能自己簽一張管理員 token
    ——這比 LDAP／SMTP 那兩個「設定可能沒生效」的警告嚴重得多，卻反而是唯一沒有自我檢查的。

    dev 只警告，是為了讓 `cp .env.example .env` 之後就能直接跑起來；prod image 直接中止，
    理由與 APP_VERSION 的 `${APP_VERSION:?...}` 相同——這種錯誤在啟動時吵一次，遠好過安靜地
    跑上幾個月。
    """
    if settings.jwt_secret_key not in _JWT_SECRET_KEY_PLACEHOLDERS:
        return

    message = (
        "JWT_SECRET_KEY is still the placeholder value from .env.example. Every token this "
        "app issues is signed with a publicly known string, so anyone can forge an admin "
        "session. Generate a real one with: openssl rand -hex 32"
    )
    if has_bundled_frontend(Path(settings.static_dir)):
        raise RuntimeError(message)
    logger.warning("%s (allowed here because this is not a production image)", message)


def warn_if_frontend_base_url_is_dev_default() -> None:
    """正式環境的 image 仍在使用開發用的 FRONTEND_BASE_URL 時，記錄一則警告。

    重設密碼的連結是由這個值組出來的（app/api/password_reset.py），而正式環境的前端由
    應用程式本身提供——那裡沒有 :5173，因此每一封重設信寄出的連結都會指向收件者自己的機器。
    麻煩之處在於它在開發環境裡完全看不出來，因為 5173 在那裡本來就正確；只有當真實使用者
    在真實部署上忘記密碼時才會浮現，而且傳到維運者耳裡時只會變成「那個連結按了沒反應」。

    以「前端有沒有被建置進 image」作為「正在正式環境 image 內執行」的判斷依據，
    見 app/core/static.py 的 has_bundled_frontend()。
    """
    if not has_bundled_frontend(Path(settings.static_dir)):
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
