Database Migrations

Project: MedOrbits
Purpose: Define the standards for creating, reviewing, testing, deploying, and recovering database schema changes.

1. Requirements

All database migrations must follow these requirements:

* Version control: Store migration files in the repository and review them alongside related application changes.
* Deterministic ordering: Apply migrations in a predictable sequence.
* Unique identifiers: Assign every migration a unique, ordered identifier, such as a timestamp or sequential version.
* SQL review: Inspect generated SQL before execution, including table alterations, indexes, constraints, data transformations, and destructive operations.
* Testing: Test migrations against an empty database and a representative staging copy.
* Compatibility: Where practical, ensure schema changes support overlapping application versions during rolling deployments and rollback windows.
* Status tracking: Record which migrations have been applied, when they ran, and whether execution succeeded or failed.
* Clear failure behavior: Stop the migration process on failure, report the relevant migration identifier, and avoid silently continuing with an inconsistent schema.
* Concurrency control: Prevent multiple deployment processes from applying the same migration concurrently.
* Auditability: Retain migration history and review records according to the project’s operational requirements.

The migration mechanism must be confirmed against the actual MedOrbits database tooling before these requirements are considered implemented.

2. Migration Naming and Ordering

Use a consistent naming convention, for example:

YYYYMMDDHHMMSS_short_description.sql

Example:

* 20261015090000_create_users_table.sql
* 20261015100000_add_email_verification.sql
* 20261015110000_add_application_status_index.sql

These names are illustrative. Use the naming convention supported by the migration runner already adopted by the project.

Each migration should:

1. Have a unique identifier.
2. Perform one logically coherent change.
3. Include comments for non-obvious or high-risk operations.
4. Avoid relying on undocumented manual database changes.
5. Be committed to version control before deployment.
6. Have an explicit verification strategy.

Never modify an already-applied migration to change production history. Create a new migration to correct or extend an earlier change, unless the project’s controlled migration policy explicitly provides another safe procedure.

3. Safe Change Pattern: Expand and Contract

For changes that span releases, prefer an expand-and-contract approach.

Phase 1 — Expand

Add compatible schema elements without immediately removing the old structure.

Examples include adding a nullable column, creating a new table, or introducing a compatible index.

Phase 2 — Deploy Compatible Code

Deploy application code that can operate safely with both the old and new schema structures during the transition.

Check compatibility with any older application instances that may remain active during deployment.

Phase 3 — Backfill Data

Move or transform existing data in controlled batches where appropriate.

* Define batch size and execution limits.
* Make the process safe to retry.
* Track progress.
* Monitor database load and errors.
* Validate data integrity after each batch or completed stage.

Avoid unnecessarily long transactions on large tables.

Phase 4 — Verify

Verify the new application behavior, data integrity, performance, and operational metrics.

Confirm that all application instances and dependent jobs have stopped relying on the old structure.

Phase 5 — Contract

Remove obsolete columns, tables, indexes, or compatibility logic only in a later, separately reviewed release.

Before removal, confirm that the old structure is no longer used and that the recovery plan accounts for the change.

4. Pre-Migration Review

Before executing a migration, review:

* [ ]	Migration identifier and ordering.
* [ ]	Generated SQL and execution plan, where applicable.
* [ ]	Table sizes and expected data volume.
* [ ]	Index creation and removal costs.
* [ ]	Locking behavior and expected runtime.
* [ ]	Available disk space and database capacity.
* [ ]	Foreign keys, unique constraints, and other integrity rules.
* [ ]	Application compatibility during deployment.
* [ ]	Data transformation and backfill requirements.
* [ ]	Failure behavior and recovery procedure.
* [ ]	Backup requirements and verification status.
* [ ]	Approval requirements for destructive changes.

Review database-engine-specific behavior rather than assuming that the same DDL operation has identical locking, transactional, or rollback behavior across engines.

5. Testing Requirements

5.1 Empty Database

Test the complete migration sequence against an empty database using the supported database engine and version.

Verify that:

* All migrations run in the intended order.
* The resulting schema matches the expected structure.
* Constraints and indexes are present.
* Required seed data is handled separately or consistently with project policy.
* The application can start and perform essential operations.

5.2 Representative Staging Database

Test against a staging copy representative of production structure and data volume.

Verify:

* Existing data remains valid.
* Data transformations produce the expected results.
* Runtime and locking remain within acceptable limits.
* Application versions remain compatible during deployment.
* Failure recovery behaves as expected.
* Critical queries and workflows continue to function.

Protect staging data using appropriate access controls and privacy safeguards. Do not copy production data into staging without an approved data-handling process.

5.3 Automated Verification

Where supported by the project, automate migration checks in CI/CD.

Recommended checks include migration naming and ordering, duplicate identifiers, schema validation, application compatibility tests, and execution against a disposable test database.

A successful test run is evidence of the tested scenarios, not a guarantee that production will experience identical timing or load.

6. Migration Execution and Status

The migration runner should maintain a reliable record of migration execution.

At minimum, the record should identify:

* Migration identifier.
* Execution status.
* Start and completion timestamps.
* Applied migration version or checksum, where supported.
* Error information sufficient for diagnosis.
* Deployment or execution context, where appropriate.

Migration execution should fail clearly when a migration fails.

The runner must account for database-engine transaction limitations. If a migration performs operations that cannot be rolled back atomically, document the possible partial state and the recovery procedure.

Do not mark a migration as successfully applied before its required operations and verification have completed.

7. Production Safeguards

Before a high-risk production migration:

1. Obtain the required review and approval.
2. Take a backup appropriate to the recovery objectives.
3. Verify that the backup can be restored or that the documented recovery procedure is operational.
4. Assess locking, runtime, disk capacity, and expected workload.
5. Confirm application-version compatibility.
6. Define monitoring and stop conditions.
7. Establish the execution window and responsible operator.
8. Prepare recovery steps and communicate the expected impact.

Never run production migrations from an unreviewed local environment.

Prefer an approved deployment or release process with controlled credentials, recorded execution, and clear ownership.

8. Rollback and Recovery

Do not assume that every migration can be reversed safely.

A rollback may be unsafe when a migration:

* Deletes or overwrites data.
* Changes data formats or meanings.
* Removes columns or tables used by active application versions.
* Performs irreversible external side effects.
* Depends on database-engine behavior that prevents transactional reversal.

For each high-risk migration, document:

* Failure conditions.
* Whether a tested down migration exists.
* Whether forward repair is safer than reversal.
* Data recovery requirements.
* Backup restoration implications.
* Application rollback compatibility.
* Verification steps after recovery.

Application rollback and database recovery are separate procedures. Reverting application code does not automatically restore the previous database schema or recover deleted data.

Prefer a forward-fix migration when reversal would cause data loss or additional inconsistency.

9. Destructive Changes

Destructive migrations include operations such as dropping tables or columns, removing constraints, truncating data, or performing irreversible transformations.

Such changes require:

* Explicit impact assessment.
* Confirmation that the affected data is no longer required.
* Review and approval from the appropriate owner.
* Verified backup or an approved alternative recovery strategy.
* A documented deployment and recovery plan.
* Post-migration verification.

Never include a destructive operation merely to make a migration pass without understanding its effect on existing data and running application versions.

10. Operational Responsibilities

The migration process should make ownership clear:

* Developer: Creates the migration, reviews its impact, and supplies tests.
* Reviewer: Checks correctness, compatibility, performance risks, and recovery plans.
* Release operator: Executes or authorizes the approved deployment procedure.
* Database or platform owner: Reviews high-risk changes and recovery readiness where applicable.

Adapt these responsibilities to the actual MedOrbits team and deployment process.

11. Related Documentation

Maintain links to the project’s actual resources when available:

* Database schema and entity documentation.
* Migration directory and migration-runner instructions.
* Database configuration guide.
* Backup and restoration procedure.
* Deployment and release procedure.
* Incident response and recovery documentation.
* Relevant automated tests.

12. Definition of Done

A migration is ready for production only when:

* [ ]	The migration is committed and uniquely identified.
* [ ]	SQL and operational risks have been reviewed.
* [ ]	Empty-database and representative staging tests have passed.
* [ ]	Application compatibility has been assessed.
* [ ]	Status tracking and failure behavior have been verified.
* [ ]	Required approvals have been obtained.
* [ ]	Backup and recovery arrangements are appropriate to the risk.
* [ ]	Deployment and post-migration verification steps are documented.

Final rule: Treat database migrations as controlled production changes. Preserve data integrity, make failures observable, and maintain a recovery strategy appropriate to the consequences of the change.