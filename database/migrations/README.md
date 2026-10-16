MedOrbits Database Migrations

Directory: database/migrations/
Database: MySQL 8.0.16+
Storage engine: InnoDB
Character set: utf8mb4
Collation: utf8mb4_0900_ai_ci

⸻

1. Overview

The database/migrations/ directory contains versioned SQL migrations that define the relational database structure for the MedOrbits platform.

Migrations establish the tables, relationships, indexes, constraints, and database-level rules required by authentication, role-based access control, education guidance, college and university discovery, student applications, document management, recruitment, subscriptions, payments, notifications, and audit logging.

Migrations are the controlled mechanism for evolving the database schema across development, testing, staging, and production environments.

Configuration	Standard
Database engine	MySQL
Minimum target version	MySQL 8.0.16+
Storage engine	InnoDB
Character set	utf8mb4
Collation	utf8mb4_0900_ai_ci
Migration format	Sequential SQL files
Migration history	schema_migrations
Primary key convention	BIGINT UNSIGNED AUTO_INCREMENT
Public identifier convention	Application-generated UUID
Timestamp convention	DATETIME(3) where appropriate

Important: These migrations target MySQL and must not be executed against PostgreSQL without an explicit database-platform conversion.

The intended migration sequence is not a substitute for inspecting the actual SQL files, their dependencies, and the migration runner.

⸻

2. Directory structure

Expected structure:

database/
├── migrations/
│   ├── README.md
│   ├── 001_create_users.sql
│   ├── 002_create_roles_permissions.sql
│   ├── 003_create_courses.sql
│   ├── 004_create_colleges_universities.sql
│   ├── 005_create_applications.sql
│   ├── 006_create_documents.sql
│   ├── 007_create_jobs_employers.sql
│   ├── 008_create_payments_subscriptions.sql
│   ├── 009_create_notifications.sql
│   └── 010_create_audit_logs.sql
│
├── seeds/
│   ├── README.md
│   ├── seed-roles.sql
│   ├── seed-courses.sql
│   ├── seed-colleges.sql
│   └── seed-demo-data.sql
│
├── fixtures/
│   ├── applications.fixture.json
│   ├── colleges.fixture.json
│   ├── courses.fixture.json
│   ├── payments.fixture.json
│   └── users.fixture.json
│
├── schema.sql
└── schema.txt

This is the intended layout. Confirm that each file exists at the specified path before executing commands.

Filename consistency

Migration filenames are part of the migration history contract. Keep them stable after they have been applied in a shared environment.

The following names have appeared in project documentation and must be reconciled against the repository:

* 007_create_jobs_employers.sql
* 007_create_employers_jobs.sql
* 008_create_payments_subscriptions.sql
* 008_create_subscriptions_payments.sql

Choose the filename that matches the actual migration file and runner. Do not create multiple files with the same numeric prefix.

⸻

3. Migration inventory

Migration	Responsibility
001_create_users.sql	User accounts, credentials, account status, and verification metadata.
002_create_roles_permissions.sql	Roles, permissions, user-role assignments, and role-permission mappings.
003_create_courses.sql	Course catalogue and education metadata.
004_create_colleges_universities.sql	Universities, colleges, and institutional relationships.
005_create_applications.sql	Student applications and application review workflows.
006_create_documents.sql	Document metadata, ownership, storage references, and verification status.
007_create_jobs_employers.sql	Employer profiles and job listings. Employment application records require explicit schema confirmation.
008_create_payments_subscriptions.sql	Subscription records, payment transactions, refunds, and provider references, according to the final SQL.
009_create_notifications.sql	Notifications, preferences, templates, delivery scheduling, retries, and provider-event tracking, according to the final SQL.
010_create_audit_logs.sql	Security events, administrative actions, and audit history.

The inventory describes intended responsibilities. It does not establish that every listed feature has been implemented in the corresponding SQL file.

Before deployment, inspect the actual migration definitions and compare them with application requirements.

⸻

4. Migration dependencies

Apply migrations in numerical order unless a reviewed dependency plan explicitly requires otherwise.

1. Users: Creates the foundational user records.
2. Roles and permissions: Establishes authorization structures referencing users.
3. Courses: Creates the education course catalogue.
4. Colleges and universities: Creates institutional records and relationships.
5. Applications: References users, courses, and colleges.
6. Documents: References users and applications.
7. Employers and jobs: Creates employer profiles and job listings.
8. Payments and subscriptions: Creates subscription and payment records.
9. Notifications: Creates notification infrastructure.
10. Audit logs: Creates audit records and actor references.

Dependency requirements

* Every referenced table must exist before a foreign key is created.
* Referenced and referencing columns must use compatible data types and attributes.
* Foreign-key columns must be indexed as required by MySQL.
* Deletion behavior must be selected deliberately.
* Migration dependencies must be reflected in the migration runner where supported.

A foreign key ensures referential integrity; it does not replace application authorization or business-rule validation.

⸻

5. Migration development standards

Every new migration must follow these conventions.

5.1 File naming and scope

* Use sequential, zero-padded numeric prefixes.
* Use descriptive, stable filenames.
* Give each migration one clearly defined purpose.
* Avoid reusing an existing numeric prefix.
* Do not silently rename or rewrite migrations already applied to shared environments.
* Prefer forward migrations for subsequent schema changes.

5.2 Data types

Use consistent types across related tables.

Purpose	Preferred convention
Internal primary keys	BIGINT UNSIGNED AUTO_INCREMENT
Related foreign keys	BIGINT UNSIGNED
Public UUIDs	CHAR(36)
Names and titles	Appropriate VARCHAR lengths
Structured metadata	JSON, when justified
Monetary values	Integer minor units where the payment design requires them
Currency codes	CHAR(3) with validation
Timestamps	DATETIME(3) where millisecond precision is required
Soft deletion	Nullable deleted_at, where appropriate

Do not change a column’s type without checking existing data, foreign keys, indexes, and application expectations.

5.3 Storage and constraints

* Use InnoDB for tables requiring foreign keys and transactional operations.
* Use utf8mb4 consistently.
* Define primary keys, unique constraints, and supporting indexes explicitly.
* Add CHECK constraints for stable database-level invariants.
* Keep business rules that require multiple-table state checks in application logic or a carefully designed transactional workflow.
* Use JSON only for structured, variable metadata rather than core relational fields.
* Avoid indexing long text columns indiscriminately.

5.4 Constraint naming

Use descriptive names where practical:

pk_<table>
uq_<table>_<column>
idx_<table>_<columns>
fk_<table>_<referenced_table>
chk_<table>_<condition>

These are naming conventions, not a requirement to rename existing constraints without a migration plan.

5.5 Security and privacy

* Never store production credentials, passwords, access tokens, session cookies, or payment secrets in migration files.
* Do not include real personal data in migrations or demonstration seeds.
* Store uploaded documents in private storage, not in the public web directory.
* Define foreign-key deletion behavior based on retention and compliance requirements.
* Restrict access to sensitive financial, document, and audit records.
* Avoid logging unnecessary personal information in JSON metadata.

⸻

6. Migration history and runner requirements

The schema_migrations table is intended to record applied migration files.

A production-ready migration runner should:

1. Discover eligible SQL migration files deterministically.
2. Validate filenames and numeric prefixes.
3. Sort migrations in ascending order.
4. Compare discovered migrations against recorded migration history.
5. Execute each unapplied migration in the correct order.
6. Record successful completion only after the migration’s success criteria are met.
7. Stop on failure and report the failed filename and database error.
8. Prevent concurrent migration processes from applying the same migration.
9. Detect unexpected modifications to previously applied migrations, preferably using checksums.
10. Verify the database engine and version before execution.
11. Distinguish failed, partially applied, and successfully recorded migrations where the implementation supports it.
12. Provide an operational recovery procedure for partial schema changes.

Migration history recommendations

A history table may include:

* Migration version or filename.
* Checksum of the migration file.
* Application timestamp.
* Execution duration.
* Execution status, if supported.
* Error details for failed attempts, with sensitive information excluded.

The exact columns must match the implementation in schema_migrations and the migration runner.

Important: Creating schema_migrations does not itself implement migration discovery, locking, execution, checksum verification, or recovery.

⸻

7. Executing migrations

First inspect the available npm scripts:

npm run

If a migration script exists and its implementation has been reviewed, use the documented command. For example:

npm run migrate

This command is illustrative; it must not be assumed to exist.

Manual execution for a new development database

A migration may be executed individually using the MySQL client if the database configuration is correct and the dependency order is respected.

Example for migration 001:

mysql \
  —host=“$DB_HOST” \
  —port=“${DB_PORT:-3306}” \
  —user=“$DB_USER” \
  —password \
  “$DB_NAME” \
  < database/migrations/001_create_users.sql

The MySQL client prompts for the password. Do not put database passwords directly in shell commands, source code, or committed configuration files.

Repeat for the remaining migrations in sequence only after reviewing each file and checking the previous migration’s result.

For production, prefer the reviewed migration runner rather than an ad hoc shell loop.

⸻

8. MySQL compatibility

The migration set targets MySQL 8.0.16 or later.

Use MySQL-compatible definitions and syntax, including:

* BIGINT UNSIGNED AUTO_INCREMENT
* CHAR(36) for application-generated UUID strings
* DATETIME(3) for millisecond precision
* JSON for structured metadata
* InnoDB foreign keys
* Enforced CHECK constraints
* MySQL-compatible index definitions
* ON DELETE RESTRICT, ON DELETE CASCADE, and ON DELETE SET NULL

Test version-sensitive features against the exact MySQL version used in deployment, including JSON defaults, CHECK constraints, regular-expression checks, collations, and index-length limitations.

The collation utf8mb4_0900_ai_ci is MySQL 8-specific and may not be available on older MySQL releases or some compatible database products.

Do not execute this migration set against PostgreSQL without explicitly converting its syntax, data types, constraints, and migration logic.

⸻

9. Schema and application integration

Migrations must remain consistent with application models, repositories, services, validators, authorization middleware, workers, seed scripts, and fixtures.

9.1 Users and authorization

* Define one authoritative mechanism for role assignment.
* If roles are stored in user_roles, ensure authorization middleware uses that relationship consistently.
* Keep any legacy role column synchronized only if the application explicitly requires it.
* Assign administrative privileges only through authorized workflows.
* Avoid granting every future permission automatically without an explicit authorization policy.

9.2 Courses and institutions

* Keep course, college, and university identifiers and slugs consistent with the education catalogue.
* Ensure foreign keys reference the intended internal IDs.
* Treat institutional existence, verification, and publication as distinct concepts.
* Confirm that seed scripts use columns actually defined in the migrations.

9.3 Applications

* Enforce unique public identifiers and application numbers.
* Align application status values with service logic and validators.
* Ensure review timestamps and reviewer IDs are populated consistently.
* Confirm that course and college deletion behavior is appropriate for historical applications.

9.4 Documents

* Store document metadata and private storage references in the database.
* Validate file contents, size, extension, and MIME type on the server.
* Enforce ownership and authorization on every read, download, update, and deletion.
* Define verification and rejection workflows that match the allowed database states.
* Keep retention requirements separate from ordinary soft deletion.

9.5 Employers and jobs

* Validate employer verification and activation before allowing job publication.
* Align employment types, workplace types, job statuses, and salary fields across the database and application.
* Keep job applications separate unless the final migration explicitly includes them.
* Do not expose private employer or applicant data in public listings.

9.6 Payments and subscriptions

* Use a consistent monetary representation throughout the application.
* Convert integer minor units and provider amounts explicitly.
* Verify provider webhooks and reconcile payment states server-side.
* Implement idempotency for payment creation and webhook processing.
* Record refunds separately when partial or multiple refunds are supported.
* Never store card numbers, CVVs, UPI PINs, or provider credentials.

9.7 Notifications

* Align notification status values with the worker and job implementation.
* Handle scheduling, retries, and failed deliveries explicitly.
* Deduplicate provider events where supported.
* Distinguish logical notifications from individual channel deliveries if the schema uses separate delivery records.
* Treat delivery as an external side effect; database status values alone cannot guarantee exactly-once delivery.

9.8 Audit logs

* Restrict access to audit records.
* Use stable action names and request correlation identifiers.
* Avoid recording credentials, authentication tokens, session cookies, or unnecessary personal information.
* Define retention and archival policies.
* Do not assume that application-level append-only behavior makes database records tamper-proof.

⸻

10. Seed data and fixtures

The related seed directory is:

database/seeds/
├── README.md
├── seed-roles.sql
├── seed-courses.sql
├── seed-colleges.sql
└── seed-demo-data.sql

Test fixtures are maintained separately:

database/fixtures/
├── applications.fixture.json
├── colleges.fixture.json
├── courses.fixture.json
├── payments.fixture.json
└── users.fixture.json

Before executing seed scripts:

* Apply the required migrations.
* Confirm every referenced column exists.
* Confirm unique constraints and foreign keys match seed assumptions.
* Create or verify required synthetic users before inserting dependent records.
* Keep demonstration data fictional and distinguishable from real records.
* Check whether repeated execution is safe.
* Review ON DUPLICATE KEY UPDATE behavior to prevent unintended overwrites.
* Never use production credentials or real personal information as sample data.

Do not assume seed scripts and migrations are compatible merely because their filenames correspond.

⸻

11. Validation and testing

Before deployment, verify the complete migration sequence on a clean, disposable database.

Schema validation checklist

* [ ]	Confirm the MySQL engine and version.
* [ ]	Confirm the database character set and collation.
* [ ]	Execute all migrations in numerical order.
* [ ]	Verify expected tables and columns.
* [ ]	Verify primary keys and unique constraints.
* [ ]	Verify foreign-key targets and deletion rules.
* [ ]	Verify indexes and enforced CHECK constraints.
* [ ]	Confirm timestamp defaults and update behavior.
* [ ]	Confirm monetary precision and currency handling.
* [ ]	Confirm application status values match the SQL constraints.
* [ ]	Execute seed scripts in their documented order.
* [ ]	Verify fixture compatibility with the actual schema.
* [ ]	Test the application against the resulting database.
* [ ]	Test failure reporting and partial-migration recovery.
* [ ]	Verify the migration history and checksum behavior, if implemented.
* [ ]	Confirm an already-applied migration is not rerun unexpectedly.

Additional test scenarios

Test both valid and invalid records, including:

* Missing required fields.
* Duplicate public identifiers.
* Invalid status values.
* Invalid foreign-key references.
* Negative or inconsistent monetary amounts.
* Invalid review-state combinations.
* Unauthorized access to user-owned documents.
* Duplicate payment and notification requests.
* Failed provider webhooks.
* Concurrent migration attempts.

Use a disposable database for destructive or recovery testing.

⸻

12. Failure handling and recovery

MySQL DDL statements can implicitly commit. A transaction does not guarantee that an entire multi-statement schema migration can be rolled back after a failure.

If a migration fails:

1. Stop the migration process.
2. Identify the failed filename, statement, and database error.
3. Inspect which tables, indexes, constraints, and columns were successfully created.
4. Compare the actual database state with migration history.
5. Determine whether the migration partially applied.
6. Restore from backup or use a reviewed forward-recovery migration when appropriate.
7. Resume only after the database state and recovery plan are understood.

Do not delete migration-history records merely to force a migration to execute again.

For production systems, maintain tested backups and a documented restoration procedure. A backup that has never been restored in testing should not be treated as a verified recovery mechanism.

⸻

13. Production deployment

Before applying migrations to production:

* Review the SQL in source control.
* Test the migration against the target MySQL version.
* Back up the database and verify restoration procedures.
* Assess locks, table rebuilds, data volume, and downtime risks.
* Use a dedicated, authorized migration process.
* Prevent concurrent migration execution.
* Review destructive operations and data transformations.
* Confirm application compatibility during rolling deployments.
* Monitor execution and inspect the resulting schema.
* Record the deployed migration version.
* Maintain a documented recovery procedure.

Prefer backward-compatible changes when application and database deployments occur separately:

1. Add compatible schema elements.
2. Deploy application code that supports the new schema.
3. Backfill or migrate data if required.
4. Verify behavior and remove obsolete schema elements in a later migration.

⸻

14. Maintenance and change management

Whenever the schema changes:

* Add a new migration instead of silently rewriting an applied migration.
* Update application models, repositories, services, and validators.
* Update seed scripts and fixtures.
* Review indexes, constraints, and foreign keys.
* Test against both a clean database and a representative existing database.
* Update this README when the migration inventory or process changes.
* Document recovery steps for changes that can affect existing data.
* Review migration checksums and history before releases.

If a migration must be corrected after it has been shared or deployed, prefer a new forward migration unless the migration is known to be unapplied in every relevant environment.

⸻

15. Current repository review

The migration inventory currently describes files 001 through 010. The actual repository must be inspected before the sequence is considered complete.

Priority verification items:

1. Confirm the actual filename for migration 007 and use it consistently in the repository and migration runner.
2. Confirm the actual filename for migration 008 and update all documentation to match.
3. Verify that 009_create_notifications.sql contains the agreed notification schema and is not empty.
4. Compare migration 010 with the final audit-log design.
5. Compare database/schema.sql with the migration sequence to identify schema drift.
6. Verify that schema_migrations is created and maintained by the actual migration implementation.
7. Confirm whether the runner supports checksums, concurrency protection, failure reporting, and recovery.
8. Compare seed scripts and fixtures with the real migration columns, constraints, and status values.
9. Confirm that the jobs/employers schema and any employment application tables match the application’s intended workflows.
10. Verify that payment, refund, notification-delivery, and provider-event tables match the current services and workers.

An empty SQL file, a documented filename, or a migration-history table alone does not establish that the corresponding schema has been successfully applied.

⸻

16. Final operational checklist

Before declaring the MedOrbits database migration system production-ready:

* [ ]	All migration filenames match the repository.
* [ ]	The complete sequence succeeds on a clean MySQL database.
* [ ]	The application starts successfully against the migrated schema.
* [ ]	Seed scripts execute in the documented order.
* [ ]	Foreign keys, indexes, and constraints have been verified.
* [ ]	Migration history accurately reflects completed migrations.
* [ ]	The migration runner prevents concurrent execution.
* [ ]	Failure and recovery procedures have been tested.
* [ ]	Backups and restoration procedures have been verified.
* [ ]	Database credentials are managed outside committed source files.
* [ ]	Production deployment has a documented approval and monitoring process.

Disclaimer

This README defines the intended MedOrbits migration standards and operating procedures. Actual behavior depends on the SQL files, the migration runner, the database configuration, and the deployed MySQL version. Verify these components before production deployment.