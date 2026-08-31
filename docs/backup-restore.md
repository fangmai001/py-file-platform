# 備份與還原 (Backup and Restore)

本文件的前提是服務已依 [發布模式與離線交付](deployment.md) 在正式環境跑起來。內容涵蓋每日自動備份、
RSS 訂閱來源的定時抓取，以及從備份還原（含在新主機上重建）。相關的 `BACKUP_*` 環境變數見
[環境變數說明](configuration.md)。

## 1. 設定每日備份

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
echo $?        # 0 才算成功
```

**判斷成功與否請看結束碼與 log 最後一行的 `Backup complete`，不要只看 `backups/` 裡有沒有檔案。**
script 會先把資料庫 dump 與 uploads 打包寫成 `.partial`，通過 `gzip -t` 與大小檢查之後才改成正式檔名，
所以失敗時不會留下任何看起來正常的檔案；但反過來說，「檔案存在」本身也不再是（也從來不該是）驗收依據。

再加進部署主機（跑 `docker-compose.prod.yml` 的那台機器）的 crontab，例如每天凌晨 2 點執行一次：

```
0 2 * * * /opt/py-file-platform/scripts/backup.sh >> /opt/py-file-platform/backups/backup.log 2>&1
```

`/opt/py-file-platform` 需換成實際部署路徑；cron 預設的 `PATH` 可能抓不到 `docker`，必要時在
crontab 開頭加上 `PATH=...` 或改用 `docker` 執行檔的絕對路徑。`backup.log` 會持續成長，之後若需要
輪替（logrotate）是另外的維運工作，這裡不處理。

log 裡若出現 `[ERROR]`，代表這次備份沒有產出任何檔案，需要處理；`BACKUP_ENABLED is not true` 則是
刻意跳過。這兩者現在分得出來——找不到 `.env` 會以 `[ERROR]` 中止，而不是被誤讀成「有人把備份關掉了」。

## 2. 設定 RSS 訂閱定時抓取

管理後台「RSS 訂閱」分頁的「立即抓取」只抓單一來源，適合新增來源時當場驗證網址。要讓文章持續更新，
請把 `scripts/fetch-feeds.sh` 加進 crontab——它會在 `app` container 內執行
`python -m app.cli.fetch_feeds`，逐一抓取所有啟用中的來源。走 container 內的 CLI 而不是打 HTTP API，
是因為抓取端點僅限管理員，cron 若要用它就得在主機上保管一份 JWT。

先手動執行一次：

```bash
./scripts/fetch-feeds.sh
echo $?        # 0 才算成功；有任何一個來源抓取失敗時會回 1
```

再加進部署主機的 crontab，例如每小時抓一次：

```
0 * * * * /opt/py-file-platform/scripts/fetch-feeds.sh >> /opt/py-file-platform/backups/feeds.log 2>&1
```

抓取頻率請斟酌對方站台的負擔——每次抓取都會帶上上一次的 `ETag`／`Last-Modified` 做條件式請求，
內容沒更新時對方只會回一個 304，成本很低，但過於頻繁仍可能被對方視為濫用。單一來源失敗（連不上、
格式壞掉）不會影響同一批的其他來源，失敗原因會記在該來源上，管理後台的狀態欄會顯示「失敗」。

## 3. 從備份還原

`scripts/backup.sh` 產出兩個檔案，資料庫與上傳檔案要**分別**還原，缺一不可：`db_<時間戳>.sql.gz`
（`pg_dump` 的純 SQL）與 `uploads_<時間戳>.tar.gz`（`uploads/` 目錄）。資料庫裡存的只有 metadata 與
`FileVersion.stored_path`，檔案本體在 `uploads/`——只還原其中一邊，會得到一份指向不存在檔案的清單。

`scripts/restore.sh` 是 `backup.sh` 的對稱工具，預設兩者一起還原，並自動處理停 app、還原、重新啟動
的順序：

```bash
sudo ./scripts/restore.sh --timestamp 20260804_020000
```

`--timestamp` 是備份檔名裡的時間戳，兩個檔案共用同一個。不帶任何參數執行會列出 `BACKUP_LOCAL_DIR`
底下可用的備份。只想還原其中一邊時用 `--db <路徑>` 或 `--uploads <路徑>`；`--yes` 可跳過確認提示
（給無人值守的情境用）。牽涉到 `uploads` 時必須整支以 `sudo` 執行，原因見下方「還原 uploads」——
script 會在動任何東西之前就檢查並擋下，而不是讓 `tar` 解到一半才失敗。

下面兩節說明 `restore.sh` 實際做了什麼，以及需要手動處理時該下什麼指令。指令中的 `platform` 請換成
`.env` 裡的 `POSTGRES_USER`／`POSTGRES_DB`（`restore.sh` 是直接從 `.env` 讀的，手動下指令時容易忘記
這兩者可能已經被改過）。

### 還原資料庫

```bash
docker compose -f docker-compose.prod.yml stop app    # 還原期間不要有連線在讀寫
gunzip -c backups/db_<時間戳>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db \
    psql -v ON_ERROR_STOP=1 -U platform -d platform
docker compose -f docker-compose.prod.yml up -d
```

**`-v ON_ERROR_STOP=1` 不是可選的。** `psql` 預設會把每個錯誤印出來然後繼續往下跑，最後以 exit 0
結束——少了這個參數，一個每句都失敗的還原和一個真正成功的還原，在終端機上看起來完全一樣。

先 `stop app` 有兩個理由：dump 開頭會 `DROP` 掉既有物件，app 若正好有查詢在跑，`DROP` 會卡在 lock 上；
而且還原途中的資料庫處於半空狀態，這時候讓使用者連進來只會看到殘缺的畫面。還原目標若是一個全新的空
資料庫，`psql` 會印出一連串 `... does not exist, skipping`，那是正常的（`ON_ERROR_STOP` 不會被這些
notice 觸發）。

`pg_dump` 帶的 `--clean --if-exists` 正是讓這一行指令有效的關鍵：還原目標永遠是已經被
`alembic upgrade head` 建好 schema 的資料庫，少了這兩個參數，每個 `CREATE TABLE` 都會撞上
`already exists`、每筆資料都會撞上 duplicate key，而 `psql` 預設不會因此中止——指令看起來跑完了，資料庫
其實原封不動。**這個參數是後來才補上的**，所以更早之前產生的 `db_*.sql.gz` 沒有這層保護，還原前必須先
手動清空資料庫：

```bash
docker compose -f docker-compose.prod.yml stop app
docker compose -f docker-compose.prod.yml exec -T db \
  psql -v ON_ERROR_STOP=1 -U platform -d postgres \
    -c 'DROP DATABASE platform;' -c 'CREATE DATABASE platform OWNER platform;'
gunzip -c backups/db_<舊時間戳>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db \
    psql -v ON_ERROR_STOP=1 -U platform -d platform
docker compose -f docker-compose.prod.yml up -d
```

### 還原 uploads

`backup.sh` 打包時是以 `uploads` 這個目錄名作為 tar 內的最上層項目，因此要在**部署根目錄**解開，
並且要用 `sudo`：

```bash
docker compose -f docker-compose.prod.yml stop app
sudo tar -xzf backups/uploads_<時間戳>.tar.gz -C /opt/py-file-platform
docker compose -f docker-compose.prod.yml up -d
```

`sudo` 不能省略。app container 內的行程以 root 執行，經由 bind mount 寫出來的檔案在 host 上也就屬於
root，一般部署帳號解開時會得到 `Cannot open: Permission denied`——而 `tar` 遇到這種錯誤仍會把其餘檔案
解完並以非零狀態結束，很容易被誤判成「解開了」。`restore.sh` 因此在還原 `uploads` 之前就先檢查
`id -u`，非 root 直接中止，連 app 都不會停。備份方向不受影響：那些檔案是 0644，非 root 的 cron
帳號讀得到，`backup.sh` 不需要 `sudo`。

解開只會覆蓋同名檔案，不會刪掉備份之後才上傳的東西。若要得到與備份時完全一致的狀態，請先把現有的
`uploads/` 更名保留再解開，不要直接刪除。

還原完成後務必實際下載一個檔案驗證。資料庫與 `uploads/` 分兩步還原，只要其中一步默默失敗，檔案清單
看起來是對的，點下載卻會拿到 404「檔案內容不存在」。

### 在新主機上從備份重建

離線主機整台掛掉時，走這個順序：

```bash
# 1. 依 deployment.md 的「2. 離線環境交付」擺好目錄結構、載入兩個 tar
# 2. 準備 .env：POSTGRES_USER / POSTGRES_DB 必須與備份來源那台相同（dump 內含 owner 相關語句）
# 3. 先讓 app 起一次，由 alembic 建好 schema
docker compose -f docker-compose.prod.yml up -d
curl -s http://localhost/health
# 4. 還原資料庫與 uploads
sudo ./scripts/restore.sh --timestamp <時間戳>
# 5. 驗收：登入原有帳號、確認首頁檔案牆的檔案可以正常下載
```

第 3 步不能省略。資料庫還原本身雖然會帶進完整 schema，但先跑一次 `up -d` 才能確認 image、`.env` 與
volume 都是好的——在還原資料之前先發現設定有問題，遠比還原到一半才發現容易處理。

