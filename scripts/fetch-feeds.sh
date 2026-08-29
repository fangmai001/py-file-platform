#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/fetch-feeds.sh

Fetches every enabled RSS/Atom feed and stores newly seen items in the database. Runs
inside the app container, so no API token is needed. Intended for cron; the admin UI has
a per-feed "fetch now" button for one-off runs. Exits non-zero if any feed failed.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "Unknown argument: $1" ;;
  esac
done

require_env_file

log INFO "Fetching feeds"
# 走容器內的 CLI 而不是打 HTTP API：抓取端點僅限管理員，cron 要用它就得保管一份 token。
# -T 關掉 TTY 配置，cron 底下沒有 TTY。
docker compose -f "$COMPOSE_FILE" exec -T app python -m app.cli.fetch_feeds \
  || die "feed fetch failed - check that the app service is up: docker compose -f $COMPOSE_FILE ps"

log INFO "Feed fetch finished"
