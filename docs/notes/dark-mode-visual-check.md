# 深色模式實機巡檢（2026-08-04）

issue #94 是 PR #93 視覺精修的後續待辦盤點，共 11 項，最後一項是「明暗兩種模式尚未實機（瀏覽器）
目視確認」。PR #97 重拍的 14 張截圖全是明亮模式，深色模式自 #93 改版以來沒有人在瀏覽器裡實際看過。
PR #113 補完了這一項，這篇筆記記錄當時的巡檢結果與留下來的截圖。

## 拍攝條件

以 docker compose 開發組合啟動站台，配一份**拋棄式的示範資料**（內容全為虛構，不含任何真實帳號、
檔案或 Email），用 Playwright 以 2560×1800 拍攝，與 `docs/screenshots/` 既有截圖同規格。完整巡檢
共 19 個畫面 × 明暗兩組，下方是挑出來留存的深色模式部分。

## 巡檢結論

- 深色模式整體正常。三階 elevation 的頂緣亮線、focus ring（改為主色後）、`destructive` 徽章與
  Callout、表格 Badge 在深色底上都清楚可辨。
- #94 第一項修正的行為在實機成立：按下主題鈕、不重新載入的情況下，`documentElement` 的 class、
  inline 的 `color-scheme` 與 `<meta name="theme-color">` 三者同步更新，捲軸與原生控制項因此立刻
  跟著換色。
- 順帶完成了 #74 想要的「LDAP 設定分頁實機檢視」，明暗兩種模式都看過了。
- 找到並修掉一個缺陷：通知對話框的「全部標記已讀」被 `DialogContent` 絕對定位的關閉鈕壓住，
  明暗兩種模式皆然。修法是替 `DialogHeader` 補上 `pr-8`——`components/ui/` 維持 shadcn 產生的原樣，
  所以修在呼叫端。

## 截圖清單

頁面：

| 檔案 | 內容 |
| --- | --- |
| `login-dark.png` | 登入頁 |
| `upload-dark.png` | 上傳頁 |
| `profile-dark.png` | 個人資料頁 |
| `not-found-dark.png` | 找不到頁面（#100 新增的 404，這是第一次實機看到） |
| `admin-files-dark.png` | 管理後台－檔案 |
| `admin-ldap-settings-dark.png` | 管理後台－LDAP 設定 |

逐項檢查的放大檢視：

| 檔案 | 內容 |
| --- | --- |
| `notification-badge-dark.png` | 通知徽章的未讀數字。深色模式下 `--destructive-foreground` 是深色、`--destructive` 是亮紅，數字為深底淺紅的反轉配色，與明亮模式的白字紅底不同但對比充足 |
| `focus-ring-dark.png` | 輸入框 focus ring，改為主色後在深色底上依然清楚 |
| `callout-destructive-dark.png` | destructive Callout（登入失敗） |
| `notification-dialog-before-fix-dark.png` | 上述標題列重疊缺陷的修正前 |
| `notification-dialog-after-fix-dark.png` | 同一畫面的修正後 |

以上檔案都在 `docs/screenshots/`。另外 `home-dark.png` 與 `admin-users-dark.png` 兩張在 PR #113
當時就已收進 README 的截圖表。

## 這批圖原本放在哪裡

它們原本被推到一個 orphan 分支 `docs/dark-mode-check-evidence`（只有 png、沒有程式碼，與 `main`
沒有共同祖先），PR #113 的留言以 `raw.githubusercontent.com` 的網址指向該分支來嵌入圖片。這種做法
的問題是：那個分支不在 README「文件與筆記」列出的三個去處內、`grep` 不到、也沒有任何地方記載它
不能刪——刪掉就會讓 #113 那則留言的 11 張圖全部變破圖。

現在圖已收進 `docs/screenshots/`，該分支不再是唯一副本。**要清掉那個分支的話，記得先把 #113 留言
裡的網址改成指向 `main` 的路徑**，否則留言仍會破圖。

往後的做法：長期展示用的截圖放 `docs/screenshots/`；一次性的驗證截圖直接拖曳上傳到 PR／Issue 的
留言，由 GitHub 自己的圖床託管，不要再開分支放圖。
