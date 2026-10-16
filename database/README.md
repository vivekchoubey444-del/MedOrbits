MedOrbits Database

Directory: database/
Database engine: MySQL 8.0.16+
Storage engine: InnoDB
Character set: utf8mb4
Collation: utf8mb4_0900_ai_ci

1. Overview

The database/ directory contains the consolidated database schema, versioned SQL migrations, seed scripts, and test fixtures used by the MedOrbits platform.

The database supports education consultancy, college and university discovery, admission applications, document management, employer and job services, subscriptions, payments, notifications, role-based access control, and audit logging.

The database layer is responsible for:

* Defining relational tables and data types.
* Enforcing referential integrity and database-level constraints.
* Supporting consistent application data access.
* Maintaining versioned schema changes.
* Providing controlled reference and demonstration data.
* Supporting automated tests through synthetic fixtures.
* Protecting sensitive records through appropriate database permissions and retention policies.

Important: This directory targets MySQL. Do not execute its SQL against PostgreSQL without explicitly converting and testing the schema and migration logic.

2. Directory structure

Expected repository layout:

database/
├── README.md
├── schema.sql
├── schema.txt
├── fixtures/
│   ├── README.md
│   ├── applications.fixture.json
│   ├── colleges.fixture.json
│   ├── courses.fixture.json
│   ├── payments.fixture.json
│   └── users.fixture.json
├── migrations/
│   ├── README.md
│   ├── 001_create_users.sql
│   ├── 002_create_roles_permissions.sql
│   ├── 003_create_courses.sql
│   ├── 004_create_colleges_universities.sql
│   ├── 005_create_applications.sql
│   ├── 006_create_documents.sql
│   ├── 007_create_employers_jobs.sql
│   ├── 008_create_subscriptions_payments.sql
│   ├── 009_create_notifications.sql
│   └── 010_create_audit_logs.sql
└── seeds/
    ├── README.md
    ├── seed-colleges.sql
    ├── seed-courses.sql
    ├── seed-demo-data.sql
    └── seed-roles.sql

This structure describes the intended layout. Verify the actual filenames and paths before running database commands.

Filename consistency

Migration filenames are part of the versioned schema history. The migration runner, migration README, deployment scripts, and repository must use exactly the same names.

Previously discussed alternatives include:

* 007_create_employers_jobs.sql versus 007_create_jobs_employers.sql
* 008_create_subscriptions_payments.sql versus 008_create_payments_subscriptions.sql

Choose the names present in the repository and standardize documentation accordingly. Do not create multiple migrations with the same numeric prefix.

3. Database architecture

MedOrbits uses a relational MySQL database with foreign keys, unique constraints, indexes, and database-level validation.

Setting	Required configuration
Database engine	MySQL
Minimum target version	8.0.16+
Storage engine	InnoDB
Character set	utf8mb4
Collation	utf8mb4_0900_ai_ci
Primary keys	BIGINT UNSIGNED AUTO_INCREMENT, where appropriate
Public identifiers	Application-generated UUIDs
Timestamps	DATETIME(3) where millisecond precision is required
Structured metadata	JSON, where appropriate
Schema history	schema_migrations, if implemented by the migration system

Core design principles

1. Use foreign keys for relational integrity.
2. Use unique constraints to enforce identity and uniqueness requirements.
3. Add indexes based on actual query patterns.
4. Keep database constraints aligned with application validation.
5. Separate schema definitions from seed data.
6. Use migrations for incremental changes.
7. Keep fixtures synthetic and restricted to development or testing.
8. Protect personal, financial, and document-related information.
9. Prefer backward-compatible schema changes when application deployments are separate from database deployments.

4. Schema ownership and source of truth

MedOrbits maintains two schema representations.

schema.sql — consolidated schema

database/schema.sql represents the complete schema for a fresh installation.

It should contain the tables, columns, relationships, indexes, and constraints required by the final database design.

Use it only through the documented fresh-install procedure.

migrations/ — incremental schema history

database/migrations/ contains the ordered SQL files describing incremental schema changes.

The migration sequence is the authoritative history of those changes for migration-managed environments.

Consistency requirement

The consolidated schema and the complete migration sequence must produce structurally equivalent databases.

This means comparing more than table names. Verify:

* Column names, types, nullability, and defaults.
* Primary keys and unique constraints.
* Foreign keys and deletion behavior.
* Indexes.
* Check constraints.
* Character sets and collations.
* Relevant timestamp behavior.

Do not apply schema.sql and migrations 001–010 to the same database unless a deliberate baseline and migration-history procedure has been implemented.

If the two representations disagree, investigate and resolve the discrepancy rather than silently treating both as interchangeable.

5. Migration inventory

The intended migration responsibilities are:

Migration	Responsibility
001_create_users.sql	User accounts, credentials, and account status
002_create_roles_permissions.sql	Roles, permissions, and their relationships
003_create_courses.sql	Education course catalogue
004_create_colleges_universities.sql	College and university records
005_create_applications.sql	Admission and consultancy applications
006_create_documents.sql	Document metadata and review status
007_create_employers_jobs.sql	Employer profiles and job listings
008_create_subscriptions_payments.sql	Subscriptions and payment records
009_create_notifications.sql	User notifications and delivery infrastructure
010_create_audit_logs.sql	Application and security audit events

The actual SQL files determine which tables and capabilities exist. The inventory alone does not prove that every listed responsibility is implemented.

For detailed migration conventions, dependencies, and execution guidance, see migrations/README.md.

6. Database migrations and history

Run migrations in numerical order through the reviewed migration runner, if one is implemented.

A production-ready runner should:

1. Discover eligible migration files deterministically.
2. Validate their filenames and numeric prefixes.
3. Apply unapplied migrations in order.
4. Maintain accurate migration history.
5. Prevent concurrent migration processes from applying the same migration.
6. Stop and report failures.
7. Detect modifications to previously applied files, preferably using checksums.
8. Verify the database engine and version.
9. Handle partially completed migrations safely.
10. Provide an operational recovery procedure.

The intended history table is schema_migrations. Its actual structure and behavior must match the migration runner.

Important MySQL behavior

MySQL DDL statements can implicitly commit. A failed multi-statement migration may leave some tables or constraints created.

CREATE TABLE IF NOT EXISTS does not update an existing table to match a revised definition.

Do not assume migrations are safe to rerun, fully transactional, or automatically reversible.

Migration naming

Once a migration has been applied in a shared environment, keep its filename stable. Make subsequent changes through a new migration rather than silently rewriting the historical file.

7. Database configuration

The application database connection is configured through:

src/config/database.js

Environment validation is expected to be handled through:

src/config/env.js

The following configuration is illustrative:

DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=medorbits
DB_USER=medorbits_app
DB_PASSWORD=replace_with_a_secure_secret
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT=10000
DB_WAIT_FOR_CONNECTIONS=true
DB_TIMEZONE=Z

These variable names and values are examples, not confirmation of the current implementation.

Before using them, verify:

* The accepted variables in .env.example.
* The validation rules in src/config/env.js.
* The connection options in src/config/database.js.
* The database adapter and supported options in package.json.
* The runtime’s timezone handling.

Credentials and permissions

* Never commit .env files or production credentials.
* Use a secrets manager or deployment environment variables for production secrets.
* Use a dedicated database account with least-privilege permissions.
* Separate the runtime database account from the migration account where practical.
* Restrict database network access.
* Use TLS where required by the deployment environment.
* Avoid exposing SQL errors or connection details in public API responses.

The application runtime should not receive schema-altering privileges unless explicitly required.

8. Fresh database installation

Use this procedure for a new development or test database.

1. Install a compatible MySQL server.
2. Create the target database with the required character set and collation.
3. Configure and verify the database connection.
4. Review database/schema.sql.
5. Apply the consolidated schema once.
6. Load the appropriate reference data.
7. Create the initial administrator through a secure setup procedure.
8. Verify the tables, constraints, and indexes.
9. Run integration tests against the resulting database.

Example database creation:

CREATE DATABASE medorbits
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

The command is illustrative. Confirm that the target database does not already contain production or otherwise valuable data before using setup commands.

Do not apply migrations 001–010 after the consolidated schema unless the project has an explicit baseline mechanism that records the appropriate migration history.

9. Existing database installation

For an existing database:

1. Back up the database.
2. Inspect the current schema and migration history.
3. Confirm that the database matches the expected baseline.
4. Identify unapplied migrations.
5. Apply unapplied migrations in numerical order.
6. Verify each migration’s result.
7. Run integration tests.
8. Monitor the application after deployment.

Do not use the fresh-install schema as a substitute for incremental migrations on an existing production database.

Migration execution

Inspect available package scripts:

npm run

If a migration script exists and has been reviewed, use the documented command. For example:

npm run migrate

This command is illustrative; do not assume the script exists.

For manual development execution, use the MySQL client and apply individual files in the documented dependency order. Prefer the migration runner for shared and production environments.

10. Seed data

The seeds/ directory contains baseline reference data and controlled development or demonstration records.

File	Responsibility
seed-roles.sql	Initial roles and authorization reference data
seed-courses.sql	Course catalogue records
seed-colleges.sql	College and university records
seed-demo-data.sql	Synthetic demonstration records

Run seeds only after their dependent tables exist.

Before execution:

* Confirm that the required columns exist.
* Verify foreign-key and unique-constraint assumptions.
* Confirm required users and reference records exist.
* Review ON DUPLICATE KEY UPDATE behavior.
* Test repeat execution.
* Keep demonstration records clearly distinguishable from real records.
* Do not load demo accounts or applicant information into production without explicit approval and a reviewed procedure.

Reference data and demonstration data should be managed separately wherever practical.

See seeds/README.md for detailed seed conventions and execution guidance.

11. Test fixtures

The fixtures/ directory contains synthetic JSON records for automated tests and development workflows.

Expected fixtures:

* users.fixture.json
* courses.fixture.json
* colleges.fixture.json
* applications.fixture.json
* payments.fixture.json

Fixtures must conform to the current schema, identifier formats, required fields, foreign-key relationships, and allowed status values.

JSON syntax validation alone does not validate database constraints or business rules. Fixtures are not automatically loaded unless a configured script or test explicitly loads them.

Validate fixture JSON

Run from the repository root:

node -e ‘for (const f of process.argv.slice(1)) JSON.parse(require(“node:fs”).readFileSync(f, “utf8”)); console.log(“Fixture JSON is valid.”)’ database/fixtures/*.json

This checks JSON syntax only. It does not verify required fields, foreign keys, status values, or application-specific rules.

Use fixtures/README.md for fixture conventions, validation requirements, and loading guidance.

12. Schema and application integration

Database definitions must remain aligned with application models, repositories, services, validators, workers, and authorization middleware.

Users and roles

The documented schema includes both users.role and normalized role-assignment tables.

Define one authoritative authorization mechanism. If both representations remain during a transition, document and test their synchronization strategy.

Backend authorization must use the authoritative role and permission source. Never trust a role or permission supplied by the client.

Courses and institutions

* Keep course, college, and university slugs consistent with seed scripts and application queries.
* Ensure foreign keys reference the intended internal IDs.
* Distinguish institutional existence from verification and publication.
* Confirm seed scripts use columns defined by the actual migrations.

Applications

* Enforce unique public identifiers and application numbers.
* Align status values with the application service and validators.
* Populate reviewer and review timestamps consistently.
* Confirm foreign-key behavior preserves the required historical information.

Documents

* Store metadata and private storage identifiers in the database.
* Store actual files in protected private storage.
* Validate file content, permitted types, and size on the server.
* Enforce ownership and access control for every download or modification.
* Define verification, rejection, retention, and deletion workflows consistently.

Employers and jobs

* Validate employer verification and activation before allowing job publication.
* Align employment types, workplace types, job statuses, and salary fields across the application and database.
* Confirm whether employment application records are implemented in the actual migration set.
* Protect private employer and applicant information.

Payments and subscriptions

* Use one consistent monetary representation.
* For INR, ₹1,500.00 equals 150000 paise when amounts are stored in paise.
* Convert between provider amounts and database values explicitly.
* Verify payment-provider webhooks on the server.
* Implement idempotency and duplicate-event protection.
* Record refunds and state transitions according to the actual payment model.
* Never store card numbers, CVVs, UPI PINs, or provider credentials.

Notifications

* Align database statuses with notification jobs and workers.
* Implement retry limits, backoff, scheduling, and safe concurrent job claiming.
* Deduplicate provider events where supported.
* Distinguish logical notifications from channel-specific deliveries if the schema uses separate delivery records.
* Do not assume exactly-once delivery from database status fields alone.

Audit logs

* Restrict access to audit records.
* Avoid storing credentials, session cookies, tokens, and unnecessary personal information.
* Define retention and archival policies.
* Consider protected external logging or tamper-evident storage for security-critical events.

13. Testing and validation

Before deploying database changes:

* [ ]	Validate SQL syntax against the target MySQL version.
* [ ]	Apply all migrations to a clean disposable database.
* [ ]	Verify primary keys, unique constraints, foreign keys, and indexes.
* [ ]	Verify enforced check constraints and timestamp defaults.
* [ ]	Confirm migration history accurately reflects completed migrations.
* [ ]	Validate fixtures and seed data.
* [ ]	Test application queries against the migrated schema.
* [ ]	Test registration, authentication, and authorization.
* [ ]	Test application submission and review workflows.
* [ ]	Test document ownership and verification.
* [ ]	Test job publication and employer verification.
* [ ]	Test payment, refund, and webhook idempotency.
* [ ]	Test notification scheduling and retries.
* [ ]	Test audit logging and restricted access.
* [ ]	Test migration failure recovery.
* [ ]	Verify the consolidated schema and migration result are structurally equivalent.
* [ ]	Test backup restoration.

Run destructive and recovery tests only against disposable or explicitly designated test databases.

14. Failure handling and recovery

If a migration fails:

1. Stop the migration process.
2. Record the migration filename and error.
3. Inspect which database objects were created or modified.
4. Compare the actual database state with migration history.
5. Determine whether the migration partially applied.
6. Follow a reviewed recovery procedure.
7. Restore from a verified backup or apply a forward-recovery migration when appropriate.
8. Verify the schema before continuing.

Do not delete migration-history records merely to force a migration to run again.

Because MySQL DDL can implicitly commit, the presence of a migration-history record is not sufficient by itself to prove that the resulting schema is correct. Conversely, the absence of a record does not prove that no schema changes occurred.

15. Backup and recovery

Maintain a documented backup and recovery procedure.

Recommended practices:

* Back up the database before production schema changes.
* Store backups securely with restricted access.
* Protect backups containing personal or confidential information.
* Define retention periods and recovery objectives.
* Test restoration periodically.
* Verify application functionality after restoration.
* Document recovery steps for failed migrations and accidental data changes.

A backup should not be considered reliable until its restoration has been tested.

16. Production deployment checklist

Before applying database changes to production:

* [ ]	The configured database engine is MySQL.
* [ ]	The deployed version supports the schema features in use.
* [ ]	Credentials are securely configured.
* [ ]	The database has a verified backup.
* [ ]	Migration filenames match the repository and runner.
* [ ]	Migration history and the current schema have been inspected.
* [ ]	Migrations have been tested in a non-production environment.
* [ ]	The migration runner prevents concurrent execution.
* [ ]	The resulting schema matches application expectations.
* [ ]	Required reference data is present.
* [ ]	Demonstration fixtures have not been loaded into production.
* [ ]	Database permissions follow least-privilege principles.
* [ ]	Application integration tests pass.
* [ ]	Monitoring and recovery procedures are available.

Prefer backward-compatible schema changes when application and database deployments happen separately.

17. Maintenance and change management

Whenever the database schema changes:

1. Add a new migration instead of silently rewriting an applied migration.
2. Update schema.sql to reflect the complete resulting schema.
3. Update models, repositories, services, validators, and workers.
4. Update seed scripts and fixtures.
5. Review indexes, foreign keys, constraints, and deletion behavior.
6. Test both a clean installation and a representative existing database.
7. Update this README and migrations/README.md where appropriate.
8. Document data transformations and recovery steps.
9. Verify migration checksums and history, if implemented.

If a migration must be corrected after deployment, prefer a reviewed forward migration unless it is confirmed that the original migration has never been applied in any shared environment.

18. Current repository verification

Before considering the database implementation production-ready, verify these items against the actual repository:

1. Confirm the filename for migration 007 and use it consistently everywhere.
2. Confirm the filename for migration 008 and use it consistently everywhere.
3. Verify that migration 009 contains the intended notification schema.
4. Verify that migration 010 matches the agreed audit-log design.
5. Compare schema.sql against the complete migration sequence.
6. Confirm that schema_migrations is implemented and maintained by the actual runner.
7. Verify whether the runner supports checksums, concurrency protection, failure reporting, and recovery.
8. Compare seed scripts and fixtures with the real schema.
9. Confirm that employment application tables exist if required by the recruitment workflow.
10. Confirm that payment, refund, notification-delivery, and provider-event tables match the application services and workers.
11. Verify environment variable names against .env.example, src/config/env.js, and src/config/database.js.
12. Confirm that production and test database credentials are separate.

Documentation describes intended behavior; it does not establish that a feature has already been implemented or tested.

19. Final principle

Keep the MedOrbits database version-controlled, migration-managed, secure, recoverable, and aligned with the application.

The numbered migrations define the history of incremental changes. The consolidated schema.sql must represent the same final schema for fresh installations. Seeds must remain controlled, fixtures must remain synthetic, and all production database changes must be reviewed, tested, and recoverable.