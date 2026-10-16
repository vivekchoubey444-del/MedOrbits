#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MedOrbits -- MySQL Restore Utility

Path: infrastructure/backup/restore-mysql.sh

Restores a compressed SQL dump into an existing, verified target database.

This script does not create, drop, or automatically select a target database

from the backup filename.

log() {
printf ‘[%s] %s\n’ "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

die() {
log "ERROR: $*" >&2
exit 1
}

if [[ $# -ne 2 ]]; then
echo "Usage: $0 /path/to/backup.sql.gz TARGET_DATABASE" >&2
exit 2
fi

backup_file="$1"
target_database="$2"

: "${MYSQL_HOST:?Set MYSQL_HOST}"
: "${MYSQL_USER:?Set MYSQL_USER}"

MYSQL_PORT="${MYSQL_PORT:-3306}"

[[ "$MYSQL_PORT" =~ ^[0-9]+$ ]] ||
die "MYSQL_PORT must be numeric."

(( MYSQL_PORT >= 1 && MYSQL_PORT <= 65535 )) ||
die "MYSQL_PORT must be between 1 and 65535."

Conservative identifier validation. Database names must be supplied

explicitly and must not contain shell or SQL identifier metacharacters.

[[ "$target_database" =~ ^[A-Za-z0-9_]{0,63}$ ]] ||
die "Invalid target database name."

[[ -f "$backup_file" && -r "$backup_file" ]] ||
die "Backup file does not exist or is not readable."

command -v mysql >/dev/null 2>&1 ||
die "mysql client is required."

command -v gzip >/dev/null 2>&1 ||
die "gzip is required."

log "Preparing MySQL restore."
log "Host: ${MYSQL_HOST}:${MYSQL_PORT}"
log "Target database: ${target_database}"
log "Backup file: ${backup_file}"

echo
echo "WARNING: SQL statements in the backup will execute against the target database."
echo "Use a disposable, isolated database for restore drills."
echo "This script does not guarantee that the dump contains no destructive statements."
echo
read -r -p "Type the target database name to continue: " confirmation

[[ "$confirmation" == "$target_database" ]] ||
die "Confirmation did not match; restore aborted."

log "Verifying compressed archive."
gzip -t – "$backup_file" ||
die "Backup archive failed gzip integrity verification."

log "Starting restore import."

Supply credentials using a protected MySQL option file or a secret manager.

Never embed passwords in this script or pass them as command-line arguments.

If using MYSQL_CNF, configure it through your deployment environment and

add –defaults-extra-file="$MYSQL_CNF" as the FIRST mysql option.

Confirm support with the installed MySQL client.

if ! gzip -dc – "$backup_file" | mysql 
–host="$MYSQL_HOST" 
–port="$MYSQL_PORT" 
–user="$MYSQL_USER" 
–default-character-set=utf8mb4 
–database="$target_database"; then
die "Restore import failed. The target database may be partially modified; inspect it before retrying."
fi

log "Restore import completed."
log "Run schema, row-count, application, and integrity checks."
log "Follow infrastructure/backup/restore-drill.md if that document exists."