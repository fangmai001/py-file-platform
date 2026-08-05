"""以與 API 相同的 origin 提供建置好的前端。

正式環境下整個應用程式是一個 image：前端在 Docker build 期間建置完並複製到 ``static_dir``，
因此 ``/api/...`` 與 SPA 本身都由 FastAPI 提供，前面不再有任何反向代理。

原生開發完全不受影響——那裡沒有 ``backend/static``，所以 ``mount_frontend()`` 什麼都不做，
前端仍由 Vite 開發伺服器在自己的 port 上提供。
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def has_bundled_frontend(static_dir: Path) -> bool:
    """前端是否已經被建置進這個 image。

    這同時也是「正在正式環境的 image 內執行」的判斷依據：只有根目錄的 Dockerfile 會把
    frontend/dist 複製到這裡，原生開發與 dev compose 都沒有這個目錄。CORS 設定
    （app/main.py）與啟動檢查（app/core/startup_checks.py）都靠它區分 dev 與 prod，
    所以判斷邏輯集中在這裡一份，不要各自再寫一次。
    """
    return (static_dir.resolve() / "index.html").is_file()


def mount_frontend(app: FastAPI, static_dir: Path) -> bool:
    """若前端已被建置進 image，就從 ``static_dir`` 提供它。

    回傳是否有註冊路由，讓呼叫端（與測試）能分辨「沒有打包前端」與掛載成功這兩種情況。

    必須在 ``include_router()`` **之後**呼叫：Starlette 依註冊順序匹配路由，
    否則這裡註冊的 catch-all 會遮蔽掉每一條 API 路由。
    """
    static_dir = static_dir.resolve()
    index_html = static_dir / "index.html"
    if not has_bundled_frontend(static_dir):
        return False

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        # 未註冊的 API 路徑仍必須以 JSON 回 404，而不是被 index.html 吞掉——
        # 否則打錯字的端點看起來會像是回傳了 HTML。
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")

        if full_path:
            candidate = (static_dir / full_path).resolve()
            # 否則 URL 裡的 `..` 可能逃出 static 目錄，把容器檔案系統上的任意檔案送出去。
            if candidate.is_relative_to(static_dir) and candidate.is_file():
                return FileResponse(candidate)

        # react-router-dom 會自己處理路由，因此其餘路徑（/admin、/upload 等）在使用者
        # 強制重新整理時必須載入 SPA 外殼，而不是回 404。
        return FileResponse(index_html)

    return True
