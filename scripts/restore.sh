#!/usr/bin/env bash
set -euo pipefail

# backup.sh 的對應腳本。backup.sh 會產出兩份壓縮檔，兩份都必須還原回去，因此這裡預設一次
# 還原兩者：資料庫只存 metadata 與 FileVersion.stored_path，位元組本體則放在 uploads/。
# 只還原其中一邊，會得到一份看起來正確、但每次下載都 404 的檔案清單。

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/restore.sh [--timestamp <ts>] [--db <path>] [--uploads <path>] [--yes]

  --timestamp <ts>  Restore both db_<ts>.sql.gz and uploads_<ts>.tar.gz from
                    BACKUP_LOCAL_DIR. <ts> is the timestamp in the filename, e.g.
                    20260804_020000.
  --db <path>       Restore the database from this dump only.
  --uploads <path>  Restore uploads/ from this tar only.
  --yes             Skip the confirmation prompt (for unattended use).

Stops the app for the duration so nothing reads or writes half-restored state, then
brings it back up. Restoring uploads/ needs root, because the app container runs as root
and the bind-mounted files are owned by root on the host - run the whole script under
sudo when uploads are involved.

Run with no arguments to see the available backups.
USAGE
}

TIMESTAMP=""
DB_PATH=""
UPLOADS_PATH=""
ASSUME_YES=false

while [ $# -gt 0 ]; do
  case "$1" in
    --timestamp) shift; [ $# -gt 0 ] || die "--timestamp needs a value"; TIMESTAMP="$1" ;;
    --db) shift; [ $# -gt 0 ] || die "--db needs a path"; DB_PATH="$1" ;;
    --uploads) shift; [ $# -gt 0 ] || die "--uploads needs a path"; UPLOADS_PATH="$1" ;;
    --yes) ASSUME_YES=true ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "Unknown argument: $1" ;;
  esac
  shift
done

require_env_file

BACKUP_LOCAL_DIR="$(resolve_path "$(env_get BACKUP_LOCAL_DIR ./backups)")"
# 從 .env 讀取而不是寫死，這樣才會跟著 backup.sh 當初 dump 的那個部署走——
# 否則改過 POSTGRES_USER 的主機會驗證失敗。
POSTGRES_USER="$(env_get POSTGRES_USER platform)"
POSTGRES_DB="$(env_get POSTGRES_DB platform)"
UPLOAD_DIR="$(resolve_path "$(env_get UPLOAD_DIR ./uploads)")"

if [ -n "$TIMESTAMP" ]; then
  if [ -n "$DB_PATH" ] || [ -n "$UPLOADS_PATH" ]; then
    die "--timestamp cannot be combined with --db/--uploads"
  fi
  DB_PATH="$BACKUP_LOCAL_DIR/db_${TIMESTAMP}.sql.gz"
  UPLOADS_PATH="$BACKUP_LOCAL_DIR/uploads_${TIMESTAMP}.tar.gz"
fi

if [ -z "$DB_PATH" ] && [ -z "$UPLOADS_PATH" ]; then
  usage >&2
  echo >&2
  echo "Available backups in $BACKUP_LOCAL_DIR:" >&2
  # 用 glob 而不是 `ls | grep`：不需要開子 shell、不在意目錄存不存在，
  # 也不會被檔名裡的特殊字元弄混。
  shopt -s nullglob
  AVAILABLE=("$BACKUP_LOCAL_DIR"/db_*.sql.gz "$BACKUP_LOCAL_DIR"/uploads_*.tar.gz)
  shopt -u nullglob
  if [ ${#AVAILABLE[@]} -eq 0 ]; then
    echo "  (none)" >&2
  else
    printf '  %s\n' "${AVAILABLE[@]##*/}" >&2
  fi
  exit 1
fi

[ -z "$DB_PATH" ] || [ -f "$DB_PATH" ] || die "$DB_PATH not found"
[ -z "$UPLOADS_PATH" ] || [ -f "$UPLOADS_PATH" ] || die "$UPLOADS_PATH not found"

# 否則 tar 會在碰到第一個 root 擁有的檔案時中途噴 "Cannot open: Permission denied"，
# 卻仍把其餘檔案解開後正常結束，看起來就像成功了。
if [ -n "$UPLOADS_PATH" ] && [ "$(id -u)" -ne 0 ]; then
  die "restoring uploads needs root (the files are root-owned via the container bind mount) - re-run with sudo"
fi

log WARN "About to restore over the live deployment at $REPO_ROOT:"
[ -z "$DB_PATH" ] || log WARN "  database $POSTGRES_DB  <- $DB_PATH"
[ -z "$UPLOADS_PATH" ] || log WARN "  $UPLOAD_DIR  <- $UPLOADS_PATH"
if [ "$ASSUME_YES" != true ]; then
  # 既有資料會被 drop（資料庫）或覆蓋（uploads），所以要讓操作者親口確認。
  printf 'Continue? [y/N] '
  read -r reply
  case "$reply" in
    [yY]|[yY][eE][sS]) ;;
    *) die "Aborted" ;;
  esac
fi

log INFO "Stopping app"
docker compose -f "$COMPOSE_FILE" stop app || die "failed to stop the app service"

if [ -n "$DB_PATH" ]; then
  log INFO "Restoring database $POSTGRES_DB from $DB_PATH"
  # -v ON_ERROR_STOP=1 不是可選項：psql 的預設行為是把每個錯誤印出來後繼續往下跑，
  # 最後仍以 0 結束。少了它，一次每條敘述都失敗的還原，與一次成功的還原完全分不出來。
  gunzip -c "$DB_PATH" \
    | docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    || die "database restore failed - the app is still stopped; fix the cause and re-run, or start it with: docker compose -f $COMPOSE_FILE up -d"
fi

if [ -n "$UPLOADS_PATH" ]; then
  log INFO "Restoring $UPLOAD_DIR from $UPLOADS_PATH"
  # backup.sh 是把 uploads/ 當成最上層項目打包的，所以這裡要解到它的上一層。
  # 解壓只會覆蓋同名檔案；備份之後才上傳的東西都會留著。若要精確回到備份當下的狀態，
  # 請先把目前的 uploads/ 移到一旁。
  tar -xzf "$UPLOADS_PATH" -C "$(dirname "$UPLOAD_DIR")" \
    || die "failed to unpack $UPLOADS_PATH - the app is still stopped"
fi

log INFO "Starting app"
docker compose -f "$COMPOSE_FILE" up -d

log INFO "Restore complete. Verify before calling it done:"
log INFO "  curl -s http://localhost/health"
log INFO "  then log in and actually download one file - a listing alone does not prove the"
log INFO "  uploads came back, since the metadata lives in the database."
