MedOrbits — Database Backup and Recovery

Directory: infrastructure/backup/

1. Purpose

This directory contains the scripts and procedures used to create MySQL logical backups, restore backups into a specified target database, and periodically verify database recoverability.

A successful backup operation does not guarantee that the database can be restored successfully. Recovery must be tested and the restored data validated.

2. Directory Contents

File	Responsibility
mysql-backup.sh	Creates a compressed logical MySQL backup.
restore-mysql.sh	Imports a compressed SQL backup into a specified, existing target database.
restore-drill.md	Documents the procedure for periodically testing backup restoration and recovery.

3. Requirements

The backup and restore scripts require:

* Bash.
* mysqldump for logical database exports.
* mysql for database imports.
* gzip for compression and archive-integrity checks.
* Access to the configured MySQL server.
* A backup destination with appropriate access controls and sufficient free space.
* A MySQL account with the privileges required for the requested operation.

Use compatible MySQL client utilities and verify their behavior against the database server version in use.

4. Configuration

Environment variables

Variable	Purpose
MYSQL_HOST	MySQL server hostname or address.
MYSQL_PORT	MySQL server port; defaults to 3306 in the supplied scripts.
MYSQL_USER	MySQL account used for the operation.
MYSQL_DATABASE	Database to back up. Required by the backup script.
BACKUP_DIR	Destination directory for backup archives; defaults to ./backups in the supplied backup script.
RETENTION_DAYS	Backup retention period in days; defaults to 14 in the supplied backup script.

The restore script accepts the backup file and target database as positional arguments. The target database must exist before restoration.

Credentials

Supply database credentials through a protected MySQL option file or managed secret injection.

* Do not hardcode passwords in scripts.
* Do not commit credentials to source control.
* Restrict access to option files and secret configuration.
* Prefer managed secret injection or a protected option file over MYSQL_PWD.
* Use MYSQL_PWD only when necessary and for the shortest practical duration because environment variables may be visible to privileged processes.

5. Backup Procedure

1. Configure the required MySQL connection variables and credentials.
2. Select an approved backup destination.
3. Ensure the destination has sufficient disk space and restricted access.
4. Run mysql-backup.sh using the configured environment.
5. Confirm that the script completes successfully and produces the expected archive.
6. Verify the archive and record relevant backup metadata.
7. Confirm that the backup is copied to protected off-host storage when required by the recovery policy.

The supplied backup script uses mysqldump and gzip compression. Its archive-integrity check does not prove that the SQL can be restored or that all database objects and records are recoverable.

6. Restore Procedure

1. Select the intended backup and verify its integrity and provenance.
2. Prepare an isolated, compatible MySQL environment.
3. Create or verify a disposable target database.
4. Configure the required connection credentials.
5. Run restore-mysql.sh with the backup path and explicit target database name.
6. Confirm the target database name when prompted.
7. Inspect the import result and validate the restored schema and representative records.
8. Run relevant application-level checks.
9. Record the results and clean up the test environment securely.

Safety requirement: Never run a routine restore drill against production. A failed import may leave the target database partially modified.

7. Production Requirements

Production backup and recovery operations should include:

* Least privilege: Use dedicated database accounts with only the necessary permissions.
* Access control: Restrict access to backup directories, archives, and credentials.
* Encryption: Protect backup archives in transit and at rest.
* Off-host copies: Keep recovery copies separate from the primary database environment.
* Retention: Define and enforce an approved retention period.
* Monitoring: Alert on failed, incomplete, or missing scheduled backups.
* Recovery testing: Periodically restore backups and validate the recovered data.
* Capacity management: Monitor available disk space and backup growth.
* Auditability: Record backup outcomes, recovery attempts, and relevant operational actions without exposing secrets.

8. Consistency and Database Considerations

The supplied backup script uses mysqldump —single-transaction, which is intended to provide a consistent snapshot for transactional tables such as InnoDB.

This option does not guarantee a consistent snapshot of nontransactional tables. Coordinate backup procedures for databases containing nontransactional tables, large transactional workloads, or special storage-engine requirements.

Verify the backup approach against the database engine, schema, workload, and recovery objectives before relying on it for production recovery.

9. Recovery Validation

Use restore-drill.md as the procedure for testing recovery.

A recovery drill should verify:

* The backup can be read and imported.
* Expected tables and database objects are present.
* Representative records and important relationships are valid.
* Character encoding and relevant constraints are preserved.
* Application-level reads behave as expected.
* Recovery duration is recorded and compared with the agreed recovery objectives.

Define Recovery Point Objective (RPO) and Recovery Time Objective (RTO) with the relevant business owner.

10. Maintenance Checklist

* [ ]	Backup and restore scripts are maintained in source control.
* [ ]	Credentials are supplied securely.
* [ ]	Backup destination permissions are restricted.
* [ ]	Storage capacity and retention behavior are monitored.
* [ ]	Production backups are encrypted and copied off-host where required.
* [ ]	Backup failures generate appropriate alerts.
* [ ]	Restore drills are performed at the required frequency.
* [ ]	Recovery results and remediation actions are documented.
* [ ]	Scripts are reviewed after database or infrastructure changes.

11. Maintenance Policy

Update this documentation whenever the backup scripts, database configuration, credential-handling approach, storage destination, retention policy, or recovery procedure changes.

Document only verified capabilities. Do not describe backups as encrypted, off-site, monitored, or automatically scheduled unless the corresponding controls have actually been configured and tested.

⸻

MedOrbits — Reliable Data, Verified Recovery