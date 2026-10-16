Backup and Recovery

Project: MedOrbits
Purpose: Define backup, retention, restoration, disaster recovery, and recovery-validation requirements for production systems.

1. Overview

MedOrbits must maintain a documented recovery process for critical application data and supporting infrastructure.

Backup procedures must protect data integrity, confidentiality, and availability. Recovery procedures must be tested before they are relied upon during a production incident.

The actual MySQL configuration, hosting-platform capabilities, storage configuration, and deployed backup tooling determine which procedures are available.

2. Recovery Objectives

Define and approve the following objectives for each critical system or data store.

Objective	Definition
Recovery Point Objective (RPO)	The maximum acceptable amount of data loss, measured as time before the incident.
Recovery Time Objective (RTO)	The target maximum time to restore the required service to an acceptable operational state.

Document the approved objectives for the MySQL database, uploaded documents, and other critical resources where applicable.

Consider the impact of losing application records, admissions applications, private documents, payment references, and audit records when defining these targets.

Do not publish numerical RPO or RTO commitments until they have been approved and the required recovery capabilities have been verified.

3. Backup Requirements

3.1 Automation and Monitoring

* Automate backups using an approved database or hosting-platform mechanism.
* Define backup frequency according to the approved RPO.
* Monitor backup completion, failure, duration, and freshness.
* Alert the responsible team when a backup fails or becomes overdue.
* Retain sufficient execution history to investigate backup failures.
* Test restoration periodically rather than relying only on successful backup-job status.

A successful backup command does not, by itself, prove that the resulting backup can be restored.

3.2 Backup Contents

Recovery planning must identify all resources required to restore the application to a consistent state.

Depending on the actual MySQL configuration and application architecture, this may include:

* Database schema and table data.
* Indexes, constraints, and foreign-key relationships.
* Stored procedures and functions, if used.
* Database events and triggers, if used.
* Required database-level configuration and permissions.
* Migration history and relevant version information.
* Uploaded documents and other persistent application-managed files.
* Configuration references needed to reconnect the restored application to its dependencies.

Identify resources that are managed separately by the hosting platform or another service. Do not assume a database backup includes application files, external-service data, or deployment configuration.

3.3 Storage and Access Controls

* Store backups separately from the primary database or failure domain.
* Use storage with suitable durability and access controls.
* Encrypt backups in transit and at rest using approved mechanisms.
* Restrict backup access to authorized personnel and recovery processes.
* Protect encryption keys and backup credentials separately from the backup data.
* Avoid exposing backup files through public web directories.
* Record access to sensitive backup resources where supported.
* Verify that the recovery team can access the required backups during an incident.

A backup stored only alongside the primary system may be lost in the same incident.

3.4 Retention and Deletion

Define retention periods based on operational requirements, applicable legal obligations, and data-protection policies.

The retention policy must specify:

* Backup frequency and retention duration.
* Handling of daily, weekly, or other backup generations, where applicable.
* Deletion of expired backup copies.
* Treatment of backups subject to legal holds or other approved exceptions.
* Secure disposal of expired backup data and associated credentials.
* How deletion obligations are handled when personal data remains in retained backups.

Document the limitations of deleting an individual record from an immutable or full-database backup. Apply the approved retention and restoration procedures to prevent deleted data from being unintentionally reintroduced.

4. Pre-Recovery Assessment

Before restoring a production system:

1. Declare the recovery event and identify the incident owner.
2. Determine the scope and severity of the failure.
3. Identify the affected database, files, services, and application versions.
4. Select an appropriate recovery point.
5. Confirm backup integrity and availability.
6. Review the approved RPO, RTO, and recovery plan.
7. Identify the required MySQL version, configuration, permissions, and dependencies.
8. Determine whether the primary system must be isolated to prevent further corruption or conflicting writes.
9. Confirm who is authorized to approve restoration and traffic switching.
10. Record the recovery decision and intended approach.

Preserve relevant logs and diagnostic evidence where required. Avoid overwriting a potentially recoverable system before its state has been assessed.

5. Recovery Procedure

Step 1 — Declare and Coordinate

Declare the recovery event using the applicable incident process.

Assign a recovery owner, communicate the expected impact, and establish the approval path for restoration and traffic switching.

Step 2 — Select and Verify the Backup

Identify a known-good backup suitable for the incident.

Verify:

* Backup timestamp and recovery point.
* Backup completion status.
* File integrity using the available checksum or verification mechanism.
* Decryption and access requirements.
* Compatibility with the intended MySQL environment.
* Availability of required schema objects and supporting files.

A checksum confirms file integrity relative to the recorded checksum; it does not independently prove that the database can be restored successfully.

Step 3 — Provision the Recovery Environment

Provision an isolated or otherwise approved recovery environment.

Confirm:

* MySQL version and relevant configuration.
* Required storage capacity and permissions.
* Network access restrictions.
* Availability of migration history and recovery tooling.
* Separation from production traffic and external side effects.

Do not restore a backup into the live production database until the recovery plan explicitly authorizes that operation.

Step 4 — Restore the Database

Use the documented MySQL recovery script or another approved restoration process.

Follow the procedure for the selected backup format and MySQL version.

The procedure must specify how to handle schema objects, database users and privileges, stored routines, triggers, events, and other required resources.

Do not invent or substitute a recovery command without verifying the actual backup format, script, and target environment.

Step 5 — Validate the Restored Data

Before allowing normal application traffic, validate:

* Schema and expected database objects.
* Table and record counts against appropriate reference points.
* Primary-key and foreign-key relationships.
* Unique constraints and other integrity rules.
* Critical records and representative queries.
* Migration history and schema compatibility.
* Data consistency across related tables.
* Availability of required uploaded documents and other persistent resources.

Record discrepancies and determine whether they are expected consequences of the recovery point or signs of an incomplete restoration.

Step 6 — Validate Application Workflows

Deploy or configure a compatible application version in the recovery environment.

Run controlled checks for the critical workflows relevant to the incident, including:

* Application startup and database connectivity.
* Authentication and authorization.
* Education and application data retrieval.
* Application creation and status retrieval, where appropriate.
* Authorized document access.
* Payment and subscription status verification, where enabled.
* Administrative access and essential reporting.

Avoid sending live emails, triggering real payments, or performing irreversible third-party operations during validation unless specifically authorized.

Step 7 — Reconcile Post-Backup Changes

Identify data created or modified after the selected recovery point.

Where possible, reconcile missing records using approved transaction logs, application records, provider records, or other authoritative sources.

Pay particular attention to payment references, application submissions, document uploads, and other operations that may have succeeded externally even when the restored database does not contain the corresponding record.

Do not blindly replay transactions or callbacks. Use appropriate reconciliation and idempotency controls to prevent duplicate processing.

Step 8 — Approve Traffic Switching

Switch production traffic only after the authorized decision-maker confirms that the recovery environment is sufficiently validated.

Before switching:

* Confirm the intended application and database endpoints.
* Verify permissions and secrets.
* Check required integrations and storage access.
* Confirm monitoring and alerting.
* Define how to stop or reverse the cutover if validation fails.
* Communicate the decision and expected service impact.

Step 9 — Monitor and Close the Recovery

After traffic switching, monitor application errors, latency, database health, critical workflows, and relevant external integrations.

Confirm that the restored system remains consistent under normal operation.

Document the final recovery point, restoration duration, data discrepancies, user impact, and outstanding follow-up work.

6. Recovery and Deployment Compatibility

Database recovery must be coordinated with application deployment.

* Confirm that the application version is compatible with the restored schema.
* Review migrations applied after the selected backup.
* Determine whether application rollback is safe against the restored schema.
* Assess whether external transactions or notifications require reconciliation.
* Avoid automatically rerunning migrations without checking migration history and the actual schema.
* Use a forward-fix or controlled data-repair procedure when reversal could cause additional data loss.

Important: Restoring a backup may discard legitimate changes made after that backup. Application rollback, database restoration, and external-system reconciliation are separate operations.

7. Recovery Drills

Run periodic restore drills in a non-production environment.

Each drill should verify:

1. A backup can be located and accessed by authorized personnel.
2. Required decryption and recovery credentials are available.
3. The documented restoration procedure can be completed.
4. Schema and data-integrity checks pass.
5. Critical application workflows function after restoration.
6. The observed recovery time is recorded against the RTO.
7. The amount of data potentially lost is assessed against the RPO.
8. Any missing resources, access problems, or procedural gaps are documented.

Never conduct a recovery drill against production.

Record the drill date, backup selected, MySQL version, observed duration, validation results, failures, and corrective actions.

A backup is not considered reliable merely because it exists; its restoration must be tested.

8. Incident Records

For each production recovery, record:

Field	Required information
Incident identifier	Incident or recovery reference
Recovery owner	Responsible person or team
Incident declaration	Timestamp and timezone
Selected recovery point	Backup identifier and timestamp
Restoration start and end	Observed timestamps
Recovery outcome	Successful, partial, or unsuccessful
Data validation	Checks completed and discrepancies
RPO assessment	Estimated data loss relative to the approved objective
RTO assessment	Actual recovery time relative to the approved objective
Traffic-switch approval	Authorized decision and timestamp
Follow-up actions	Corrective actions, owners, and deadlines

Do not include passwords, secret values, or unnecessary personal information in incident records.

9. Responsibilities

Assign clear ownership for:

* Backup scheduling and monitoring.
* Backup storage and access controls.
* Encryption-key and credential management.
* Recovery approval and execution.
* Database and application validation.
* Incident communication.
* Recovery-drill scheduling and remediation.

Use the actual MedOrbits team structure and hosting capabilities when assigning responsibilities.

10. Related Documentation

* Database schema documentation.
* Database migration and recovery procedures.
* docs/deployment/production.md — Production deployment, if present.
* docs/deployment/staging.md — Staging validation, if present.
* docs/architecture/data-flow.md — Data-processing flows.
* Hosting-platform backup and recovery documentation.
* Incident response and security procedures.

Verify all paths against the current repository.

11. Definition of Done

A recovery is complete when:

* [ ]	The restored environment has passed the required integrity checks.
* [ ]	Critical application workflows have been verified.
* [ ]	Data discrepancies have been reconciled or explicitly documented.
* [ ]	Traffic switching has been authorized.
* [ ]	Monitoring confirms acceptable operation.
* [ ]	RPO and RTO outcomes have been assessed.
* [ ]	The recovery record and follow-up actions have been completed.

Accuracy rule: Document only backup schedules, recovery scripts, retention policies, and hosting-platform capabilities that have been verified. This procedure defines the required recovery process; it does not establish that automated backups or tested restoration tooling already exist.