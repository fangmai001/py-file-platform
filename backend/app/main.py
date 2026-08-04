from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.router import router
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.ldap_config import warn_if_ldap_env_config_ignored
from app.core.seed import seed_initial_admin
from app.core.smtp_config import warn_if_smtp_env_config_ignored
from app.core.startup_checks import warn_if_frontend_base_url_is_dev_default
from app.core.static import mount_frontend


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_initial_admin(db)
        warn_if_ldap_env_config_ignored(db)
        warn_if_smtp_env_config_ignored(db)
    finally:
        db.close()
    # 不需要 db——純粹檢查部署者在 .env 裡填了什麼。
    warn_if_frontend_base_url_is_dev_default()
    yield


app = FastAPI(title="py-file-platform", lifespan=lifespan)

# 開發環境（Vite 在 :5173、uvicorn 在 :8000）與跨 docker-compose 服務時，前後端是不同的 origin，
# 因此瀏覽器需要 CORS header 才呼叫得到 API。驗證走的是 Bearer token（不用 cookie），
# 所以這裡放行萬用 origin 並不會像 cookie-based session 那樣帶來 CSRF 風險。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 正式環境已經沒有反向代理（見 app/core/static.py），所以壓縮 JS／CSS bundle 與 JSON API 回應
# 現在是這支應用程式的責任。compresslevel 從 starlette 預設的 9 調低，因為檔案下載也會經過這裡，
# 而花 level-9 的 CPU 去重新壓縮一個本來就已壓縮過的上傳檔（zip、pdf、圖片）純屬浪費。
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

app.include_router(router)


@app.get("/health")
def health():
    # 版本來自 image 建置時（見 repo 根目錄的 Dockerfile），因此這就是離線主機用來確認
    # `up -d` 實際啟動了哪個 release 的方式。
    return {"status": "ok", "version": settings.app_build_version}


# 刻意放在最後註冊：SPA 的 catch-all 會匹配所有路徑，因此必須排在 API 路由與 /health 之後。
mount_frontend(app, Path(settings.static_dir))
