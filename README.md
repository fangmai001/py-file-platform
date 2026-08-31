# 資訊消息平台（py-file-platform）

資訊消息平台是一個基於 Python 開發的檔案管理與消息發布平台系統。
本專案的主要目的是測試 Python 在前後端互動中，處理資料「增刪查改 (CRUD)」與 API 的支援能力。

資訊消息平台定位為公開的文件與消息分享空間（性質接近簡化版的 Facebook 貼文牆，但聚焦在檔案分享）：訪客無需登入，即可瀏覽並直接下載所有公開檔案；若要上傳或管理檔案，才需要登入帳號。

## 📸 畫面截圖 (Screenshots)

|                                                       |                                                         |
| ----------------------------------------------------- | ------------------------------------------------------- |
| **首頁公開檔案牆**（含檔案依資料夾分組與連結卡片）         | **登入頁**                                               |
| ![首頁](docs/screenshots/home.png)                     | ![登入頁](docs/screenshots/login.png)                    |
| **上傳頁**                                             | **管理後台－使用者**                                     |
| ![上傳頁](docs/screenshots/upload.png)                 | ![管理後台使用者列表](docs/screenshots/admin-users.png)  |
| **管理後台－資料夾**                                     | **管理後台－連結卡片**                                   |
| ![管理後台資料夾列表](docs/screenshots/admin-folders.png) | ![管理後台連結卡片列表](docs/screenshots/admin-link-cards.png) |
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
*   **資料夾分類瀏覽**：管理員可建立、編輯、刪除資料夾（名稱、說明），檔案依資料夾分組呈現，方便依部門或用途尋找檔案。
*   **檔案搜尋與分批載入**：公開檔案牆可用關鍵字搜尋（同時比對實際檔名與顯示名稱）並依資料夾篩選；每個資料夾分組預設先顯示 20 筆，需要時再逐步「載入更多」，避免檔案變多後一次塞爆頁面。
*   **檔案顯示名稱與公告日期**：檔案除了實際檔名外，可另外設定顯示名稱與公告日期，方便在清單中呈現（不影響實際檔名與下載內容）。
*   **版本歷史**：同名檔案上傳時不覆蓋舊檔，保留版本歷史，可回溯查看／下載先前版本。
*   **上傳通知與通知中心**：公開檔案上傳成功後，廣播站內通知給其他使用者；私密檔案不通知，避免洩漏其存在。站內通知一律寫入，通知信則只在收件者有設定 Email、且未關閉「上傳通知寄送 Email」偏好時才非同步寄出。登入後右上角的通知鈴鐺會顯示未讀數量，可展開列表、點擊單則標記已讀、「載入更多」翻閱較早的通知，或一次「全部標記已讀」。
*   **Email SMTP 設定**：寄送重設密碼信、上傳通知信所使用的 SMTP 伺服器、帳密等設定，可直接在管理後台網頁上設定，無需改動伺服器環境變數；未啟用或未設定時，信件內容僅會寫入後端日誌，方便本機開發測試。
*   **站台外觀設定**：站台名稱、瀏覽器分頁標題、首頁歡迎卡片的主標題與副標說明文字，以及網站圖示（favicon）與首頁歡迎圖片，皆可直接在管理後台的「站台設定」中修改；圖片支援 SVG / PNG / JPG / GIF / WebP / ICO 上傳，未設定時使用內建預設值。
*   **首頁特色介紹**：首頁歡迎區塊下方的特色卡片（圖示、標題、說明文字、排序、是否顯示）可在管理後台的「首頁特色」中自行新增、編輯與刪除；圖示由下拉選單挑選，卡片張數不固定，首頁版面會依張數自動調整。
*   **RSS 訂閱來源**：管理員可在後台的「RSS 訂閱」分頁維護外部 RSS／Atom 來源（名稱、網址、資料夾、公開／私密、啟用／停用），平台會定期抓回最新文章，彙整顯示在 `/feeds`「訂閱」頁；抓取只讀取 feed 本身，不會進一步爬取原文網頁。每個來源可個別設定公開或私密，私密來源的文章只有登入者看得到。新增來源後可按「立即抓取」當場驗證網址是否正確；定時抓取的開關與間隔也在同一個分頁設定，由應用程式自己執行，不需要在主機上設定 cron。
*   **深色／明亮模式**：右上角可一鍵切換深色與明亮外觀，選擇會記在瀏覽器本機（`localStorage` 的 `theme`）；第一次造訪時跟隨作業系統的深色偏好（`prefers-color-scheme`），且在頁面首次繪製之前就套用主題，深色使用者不會先看到一片白再跳暗。
*   **一致的介面設計**：全站的色彩、圓角與間距統一由設計 token 定義（明亮／深色各一套，見 `frontend/src/index.css`），資料載入中顯示骨架（skeleton）佔位、沒有資料時顯示統一的空狀態說明，操作成功或失敗則以畫面右下角的浮動訊息（toast）提示；版面與字級會依螢幕寬度自動調整。
*   **檔案儲存**：檔案實體存放於伺服器本機檔案系統，資料庫僅儲存檔案 metadata。
*   **檔案大小限制**：上傳檔案設有單檔大小上限，避免磁碟空間被過大檔案佔滿。上限可由管理員在管理後台的「站台設定」中調整（1 到 512 MB），調整後立即生效，上傳頁面也會同步顯示目前上限並在選檔當下就擋下過大的檔案。
*   **操作稽核紀錄（Audit Log）**：記錄管理員的高權限操作（如建立/停用/刪除使用者帳號、刪除他人檔案等），包含操作者、時間、對象與動作內容，以利事後追溯。
*   **集中式管理後台**：`/admin` 以分頁形式集中所有管理功能，共十個分頁——使用者、資料夾、連結卡片、RSS 訂閱、首頁特色、檔案、操作紀錄、站台設定、LDAP 設定、Email SMTP 設定。
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
| `/`                 | 公開檔案牆（檔案依資料夾分組，另有連結卡片）；登入後可在此管理自己的檔案（公開／私密切換、版本、刪除） | 否，訪客可瀏覽下載公開檔案 |
| `/feeds`            | 訂閱文章（外部 RSS／Atom 來源抓回的最新文章） | 否，訪客可瀏覽公開來源的文章 |
| `/about`            | 關於本站                                   | 否                        |
| `/login`            | 登入                                       | 否                        |
| `/forgot-password`  | 忘記密碼（寄送重設連結）                   | 否                        |
| `/reset-password`   | 以 Email 連結重設密碼                      | 否                        |
| `/upload`           | 上傳檔案（可設定顯示名稱、資料夾、公告日期與可見度） | 是                        |
| `/profile`          | 個人資料（姓名／Email／密碼／通知偏好）    | 是                        |
| `/admin`            | 管理後台                                   | 是，且需 admin 角色       |

`/upload`、`/profile`、`/admin` 在前端未符合條件時會導向 `/login`，但這只是操作動線上的引導；實際權限一律由後端 API 驗證 JWT 與角色後把關。

## 🧑‍💻 本機執行方式 (Local Development)

### 前置準備

複製環境變數範本並依需要調整：

```bash
cp .env.example .env
```

`.env` 放在專案根目錄（不是 `backend/` 底下），前後端與 `docker-compose` 都共用同一份設定。各項設定的
用途、以及正式環境務必改掉的項目，見 [環境變數說明](docs/configuration.md)。

### 後端 (backend)

需先啟動一個 PostgreSQL（例如用 `docker compose up db`）。

第一次執行要先建立虛擬環境並安裝依賴（`backend/venv` 被 `.gitignore` 忽略，新 clone 的人不會有）：

```bash
cd backend
python3.12 -m venv venv            # 或 uv venv venv
source venv/bin/activate
pip install -r requirements-dev.txt   # 內含 -r requirements.txt，另有 pytest 與 httpx
```

之後每次開發：

```bash
cd backend
source venv/bin/activate        # venv 已存在時直接 activate 即可

alembic upgrade head            # 套用資料庫 migration
uvicorn app.main:app --reload   # 開發模式啟動，預設 http://localhost:8000
```

原生開發（uvicorn 跑在 host，db 在 Docker）時，`.env` 的 `DATABASE_URL` 要用 `localhost`。

### 前端 (frontend)

```bash
cd frontend
npm install
npm run dev   # Vite dev server，預設 http://localhost:5173
```

> 人用 `npm install`（要能加套件、更新 lockfile），機器用 `npm ci`（完全照 lockfile 安裝）。
> CI（`frontend-ci.yml`）與兩個 `Dockerfile` 都是 `npm ci`，這個區分是刻意的。

### 使用 Docker Compose 一次啟動全部服務

```bash
docker compose up --build
```

會啟動三個 service：`db`（postgres:16-alpine）、`backend`（container 啟動時自動跑 `alembic upgrade
head` 再啟動 uvicorn，`:8000`）、`frontend`（Vite dev server，`:5173`）。此模式下 backend 讀取的
`DATABASE_URL` 會由 `docker-compose.yml` 覆寫為指向 `db` 這個 service。`./uploads` 會掛載進
backend container，確保上傳檔案在容器重建後仍保留。

> ℹ️ dev compose **不在版號鏈上**：`backend/Dockerfile` 沒有 `ARG APP_VERSION`（只有正式環境的
> 根目錄 `Dockerfile` 有），所以這個模式下 `GET /health` 一律回 `{"version": "dev"}`。這是預期行為，
> 不是壞掉——版號機制只服務離線交付的正式 image。

> ⚠️ **這個模式的定位是「一鍵把整套跑起來看看」，不是日常開發環境。** 兩個 service 都沒有掛
> 原始碼 volume（程式碼是 `COPY` 進 image 的），backend 也沒有 `--reload`，所以**改了程式碼要重跑
> `docker compose up --build` 才會生效**——容器裡的 Vite 監看的是 image 內那份靜態複本，不會收到
> host 上的改動。要邊改邊看，請用上面「後端 (backend)」與「前端 (frontend)」兩節的原生模式，
> 只把 db 留在 Docker 裡（`docker compose up db`）。

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

## 📚 文件 (Documentation)

安裝、維運與開發慣例的完整說明放在 `docs/`，README 只保留「認識專案 + 本機跑起來」的部分：

| 文件 | 內容 |
| --- | --- |
| [環境變數說明](docs/configuration.md) | `.env` 各項設定的用途，以及正式環境務必改掉的項目 |
| [發布模式與離線交付](docs/deployment.md) | 正式環境啟動、image 打包與離線主機安裝、版本升級與回滾 |
| [備份與還原](docs/backup-restore.md) | 每日備份、RSS 定時抓取、從備份還原（含在新主機上重建） |
| [持續整合與分支慣例](docs/ci.md) | 四個必要檢查、分支命名、commit message、分支保護 |
| [專案筆記](docs/notes/README.md) | 留存筆記的索引，以及筆記該放哪裡的規則 |

## 🚀 部署 (Deployment)

*   **部署方式**：以 Docker 容器化部署，正式環境只有兩個 image——`app`（FastAPI 後端，內含建置好的 React 前端靜態檔）與 PostgreSQL（資料庫），以 docker-compose 統一管理；本機檔案系統的上傳目錄需掛載為 volume，避免容器重建時資料遺失。
*   **存取範圍**：僅限內部網路存取，不對外公開。
*   **資料備份**：由 `scripts/backup.sh` 每日自動執行本機備份（`pg_dump` 匯出資料庫、`tar` 打包上傳目錄），保留最近 30 天並自動清除逾期備份，設定方式見 [備份與還原](docs/backup-restore.md) 的「1. 設定每日備份」；還原則由對稱的 `scripts/restore.sh` 負責（含在新主機上重建），見同一份文件的「3. 從備份還原」。備份檔只保留在部署主機本機，傳送至外部 NAS／其他主機的異地備份不在本專案規劃範圍內。

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。

