# MySQL Restore Drill

## Objective

Prove that a backup can be restored and that the restored data is usable. A successful backup command alone does not prove recoverability.

## Frequency

Run a drill at least quarterly, after major schema changes, and after changing backup tooling or storage. Set a stricter cadence if contractual or regulatory requirements demand it.

## Procedure

1. Select a recent backup and verify its checksum or storage integrity.
2. Create a disposable, isolated MySQL database or test instance with compatible MySQL version and configuration.
3. Confirm the target is not production and that the restore account has only the permissions needed for the drill.
4. Restore using `restore-mysql.sh` and explicitly confirm the target database name.
5. Validate table counts, key relationships, representative records, indexes, triggers, routines, events, character encoding, and application-level read paths.
6. Record backup timestamp, restore start/end time, errors, validation results, and approximate recovery time.
7. Remove test data securely after approval.
8. Document remediation tasks for any failures.

## Measures

- **RPO (Recovery Point Objective):** maximum acceptable data loss measured in time.
- **RTO (Recovery Time Objective):** maximum acceptable time to restore service.

Define targets with the business owner and verify them through drills.

## Safety

Never run a restore drill against production. Do not place backup archives in public web directories or commit them to source control. Protect backups with encryption, access controls, retention, and off-site copies.
