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

# Both archives are written to .partial and only renamed once verified, so a failure never
# leaves a file under the real name. The shell creates a redirect target *before* the
# pipeline runs, so writing straight to db_<ts>.sql.gz meant any pg_dump failure left a
# 0-byte file behind with a perfectly plausible name - which passed the README's "check
# that backups/ contains db_*.sql.gz" acceptance check. A backup that lies about having
# worked is worse than no backup, because it is only discovered on the day it is needed.
trap 'rm -f "$DB_DUMP_PATH.partial" "$UPLOADS_TAR_PATH.partial"' EXIT

# A gzipped dump of the migrated schema runs to several KB even with no rows in it, so
# anything near-empty means the dump did not actually happen.
MIN_DUMP_BYTES=1024

log INFO "Dumping database ($POSTGRES_DB) to $DB_DUMP_PATH"
# --clean --if-exists is what makes this dump restorable. The restore target is always a
# database the app container has already run `alembic upgrade head` against, so a plain
# dump would hit "already exists" on every CREATE and duplicate keys on every COPY -
# psql keeps going past those, so the restore looks like it worked while leaving the data
# untouched. With these flags each object is dropped first (and missing ones are skipped
# with a notice on an empty database, which is harmless).
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
