#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/backup.sh

Dumps the production database and packs uploads/ into BACKUP_LOCAL_DIR, then purges
backups older than BACKUP_RETENTION_DAYS. Reads its settings from .env in the deployment
root and does nothing unless BACKUP_ENABLED=true. Restore with scripts/restore.sh.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "Unknown argument: $1" ;;
  esac
done

require_env_file

BACKUP_ENABLED="$(env_get BACKUP_ENABLED false)"
if [ "$BACKUP_ENABLED" != "true" ]; then
  log INFO "BACKUP_ENABLED is not true, skipping backup"
  exit 0
fi

BACKUP_LOCAL_DIR="$(resolve_path "$(env_get BACKUP_LOCAL_DIR ./backups)")"
BACKUP_RETENTION_DAYS="$(env_get BACKUP_RETENTION_DAYS 30)"
POSTGRES_USER="$(env_get POSTGRES_USER platform)"
POSTGRES_DB="$(env_get POSTGRES_DB platform)"
UPLOAD_DIR="$(resolve_path "$(env_get UPLOAD_DIR ./uploads)")"

[ -d "$UPLOAD_DIR" ] || die "UPLOAD_DIR $UPLOAD_DIR does not exist - nothing to pack"

mkdir -p "$BACKUP_LOCAL_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
DB_DUMP_PATH="$BACKUP_LOCAL_DIR/db_${TS}.sql.gz"
UPLOADS_TAR_PATH="$BACKUP_LOCAL_DIR/uploads_${TS}.tar.gz"

# 兩個壓縮檔都先寫成 .partial，通過驗證後才改名，因此失敗絕不會留下一個掛著正式檔名的檔案。
# shell 會在 pipeline 執行**之前**就先建立重導向的目標檔，所以直接寫進 db_<ts>.sql.gz 的話，
# 任何一次 pg_dump 失敗都會留下一個 0 byte、檔名卻看起來完全正常的檔案——而它還能通過 README
# 那句「檢查 backups/ 裡有沒有 db_*.sql.gz」的驗收。一份謊稱自己成功的備份比沒有備份更糟，
# 因為它只會在真正需要它的那一天才被發現。
trap 'rm -f "$DB_DUMP_PATH.partial" "$UPLOADS_TAR_PATH.partial"' EXIT

# 已套用 migration 的 schema，即使一列資料都沒有，gzip 過的 dump 也有好幾 KB，
# 因此檔案接近空白就代表 dump 根本沒有真正發生。
MIN_DUMP_BYTES=1024

log INFO "Dumping database ($POSTGRES_DB) to $DB_DUMP_PATH"
# --clean --if-exists 正是讓這份 dump 能被還原的關鍵。還原目標永遠是 app 容器已經跑過
# `alembic upgrade head` 的資料庫，所以 plain dump 會在每個 CREATE 撞上 "already exists"、
# 每個 COPY 撞上 duplicate key——而 psql 遇到這些並不會停下來，結果就是還原看起來成功了，
# 資料卻原封不動。帶上這兩個參數後，每個物件都會先被 drop（在空資料庫上找不到的物件會跳過
# 並印一則 notice，無害）。
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_DUMP_PATH.partial" \
  || die "pg_dump failed - check that the db service is up: docker compose -f $COMPOSE_FILE ps"

gzip -t "$DB_DUMP_PATH.partial" 2>/dev/null \
  || die "the database dump is not a valid gzip archive - refusing to keep it"
DUMP_SIZE="$(wc -c < "$DB_DUMP_PATH.partial" | tr -d '[:space:]')"
[ "$DUMP_SIZE" -ge "$MIN_DUMP_BYTES" ] \
  || die "the database dump is only ${DUMP_SIZE} bytes (expected at least ${MIN_DUMP_BYTES}) - refusing to keep it"
mv "$DB_DUMP_PATH.partial" "$DB_DUMP_PATH"

log INFO "Packing $UPLOAD_DIR to $UPLOADS_TAR_PATH"
tar -czf "$UPLOADS_TAR_PATH.partial" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")" \
  || die "failed to pack $UPLOAD_DIR"
gzip -t "$UPLOADS_TAR_PATH.partial" 2>/dev/null \
  || die "the uploads archive is not a valid gzip archive - refusing to keep it"
mv "$UPLOADS_TAR_PATH.partial" "$UPLOADS_TAR_PATH"

log INFO "Purging local backups older than ${BACKUP_RETENTION_DAYS} days"
find "$BACKUP_LOCAL_DIR" -maxdepth 1 -type f \( -name 'db_*.sql.gz' -o -name 'uploads_*.tar.gz' \) \
  -mtime "+${BACKUP_RETENTION_DAYS}" -delete

log INFO "Backup complete"
