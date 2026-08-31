from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py 往上三層就是專案根目錄——但這只在原生開發時成立，用意是讓 uvicorn
# 不論從 backend/ 還是 repo 根目錄啟動，都讀到同一份 .env。
#
# 容器內完全不是這麼一回事：WORKDIR 是 /app、檔案在 /app/app/core/config.py，往上三層是 /，
# 所以這裡指向的是不存在的 /.env。容器的設定全部來自 compose env_file: 注入的環境變數，而
# pydantic-settings 的環境變數優先於 env file，兩邊的結果才會一致。.env 刻意不進 image
#（見 .dockerignore），不要為了讓容器讀得到它而改這一點。
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # 由 GET /health 回報，讓離線主機只要一次 HTTP 請求就能確認正在跑的是哪個 build。
    # repo 根目錄的 Dockerfile 會把它烙進 image（ARG APP_VERSION -> ENV APP_BUILD_VERSION）；
    # 名稱刻意與 APP_VERSION 不同，這樣 compose 的 `env_file: .env` 就無法拿部署者隨手打的值
    # 蓋掉建置時的版本戳記。原生開發回報的是 "dev"，因為那裡根本沒有建置過 image。
    app_build_version: str = "dev"

    database_url: str = "postgresql+psycopg2://platform:platform@localhost:5432/platform"
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    # 建置好的前端所在位置，相對於工作目錄。正式環境的 Dockerfile 會把它建到 /app/static，
    # 應用程式再以與 API 相同的 origin 提供（見 app/core/static.py）。原生開發時這裡什麼都沒有，
    # 前端改由 Vite 提供，因此整個掛載會直接跳過。
    static_dir: str = "./static"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # 選用：兩者都有設定且尚無任何管理員帳號時，啟動時會建立一個，
    # 讓第一個管理員有辦法生出來（見 app/core/seed.py）。
    initial_admin_username: str | None = None
    initial_admin_password: str | None = None

    # 寄件用的 SMTP（重設密碼連結、上傳通知）。這些只在第一次讀取時，用來填入管理員可編輯的
    # smtp_settings 資料列的初始值（見 app/core/smtp_config.py）——在那之後，修改一律走管理後台
    # UI／API（app/api/smtp_settings.py），而不是這份 env 設定，與下方的 LDAP_* 是同一套模式。
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_address: str | None = None
    # 與 smtp_from_address 是不同的欄位與預設值：app/core/mailer.py（上傳通知）
    # 當初就是照著這個欄位寫的，而不是 smtp_from_address。
    smtp_from: str = "noreply@example.com"
    smtp_use_tls: bool = True

    # 用來組出指回前端的連結（例如重設密碼）。
    frontend_base_url: str = "http://localhost:5173"
    password_reset_token_expire_minutes: int = 30

    # LDAP 驗證（見 app/core/ldap.py）。預設關閉，讓沒有 LDAP 伺服器的環境維持原樣，
    # 只用本機帳號也照常運作。
    ldap_enabled: bool = False
    ldap_server_uri: str | None = None
    ldap_bind_dn: str | None = None
    ldap_bind_password: str | None = None
    ldap_base_dn: str | None = None
    # {username} 會被代換成登入用的 username（已做 filter escape）。
    ldap_user_search_filter: str = "(uid={username})"

    # 內建的 RSS 定時抓取排程器（見 app/core/feed_scheduler.py）是否要隨應用程式啟動。這是
    # process 層級的總開關，與管理員在後台切換的 feed_settings.fetch_enabled 是兩回事：後者是
    # 「排程開著沒有」，這裡則是「這個 process 要不要跑排程器」。維持 crontab、或日後跑多個
    # 副本而只想讓其中一個抓取時設成 false。測試也靠它避免在 TestClient 的 lifespan 裡
    # 起一條真的會連外的背景迴圈。
    feed_scheduler_enabled: bool = True


settings = Settings()
