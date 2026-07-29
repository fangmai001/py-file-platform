# py-file-platform

這是一個基於 Python 開發的檔案管理平台系統。
本專案的主要目的是測試 Python 在前後端互動中，處理資料「增刪查改 (CRUD)」與 API 的支援能力。

平台定位類似「社團／內部團隊」的公開文件分享空間（性質接近簡化版的 Facebook 貼文牆，但聚焦在檔案分享）：訪客無需登入，即可瀏覽並直接下載所有公開檔案；若要上傳或管理檔案，才需要登入帳號。

## 📸 畫面截圖 (Screenshots)

|                                                       |                                                         |
| ----------------------------------------------------- | ------------------------------------------------------- |
| **首頁公開檔案牆**（含檔案卡片與連結卡片分類）         | **登入頁**                                               |
| ![首頁](docs/screenshots/home.png)                     | ![登入頁](docs/screenshots/login.png)                    |
| **上傳頁**                                             | **管理後台－使用者**                                     |
| ![上傳頁](docs/screenshots/upload.png)                 | ![管理後台使用者列表](docs/screenshots/admin-users.png)  |
| **管理後台－卡片**                                     | **管理後台－連結卡片**                                   |
| ![管理後台卡片列表](docs/screenshots/admin-folders.png) | ![管理後台連結卡片列表](docs/screenshots/admin-link-cards.png) |
| **管理後台－檔案**                                     | **管理後台－操作紀錄**                                   |
| ![管理後台檔案列表](docs/screenshots/admin-files.png)  | ![管理後台操作紀錄](docs/screenshots/admin-audit-logs.png) |
| **管理後台－站台設定**                                 |                                                           |
| ![管理後台站台設定](docs/screenshots/admin-site-settings.png) |                                                    |

## 🌟 專案特點

*   **身分驗證與權限分級**：支援使用者登入，帳號可由管理員建立，或串接 LDAP 進行驗證（LDAP 伺服器、帳密等設定可直接在管理後台網頁上設定，無需改動伺服器環境變數）。一般使用者可上傳與管理自己的檔案；管理員（Admin）擁有最高權限，可管理系統內所有使用者帳號（包含建立、編輯、停用、刪除其他使用者），並可檢視、管理所有使用者上傳的檔案。
*   **個人資料自助管理**：已登入使用者可自行修改顯示姓名，並在輸入目前密碼驗證後自行變更密碼；忘記密碼時仍可透過 Email 重設連結重設。
*   **檔案公開／私密設定**：使用者上傳檔案時可選擇公開（訪客可瀏覽下載）或私密（僅限本人與管理員檢視），滿足不想公開分享的檔案需求。
*   **檔案管理 API**：完整測試 Python 後端處理檔案上傳、讀取、更新與刪除的能力，並支援訪客直接下載公開檔案。
*   **檔案類型防護**：上傳檔案以常見辦公室文件為主（如 doc/docx、pdf、xls/xlsx 等），後端會進行副檔名／類型基本檢查，降低惡意檔案上傳風險。
*   **卡片分類瀏覽**：管理員可建立、編輯、刪除分類卡片（名稱、描述），檔案依卡片分組呈現，方便依部門或用途尋找檔案。
*   **檔案顯示名稱與公告日期**：檔案除了實際檔名外，可另外設定顯示名稱與公告日期，方便在清單中呈現（不影響實際檔名與下載內容）。
*   **版本歷史**：同名檔案上傳時不覆蓋舊檔，保留版本歷史，可回溯查看／下載先前版本。
*   **上傳通知**：公開檔案上傳成功後，廣播站內通知給其他使用者，並在使用者有設定 Email 時非同步寄送通知信；私密檔案不通知，避免洩漏其存在。
*   **Email SMTP 設定**：寄送重設密碼信、上傳通知信所使用的 SMTP 伺服器、帳密等設定，可直接在管理後台網頁上設定，無需改動伺服器環境變數；未啟用或未設定時，信件內容僅會寫入後端日誌，方便本機開發測試。
*   **站台外觀設定**：站台名稱、瀏覽器分頁標題、首頁歡迎卡片的主標題與副標說明文字，以及網站圖示（favicon）與首頁歡迎圖片，皆可直接在管理後台的「站台設定」中修改；圖片支援 SVG / PNG / JPG / GIF / WebP / ICO 上傳，未設定時使用內建預設值。
*   **首頁特色介紹**：首頁歡迎區塊下方的特色卡片（圖示、標題、說明文字、排序、是否顯示）可在管理後台的「首頁特色」中自行新增、編輯與刪除；圖示由下拉選單挑選，卡片張數不固定，首頁版面會依張數自動調整。
*   **檔案儲存**：檔案實體存放於伺服器本機檔案系統，資料庫僅儲存檔案 metadata。
*   **檔案大小限制**：上傳檔案設有大小上限，避免磁碟空間被過大檔案佔滿。
*   **操作稽核紀錄（Audit Log）**：記錄管理員的高權限操作（如建立/停用/刪除使用者帳號、刪除他人檔案等），包含操作者、時間、對象與動作內容，以利事後追溯。
*   **前後端分離測試**：驗證前端與 Python 後端 API 的資料對接與傳輸效率。

## 🛠️ 技術棧 (Tech Stack)

*   **後端 (Backend)**: Python / FastAPI
*   **前端 (Frontend)**: React + TypeScript + Vite，UI 使用 Tailwind CSS v4 + shadcn（`base-nova`
    style，元件基底為 `@base-ui/react`）+ `lucide-react` 圖示，樣式組合用
    `class-variance-authority` / `tailwind-merge`
*   **資料庫 (Database)**: PostgreSQL

## 🧑‍💻 本機執行方式 (Local Development)

### 前置準備

複製環境變數範本並依需要調整：

```bash
cp .env.example .env
```

`.env` 放在專案根目錄（不是 `backend/` 底下），前後端與 `docker-compose` 都共用同一份設定。

### 後端 (backend)

需先啟動一個 PostgreSQL（例如用 `docker compose up db`），再執行：

```bash
cd backend
source venv/bin/activate   # venv 已存在，以 uv 建立、Python 3.12

alembic upgrade head       # 套用資料庫 migration
uvicorn app.main:app --reload   # 開發模式啟動，預設 http://localhost:8000
```

原生開發（uvicorn 跑在 host，db 在 Docker）時，`.env` 的 `DATABASE_URL` 要用 `localhost`。

### 前端 (frontend)

```bash
cd frontend
npm install
npm run dev   # Vite dev server，預設 http://localhost:5173
```

### 使用 Docker Compose 一次啟動全部服務

```bash
docker compose up --build
```

會啟動三個 service：`db`（postgres:16-alpine）、`backend`（container 啟動時自動跑 `alembic upgrade
head` 再啟動 uvicorn，`:8000`）、`frontend`（Vite dev server，`:5173`）。此模式下 backend 讀取的
`DATABASE_URL` 會由 `docker-compose.yml` 覆寫為指向 `db` 這個 service。`./uploads` 會掛載進
backend container，確保上傳檔案在容器重建後仍保留。

## ✅ 測試 (Testing)

### 後端

```bash
cd backend
source venv/bin/activate
pytest
```

### 前端

```bash
cd frontend
npm test        # vitest run
npm run lint    # oxlint
```

## 🤖 持續整合 (Continuous Integration)

本專案在 GitHub Actions 設定了兩個自動化檢查流程，分別對應後端與前端。兩者都在**每個** Pull Request
以及 push 到 `main` 時觸發（不做路徑過濾，原因見下方「為什麼不用 `paths:` 過濾」）：

### 後端 (`.github/workflows/backend-ci.yml`，check 名稱 `Backend`)

流程為：

1. 啟動一個 PostgreSQL 服務容器
2. 對這個資料庫執行 `alembic upgrade head`（驗證所有 migration 都能從乾淨的資料庫一路套用到最新版本，避免多個分支各自新增 migration、合併後互相分岔卻沒有人補 merge migration 的情況——這正是先前導致後端在 `docker compose up` 時 crash-loop 的原因）
3. 執行 `pytest`（單元測試使用記憶體內的 SQLite，不需要外部資料庫）

### 前端 (`.github/workflows/frontend-ci.yml`，check 名稱 `Frontend`)

流程為：

1. `npm ci` 安裝套件
2. `npm run lint`（oxlint）
3. `npm test`（vitest run）
4. `npm run build`（包含 `tsc -b` 型別檢查，能擋下型別錯誤）

### 為什麼不用 `paths:` 過濾

直覺上會想用 `paths:` 讓「只改前端的 PR 不要跑後端 CI」以節省時間，但這會與下方的 branch protection
直接衝突：**當 workflow 因路徑過濾而未被觸發時，它的 check 不會回報成功，而是永遠停在
`Expected — Waiting for status to be reported`**，於是被列為必要檢查的 PR 就永遠合不進去
（例如只改 `README.md` 的 PR 會讓兩個檢查同時卡住）。兩個 workflow 加起來也才約一分半且平行執行，
因此選擇無條件觸發。

### 分支命名與 commit message

所有變更都走「開分支 → PR → 合併回 `main`」，分支名稱一律使用 `<type>/<kebab-case-description>`
格式，`<type>` 限定以下四種：

| type | 用途 | 範例 |
| --- | --- | --- |
| `feat` | 新功能 | `feat/site-branding-images` |
| `fix` | 修正錯誤 | `fix/admin-self-demote-guard` |
| `docs` | 文件變更 | `docs/update-readme-features-env` |
| `chore` | 雜項維護、環境設定 | `chore/cleanup-legacy-css` |

描述部分用小寫英文加連字號。若使用 git worktree，工具自動產生的 `worktree-xxx` 分支名必須在 push
之前改掉（`git branch -m feat/xxx`，或用 `git push -u origin HEAD:feat/xxx` 指定正確名稱）。

Commit message 的主旨行用繁體中文、以動詞開頭（新增／修正／更新／移除／文件），**不加任何前綴
標籤**，中文標點一律使用全形（`，`「」`（）`）：

```
新增每日備份 script（本機 pg_dump + tar，保留 30 天）
```

主旨不要手寫 issue 或 PR 編號，關聯的 issue 寫在 commit body 或 PR 內文的 `Closes #N`；PR 若以
squash 方式合併，GitHub 自動附加的 `(#NN)` 屬工具行為，不需要移除。PR 標題適用同一套規則。

版本標記使用 semver 格式的 git tag（`vMAJOR.MINOR.PATCH`，例如 `v0.1.0`），從 `main` 上建立。

> 早期的 PR（#30 以前）曾出現 `feature-issue-*` 分支名與 `文件：`、`chore：` 等 commit 前綴，屬於
> 慣例確立前的歷史紀錄，不再沿用，也不會回頭改寫已發布的歷史。

### 分支保護 (Branch protection)

`main` 分支透過 GitHub **Rulesets**（`Settings → Rules → Rulesets`）套用以下規則：

- 所有變更必須經由 Pull Request，不得直接 push 到 `main`
- PR 必須通過 `Backend` 與 `Frontend` 兩個 status check 才能合併
- 禁止刪除 `main`、禁止 force push

因為這是單人維護的 repo，PR 不要求額外的審核者（GitHub 不允許 approve 自己的 PR，若要求審核數
會導致任何 PR 都無法合併）。

### ⚠️ 尚未涵蓋的部分

- **CD（自動部署）**：目前仍是手動執行 `docker compose -f docker-compose.prod.yml up --build -d`，未包含在這兩個
  workflow 內。
- **測試覆蓋率門檻（coverage gate）**：目前未設定，CI 只確保測試「有跑且通過」，不檢查覆蓋率百分比。

## 📦 發布模式執行方式 (Production / Release Mode)

`docker compose up`（即 `docker-compose.yml`）啟動的 frontend container 內部是跑 `npm run dev`
（Vite dev server），只適合開發用途。正式環境改用獨立的 `docker-compose.prod.yml`（**不要**跟
`docker-compose.yml` 疊加使用，兩者的 frontend/nginx 服務會同時啟動）：內含 db／backend／nginx 三個
service，用 nginx（`nginx/nginx.conf`）取代 Vite dev server，直接靜態伺服 `frontend/dist/` 並將
`/api/` 轉發給 backend，對外只暴露一個 port（80）。

### 1. 建置前端靜態檔案

```bash
cd frontend
npm run build     # tsc -b && vite build，輸出到 frontend/dist/
```

`docker-compose.prod.yml` 會把 `frontend/dist/` 以唯讀 volume 掛進 nginx container，所以每次改動前端
程式碼後，部署前都要重新執行這個步驟。

> 建置時**不要**設定 `VITE_API_BASE_URL`（開發用的 `.env` 只給 `npm run dev` 用）。這個情境下前端與
> 後端是同一個 nginx origin，API client 沒抓到這個變數時會 fallback 成相對路徑 `/api/...`，直接交由
> nginx 的 `location /api/` 轉發即可；若建置時不小心帶了開發用的 `http://localhost:8000`，前端會跳過
> nginx 直接打 8000 port，但 `docker-compose.prod.yml` 並未對外開放該 port，會直接連線失敗。

### 2. 啟動 db／backend／nginx

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- `nginx` service：監聽 `:80`，靜態伺服 `frontend/dist/`；`location /api/` 轉發給 `backend:8000`；
  非 `/api` 且非實際靜態檔案的路徑一律 fallback 回 `index.html`（支援 `react-router-dom` 的
  client-side routing，重新整理 `/admin` 等子路徑不會 404）。
- `backend`／`db` 不再對外暴露 port（`8000`／`5432`），只能透過 docker 內部網路被 `nginx` 存取，
  對外僅開放 80。
- backend container 啟動時一樣會自動跑 `alembic upgrade head`（見 `backend/Dockerfile`）。

若需要調整 backend 的 worker 數／monitoring，修改 `backend/Dockerfile` 的啟動指令即可；此設定原本
就不含 `--reload`，可直接用於正式環境。

### 3. 設定每日備份

`scripts/backup.sh` 每日執行一次本機備份：透過 `docker compose -f docker-compose.prod.yml exec db
pg_dump` 匯出資料庫（因為 `db` service 沒有對外開放 `5432` port，host 端無法直接用 `pg_dump` 連線，
只能讓指令在 container 內部執行），並將 host 端的 `uploads/` 目錄 `tar` 打包，兩者都輸出到
`BACKUP_LOCAL_DIR`（預設 `./backups`）並附上時間戳；同時清除超過 `BACKUP_RETENTION_DAYS`
（預設 30）天的舊備份檔。備份檔只保留在部署主機本機，傳送到外部 NAS／其他主機的異地備份不在本
專案規劃範圍內；若有異地需求，請自行在部署主機上以 rsync／NAS 排程等方式搬運 `BACKUP_LOCAL_DIR`。

在 `.env` 設定（預設關閉，需明確啟用）：

```
BACKUP_ENABLED=true
BACKUP_LOCAL_DIR=./backups
BACKUP_RETENTION_DAYS=30
```

先手動執行一次確認可以正常運作：

```bash
./scripts/backup.sh
```

再加進部署主機（跑 `docker-compose.prod.yml` 的那台機器）的 crontab，例如每天凌晨 2 點執行一次：

```
0 2 * * * /opt/py-file-platform/scripts/backup.sh >> /opt/py-file-platform/backups/backup.log 2>&1
```

`/opt/py-file-platform` 需換成實際部署路徑；cron 預設的 `PATH` 可能抓不到 `docker`，必要時在
crontab 開頭加上 `PATH=...` 或改用 `docker` 執行檔的絕對路徑。`backup.log` 會持續成長，之後若需要
輪替（logrotate）是另外的維運工作，這裡不處理。

## 🚀 部署 (Deployment)

*   **部署方式**：以 Docker 容器化部署，FastAPI（後端）、React（前端）、PostgreSQL（資料庫）分別建立 container，並以 docker-compose 統一管理；本機檔案系統的上傳目錄需掛載為 volume，避免容器重建時資料遺失。
*   **存取範圍**：僅限內部網路存取，不對外公開。
*   **資料備份**：由 `scripts/backup.sh` 每日自動執行本機備份（`pg_dump` 匯出資料庫、`tar` 打包上傳目錄），保留最近 30 天並自動清除逾期備份，設定方式見「發布模式執行方式」章節的「設定每日備份」。備份檔只保留在部署主機本機，傳送至外部 NAS／其他主機的異地備份不在本專案規劃範圍內。

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。

