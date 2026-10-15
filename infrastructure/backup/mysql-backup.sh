#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${MYSQL_HOST:?Set MYSQL_HOST}"
: "${MYSQL_DATABASE:?Set MYSQL_DATABASE}"
: "${MYSQL_USER:?Set MYSQL_USER}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

command -v mysqldump >/dev/null 2>&1 || { echo "ERROR: mysqldump is required." >&2; exit 127; }
command -v gzip >/dev/null 2>&1 || { echo "ERROR: gzip is required." >&2; exit 127; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
safe_db="$(printf '%s' "$MYSQL_DATABASE" | tr -cs 'A-Za-z0-9_.-' '_')"
destination="${BACKUP_DIR%/}/${safe_db}_${timestamp}.sql.gz"
temporary="${destination}.partial"
trap 'rm -f "$temporary"' EXIT

echo "Starting logical backup of database '${MYSQL_DATABASE}' from '${MYSQL_HOST}:${MYSQL_PORT}'."
echo "Output: $destination"

# Supply credentials through a protected MySQL option file (recommended), or
# the MYSQL_PWD environment variable injected by your secret manager.
# Never put passwords directly in this script or command-line arguments.
mysqldump \
  --host="$MYSQL_HOST" \
  --port="$MYSQL_PORT" \
  --user="$MYSQL_USER" \
  --single-transaction \
  --quick \
  --routines \
  --events \
  --triggers \
  --hex-blob \
  --default-character-set=utf8mb4 \
  "$MYSQL_DATABASE" | gzip -c > "$temporary"

gzip -t "$temporary"
mv "$temporary" "$destination"
chmod 600 "$destination"
trap - EXIT

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS > 0 )); then
  find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete
else
  echo "WARNING: RETENTION_DAYS is not a positive integer; skipping cleanup." >&2
fi

echo "Backup completed and gzip integrity check passed: $destination"
