# CLAUDE.md

本檔案提供 Claude Code（claude.ai/code）在此 repo 中工作時的指引。

## Language

在此 repo 中一律以繁體中文與使用者溝通，與 README.md 一致。程式碼、識別符與程式碼註解則照慣例維持英文。

本檔案（CLAUDE.md）本身也以繁體中文撰寫，後續維護請沿用同一風格：敘述文字用繁中並使用全形標點，
章節標題、檔案路徑、識別符、指令等技術符號一律維持英文原樣。

PR 標題與內文同樣必須使用繁體中文，並使用全形標點（`，`「」`（）`），而非半形的 `,` `()` `:`。
PR 標題套用與 commit 訊息相同的主旨規則，見 Git workflow 底下的 Commit messages and PR titles 一節。

在此 repo 上執行 `gh pr edit` 會因為 `Projects (classic)` 的 GraphQL 棄用錯誤而失敗，即使編輯的是
無關的欄位也一樣。請改用
`gh api repos/<owner>/<repo>/pulls/<n> -X PATCH -f title=... -f body=...`。

## Git workflow

變更一律透過 feature branch + PR 合併進 GitHub 上的 `main`，不直接 commit 到 `main`。即使是小改動
（例如純文件更新）也適用。目前為止的每一次變更，包含先前的純文件更新，都是走這條路徑。

### Branch naming

分支命名為 `<type>/<kebab-case-description>`，其中 `<type>` 是 `feat`、`fix`、`docs`、`chore` 其中之一。
描述部分是以連字號串接的小寫英文單字，例如 `feat/backup-automation`、`fix/alembic-merge-heads`、
`docs/update-readme-features-env`、`chore/cleanup-legacy-css`。

**唯一會破壞這項規則的是 worktree。** Claude Code 會把新 worktree 的分支命名為 `worktree-<name>` 或
`worktree-bridge-cse_<id>`，而其中好幾個已經就這樣被推上 `origin`。從 worktree 推送前，請先改名
（`git branch -m feat/whatever`），或明確指定正確的名稱推送
（`git push -u origin HEAD:feat/whatever`）——`worktree-` 前綴絕對不可進到 `origin`。

### Commit messages and PR titles

- 主旨行：繁體中文，以動詞開頭——`新增` / `修正` / `更新` / `移除` / `文件`。
  **不加前綴標籤。** 不要使用 Conventional Commits（`feat:` / `fix:`），也不要使用舊的中文標籤風格
  （`文件：` / `chore：`）。
- 主旨內的標點使用全形（`，`「」`（）`），絕不使用半形的 `,` `()` `:`。句中夾帶的英文識別符維持原樣
  （例如 `shadcn/ui`、`pg_dump`）。
- 不要在主旨手動寫入 issue 或 PR 編號。改在內文以 `Closes #N` 連結 issue。PR 以 squash 合併時 GitHub
  自動附加的 `(#NN)` 屬於工具行為，不算違規，事後也不要把它拿掉。
- 內文說明這次變更**為什麼**要做，而不是複述 diff，並保留既有的 `Co-Authored-By:` trailer。

一個好例子，取自每日備份那次 commit：
`新增每日備份 script（本機 pg_dump + tar，保留 30 天）`

### Release tags

Tag 使用 semver，格式為 `vMAJOR.MINOR.PATCH`（例如 `v0.1.0`），從 `main` 切出。此 repo 目前還沒有任何
tag——當確實需要打第一個 tag 時，請先與使用者確認版號再推送。

### Historical exceptions

在 PR #31 之前合併的分支（`feature-issue-*`、`fix-about-heading`、`theme-blue-dark-light-toggle`、
`worktree-*`），以及早期的 commit 主旨（`文件：`、`chore：`、`fix: `，還有像 `Add file upload/download API`
這類純英文主旨），都早於上述規則。它們維持原樣——改寫它們等於改寫已發布的歷史——所以不要把它們當成
可以跟隨的範例。

## Project overview

py-file-platform 是一個檔案管理／分享平台，定位類似社團或內部團隊的公開文件牆：訪客無需登入即可瀏覽並
下載公開檔案；只有要上傳或管理檔案時才需要登入。它存在的主要目的，是拿 Python 後端的 CRUD／API 處理
能力去對接 React 前端做實測。

已實作：本機帳號與 LDAP 登入／JWT 驗證、檔案上傳下載（含每個檔案的公開／私密可見性與版本歷史）、
依 folder 分組的瀏覽、link card 分類、站台品牌設定、管理員可編輯的首頁特色卡片、自助重設密碼、
管理員使用者管理、高權限操作的稽核紀錄，以及上傳通知——完整功能列表見 README.md。上傳通知現在也有前端了：
`frontend/src/components/NotificationBell.tsx`（掛載於 `App.tsx`）透過
`frontend/src/api/notifications.ts` 呼叫 `GET/PATCH /api/notifications`。`AboutPage.tsx` 已不再有
「尚未實作」區塊——LDAP 與上傳通知都已列在「已實作功能」之下。

LDAP 設定（server URI、bind DN／密碼、base DN、user search filter）可在執行期由管理員於 `/admin` 的
「LDAP 設定」分頁編輯，背後存放在單列的 `ldap_settings` 資料表，而不是只靠環境變數——見
`app/core/ldap_config.py` 與 `app/api/ldap_settings.py`。`.env` 中的 `LDAP_*` 環境變數只在該列第一次被
讀取時用來填入初始值；在那之後，修改一律走管理後台 UI／API，而不是改 env 檔。

技術棧：FastAPI（後端）+ React/Vite（前端）+ PostgreSQL，以 docker-compose 部署。後端與前端都已端到端
接通（API 路由、頁面與測試套件都存在），不是空殼。

## Commands

### Backend (`backend/`)

`backend/venv` 已有現成的 venv（以 `uv` 建立，Python 3.12）。

```bash
cd backend
source venv/bin/activate

# 啟動開發伺服器（從 ../.env 讀取 DATABASE_URL 等設定）
uvicorn app.main:app --reload

# 套用 migration
alembic upgrade head

# 修改 app/models/ 下的 model 後，建立新的 migration
alembic revision --autogenerate -m "description"

# 執行測試套件
pytest
```

### Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev      # vite 開發伺服器，位於 :5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm test          # vitest run
```

### Full stack via Docker

```bash
docker compose up --build
```

會啟動三個服務：`db`（postgres:16-alpine）、`backend`（uvicorn 於 :8000，容器啟動時會執行
`alembic upgrade head`，見 `backend/Dockerfile`）、`frontend`（vite 開發伺服器於 :5173）。host 上的
`./uploads` 目錄會 bind-mount 進 backend 容器，讓已上傳的檔案在容器重建後仍然存在。

正式環境（`docker-compose.prod.yml`）用的是完全不同的組合：只有 `app` 與 `db` 兩個 service。`app` 由
**專案根目錄的 `Dockerfile`** 以 multi-stage build 產生（node 階段建置前端 → python 階段將 `dist/`
複製為 image 內的 `/app/static`），前端靜態檔由 FastAPI 直接伺服，因此前後端同 origin、沒有 nginx 或
任何反向代理。改前端不需要在 host 上先跑 `npm run build`。dev 的 `docker-compose.yml` 與
`frontend/Dockerfile` 維持 Vite dev server 不受影響。

## Configuration

放在**專案根目錄**（而非 `backend/` 之下）的單一 `.env` 是原生開發與 Docker 開發共同的設定來源——見
`.env.example`。特別注意：

- `backend/app/core/config.py` 會從自身檔案路徑往上走三層來定位這個根目錄的 `.env`，因此不論 uvicorn 是
  從 `backend/` 原生啟動，還是應用程式跑在 Docker 容器內，`Settings()` 的行為都一致。
- `DATABASE_URL` 在原生開發與完整 docker-compose 之下並不相同：當 uvicorn 跑在 host 上、連向
  dockerized 的 `db` 時使用 `localhost`；當 backend 本身也跑在 Docker 內時則使用 host `db`
  （docker-compose 正是為此透過 `environment:` 區塊覆寫 `DATABASE_URL`，見 `docker-compose.yml`）。

## Backend architecture

- `app/main.py` — FastAPI 應用程式進入點；掛載 `app/api/router.py` 提供的單一 router，接著（順序很重要，
  必須在 `include_router` 之後）呼叫 `app/core/static.py` 的 `mount_frontend()`，因為它註冊的 catch-all
  route 會匹配所有路徑，早一步註冊就會遮蔽掉整組 API。另外掛了 `GZipMiddleware`（沒有反向代理後，壓縮
  是這裡的責任）。
- `app/core/static.py` — production image 內建的前端靜態檔伺服：實際檔案優先，其餘 fallback 回
  `index.html` 支援 react-router 深層連結，但 `/api/...` 開頭的未註冊路徑仍回 404 JSON。
  `settings.static_dir`（預設 `./static`）不存在時整個掛載會被跳過，所以原生開發完全不受影響。
- `app/api/router.py` — `APIRouter(prefix="/api")`，納入各個功能 router，每個都是 `app/api/` 底下獨立的
  模組：`auth.py`（登入／JWT——本機密碼或透過 `app/core/ldap.py` 的 LDAP bind，以及 `/me`）、
  `files.py`（上傳下載、版本、可見性切換、依 folder 分組的列表，並觸發上傳通知）、
  `folders.py`（card CRUD，寫入操作透過 `require_admin` 限定管理員）、`link_cards.py`
  （管理員維護的外部連結卡片，與檔案一樣依 folder 分組）、`highlights.py`（首頁的特色卡片——與
  `link_cards.py` 相同的「`GET` 公開、寫入僅限管理員」形狀；`icon` 存的是 kebab-case 字串 key，由
  `app/schemas/highlight.py` 的 `HighlightIconKey` `Literal` 驗證，而
  `frontend/src/lib/highlight-icons.ts` 會把它對應到 lucide 元件並帶有 fallback，因此兩份清單必須保持
  同步）、`site_settings.py`（品牌文字與每檔上傳大小上限 `max_upload_size_mb`，寫入僅限管理員，另有
  管理員上傳的 favicon／hero 圖片——那些檔案放在 `UPLOAD_DIR/branding/`，由**公開、免驗證**的
  `GET /api/site-settings/assets/{filename}` 路由提供，這是本應用程式「一切都走經過驗證的
  `FileResponse`」規則的唯一例外，因為 favicon 必須在登入前就能載入）、`ldap_settings.py`
  （LDAP 設定 CRUD，`GET`+`PATCH` 都僅限管理員，因為它會揭露基礎架構細節，這點與 `site_settings.py`
  的公開 `GET` 不同——而且永遠不會回傳 bind 密碼本身，只回傳是否已設定）、`smtp_settings.py`
  （寄件用的 SMTP 設定 CRUD，與 `ldap_settings.py` 相同的「`GET`+`PATCH` 僅限管理員」模式與
  「密碼永不回傳」行為）、`password_reset.py`（自助的忘記密碼／重設密碼流程，透過
  `app/core/mailer.py` 寄出帶 token 的連結）、`notifications.py`（對使用者自己的 `Notification` 資料列
  進行 `GET`/`PATCH`——由 `frontend/src/components/NotificationBell.tsx` 使用）、`admin.py`
  （使用者管理，由 `deps.py` 中的 `require_admin` 把關）。
- `app/core/config.py` — pydantic-settings 的 `Settings`，以模組層級的 `settings` singleton 載入一次，
  需要設定的地方都 import 它。其中的 `LDAP_*` 與 `SMTP_*` 欄位只用於在第一次讀取時，替 DB 中的
  `ldap_settings`／`smtp_settings` 資料列填入初始值（見 `app/core/ldap_config.py`、
  `app/core/smtp_config.py`），登入／驗證或寄信的程式碼並不會直接讀取它們。
- `app/core/ldap_config.py` — `get_ldap_settings(db)` 取出單列的 `LdapSetting`，第一次呼叫時會建立該列
  （以 `settings.ldap_*` 填入初始值）。`app/api/auth.py`（用來檢查 `enabled` 並組出
  `authenticate_ldap()` 的設定）與 `app/api/ldap_settings.py` 都會使用它。
- `app/core/smtp_config.py` — `get_smtp_settings(db)` 取出單列的 `SmtpSetting`，第一次呼叫時建立該列
  （以 `settings.smtp_*` 填入初始值），與 `ldap_config.py` 是同一套模式。另外也提供
  `SmtpConfig`／`to_smtp_config()`，也就是該資料列的純 dataclass 快照：呼叫端在請求之內（DB session
  仍開著時）取得它，再透過 `BackgroundTasks.add_task` 交給 `app/core/mailer.py` 的 `send_email()` /
  `send_upload_notification_emails()`，因為那些函式是在請求的 session 關閉之後才執行，無法安全地自行
  重新查詢 ORM 資料列。
- `app/core/upload_limit.py` — `get_max_upload_size_mb(db)` 從 `site_settings` 資料列讀取管理員可編輯的
  每檔上限，在該欄位仍為 `NULL` 時退回 `settings.max_upload_size_mb`。這裡刻意採用單純讀取，而非
  `ldap_config.py`／`smtp_config.py` 使用的 get-or-create：它每次上傳都會執行，所以填入初始值的邏輯改放在
  管理員的讀取路徑（`app/api/site_settings.py` 中的 `_get_or_create_settings`）。此檔案也定義了
  `MAX_UPLOAD_SIZE_MB_CEILING`（512），也就是 schema 驗證時對照的值——
  `frontend/src/pages/admin/useSiteSettingsAdmin.ts` 中的 `MAX_UPLOAD_SIZE_MB_CEILING` 寫死同一個
  數字，必須一起修改。正式環境已無反向代理，這兩處就是唯一的上限來源。
- `app/core/database.py` — SQLAlchemy 的 engine／session 設定；所有 model 繼承的 `Base`
  （DeclarativeBase），以及供 FastAPI 依賴注入使用的 `get_db()` generator。
- `app/models/` — 一張表一個檔案（`User`、`File`、`FileVersion`、`Folder`、`LinkCard`、`Highlight`、
  `SiteSetting`、`LdapSetting`、`SmtpSetting`、`PasswordResetToken`、`Notification`、`AuditLog`），全部
  在 `app/models/__init__.py` 中 import 並重新匯出。Alembic 的 `env.py` 會執行
  `from app.models import *`，因此每個 model 都必須加進那個 `__init__.py`，autogenerate 才抓得到。

資料模型關聯：`File.owner_id` → `User.id`；`File.folder_id` → `Folder.id`（可為 null；這是一種帶名稱與
描述、由管理員維護的「card」分組，任何檔案擁有者都可以把自己的檔案歸進去）；`FileVersion.file_id` →
`File.id`（檔案每上傳一個版本就一列，用以支援 README 所描述的「不覆蓋、保留版本歷史」行為）；
`AuditLog.actor_id` → `User.id` 記錄高權限的管理員操作。檔案內容本身存放在磁碟上的
`UPLOAD_DIR`／`uploads/` 之下——DB 只存 metadata 與 `FileVersion.stored_path`。
`SiteSetting.favicon_filename`／`hero_image_filename` 遵循同樣的拆分方式：DB 存純 uuid 檔名，位元組資料
放在 `UPLOAD_DIR/branding/`，由 response schema 從檔名推導出公開 URL。`File.display_name` 與
`File.announced_at` 是僅供顯示的 metadata（可由擁有者或管理員透過 `PATCH /api/files/{id}` 編輯），不會
影響下載或版本比對所使用的真正 `filename`。`Highlight` 完全沒有外鍵——資料列依 `sort_order` 排序
（同分時以 `id` 決勝），而原本寫死在 `HomePage.tsx` 的那四張卡片，是由 migration `c9d3e17a4b52` 塞入的。
測試看不到那些預先塞入的資料列：`backend/tests/conftest.py` 是用 `Base.metadata.create_all` 建立 schema，
而不是跑 migration。

## Frontend architecture

Vite + React 19 + TypeScript + `react-router-dom` v7。路由定義在 `App.tsx`，包含 `/`、`/login`、
`/forgot-password`、`/reset-password`、`/upload`、`/profile`、`/about`、`/admin`
（→ `HomePage`、`LoginPage`、`ForgotPasswordPage`、`ResetPasswordPage`、`UploadPage`、`ProfilePage`、
`AboutPage`、`AdminPage`），全部透過 `src/api/`（`auth.ts`、`files.ts`、`folders.ts`、`admin.ts`、
`client.ts`）接上後端 API；`AuthContext.tsx` 保存已登入的使用者與 JWT。`/upload` 與 `/profile` 開放給
任何已登入使用者，`/admin` 則僅限管理員（未通過時都會導向 `/login`，於前端把關）。Lint 使用 `oxlint`
（設定在 `.oxlintrc.json`），而非 eslint。

`AdminPage.tsx` 只是外殼：統計卡片與九個 `<Tabs>` 觸發器。每個分頁是 `src/pages/admin/` 底下的一對
檔案——`useXxxAdmin.ts`（狀態、載入器、handler）與 `XxxTab.tsx`（版面，以 hook 的回傳值作為 props）。
這些 hook 是由 `AdminPage` 呼叫，而不是由分頁元件自己呼叫，原因有三：統計卡片要在 `<Tabs>` 之外讀取
使用者與檔案總數；分頁之間彼此相依（連結卡片的 folder 選單要讀 folder 列表、資料異動後要刷新操作紀錄、
刪除 folder 後要重新列出檔案）；而且 Radix 會把未啟用的 `TabsContent` unmount——狀態若放在分頁內，
管理員每次切換分頁都會弄丟尚未儲存的 LDAP／SMTP 編輯內容。`AdminPage.test.tsx` 維持單一測試套件、
驅動整個頁面，這正是它能成為任一分頁改動安全網的原因。

### Design system

所有視覺表現都來自 `frontend/src/index.css` 裡的 token——PR #93 那次整理的重點，就是不要再讓各個頁面
自己手刻尺寸、陰影與錯誤文字。新的 UI 應優先取用既有的 token 或共用元件，而不是寫一次性的 Tailwind class。

- **Surfaces。** `--canvas` 是內容 sheet **之外**的頁面底色（也就是 `:root` 設為 `background` 的那個）；
  `--background` 與 `--card` 則是 sheet 本身與其上的卡片。這些中性色並非純灰：它們帶有 0.005–0.014 的
  primary 色相彩度，才不會在藍色 primary 旁邊看起來像死灰。任何新的中性色都必須以同樣方式調配。
- **Elevation。** 三個階層，`--elevation-1/2/3`。`@theme inline` 區塊把內建的 shadow 尺標重新對應到
  它們，因此 `shadow-xs`／`shadow-sm` → 第 1 階、`shadow-md` → 第 2 階、`shadow-lg` 以上 → 第 3 階，
  而且全部自動具備主題感知。深色模式下每一階還會多帶一條 inset 的頂部細線，因為黑色的投影在近黑色的
  表面上根本看不見。不要手寫 `shadow-[...]`。
- **Type scale。** `text-display` / `text-title` / `text-section` / `text-sub`，每一個都在單一 class 內
  帶齊字級、行高、字距與字重。未加 scope 的 `h1`／`h2` 元素規則已經移除（它們的 margin 會疊加到容器的
  flex gap 上），所以標題必須主動選用——實務上是透過 `PageHeader` 與 `SectionTitle`，而不是手寫
  `text-2xl font-bold`。
- **Layout and fonts。** `@utility page` 是標準的頁面容器（直向 flex、頁面節奏與 RWD 內距）；`App.tsx`
  以 `max-w-app`（`--container-app`）決定外殼寬度。`--sans`（以及目前只是它別名的 `font-heading`）是一組
  系統字型堆疊，帶有明確的 zh-Hant fallback 鏈——不會下載任何字型，但少了那條鏈，繁體中文在 Windows 與
  Linux 上會掉到明體／襯線字。
- **Status vocabulary。** 行內訊息一律走 `Callout`（`destructive` / `success` / `info`），絕不使用裸的
  `<p className="text-destructive">`；空列表走 `EmptyState`；載入佔位走 `ui/skeleton`；操作結果走
  `sonner` toast。破壞性按鈕方面，`destructive-outline` 是用在每一列的變體（給出紅色提示但不會讓整張
  表格變紅），實心的 `destructive` 則保留給確認對話框，因為在那裡該操作真的具有後果。

`frontend/src/components/` 底下的共用元件（`ui/` 子目錄屬於 shadcn，原則上維持產生出來的樣子）：

| 元件 | 用途 |
| --- | --- |
| `PageHeader` | 頁面頂端的 `<h1>` 區塊，可選擇性帶描述與操作按鈕。 |
| `SectionTitle` | 卡片與區塊標題；`as` 決定 `h2`／`h3`／`h4`，`size` 決定字級階層。 |
| `Callout` | 表單或分頁內的行內錯誤／成功／資訊訊息。 |
| `EmptyState` | 列表沒有任何資料時的虛線佔位區塊。 |
| `AuthLayout` | 登入、忘記密碼與重設密碼共用的置中卡片外殼。 |
| `ui/badge` | 狀態標籤（`success` / `warning` / `destructive` / `outline` / …）。 |
| `ui/skeleton` | 載入佔位。 |

`PageHeader` 與 `SectionTitle` 刻意渲染真正的標題元素：有不少測試是用 `getByRole("heading")` 來定位
頁面與區塊，而 shadcn 的 `CardTitle` 渲染出來的是 `<div>`。`SectionTitle` 另外保留了
`data-slot="card-title"`，好讓 `CardAction` 與它並排時，`CardHeader` 的 grid 仍能正確排版。`Callout` 在
`children` 為 falsy 時回傳 `null`（因此呼叫端可以直接把可能為空的錯誤字串丟進來），並在 `role` 之間切換
`alert`（destructive）與 `status`（其餘）——這樣螢幕閱讀器就不會把資訊框念成警示。以上兩者的行為都不是
偶然，而是刻意設計。
