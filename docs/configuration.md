# 環境變數說明 (Configuration)

專案根目錄的單一 `.env` 是原生開發與 Docker 開發共同的設定來源。第一次設定請先照
[README 的「本機執行方式」](../README.md#-本機執行方式-local-development)複製 `.env.example`，再回來
對照本文件逐項調整；正式環境另外還有一份首次安裝檢查表，見
[發布模式與離線交付](deployment.md)。

`.env.example` 內含完整註解，以下整理常用設定；未列出的項目沿用程式內建預設值（見 `backend/app/core/config.py`）。

**資料庫**

| 變數                                                  | 說明                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `docker-compose` 建立 db service 時使用的帳密與資料庫名稱。**正式環境務必改掉密碼**——範例值是公開的 `platform`，而 dev 的 `docker-compose.yml` 還會把 5432 對 host 開出去。注意 postgres 只在初始化 `db_data` volume 時套用這組值，之後再改沒有效果，除非刪掉 volume 重來 |
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
| `JWT_SECRET_KEY`               | JWT 簽章金鑰，**正式環境務必改掉**：`openssl rand -hex 32`。留在 `.env.example` 的佔位值時，原生開發會在啟動時警告，正式環境的 image 則**直接拒絕啟動** |
| `JWT_ALGORITHM`                | 簽章演算法，預設 `HS256`                                              |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | Token 有效時間（分鐘），預設 `1440`（一天）                           |

**初始管理員（第一次啟動必看）**

建立使用者的 API 本身就需要管理員身分，所以全新的資料庫需要先有一個 admin 才能開始操作。設定下列兩個變數後，
後端啟動時會自動建立第一個管理員帳號（見 `backend/app/core/seed.py`）：

```
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=change-me-to-a-real-password
```

僅在「系統中還沒有任何 admin 帳號」時才會生效。**建立完成後請務必從 `.env` 移除**——留著等於把管理員密碼
以明文放在部署主機上，而它已經沒有任何作用了。密碼強度不會被檢查，照抄 `.env.example` 的
`change-me-to-a-real-password` 會被沉默接受。

**前端連結與密碼重設**

| 變數                                    | 說明                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| `FRONTEND_BASE_URL`                     | 產生密碼重設信連結時使用的前端網址。**正式環境務必改掉**：預設的 `http://localhost:5173` 是 Vite 開發伺服器的位址，正式環境根本沒有這個 port，留著它等於每一封重設密碼信都寄出一個沒人打得開的死連結。填使用者實際連進來的網址（例如 `http://files.example.internal`），詳見 [發布模式與離線交付](deployment.md) 的「首次安裝」 |
| `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`   | 重設密碼 token 有效時間（分鐘），預設 `30`                    |
| `VITE_API_BASE_URL`                     | 僅供前端開發使用的後端網址；正式建置在 `Dockerfile` 內進行且不讀這個檔案，因此不需要設定 |

**SMTP_\* 與 LDAP_\*（只是初始種子值）**

這兩組變數**只在資料庫對應的設定列第一次被讀取時**用來填入初始值；之後 Email SMTP 與 LDAP 的設定一律以管理後台
的「Email SMTP 設定」／「LDAP 設定」分頁為準，改 `.env` 不會有任何效果。後端啟動時若偵測到 env 的設定已被資料庫
覆蓋，會在 log 印出警告提醒。

**備份**

`BACKUP_ENABLED`、`BACKUP_LOCAL_DIR`、`BACKUP_RETENTION_DAYS` 供 `scripts/backup.sh` 使用，
說明見 [備份與還原](backup-restore.md) 的「1. 設定每日備份」。

