#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MedOrbits -- MySQL Logical Backup

Path: infrastructure/backup/mysql-backup.sh

: "${MYSQL_HOST:?Set MYSQL_HOST}"
: "${MYSQL_DATABASE:?Set MYSQL_DATABASE}"
: "${MYSQL_USER:?Set MYSQL_USER}"

MYSQL_PORT="${MYSQL_PORT:-3306}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

log() {
printf ‘[%s] %s\n’ "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

die() {
log "ERROR: $*" >&2
exit 1
}

command -v mysqldump >/dev/null 2>&1 ||
die "mysqldump is required."

command -v gzip >/dev/null 2>&1 ||
die "gzip is required."

command -v find >/dev/null 2>&1 ||
die "find is required."

command -v mktemp >/dev/null 2>&1 ||
die "mktemp is required."

[[ "$MYSQL_PORT" =~ ^[0-9]+$ ]] ||
die "MYSQL_PORT must be numeric."

(( MYSQL_PORT >= 1 && MYSQL_PORT <= 65535 )) ||
die "MYSQL_PORT must be between 1 and 65535."

[[ -n "$MYSQL_DATABASE" ]] ||
die "MYSQL_DATABASE cannot be empty."

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] ||
die "RETENTION_DAYS must be a non-negative integer."

[[ -d "$BACKUP_DIR" || ! -e "$BACKUP_DIR" ]] ||
die "BACKUP_DIR exists but is not a directory."

mkdir -p – "$BACKUP_DIR"
chmod 700 – "$BACKUP_DIR"

BACKUP_DIR="$(cd – "$BACKUP_DIR" && pwd -P)"

Keep database names out of filenames unless they contain safe characters.

safe_db="$(printf ‘%s’ "$MYSQL_DATABASE" | tr -cs ‘A-Za-z0-9_.-’ ‘’)"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${BACKUP_DIR}/${safe_db}${timestamp}.sql.gz"

Create the temporary file inside the destination directory so that

publication by rename stays on the same filesystem.

temporary="$(mktemp "${BACKUP_DIR}/.${safe_db}_${timestamp}.XXXXXX.partial")"
chmod 600 – "$temporary"

cleanup() {
if [[ -n "${temporary:-}" && -e "$temporary" ]]; then
rm -f – "$temporary"
fi
}
trap cleanup EXIT
trap ‘exit 130’ INT
trap ‘exit 143’ TERM

log "Starting logical backup."
log "Database host: ${MYSQL_HOST}:${MYSQL_PORT}"
log "Database: ${MYSQL_DATABASE}"
log "Destination: ${destination}"

Configure credentials through a protected MySQL option file or a secret

manager. Do not put passwords in this script or command-line arguments.

For an option file, configure MYSQL_CNF to point to a file readable only

by the backup account and add –defaults-extra-file="$MYSQL_CNF" as the

FIRST mysqldump option. Verify support with the installed client.

MYSQL_PWD may be used when injected securely by the deployment environment,

but a protected option file or managed secret integration is preferred.

if ! mysqldump 
–host="$MYSQL_HOST" 
–port="$MYSQL_PORT" 
–user="$MYSQL_USER" 
–single-transaction 
–quick 
–routines 
–events 
–triggers 
–hex-blob 
–default-character-set=utf8mb4 
"$MYSQL_DATABASE" | gzip -c > "$temporary"; then
die "Database dump or compression failed."
fi

[[ -s "$temporary" ]] ||
die "Backup archive is empty."

gzip -t – "$temporary" ||
die "Backup archive failed gzip integrity verification."

Publish only after the dump and archive checks succeed.

[[ ! -e "$destination" ]] ||
die "Destination already exists; refusing to overwrite it."

mv – "$temporary" "$destination"
temporary=""
chmod 600 – "$destination"

log "Backup archive created and gzip integrity verified."

Retention is limited to SQL gzip files directly inside BACKUP_DIR.

A retention period of 0 intentionally disables automatic cleanup.

if (( RETENTION_DAYS > 0 )); then
log "Removing backup files older than ${RETENTION_DAYS} days."

find "$BACKUP_DIR" 
-maxdepth 1 
-type f 
-name ‘*.sql.gz’ 
-mtime "+${RETENTION_DAYS}" 
-print 
-delete
else
log "Retention cleanup disabled because RETENTION_DAYS=0."
fi

log "Backup completed successfully: ${destination}"