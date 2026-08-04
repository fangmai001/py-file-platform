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
| **管理後台－站台設定**                                 | **管理後台－LDAP 設定**                                  |
| ![管理後台站台設定](docs/screenshots/admin-site-settings.png) | ![管理後台 LDAP 設定](docs/screenshots/admin-ldap-settings.png) |
| **管理後台－Email SMTP 設定**                          | **個人資料頁**                                           |
| ![管理後台 Email SMTP 設定](docs/screenshots/admin-smtp-settings.png) | ![個人資料頁](docs/screenshots/profile.png) |
| **管理後台－首頁特色**                                 | **通知中心**                                             |
| ![管理後台首頁特色](docs/screenshots/admin-highlights.png) | ![通知中心](docs/screenshots/notifications.png)       |
| **首頁（深色模式）**                                   | **管理後台－使用者（深色模式）**                         |
| ![首頁深色模式](docs/screenshots/home-dark.png)        | ![管理後台使用者列表深色模式](docs/screenshots/admin-users-dark.png) |

## 🌟 專案特點

*   **身分驗證與權限分級**：支援使用者登入，帳號可由管理員建立，或串接 LDAP 進行驗證（LDAP 伺服器、帳密等設定可直接在管理後台網頁上設定，無需改動伺服器環境變數）。一般使用者可上傳與管理自己的檔案；管理員（Admin）擁有最高權限，可管理系統內所有使用者帳號（包含建立、編輯、停用、刪除其他使用者），並可檢視、管理所有使用者上傳的檔案。
*   **管理員重設使用者密碼**：使用者忘記密碼又收不到重設信時，管理員可在後台為該本機帳號重設密碼——系統會產生一組隨機密碼並直接顯示在畫面上，由管理員轉交給使用者，不需經過 Email；LDAP 帳號因密碼不在本平台保管，不適用此功能。
*   **個人資料自助管理**：已登入使用者可在「個人資料」頁自行修改顯示姓名與 Email、切換「上傳通知是否寄送 Email」偏好，並在輸入目前密碼驗證後自行變更密碼；忘記密碼時仍可透過 Email 重設連結重設。LDAP 帳號的密碼由 LDAP 伺服器管理，無法在本平台變更。
*   **檔案公開／私密設定**：使用者上傳檔案時可選擇公開（訪客可瀏覽下載）或私密（僅限本人與管理員檢視），滿足不想公開分享的檔案需求。
*   **檔案管理 API**：完整測試 Python 後端處理檔案上傳、讀取、更新與刪除的能力，並支援訪客直接下載公開檔案。
*   **檔案類型防護**：上傳檔案以常見辦公室文件為主（如 doc/docx、pdf、xls/xlsx 等），後端會進行副檔名／類型基本檢查，降低惡意檔案上傳風險。
*   **卡片分類瀏覽**：管理員可建立、編輯、刪除分類卡片（名稱、描述），檔案依卡片分組呈現，方便依部門或用途尋找檔案。
*   **檔案搜尋與分批載入**：公開檔案牆可用關鍵字搜尋（同時比對實際檔名與顯示名稱）並依卡片篩選；每個卡片分組預設先顯示 20 筆，需要時再逐步「載入更多」，避免檔案變多後一次塞爆頁面。
*   **檔案顯示名稱與公告日期**：檔案除了實際檔名外，可另外設定顯示名稱與公告日期，方便在清單中呈現（不影響實際檔名與下載內容）。
*   **版本歷史**：同名檔案上傳時不覆蓋舊檔，保留版本歷史，可回溯查看／下載先前版本。
*   **上傳通知與通知中心**：公開檔案上傳成功後，廣播站內通知給其他使用者；私密檔案不通知，避免洩漏其存在。站內通知一律寫入，通知信則只在收件者有設定 Email、且未關閉「上傳通知寄送 Email」偏好時才非同步寄出。登入後右上角的通知鈴鐺會顯示未讀數量，可展開列表、點擊單則標記已讀、「載入更多」翻閱較早的通知，或一次「全部標記已讀」。
*   **Email SMTP 設定**：寄送重設密碼信、上傳通知信所使用的 SMTP 伺服器、帳密等設定，可直接在管理後台網頁上設定，無需改動伺服器環境變數；未啟用或未設定時，信件內容僅會寫入後端日誌，方便本機開發測試。
*   **站台外觀設定**：站台名稱、瀏覽器分頁標題、首頁歡迎卡片的主標題與副標說明文字，以及網站圖示（favicon）與首頁歡迎圖片，皆可直接在管理後台的「站台設定」中修改；圖片支援 SVG / PNG / JPG / GIF / WebP / ICO 上傳，未設定時使用內建預設值。
*   **首頁特色介紹**：首頁歡迎區塊下方的特色卡片（圖示、標題、說明文字、排序、是否顯示）可在管理後台的「首頁特色」中自行新增、編輯與刪除；圖示由下拉選單挑選，卡片張數不固定，首頁版面會依張數自動調整。
*   **深色／明亮模式**：右上角可一鍵切換深色與明亮外觀，選擇會記在瀏覽器本機（`localStorage` 的 `theme`）；第一次造訪時跟隨作業系統的深色偏好（`prefers-color-scheme`），且在頁面首次繪製之前就套用主題，深色使用者不會先看到一片白再跳暗。
*   **一致的介面設計**：全站的色彩、圓角與間距統一由設計 token 定義（明亮／深色各一套，見 `frontend/src/index.css`），資料載入中顯示骨架（skeleton）佔位、沒有資料時顯示統一的空狀態說明，操作成功或失敗則以畫面右下角的浮動訊息（toast）提示；版面與字級會依螢幕寬度自動調整。
*   **檔案儲存**：檔案實體存放於伺服器本機檔案系統，資料庫僅儲存檔案 metadata。
*   **檔案大小限制**：上傳檔案設有單檔大小上限，避免磁碟空間被過大檔案佔滿。上限可由管理員在管理後台的「站台設定」中調整（1 到 512 MB），調整後立即生效，上傳頁面也會同步顯示目前上限並在選檔當下就擋下過大的檔案。
*   **操作稽核紀錄（Audit Log）**：記錄管理員的高權限操作（如建立/停用/刪除使用者帳號、刪除他人檔案等），包含操作者、時間、對象與動作內容，以利事後追溯。
*   **集中式管理後台**：`/admin` 以分頁形式集中所有管理功能，共九個分頁——使用者、卡片、連結卡片、首頁特色、檔案、操作紀錄、站台設定、LDAP 設定、Email SMTP 設定。
*   **前後端分離測試**：驗證前端與 Python 後端 API 的資料對接與傳輸效率。

## 🛠️ 技術棧 (Tech Stack)

*   **後端 (Backend)**: Python / FastAPI
*   **前端 (Frontend)**: React + TypeScript + Vite，UI 使用 Tailwind CSS v4 + shadcn（`base-nova`
    style，元件基底為 `@base-ui/react`）+ `lucide-react` 圖示，樣式組合用
    `class-variance-authority` / `tailwind-merge`，浮動訊息（toast）用 `sonner`、動畫用
    `tw-animate-css`；明亮／深色兩套設計 token 定義在 `frontend/src/index.css`
*   **資料庫 (Database)**: PostgreSQL

## 🗺️ 頁面與權限 (Pages)

| 路徑                | 頁面                                       | 需要登入                  |
| ------------------- | ------------------------------------------ | ------------------------- |
| `/`                 | 公開檔案牆（檔案卡片與連結卡片）；登入後可在此管理自己的檔案（公開／私密切換、版本、刪除） | 否，訪客可瀏覽下載公開檔案 |
| `/about`            | 關於本站                                   | 否                        |
| `/login`            | 登入                                       | 否                        |
| `/forgot-password`  | 忘記密碼（寄送重設連結）                   | 否                        |
| `/reset-password`   | 以 Email 連結重設密碼                      | 否                        |
| `/upload`           | 上傳檔案（可設定顯示名稱、卡片分類、公告日期與可見度） | 是                        |
| `/profile`          | 個人資料（姓名／Email／密碼／通知偏好）    | 是                        |
| `/admin`            | 管理後台                                   | 是，且需 admin 角色       |

`/upload`、`/profile`、`/admin` 在前端未符合條件時會導向 `/login`，但這只是操作動線上的引導；實際權限一律由後端 API 驗證 JWT 與角色後把關。

## 🧑‍💻 本機執行方式 (Local Development)

### 前置準備

複製環境變數範本並依需要調整：

```bash
cp .env.example .env
```

`.env` 放在專案根目錄（不是 `backend/` 底下），前後端與 `docker-compose` 都共用同一份設定。

### ⚙️ 環境變數說明

`.env.example` 內含完整註解，以下整理常用設定；未列出的項目沿用程式內建預設值（見 `backend/app/core/config.py`）。

**資料庫**

| 變數                                                  | 說明                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `docker-compose` 建立 db service 時使用的帳密與資料庫名稱             |
| `POSTGRES_PORT`                                       | db service 對外映射的 port，預設 `5432`                               |
| `DATABASE_URL`                                        | 後端連線字串。原生開發用 `localhost`；全 Docker 時 `docker-compose.yml` 會覆寫為指向 `db` |

**檔案上傳**

| 變數                  | 說明                                             |
| --------------------- | ------------------------------------------------ |
| `UPLOAD_DIR`          | 檔案實體存放目錄，預設 `./uploads`               |
| `MAX_UPLOAD_SIZE_MB`  | 單檔上傳大小上限（MB）的初始值，預設 `50`。資料庫建立後改以管理後台「站台設定」的值為準 |

**驗證**

| 變數                           | 說明                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| `JWT_SECRET_KEY`               | JWT 簽章金鑰，**正式環境務必改掉**：`openssl rand -hex 32`             |
| `JWT_ALGORITHM`                | 簽章演算法，預設 `HS256`                                              |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | Token 有效時間（分鐘），預設 `1440`（一天）                           |

**初始管理員（第一次啟動必看）**

建立使用者的 API 本身就需要管理員身分，所以全新的資料庫需要先有一個 admin 才能開始操作。設定下列兩個變數後，
後端啟動時會自動建立第一個管理員帳號（見 `backend/app/core/seed.py`）：

```
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=change-me-to-a-real-password
```

僅在「系統中還沒有任何 admin 帳號」時才會生效，建立完成後即可從 `.env` 移除。

**前端連結與密碼重設**

| 變數                                    | 說明                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| `FRONTEND_BASE_URL`                     | 產生密碼重設信連結時使用的前端網址。**正式環境務必改掉**：預設的 `http://localhost:5173` 是 Vite 開發伺服器的位址，正式環境根本沒有這個 port，留著它等於每一封重設密碼信都寄出一個沒人打得開的死連結。填使用者實際連進來的網址（例如 `http://files.example.internal`），詳見「發布模式執行方式」的首次安裝檢查表 |
| `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`   | 重設密碼 token 有效時間（分鐘），預設 `30`                    |
| `VITE_API_BASE_URL`                     | 僅供前端開發使用的後端網址；正式建置在 `Dockerfile` 內進行且不讀這個檔案，因此不需要設定 |

**SMTP_\* 與 LDAP_\*（只是初始種子值）**

這兩組變數**只在資料庫對應的設定列第一次被讀取時**用來填入初始值；之後 Email SMTP 與 LDAP 的設定一律以管理後台
的「Email SMTP 設定」／「LDAP 設定」分頁為準，改 `.env` 不會有任何效果。後端啟動時若偵測到 env 的設定已被資料庫
覆蓋，會在 log 印出警告提醒。

**備份**

`BACKUP_ENABLED`、`BACKUP_LOCAL_DIR`、`BACKUP_RETENTION_DAYS` 供 `scripts/backup.sh` 使用，
說明見下方「發布模式執行方式」的「設定每日備份」。

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
`docker-compose.yml` 疊加使用，兩者的 frontend 服務會同時啟動）：只有 `app` 與 `db` 兩個 service，
對外只暴露一個 port（80）。

`app` 由專案根目錄的 `Dockerfile` 以 multi-stage build 產生：第一階段用 `node:22-alpine` 執行
`npm ci && npm run build`，第二階段的 `python:3.12-slim` 再把產出的 `dist/` 複製成 image 內的
`/app/static`，由 FastAPI 直接靜態伺服（見 `backend/app/core/static.py`）。因此前後端是同一個
origin，不需要反向代理，正式環境總共只有 **app 與 postgres 兩個 image**。

### 1. 啟動 app／db

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

### 2. 離線環境交付

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

#### 離線主機上的目錄結構

離線主機不會（也不該）build，因此不需要複製原始碼，但**需要 `scripts/`**：`scripts/backup.sh` 是以
「自己所在目錄的上一層」推導部署根目錄，再從那裡讀 `.env` 與 `docker-compose.prod.yml`。把交付內容排成
與 repo 相同的相對結構：

```
/opt/py-file-platform/
  docker-compose.prod.yml
  .env
  scripts/backup.sh
  uploads/                                        # bind mount 目標，先建好
  release/
    py-file-platform-app-v0.1.0.tar
    py-file-platform-db-postgres-16-alpine.tar
    MANIFEST.sha256
```

`release/` 建議直接留在部署主機上並保留最近幾版的 app tar——回滾時要 `docker load` 的就是它，見
「4. 版本升級與回滾」。

#### 首次安裝：先把 `.env` 改對，再 `up -d`

`.env.example` 的預設值是開發用的。全新的離線主機在第一次 `up -d` **之前**必須改掉下列項目，其中前兩項
事後補救的代價特別高：

| 變數 | 為什麼要在第一次 `up -d` 之前改 |
| --- | --- |
| `POSTGRES_PASSWORD`（連同 `POSTGRES_USER`／`POSTGRES_DB`） | postgres image 只在初始化 `db_data` volume 時套用這組帳密，之後改 `.env` 完全不生效，要改就得刪掉 volume 從頭來過 |
| `JWT_SECRET_KEY` | 用 `openssl rand -hex 32` 產生；留著預設值等於任何知道這份 repo 的人都能自行簽出有效 token |
| `APP_VERSION` | 必填且不可為 `latest`，說明見本節上方 |
| `FRONTEND_BASE_URL` | 密碼重設信裡連結的來源（`backend/app/api/password_reset.py`），預設的 `http://localhost:5173` 在離線主機是死連結；填使用者實際連進來的網址，例如 `http://files.example.internal` |
| `INITIAL_ADMIN_USERNAME`／`INITIAL_ADMIN_PASSWORD` | 全新資料庫裡一個 admin 都沒有，而建立帳號的 API 本身就要 admin 身分。僅在系統尚無 admin 時生效（`backend/app/core/seed.py`），第一個管理員建好後即可從 `.env` 移除 |

反過來說，這兩項在正式環境**不需要**動，改了反而容易出錯：`DATABASE_URL` 會被
`docker-compose.prod.yml` 覆寫成指向 `db` service；`VITE_API_BASE_URL` 只服務前端開發，正式建置在
image 內完成、根本不讀這個檔案。

#### 載入與啟動

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

### 4. 版本升級與回滾

#### 升級 app（migration 會自動執行）

根目錄 `Dockerfile` 的啟動指令是 `alembic upgrade head && uvicorn ...`，所以 container 一啟動就會把
資料庫 schema 套用到新版，離線主機上**不需要**進 container 手動跑任何 migration 指令。上傳的檔案與
資料庫內容都不受影響：`db_data` 是 named volume、`uploads/` 是 bind mount，換 image 只會 recreate
container，兩者都在 container 之外。

但 migration 執行了就直接改下去，沒有自動的還原點，所以**升級的第一步是先手動備份**：

```bash
./scripts/backup.sh                                  # 確認 backups/ 產出 db_*.sql.gz
docker load -i py-file-platform-app-<新版本>.tar
# 編輯 .env 的 APP_VERSION 為新版本
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f app # 確認 migration 與啟動都成功
curl -s http://localhost/health                       # 確認跑的確實是新版本
```

若 migration 失敗，`&&` 會讓 uvicorn 不啟動，加上 `restart: unless-stopped`，container 會不斷重啟。
這是刻意的——帶著改壞的 schema 硬跑更糟——遇到服務起不來時請先看 `logs app` 的內容，而不是直接判定
image 有問題。

#### 回滾 app

`alembic upgrade head` 只會往前，**不會**自動降版，所以只把 image 換回舊版會讓舊版程式碼對上新版
schema。正確順序是先還原資料庫，再換 image：

```bash
docker compose -f docker-compose.prod.yml stop app   # 還原期間不要有連線在寫入
gunzip -c backups/db_<時間戳>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U platform -d platform
docker load -i release/py-file-platform-app-<舊版本>.tar
# 編輯 .env 的 APP_VERSION 為舊版本
docker compose -f docker-compose.prod.yml up -d
curl -s http://localhost/health                      # 確認確實退回舊版本
```

因此 `release/` 底下建議保留最近幾版的 `py-file-platform-app-*.tar`（每版約 70 MB），否則要回滾時
會沒有可載入的舊 image。`postgres` 那份不隨版本變動，留一份即可。

還原指令的細節（為什麼要先 `stop app`、舊備份檔要怎麼處理、`uploads/` 要不要一起還原）見下方
「5. 從備份還原」，那裡是唯一一份完整說明，這裡只列回滾當下的順序。

#### 確認目前執行的版本

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

#### 升級 postgres

**major 版本（例如 16 → 17）不能只改 `docker-compose.prod.yml` 的 tag**，資料目錄的版本對不上，
container 會直接拒絕啟動。必須走 `pg_dump` 匯出 → 改 tag → 清空 `db_data` volume → restore 的流程。
patch 版（例如 `16.8` → `16.9`）則可以直接換 tag、重新 `package-images.sh` 出 db tar，app 完全不用重建。

### 5. 從備份還原

`scripts/backup.sh` 產出兩個檔案，資料庫與上傳檔案要**分別**還原，缺一不可：`db_<時間戳>.sql.gz`
（`pg_dump` 的純 SQL）與 `uploads_<時間戳>.tar.gz`（`uploads/` 目錄）。資料庫裡存的只有 metadata 與
`FileVersion.stored_path`，檔案本體在 `uploads/`——只還原其中一邊，會得到一份指向不存在檔案的清單。

#### 還原資料庫

```bash
docker compose -f docker-compose.prod.yml stop app    # 還原期間不要有連線在讀寫
gunzip -c backups/db_<時間戳>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U platform -d platform
docker compose -f docker-compose.prod.yml up -d
```

先 `stop app` 有兩個理由：dump 開頭會 `DROP` 掉既有物件，app 若正好有查詢在跑，`DROP` 會卡在 lock 上；
而且還原途中的資料庫處於半空狀態，這時候讓使用者連進來只會看到殘缺的畫面。還原目標若是一個全新的空
資料庫，`psql` 會印出一連串 `... does not exist, skipping`，那是正常的。

`pg_dump` 帶的 `--clean --if-exists` 正是讓這一行指令有效的關鍵：還原目標永遠是已經被
`alembic upgrade head` 建好 schema 的資料庫，少了這兩個參數，每個 `CREATE TABLE` 都會撞上
`already exists`、每筆資料都會撞上 duplicate key，而 `psql` 預設不會因此中止——指令看起來跑完了，資料庫
其實原封不動。**這個參數是後來才補上的**，所以更早之前產生的 `db_*.sql.gz` 沒有這層保護，還原前必須先
手動清空資料庫：

```bash
docker compose -f docker-compose.prod.yml stop app
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U platform -d postgres -c 'DROP DATABASE platform;' -c 'CREATE DATABASE platform OWNER platform;'
gunzip -c backups/db_<舊時間戳>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U platform -d platform
docker compose -f docker-compose.prod.yml up -d
```

#### 還原 uploads

`backup.sh` 打包時是以 `uploads` 這個目錄名作為 tar 內的最上層項目，因此要在**部署根目錄**解開，
並且要用 `sudo`：

```bash
docker compose -f docker-compose.prod.yml stop app
sudo tar -xzf backups/uploads_<時間戳>.tar.gz -C /opt/py-file-platform
docker compose -f docker-compose.prod.yml up -d
```

`sudo` 不能省略。app container 內的行程以 root 執行，經由 bind mount 寫出來的檔案在 host 上也就屬於
root，一般部署帳號解開時會得到 `Cannot open: Permission denied`——而 `tar` 遇到這種錯誤仍會把其餘檔案
解完並以非零狀態結束，很容易被誤判成「解開了」。備份方向不受影響：那些檔案是 0644，非 root 的 cron
帳號讀得到，`backup.sh` 不需要 `sudo`。

解開只會覆蓋同名檔案，不會刪掉備份之後才上傳的東西。若要得到與備份時完全一致的狀態，請先把現有的
`uploads/` 更名保留再解開，不要直接刪除。

還原完成後務必實際下載一個檔案驗證。資料庫與 `uploads/` 分兩步還原，只要其中一步默默失敗，檔案清單
看起來是對的，點下載卻會拿到 404「檔案內容不存在」。

#### 在新主機上從備份重建

離線主機整台掛掉時，走這個順序：

```bash
# 1. 依「2. 離線環境交付」擺好目錄結構、載入兩個 tar
# 2. 準備 .env：POSTGRES_USER / POSTGRES_DB 必須與備份來源那台相同（dump 內含 owner 相關語句）
# 3. 先讓 app 起一次，由 alembic 建好 schema
docker compose -f docker-compose.prod.yml up -d
curl -s http://localhost/health
# 4. 依上面兩節還原資料庫與 uploads（uploads 那步記得 sudo）
# 5. 驗收：登入原有帳號、確認首頁檔案牆的檔案可以正常下載
```

第 3 步不能省略。資料庫還原本身雖然會帶進完整 schema，但先跑一次 `up -d` 才能確認 image、`.env` 與
volume 都是好的——在還原資料之前先發現設定有問題，遠比還原到一半才發現容易處理。

## 🚀 部署 (Deployment)

*   **部署方式**：以 Docker 容器化部署，正式環境只有兩個 image——`app`（FastAPI 後端，內含建置好的 React 前端靜態檔）與 PostgreSQL（資料庫），以 docker-compose 統一管理；本機檔案系統的上傳目錄需掛載為 volume，避免容器重建時資料遺失。
*   **存取範圍**：僅限內部網路存取，不對外公開。
*   **資料備份**：由 `scripts/backup.sh` 每日自動執行本機備份（`pg_dump` 匯出資料庫、`tar` 打包上傳目錄），保留最近 30 天並自動清除逾期備份，設定方式見「發布模式執行方式」章節的「設定每日備份」，還原（含在新主機上重建）則見同章節的「從備份還原」。備份檔只保留在部署主機本機，傳送至外部 NAS／其他主機的異地備份不在本專案規劃範圍內。

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。

