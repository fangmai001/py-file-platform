#!/usr/bin/env bash
set -euo pipefail

# The counterpart to backup.sh. backup.sh produces two archives and both have to go back,
# so this restores them together by default: the database holds only metadata and
# FileVersion.stored_path, while the bytes live in uploads/. Restoring one without the
# other yields a file listing that looks correct but 404s on every download.

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
# Read from .env rather than hardcoded, so this follows the same deployment backup.sh
# dumped from - a host that changed POSTGRES_USER would otherwise fail to authenticate.
POSTGRES_USER="$(env_get POSTGRES_USER platform)"
POSTGRES_DB="$(env_get POSTGRES_DB platform)"
UPLOAD_DIR="$(resolve_path "$(env_get UPLOAD_DIR ./uploads)")"

if [ -n "$TIMESTAMP" ]; then
  [ -z "$DB_PATH" ] && [ -z "$UPLOADS_PATH" ] || die "--timestamp cannot be combined with --db/--uploads"
  DB_PATH="$BACKUP_LOCAL_DIR/db_${TIMESTAMP}.sql.gz"
  UPLOADS_PATH="$BACKUP_LOCAL_DIR/uploads_${TIMESTAMP}.tar.gz"
fi

if [ -z "$DB_PATH" ] && [ -z "$UPLOADS_PATH" ]; then
  usage >&2
  echo >&2
  echo "Available backups in $BACKUP_LOCAL_DIR:" >&2
  ls -1 "$BACKUP_LOCAL_DIR" 2>/dev/null | grep -E '^(db|uploads)_' >&2 || echo "  (none)" >&2
  exit 1
fi

[ -z "$DB_PATH" ] || [ -f "$DB_PATH" ] || die "$DB_PATH not found"
[ -z "$UPLOADS_PATH" ] || [ -f "$UPLOADS_PATH" ] || die "$UPLOADS_PATH not found"

# tar would otherwise fail partway through with "Cannot open: Permission denied" on the
# first root-owned file and still exit after unpacking the rest, which reads as success.
if [ -n "$UPLOADS_PATH" ] && [ "$(id -u)" -ne 0 ]; then
  die "restoring uploads needs root (the files are root-owned via the container bind mount) - re-run with sudo"
fi

log WARN "About to restore over the live deployment at $REPO_ROOT:"
[ -z "$DB_PATH" ] || log WARN "  database $POSTGRES_DB  <- $DB_PATH"
[ -z "$UPLOADS_PATH" ] || log WARN "  $UPLOAD_DIR  <- $UPLOADS_PATH"
if [ "$ASSUME_YES" != true ]; then
  # Existing data is dropped (db) or overwritten (uploads), so make the operator say so.
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
  # -v ON_ERROR_STOP=1 is not optional: psql's default is to report each error and carry
  # on, then exit 0. Without it a restore that failed on every single statement is
  # indistinguishable from one that worked.
  gunzip -c "$DB_PATH" \
    | docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    || die "database restore failed - the app is still stopped; fix the cause and re-run, or start it with: docker compose -f $COMPOSE_FILE up -d"
fi

if [ -n "$UPLOADS_PATH" ]; then
  log INFO "Restoring $UPLOAD_DIR from $UPLOADS_PATH"
  # backup.sh packs uploads/ as the top-level entry, so this unpacks one level above it.
  # Extraction only overwrites files of the same name; anything uploaded after the backup
  # stays. To land exactly on the backed-up state, move the current uploads/ aside first.
  tar -xzf "$UPLOADS_PATH" -C "$(dirname "$UPLOAD_DIR")" \
    || die "failed to unpack $UPLOADS_PATH - the app is still stopped"
fi

log INFO "Starting app"
docker compose -f "$COMPOSE_FILE" up -d

log INFO "Restore complete. Verify before calling it done:"
log INFO "  curl -s http://localhost/health"
log INFO "  then log in and actually download one file - a listing alone does not prove the"
log INFO "  uploads came back, since the metadata lives in the database."
