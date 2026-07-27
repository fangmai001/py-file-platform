#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"

log() {
  printf '%s [%s] %s\n' "$(date -Iseconds)" "$1" "$2"
}

# Only ever reads KEY=value lines by regex - never sourced, so .env content is
# never executed as shell code.
env_get() {
  local val
  val=$(grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d'=' -f2-)
  echo "${val:-${2:-}}"
}

# Resolves a possibly-relative path against REPO_ROOT, so values like
# "./backups" behave the same whether cron invokes this script from REPO_ROOT
# or from some other cwd.
resolve_path() {
  case "$1" in
    /*) echo "$1" ;;
    *) echo "$REPO_ROOT/${1#./}" ;;
  esac
}

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

mkdir -p "$BACKUP_LOCAL_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
DB_DUMP_PATH="$BACKUP_LOCAL_DIR/db_${TS}.sql.gz"
UPLOADS_TAR_PATH="$BACKUP_LOCAL_DIR/uploads_${TS}.tar.gz"

log INFO "Dumping database ($POSTGRES_DB) to $DB_DUMP_PATH"
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_DUMP_PATH"

log INFO "Packing $UPLOAD_DIR to $UPLOADS_TAR_PATH"
tar -czf "$UPLOADS_TAR_PATH" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"

log INFO "Purging local backups older than ${BACKUP_RETENTION_DAYS} days"
find "$BACKUP_LOCAL_DIR" -maxdepth 1 -type f \( -name 'db_*.sql.gz' -o -name 'uploads_*.tar.gz' \) \
  -mtime "+${BACKUP_RETENTION_DAYS}" -delete

log INFO "Backup complete"
