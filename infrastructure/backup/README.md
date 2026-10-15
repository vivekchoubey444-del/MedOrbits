# Database Backup and Recovery

**Directory:** `infrastructure/backup/`

## Contents

- `mysql-backup.sh` — Creates a compressed logical MySQL backup.
- `restore-mysql.sh` — Restores a backup into a specified target database.
- `restore-drill.md` — Procedure for periodically testing recovery.

## Requirements

- Bash, `mysqldump`, `mysql`, and `gzip`.
- Credentials supplied through environment variables or a protected MySQL option file.
- A backup destination with appropriate access controls and adequate free space.

## Configuration

The scripts read `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, and `MYSQL_DATABASE`. Set `BACKUP_DIR` for backups. Use `MYSQL_PWD` only as a short-lived environment variable if necessary; a protected option file or managed secret injection is preferable because environment variables may be visible to privileged processes.

For production, use a least-privilege backup account, encrypted storage, off-host copies, retention policies, and monitoring for failed or missing backups.

## Safety

- Do not commit backup files or credentials.
- Do not restore over production as part of a drill.
- Validate backup integrity and periodically test actual restoration.
- Coordinate consistent backups for databases with large transactional workloads or special storage-engine requirements.