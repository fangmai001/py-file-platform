# 專案筆記 (Documentation and Notes)

這裡放**要留存、其他人也需要看得到**的專案筆記——例如部署踩雷紀錄、環境設定備忘、某個決定的來龍去脈。

筆記依「要不要留存」與「能不能公開」分成三個去處。選錯地方的代價是真實的——不是每次 PR 都跑滿 CI，
就是把不該公開的東西推上 public repo：

| 內容 | 位置 | 進版控 | 公開 | 變更成本 |
| --- | --- | --- | --- | --- |
| 要留存、他人也要看的專案筆記 | `docs/notes/` | 是 | 是 | feature branch + PR + 四個必要檢查 |
| 有生命週期的待辦與議題 | GitHub Issues | 否 | 是 | 無 |
| 個人隨手速記、草稿 | `*.local.md`（已被 `.gitignore` 排除） | 否 | 否 | 無 |

`docs/notes/` 與既有的 `docs/screenshots/` 平行，索引就是本檔案下方的「目前的筆記」清單——新增筆記時
順手補一行。內容比照本專案其餘文件，使用繁體中文與全形標點。

## 為什麼隨手速記不要放 `docs/`

因為本專案的三個 workflow **刻意不加 `paths:` 過濾**（理由見
[持續整合與分支慣例](../ci.md)的「為什麼不用 `paths:` 過濾」），所以即使 PR 只改了一個 markdown 錯字，
`Backend`、`Frontend`、`Production image`、`Shell scripts` 四個必要檢查仍會全部執行，而且要全綠才能合併。
對「記一筆待會要查的東西」來說，開分支、送 PR、等 CI 這串流程的成本遠大於筆記本身。

這不是 CI 設定的缺陷，不要為了讓文件 PR 跑快一點而去加 `paths:`——那會讓被跳過的 workflow 永遠卡在
`Expected — Waiting for status to be reported`，PR 反而完全合不進去。正確做法是讓高頻速記留在
`*.local.md`，只有真正要留存的內容才進 `docs/notes/`。

## ⚠️ 安全邊界

**這是公開 repo。** 密鑰、`.env` 的實際內容、LDAP／SMTP 的真實設定值（server URI、bind DN、密碼）、
內部主機名稱與 IP，一律不得寫進 `docs/`、Issues 或 PR 內文。那些內容只能留在 `*.local.md`——
`.gitignore` 已經以萬用字元排除（`NOTES.local.md`、`deploy.local.md` 都涵蓋在內），不會被誤推上來。

## 命名慣例

檔名使用 `kebab-case.md`（例如 `offline-delivery-gotchas.md`），檔案第一行是 `#` 標題。新增筆記時，
順手在下方清單補一行。

## 目前的筆記

- [深色模式實機巡檢（2026-08-04）](dark-mode-visual-check.md)——PR #113 的巡檢結果與留存截圖，
  另記錄了截圖該放哪裡。
