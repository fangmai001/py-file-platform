# 持續整合與分支慣例 (Continuous Integration)

本文件說明 `main` 的四個必要檢查各自驗證什麼、為什麼刻意不做路徑過濾，以及分支命名、commit message
與分支保護的慣例。

本專案在 GitHub Actions 設定了四個自動化檢查流程。前三個對應後端、前端與正式環境，都在**每個**
Pull Request 以及 push 到 `main` 時觸發（不做路徑過濾，原因見下方「為什麼不用 `paths:` 過濾」）；
第四個只在 push tag 時跑：

## 後端 (`.github/workflows/backend-ci.yml`，check 名稱 `Backend`)

流程為：

1. 啟動一個 PostgreSQL 服務容器
2. 對這個資料庫執行 `alembic upgrade head`（驗證所有 migration 都能從乾淨的資料庫一路套用到最新版本，避免多個分支各自新增 migration、合併後互相分岔卻沒有人補 merge migration 的情況——這正是先前導致後端在 `docker compose up` 時 crash-loop 的原因）
3. 執行 `alembic check`，比對 model 與 migration 是否已經分岔。這一步是必要的：`pytest` 是用
   `Base.metadata.create_all` 直接從 model 建表（見 `backend/tests/conftest.py`），而不是跑 migration，
   所以「model 改了但沒補 migration」在測試裡完全看不出來——兩邊各自對著不同的 schema 一起變綠
4. 執行 `pytest`（單元測試使用記憶體內的 SQLite，不需要外部資料庫）

## 前端 (`.github/workflows/frontend-ci.yml`，check 名稱 `Frontend`)

流程為：

1. `npm ci` 安裝套件
2. `npm run lint`（oxlint）
3. `npm test`（vitest run）
4. `npm run build`（包含 `tsc -b` 型別檢查，能擋下型別錯誤）

## 正式環境 (`.github/workflows/production-ci.yml`，check 名稱 `Production image`、`Shell scripts`)

上面兩個 workflow 走的都是開發用的組合，**完全不會碰到正式環境那一套**（根目錄 `Dockerfile` 與
`docker-compose.prod.yml`）。這個 workflow 補的就是這段空白。

`Production image` 這個 job：

1. `docker compose -f docker-compose.prod.yml config` 驗證整份 compose 與 `${APP_VERSION:?...}` 插值，
   並額外確認 `APP_VERSION` 未設定時**確實會失敗**（這個 guard 是刻意的，見 `docker-compose.prod.yml`
   裡的註解——沒有它，兩次發布會共用同一個 tag，離線主機就沒有舊版可以回滾）
2. 建置正式環境 image
3. 確認 `/app/static/index.html` 存在。`app/core/static.py` 就是靠這個檔案決定要不要掛載前端，
   而且找不到時是**靜默** `return False`——少了這一步，image 會變成一台只有 API 的伺服器，整個 UI 全部 404
4. 確認 bundle 裡沒有被烙進 `localhost:8000`。正式環境前後端同 origin，靠的是建置時不設定
   `VITE_API_BASE_URL`、讓 `frontend/src/api/client.ts` 退回相對路徑 `/api/...`。只要有人把 `.env` 從
   `.dockerignore` 拿掉、或在 `build.args` 加一行，這條鏈就斷了，而且**只有在瀏覽器上才看得出來**
5. 真的把 image 跑起來打 `GET /health`，斷言回報的 `version` 等於建置時傳入的 `APP_VERSION`。
   一個請求同時驗證三件事：image 起得來、`alembic upgrade head` 連得到資料庫、
   以及 `ARG APP_VERSION` → `ENV APP_BUILD_VERSION` → `/health` 這條版本鏈沒有斷

`Shell scripts` 這個 job 對 `scripts/*.sh` 執行 `shellcheck -x`。那三支 script（備份、還原、離線打包）
與它們共用的 `lib.sh` 都在維運關鍵路徑上，先前卻完全沒有任何自動檢查。`-x` 用來跟進每支 script 開頭的
`source .../lib.sh`。

## 發布 (`.github/workflows/release-check.yml`，check 名稱 `Release version`)

只在 push `v*` tag 時觸發，檢查 `.env.example` 的 `APP_VERSION` 是否與 tag 一致。

這條版號鏈全靠人工同步（`.env` 不在版控），而漏改 `.env.example` 的後果不會當場出現：新部署照著
`cp .env.example .env` 拿到舊版號，compose 於是去找一個離線主機上根本不存在的 image tag，
直到 `up -d` 那一刻才爆。完整順序見 `CLAUDE.md` 的 release checklist。

因為它只在 tag 上跑，**不會**、也不該被列為 PR 的必要檢查。

## 為什麼不用 `paths:` 過濾

直覺上會想用 `paths:` 讓「只改前端的 PR 不要跑後端 CI」以節省時間，但這會與下方的 branch protection
直接衝突：**當 workflow 因路徑過濾而未被觸發時，它的 check 不會回報成功，而是永遠停在
`Expected — Waiting for status to be reported`**，於是被列為必要檢查的 PR 就永遠合不進去
（例如只改 `README.md` 的 PR 會讓兩個檢查同時卡住）。兩個 workflow 加起來也才約一分半且平行執行，
因此選擇無條件觸發。

## 分支命名與 commit message

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

## 分支保護 (Branch protection)

`main` 分支透過 GitHub **Rulesets**（`Settings → Rules → Rulesets`）套用以下規則：

- 所有變更必須經由 Pull Request，不得直接 push 到 `main`
- PR 必須通過 `Backend`、`Frontend`、`Production image`、`Shell scripts` 四個 status check 才能合併
- 禁止刪除 `main`、禁止 force push

> ⚠️ 新增 workflow **不會**自動成為必要檢查。GitHub 的必要檢查是按 job 名稱逐一列舉的，所以每次新增
> job 都要手動到 `Settings → Rules → Rulesets` 把名稱補進去，否則它只會是一個「跑了但擋不住任何東西」
> 的檢查。`Production image` 與 `Shell scripts` 就是這樣加進來的。

因為這是單人維護的 repo，PR 不要求額外的審核者（GitHub 不允許 approve 自己的 PR，若要求審核數
會導致任何 PR 都無法合併）。

## ⚠️ 尚未涵蓋的部分

- **CD（自動部署）**：目前仍是手動執行 `docker compose -f docker-compose.prod.yml up --build -d`，未包含在
  任何 workflow 內。CI 只驗證正式環境 image **建得起來、跑得起來**，不會把它部署到任何地方。
- **測試覆蓋率門檻（coverage gate）**：目前未設定，CI 只確保測試「有跑且通過」，不檢查覆蓋率百分比。
- **後端的 lint／format 檢查**：前端有 oxlint，後端則完全沒有對應的檢查（`requirements-dev.txt` 只有
  pytest 與 httpx）。兩邊標準不一致，是否導入 ruff 仍待決定。

