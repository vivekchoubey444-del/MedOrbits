MedOrbits — MySQL Restore Drill

Directory: infrastructure/backup/
Related scripts:

* mysql-backup.sh
* restore-mysql.sh

1. Objective

Prove that a MySQL backup can be restored and that the recovered data is usable.

A successful backup command or archive-integrity check alone does not prove recoverability. A restore drill must validate the restored database and confirm that the relevant application functions work as expected.

2. Frequency

Run a restore drill:

* At least quarterly.
* After major database schema changes.
* After changing backup scripts, storage systems, or database configurations.
* After significant changes to the recovery process.
* More frequently when contractual, business, or regulatory requirements demand it.

Assign an owner responsible for scheduling drills, recording results, and tracking remediation.

3. Prerequisites

Before beginning:

* Identify the backup to test and confirm its timestamp and source.
* Confirm that a compatible MySQL version and configuration are available.
* Prepare a disposable, isolated database or test instance.
* Verify that the target is not production.
* Confirm that the restore account has only the privileges required for the drill.
* Ensure sufficient disk space and an appropriate recovery environment.
* Confirm that backup files and restored data are protected from unauthorized access.
* Review the backup’s provenance and ensure it is suitable for testing.

Use synthetic or appropriately protected test data wherever practical. If the backup contains personal or confidential information, apply the required access controls and data-handling safeguards.

4. Restore Drill Procedure

Step 1 — Select and verify the backup

Choose a recent backup that is representative of the recovery requirements.

* Record the backup filename and timestamp.
* Verify its checksum against a trusted recorded checksum, if available.
* Confirm storage integrity and access permissions.
* Check the compressed archive using the available integrity-verification procedure.
* Confirm that the backup is complete enough for the intended recovery test.

A successful compression check does not prove that the SQL can be imported or that the database can be used.

Step 2 — Prepare the recovery environment

Create or provision a disposable, isolated MySQL database or test instance.

* Confirm the MySQL version and relevant configuration.
* Ensure the environment cannot accidentally modify production.
* Confirm the target database name explicitly.
* Verify that the restore account has the necessary privileges without unnecessary administrative access.
* Configure credentials securely; never embed passwords in commands, scripts, or documentation.
* Prevent test data from being exposed through public web directories or unrestricted services.

Step 3 — Restore the backup

Use the repository’s restore-mysql.sh script when it is appropriate for the selected backup format and target.

Follow its confirmation prompt and explicitly verify the target database name before proceeding.

Monitor the restore for:

* SQL import errors.
* Permission or configuration problems.
* Missing tables, routines, triggers, or events.
* Character-set or collation issues.
* Timeouts, resource constraints, or insufficient disk space.

If the restore fails, treat the target as potentially partially modified. Investigate the cause before retrying.

Safety rule: Never run a restore drill against production or an active database containing valuable data.

Step 4 — Validate the restored database

Compare the restored database with the expected schema and available reference information.

Validate the following where applicable:

* [ ]	Expected tables and views exist.
* [ ]	Table counts are plausible and discrepancies are explained.
* [ ]	Representative records can be queried.
* [ ]	Primary keys, foreign keys, and important relationships are valid.
* [ ]	Indexes and constraints are present.
* [ ]	Triggers, stored routines, and scheduled database events are present where expected.
* [ ]	Character encoding and collation are correct.
* [ ]	Important timestamps, monetary values, and status fields are preserved.
* [ ]	No unexpected import errors or unexplained data gaps remain.

Table counts may change if the source database was modified after the backup was taken. Compare results against the appropriate backup-time reference rather than assuming current production counts must match.

Step 5 — Validate application behavior

Where the test environment supports it, run the relevant application checks against the restored database.

Examples include:

* Reading representative education catalogues.
* Retrieving test user and application records.
* Loading relevant course, college, or university information.
* Verifying expected relationships between applications and their associated records.
* Confirming that database-backed pages and API endpoints behave as expected.

Do not connect the drill environment to live payment processing, production email delivery, or other external services that could trigger real transactions or notifications.

Step 6 — Record recovery measurements

Record:

* Backup identifier and timestamp.
* Source and destination environment.
* MySQL version and relevant configuration.
* Restore start and completion times.
* Total restore duration.
* Validation results and discrepancies.
* Errors and corrective actions.
* Whether the agreed RPO and RTO targets were met.

Calculate recovery time consistently, using the same start and completion definitions for each drill.

Step 7 — Clean up the test environment

After validation and approval:

* Remove temporary test resources and restored data securely.
* Confirm that no test database or service remains unintentionally exposed.
* Preserve the drill report and required audit evidence.
* Retain any logs needed for remediation without exposing secrets or unnecessary personal information.

Step 8 — Track remediation

For each failure or discrepancy:

* Describe the issue and its impact.
* Identify the responsible owner.
* Record the corrective action and target completion date.
* Retest the affected recovery step.
* Document the final result and closure evidence.

A drill is not complete merely because the restore command exits successfully.

5. Recovery Measures

Recovery Point Objective (RPO)

The maximum acceptable data loss measured in time.

Define the RPO with the relevant business owner and verify that backup frequency, backup completeness, and recovery procedures can meet it.

Recovery Time Objective (RTO)

The maximum acceptable time to restore the required service.

Define the RTO with the relevant business owner and measure recovery duration during drills, including validation and any necessary service-restoration steps.

Targets must reflect business requirements rather than assumptions based solely on the speed of a database import.

6. Backup and Recovery Safety

* Never run a restore drill against production.
* Never commit backup archives or database credentials to source control.
* Never store private backup archives in publicly served web directories.
* Protect backups with encryption, least-privilege access, appropriate retention, and off-site or separately isolated copies.
* Protect restored test data to the same standard required by its sensitivity.
* Keep backup credentials separate from ordinary application credentials where practical.
* Verify that backups can be accessed during recovery without unnecessarily exposing secrets.
* Maintain a recovery procedure for corrupted, incomplete, or inaccessible backups.

7. Drill Record Template

Complete one record for every drill.

Field	Record
Drill date	YYYY-MM-DD
Responsible owner	Name or team
Backup identifier	Filename or backup ID
Backup timestamp	UTC timestamp
Test environment	Isolated instance or database
MySQL version	Tested version
Restore start	UTC timestamp
Restore completion	UTC timestamp
Total recovery duration	Measured duration
RPO target and result	Target; met/not met
RTO target and result	Target; met/not met
Database validation	Pass/fail with notes
Application validation	Pass/fail/not applicable
Issues found	Summary or issue references
Remediation owner	Name or team
Final status	Pass/fail/pending remediation
Reviewer	Name or team

8. Completion Criteria

A restore drill passes only when:

1. The selected backup is verified to the extent supported by the available evidence.
2. The backup imports into the isolated target without unresolved errors.
3. Required database objects and representative records are validated.
4. Relevant application checks pass where applicable.
5. Recovery measurements are recorded and compared with the agreed targets.
6. Issues are documented and assigned for remediation.
7. Test resources are cleaned up or securely retained under an approved procedure.

9. Maintenance

Review this procedure whenever the backup scripts, MySQL version, database schema, storage system, or recovery objectives change.

MedOrbits operational principle: A backup is dependable only when recovery has been demonstrated and the recovered data has been validated.