# 發布模式與離線交付 (Production / Release Mode)

本文件涵蓋正式環境的啟動方式、離線主機的 image 交付流程，以及版本升級與回滾。備份、RSS 定時抓取與
還原是另一份 [備份與還原](backup-restore.md)；`.env` 各項設定的意義見
[環境變數說明](configuration.md)。

`docker compose up`（即 `docker-compose.yml`）啟動的 frontend container 內部是跑 `npm run dev`
（Vite dev server），只適合開發用途。正式環境改用獨立的 `docker-compose.prod.yml`（**不要**跟
`docker-compose.yml` 疊加使用，兩者的 frontend 服務會同時啟動）：只有 `app` 與 `db` 兩個 service，
對外只暴露一個 port（80）。

`app` 由專案根目錄的 `Dockerfile` 以 multi-stage build 產生：第一階段用 `node:22-alpine` 執行
`npm ci && npm run build`，第二階段的 `python:3.12-slim` 再把產出的 `dist/` 複製成 image 內的
`/app/static`，由 FastAPI 直接靜態伺服（見 `backend/app/core/static.py`）。因此前後端是同一個
origin，不需要反向代理，正式環境總共只有 **app 與 postgres 兩個 image**。

## 1. 啟動 app／db

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- `app` service：對外監聽 `:80`（對應 container 內的 `8000`）。`/api/...` 由 FastAPI 的 router 處理，
  其餘路徑優先回傳 `/app/static` 底下的實際檔案，找不到則 fallback 回 `index.html`（支援
  `react-router-dom` 的 client-side routing，重新整理 `/admin` 等子路徑不會 404）；未註冊的
  `/api/...` 路徑則維持回傳 404 JSON，不會被 fallback 吃掉。
- 前端在建置階段沒有 `VITE_API_BASE_URL`，API client 會 fallback 成相對路徑 `/api/...`，直接打同一個
  origin。host 上的 `.env` 不會參與這個建置，因此開發用的 `VITE_API_BASE_URL=http://localhost:8000`
  不會誤入正式建置。
- 前端程式碼改動後**不需要**手動 `npm run build`，重跑 `up --build -d` 即可；建置是 image 的一部分。
- `db` 不對外暴露 `5432`，只能透過 docker 內部網路被 `app` 存取。
- app container 啟動時一樣會自動跑 `alembic upgrade head`（見根目錄 `Dockerfile`）。
- 上傳大小的天花板只剩後端這一道（`backend/app/core/upload_limit.py` 的
  `MAX_UPLOAD_SIZE_MB_CEILING`，預設 512 MB），不再有反向代理層先擋掉。

若需要調整 worker 數／monitoring，修改根目錄 `Dockerfile` 的啟動指令即可；此設定原本就不含
`--reload`，可直接用於正式環境。

## 2. 離線環境交付

兩個 image 分別打包成兩個 tar，而不是合併成一個。`app` 每次改版都要重出，`postgres:16-alpine` 則是
釘死的版本，可能一年都不動——分開之後日常改版只需要搬 app 那一份（約 70 MB，而非兩者合計的 180 MB），
保留舊版以備回滾時也不必每一份都複製一次 postgres。兩個 image 一個是 Debian 底、一個是 Alpine 底，
沒有任何共用 layer，所以合併成單一 tar 也省不到空間。

打包前先確認 `.env` 的 `APP_VERSION` 是這次要發布的版號（例如 `v0.1.0`），再於有網路的機器上執行：

```bash
./scripts/package-images.sh              # 建置 app、匯出兩個 tar、產生 sha256 清單
./scripts/package-images.sh --app-only   # 日常改版：只重出 app tar（postgres 沒變就不必重傳）
```

產出在 `PACKAGE_OUTPUT_DIR`（`.env` 可覆寫，預設 `./release`）：

```
release/
  py-file-platform-app-v0.1.0.tar               # 檔名中的版本取自 .env 的 APP_VERSION
  py-file-platform-db-postgres-16-alpine.tar
  MANIFEST.sha256
```

### 離線主機上的目錄結構

離線主機不會（也不該）build，因此不需要複製原始碼，但**需要整個 `scripts/` 目錄**：`backup.sh` 與
`restore.sh` 都是以「自己所在目錄的上一層」推導部署根目錄，再從那裡讀 `.env` 與
`docker-compose.prod.yml`，而且兩者都會 `source` 同目錄下的 `lib.sh`——少了它任何一支都無法執行。
把交付內容排成與 repo 相同的相對結構：

```
/opt/py-file-platform/
  docker-compose.prod.yml
  .env
  scripts/
    lib.sh                                        # 共用函式，backup.sh／restore.sh 都會 source
    backup.sh
    restore.sh
  uploads/                                        # bind mount 目標，先建好
  release/
    py-file-platform-app-v0.1.0.tar
    py-file-platform-db-postgres-16-alpine.tar
    MANIFEST.sha256
```

`release/` 建議直接留在部署主機上並保留最近幾版的 app tar——回滾時要 `docker load` 的就是它，見
「3. 版本升級與回滾」。

### 首次安裝：先把 `.env` 改對，再 `up -d`

`.env.example` 的預設值是開發用的。全新的離線主機在第一次 `up -d` **之前**必須改掉下列項目，其中前兩項
事後補救的代價特別高：

| 變數 | 為什麼要在第一次 `up -d` 之前改 |
| --- | --- |
| `POSTGRES_PASSWORD`（連同 `POSTGRES_USER`／`POSTGRES_DB`） | postgres image 只在初始化 `db_data` volume 時套用這組帳密，之後改 `.env` 完全不生效，要改就得刪掉 volume 從頭來過 |
| `JWT_SECRET_KEY` | 用 `openssl rand -hex 32` 產生；留著預設值等於任何知道這份 repo 的人都能自行簽出有效 token |
| `APP_VERSION` | 必填且不可為 `latest`，說明見本節上方 |
| `FRONTEND_BASE_URL` | 密碼重設信裡連結的來源（`backend/app/api/password_reset.py`），預設的 `http://localhost:5173` 在離線主機是死連結；填使用者實際連進來的網址，例如 `http://files.example.internal` |
| `INITIAL_ADMIN_USERNAME`／`INITIAL_ADMIN_PASSWORD` | 全新資料庫裡一個 admin 都沒有，而建立帳號的 API 本身就要 admin 身分。僅在系統尚無 admin 時生效（`backend/app/core/seed.py`），第一個管理員建好後**請務必**從 `.env` 移除 |

`JWT_SECRET_KEY` 這一項有程式在把關：留著 `.env.example` 的佔位值時，正式環境的 image 會**直接拒絕
啟動**並在 log 說明原因（`backend/app/core/startup_checks.py`）。其餘幾項沒有這種保護，只能照表檢查。

### Token 的生命週期與撤銷

有一件事維運上必須知道：**這個系統沒有 token 撤銷機制。**

JWT 的 payload 只有 `sub` 與 `exp`（`backend/app/core/security.py`），有效期由
`ACCESS_TOKEN_EXPIRE_MINUTES` 決定，預設 1440 分鐘（一天）。因此：

- 變更密碼（不論是使用者自己改、管理員重設，還是自助的忘記密碼流程）**都不會**讓已經發出去的
  token 失效。舊 token 會一直有效到過期為止。
- 唯一能立即生效的手段是把帳號**停用**（`is_active=False`），管理後台的「使用者」分頁可以做到——
  每個請求都會重新檢查這個欄位（`backend/app/api/deps.py`）。

所以帳號外洩時的正確處置是「停用帳號」，而不是「改密碼」。若要縮短暴露窗口，可以調低
`ACCESS_TOKEN_EXPIRE_MINUTES`，代價是使用者更常需要重新登入。

另外，本專案**沒有 debug 開關**——`.env` 裡沒有 `DEBUG` 之類的設定，`FastAPI()` 也沒有帶
`debug=`，所以不需要擔心正式環境忘了關掉它。

反過來說，這兩項在正式環境**不需要**動，改了反而容易出錯：`DATABASE_URL` 會被
`docker-compose.prod.yml` 覆寫成指向 `db` service；`VITE_API_BASE_URL` 只服務前端開發，正式建置在
image 內完成、根本不讀這個檔案。

### 載入與啟動

```bash
(cd release && sha256sum -c MANIFEST.sha256)         # 先驗完整性，再載入
docker load -i release/py-file-platform-app-v0.1.0.tar
docker load -i release/py-file-platform-db-postgres-16-alpine.tar
docker compose -f docker-compose.prod.yml config     # 確認解析出 py-file-platform-app:v0.1.0
docker compose -f docker-compose.prod.yml up -d      # 注意：不加 --build
curl -s http://localhost/health                      # {"status":"ok","version":"v0.1.0"}
```

最後用 `INITIAL_ADMIN_USERNAME`／`INITIAL_ADMIN_PASSWORD` 登入 `/login`，確認管理員帳號確實被建立，
再到 `/admin` 依現場情況設定站台品牌、SMTP 與 LDAP。

離線主機上務必省略 `--build`，否則 compose 會嘗試重新建置（需要連網抓 base image 與 npm 套件）而失敗。
`config` 那一步是刻意放在 `up -d` 之前的：`APP_VERSION` 沒設好時它會立刻報錯，而不是等到啟動階段才發現
image tag 對不上載入的 image。

`.env` 的 `APP_VERSION` 同時決定四件事：`docker-compose.prod.yml` 裡 `app` 解析出的 image tag、
`package-images.sh` 產出的 tar 檔名、離線主機 `up -d` 時要啟動哪一版，以及建置時烙進 image、由
`GET /health` 回報的版本。因為 compose 的 `app` 有明確的 `image:` 標籤，image 名稱不會隨部署目錄名改變，
離線主機放在哪個路徑下都能正確對應到載入的 image。只有 `db` 那個 tar 內的 image 維持上游原名
`postgres:16-alpine`，方便日後查 CVE 與升級。

`APP_VERSION` 是**必填**，且不接受 `latest`：兩個版本共用同一個 tag，會讓後打的 tar 覆蓋前一份、
`docker load` 把 tag 重新指到新 image，離線主機因此沒有任何舊版可以退回去。未設定或設成 `latest` 時，
`package-images.sh` 會直接失敗而不產出檔案，`docker compose` 也會以明確訊息中止。

## 3. 版本升級與回滾

### 升級 app（migration 會自動執行）

根目錄 `Dockerfile` 的啟動指令是 `alembic upgrade head && uvicorn ...`，所以 container 一啟動就會把
資料庫 schema 套用到新版，離線主機上**不需要**進 container 手動跑任何 migration 指令。上傳的檔案與
資料庫內容都不受影響：`db_data` 是 named volume、`uploads/` 是 bind mount，換 image 只會 recreate
container，兩者都在 container 之外。

但 migration 執行了就直接改下去，沒有自動的還原點，所以**升級的第一步是先手動備份**：

```bash
./scripts/backup.sh && echo "備份成功"              # 以結束碼為準，不是看 backups/ 有沒有檔案
docker load -i py-file-platform-app-<新版本>.tar
# 編輯 .env 的 APP_VERSION 為新版本
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f app # 確認 migration 與啟動都成功
curl -s http://localhost/health                       # 確認跑的確實是新版本
```

若 migration 失敗，`&&` 會讓 uvicorn 不啟動，加上 `restart: unless-stopped`，container 會不斷重啟。
這是刻意的——帶著改壞的 schema 硬跑更糟——遇到服務起不來時請先看 `logs app` 的內容，而不是直接判定
image 有問題。

### 回滾 app

`alembic upgrade head` 只會往前，**不會**自動降版，所以只把 image 換回舊版會讓舊版程式碼對上新版
schema。正確順序是先還原資料庫，再換 image：

```bash
./scripts/restore.sh --db backups/db_<時間戳>.sql.gz   # 會自動 stop app → 還原 → up -d
docker load -i release/py-file-platform-app-<舊版本>.tar
# 編輯 .env 的 APP_VERSION 為舊版本
docker compose -f docker-compose.prod.yml up -d
curl -s http://localhost/health                      # 確認確實退回舊版本
```

因此 `release/` 底下建議保留最近幾版的 `py-file-platform-app-*.tar`（每版約 70 MB），否則要回滾時
會沒有可載入的舊 image。`postgres` 那份不隨版本變動，留一份即可。

還原指令的細節（為什麼要先 `stop app`、舊備份檔要怎麼處理、`uploads/` 要不要一起還原）見
[備份與還原](backup-restore.md)的「3. 從備份還原」，那裡是唯一一份完整說明，這裡只列回滾當下的順序。

### 確認目前執行的版本

`GET /health` 會回報 image 建置時烙入的版本（根目錄 `Dockerfile` 的 `ARG APP_VERSION` →
`ENV APP_BUILD_VERSION`），因此它反映的是**實際在跑的** image，而不是 `.env` 裡打了什麼：

```bash
curl -s http://localhost/health
# {"status":"ok","version":"v0.1.0"}
```

若要在不啟動 container 的情況下確認某個 image 的版本，可以直接看 label：

```bash
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' \
  py-file-platform-app:v0.1.0
```

### 升級 postgres

**major 版本（例如 16 → 17）不能只改 `docker-compose.prod.yml` 的 tag**，資料目錄的版本對不上，
container 會直接拒絕啟動。必須走 `pg_dump` 匯出 → 改 tag → 清空 `db_data` volume → restore 的流程。
patch 版（例如 `16.8` → `16.9`）則可以直接換 tag、重新 `package-images.sh` 出 db tar，app 完全不用重建。

