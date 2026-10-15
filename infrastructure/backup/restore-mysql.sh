#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 /path/to/backup.sql.gz TARGET_DATABASE" >&2
  exit 2
fi

backup_file="$1"
target_database="$2"

: "${MYSQL_HOST:?Set MYSQL_HOST}"
: "${MYSQL_USER:?Set MYSQL_USER}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

[[ -f "$backup_file" ]] || { echo "ERROR: Backup file not found: $backup_file" >&2; exit 1; }
command -v mysql >/dev/null 2>&1 || { echo "ERROR: mysql client is required." >&2; exit 127; }
command -v gzip >/dev/null 2>&1 || { echo "ERROR: gzip is required." >&2; exit 127; }

# This script does not create the target database and never selects a database
# from the backup filename. Create and verify an isolated target database first.
echo "WARNING: This will import '$backup_file' into database '$target_database' on '$MYSQL_HOST:$MYSQL_PORT'."
echo "Use a disposable, verified target database for drills. This is not a production-safe overwrite tool."
read -r -p "Type the target database name to continue: " confirmation
[[ "$confirmation" == "$target_database" ]] || { echo "Confirmation did not match; aborting." >&2; exit 1; }

gzip -t "$backup_file"
gzip -dc "$backup_file" | mysql \
  --host="$MYSQL_HOST" \
  --port="$MYSQL_PORT" \
  --user="$MYSQL_USER" \
  --default-character-set=utf8mb4 \
  "$target_database"

echo "Restore import completed. Run the validation steps in restore-drill.md."
