#!/usr/bin/env bash
set -euo pipefail

# 把兩個正式環境 image 分別打包成獨立的 tar 供離線交付，另附一份 sha256 manifest。
# 刻意維持分開：app image 每次發版都會變，而 postgres 是釘死版本的，因此日常更新只需要
# 傳 app 的 tar（約 70 MB），而不是兩個都傳（約 180 MB）。這兩個 image 沒有共用任何 layer
# ——python:3.12-slim 對上 alpine——所以合併起來本來也省不到空間。

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

usage() {
  cat <<'USAGE'
Usage: scripts/package-images.sh [--app-only]

  --app-only  Skip the postgres tar and only rebuild/save the app image. Use this
              for routine releases - postgres is pinned, so the offline host only
              needs its tar the first time (or when the pinned version changes).
USAGE
}

APP_ONLY=false
while [ $# -gt 0 ]; do
  case "$1" in
    --app-only) APP_ONLY=true ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "Unknown argument: $1" ;;
  esac
  shift
done

require_env_file

APP_VERSION="$(env_get APP_VERSION)"
OUTPUT_DIR="$(resolve_path "$(env_get PACKAGE_OUTPUT_DIR ./release)")"

# 刻意不設 fallback。這個版號會出現在 tar 檔名、離線主機上的 image tag，以及 compose 解析出的
# tag——因此一旦沒設定或多個版本共用同一個值，下一次發版就會覆蓋前一份 tar、把 tag 指向別處，
# 讓人無版可回滾。與其交付一份只能往前、不能回頭的東西，不如在這裡就拒絕。
if [ -z "$APP_VERSION" ]; then
  die "APP_VERSION is not set in $ENV_FILE - set it to the release version (e.g. v0.1.0)"
fi
if [ "$APP_VERSION" = "latest" ]; then
  die "APP_VERSION=latest is not allowed - every release would overwrite the previous tar and image tag, leaving no version to roll back to. Set a real version (e.g. v0.1.0)."
fi
# Docker 的 tag 允許字元集，同時也是讓 tar 檔名維持正常的關鍵——"/" 或空白會在下方
# 靜默產生一條壞掉的路徑。
if ! printf '%s' "$APP_VERSION" | grep -qE '^[A-Za-z0-9_][A-Za-z0-9._-]*$'; then
  die "APP_VERSION='$APP_VERSION' is not a valid image tag - use only letters, digits, '.', '_' and '-' (e.g. v0.1.0)"
fi

# 匯出成環境變數，好讓 compose 內插出來的 tag，與我們烙進 tar 檔名、以及當成 build arg
# 傳進去的是同一個。
export APP_VERSION

APP_IMAGE="py-file-platform-app:${APP_VERSION}"
# db image 是從 compose 檔讀回來的，而不是在這裡再寫一次，這樣 docker-compose.prod.yml
# 就仍是「這個部署釘在哪個 postgres 版本」的唯一來源。
#
# `|| true` 才是讓下方那個檢查真的跑得到的關鍵。在 `set -e` 之下，賦值會採用其命令替換的
# 結束碼，而 `pipefail` 又會把管線中任一段的非零值往外傳——少了它，一份沒有列出 db image
# 的 compose 檔（或是 `head` 提早關閉管線害 grep 收到 SIGPIPE）會讓 script 就地中止，
# 底下那句明確的錯誤訊息因此成為部署者永遠看不到的死碼。
DB_IMAGE="$(docker compose -f "$COMPOSE_FILE" config --images | grep -vFx "$APP_IMAGE" | head -n1 || true)"
if [ -z "$DB_IMAGE" ]; then
  die "Could not resolve the db image from $COMPOSE_FILE"
fi

# 兩份 tar 共用 py-file-platform- 前綴，好讓同一次交付在檔案列表中排在一起；db 那份保留
# 上游的 image 名稱，讓它的來源（以及該對照哪個版本查 CVE）在傳輸過程中不會遺失。
APP_TAR="$OUTPUT_DIR/py-file-platform-app-${APP_VERSION}.tar"
DB_TAR="$OUTPUT_DIR/py-file-platform-db-$(echo "$DB_IMAGE" | tr ':/' '--').tar"

mkdir -p "$OUTPUT_DIR"

log INFO "Building $APP_IMAGE"
docker compose -f "$COMPOSE_FILE" build

log INFO "Saving $APP_IMAGE to $APP_TAR"
docker save "$APP_IMAGE" -o "$APP_TAR"

if [ "$APP_ONLY" = true ]; then
  log INFO "Skipping $DB_IMAGE (--app-only)"
else
  log INFO "Saving $DB_IMAGE to $DB_TAR"
  docker save "$DB_IMAGE" -o "$DB_TAR"
fi

# manifest 只涵蓋這一次交付的 tar，而不是輸出目錄裡先前版本殘留的所有檔案，
# 這樣離線主機上的 `sha256sum -c` 檢查到的就正好是交出去的那一組。
MANIFEST_FILES=("$(basename "$APP_TAR")")
if [ -f "$DB_TAR" ]; then
  MANIFEST_FILES+=("$(basename "$DB_TAR")")
else
  log WARN "$(basename "$DB_TAR") is not in $OUTPUT_DIR - manifest covers the app tar only"
fi

log INFO "Writing $OUTPUT_DIR/MANIFEST.sha256"
(cd "$OUTPUT_DIR" && sha256sum "${MANIFEST_FILES[@]}" > MANIFEST.sha256)

log INFO "Done - transfer these to the offline host along with docker-compose.prod.yml and .env:"
(cd "$OUTPUT_DIR" && ls -lh "${MANIFEST_FILES[@]}" MANIFEST.sha256)
