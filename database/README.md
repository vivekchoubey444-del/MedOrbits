MedOrbits Database

The database/ directory contains the consolidated database schema, versioned migrations, seed scripts, and test fixtures used by the MedOrbits platform.

It supports education consultancy, college and university discovery, admission applications, document management, employer and job services, subscriptions, payments, notifications, role-based access control, and audit logging.

Database target: MySQL 8.0.16+
Storage engine: InnoDB
Character set: utf8mb4
Collation: utf8mb4_0900_ai_ci

Directory Structure

database/
├── README.md
├── schema.sql
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

Verify these filenames against the actual repository. The migration runner and documentation must use exactly the same filenames.

1. Directory Responsibilities

schema.sql

schema.sql is the consolidated schema for a fresh database installation.

It defines the tables, columns, primary keys, foreign keys, constraints, and indexes required by the application.

Use it when creating a new database from scratch.

Important: Do not run schema.sql and then apply migrations 001–010 against the same database without a deliberate baseline and migration-history strategy.

Keep the consolidated schema structurally equivalent to the result of applying all migrations to a clean database.

migrations/

The migrations/ directory contains ordered, version-controlled database changes.

Migration	Responsibility
001_create_users.sql	User accounts, credentials, and account status
002_create_roles_permissions.sql	Roles, permissions, and their relationships
003_create_courses.sql	Education course catalogue
004_create_colleges_universities.sql	College and university records
005_create_applications.sql	Admission and consultancy applications
006_create_documents.sql	Document metadata and review status
007_create_employers_jobs.sql	Employer profiles and job listings
008_create_subscriptions_payments.sql	Subscriptions and payment records
009_create_notifications.sql	User notifications and delivery status
010_create_audit_logs.sql	Auditable application and security events

Run migrations in numerical order using the project’s configured migration runner.

A production-ready migration runner should:

* Maintain a migration-history table.
* Record each successfully applied migration.
* Prevent accidental duplicate execution.
* Stop and report errors when a migration fails.
* Prevent concurrent deployments from applying the same migration simultaneously.
* Verify that the configured database engine is MySQL.
* Detect partially completed migrations and support safe recovery.

Do not assume migrations are safe to rerun unless their implementation explicitly supports it. MySQL DDL statements can implicitly commit, so a failed migration may leave some database objects created.

seeds/

The seeds/ directory contains SQL scripts for reference data and controlled development or demonstration records.

File	Responsibility
seed-roles.sql	Initial roles and authorization reference data
seed-courses.sql	Course catalogue records
seed-colleges.sql	College and university records, where included
seed-demo-data.sql	Synthetic demonstration records

Review each seed script before execution.

Run seeds only after their dependent tables exist. Make reference-data seeds repeatable where appropriate, and never load demonstration users or sample applicant information into production without an explicit, reviewed procedure.

fixtures/

The fixtures/ directory contains JSON records for automated tests and development workflows.

* users.fixture.json
* courses.fixture.json
* colleges.fixture.json
* applications.fixture.json
* payments.fixture.json

Fixtures must use synthetic data and conform to the current schema, identifier formats, required fields, and valid status values.

JSON syntax validation alone does not verify database constraints or foreign-key relationships. Fixtures are not automatically loaded unless a configured script or test explicitly loads them.

See fixtures/README.md for fixture conventions, validation, loading guidance, and security requirements.

2. Database Configuration

The application database connection is configured through:

src/config/database.js

MedOrbits is intended to use MySQL with a compatible Node.js database adapter, such as mysql2/promise.

Example environment configuration

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

These variable names are examples. Confirm the exact names and accepted values in src/config/env.js, .env.example, and src/config/database.js before using them.

Do not commit actual passwords, connection strings, access tokens, or .env files.

Use a dedicated database account with least-privilege permissions. Where practical, separate the application’s runtime account from the account used for schema migrations.

3. Database Compatibility

The consolidated schema and migration set target MySQL 8.0.16+.

Do not execute MySQL SQL against PostgreSQL or PostgreSQL SQL against MySQL.

The schema uses MySQL-specific or MySQL-compatible features, including:

* BIGINT UNSIGNED AUTO_INCREMENT
* CHAR(36) for application-generated UUIDs
* DATETIME(3) for timestamps
* JSON columns
* InnoDB foreign keys
* Enforced CHECK constraints
* MySQL-compatible indexes

Test JSON expression defaults and other version-dependent features against the exact MySQL version used in deployment.

The specified collation, utf8mb4_0900_ai_ci, is intended for MySQL 8.0. Check collation support before using this configuration with other database products or older MySQL-compatible servers.

4. Recommended Setup Workflow

Fresh database installation

1. Install and configure a compatible MySQL server.
2. Create the target database with the required character set and collation.
3. Configure and verify the MySQL connection.
4. Review database/schema.sql.
5. Apply the consolidated schema once.
6. Run the appropriate reference-data seed scripts.
7. Create the initial administrator through a secure setup procedure.
8. Verify the expected tables, constraints, and indexes.
9. Run application integration tests against the resulting database.

Do not apply the numbered migrations after installing the consolidated schema unless a deliberate baseline procedure has been implemented.

Existing database installation

1. Back up the database.
2. Inspect the migration-history table and current schema.
3. Confirm that the database matches the expected baseline.
4. Identify unapplied migrations.
5. Apply unapplied migrations in numerical order.
6. Verify each migration’s result.
7. Run tests and review application logs before completing deployment.

Do not use the fresh-install schema as a substitute for versioned migrations on an existing production database.

Recovery after a failed migration

If a migration fails:

1. Stop the deployment process.
2. Record the migration name and error.
3. Inspect the database to determine which objects were created or modified.
4. Check the migration-history table.
5. Follow a reviewed recovery procedure appropriate to the migration.
6. Verify the resulting schema before retrying or proceeding.

Do not simply delete migration-history records or rerun the migration without checking the actual database state.

5. Schema and Migration Maintenance

* Treat applied migrations as immutable.
* Add a new numbered migration to change an existing schema.
* Keep the consolidated schema equivalent to the complete migration result.
* Keep database column names aligned with models, repositories, validators, and services.
* Add appropriate foreign keys, unique constraints, checks, and indexes.
* Review deletion behavior for users, applications, documents, payments, and audit records.
* Test migrations on both a clean database and a representative existing database.
* Document migration dependencies and any data transformations.
* Verify that the migration runner and repository documentation use the same filenames.

Roles and permissions

The schema includes both users.role and normalized role-assignment tables.

Define one authoritative authorization model. If both representations remain during a transition, document and test the synchronization strategy.

Backend authorization must use the authoritative role and permission source. Never grant privileged access merely because a client supplies an administrator role.

Documents

Store uploaded files outside publicly accessible directories.

Database records should retain validated metadata and internal storage identifiers, not expose confidential filesystem paths or unrestricted public URLs.

Validate file signatures, permitted MIME types, file size, ownership, and access permissions in the application.

Payments and subscriptions

Store monetary amounts in integer minor units consistently.

For INR, ₹1,500.00 equals 150000 paise when amounts are represented in paise.

Verify payment-provider webhook signatures and reconcile transaction status on the backend. Implement idempotent webhook processing and prevent duplicate payment processing.

Never treat a client-side success redirect as authoritative payment confirmation.

Payment states and refund transitions must follow the actual payment model, database constraints, and provider integration.

Notifications

Implement retry limits, backoff, scheduling, and safe concurrent job claiming in the notification worker.

A database status field alone does not guarantee exactly-once delivery. Use idempotent processing and appropriate deduplication where required.

Audit logs

Restrict audit-log access and avoid storing passwords, session cookies, access tokens, payment credentials, or unnecessary sensitive personal information.

Consider protected external logging and restricted database privileges for stronger tamper resistance.

6. Testing and Validation

Before deploying a database change:

* Validate SQL syntax using the target MySQL version.
* Verify foreign-key relationships.
* Confirm unique constraints, indexes, and check constraints.
* Validate fixture files with a JSON parser.
* Test application queries against the resulting schema.
* Verify reference and demonstration seeds.
* Test registration, authentication, authorization, applications, documents, jobs, payments, and notifications.
* Confirm migration history accurately reflects applied files.
* Test backup restoration and recovery procedures.
* Check that fixture loading is restricted to development and test environments.

Validate JSON fixtures

Run the following command from the repository root:

node -e ‘for (const f of process.argv.slice(1)) JSON.parse(require(“node:fs”).readFileSync(f, “utf8”)); console.log(“Fixture JSON is valid.”)’ database/fixtures/*.json

This command checks JSON syntax only. It does not verify database constraints, required fields, foreign keys, business rules, or application-specific status values.

Validate the database schema

Use the project’s configured migration runner and integration tests to verify that:

* All required tables exist.
* Expected columns and data types are present.
* Foreign keys reference the correct tables.
* Unique constraints and indexes are applied.
* Role and status values match the application implementation.
* The consolidated schema and migration-based installation produce equivalent structures.

Run tests against a dedicated development or test database, not production.

7. Security and Data Protection

* Keep production credentials in environment variables or a secrets manager.
* Use least-privilege database accounts.
* Restrict database network access.
* Use TLS when required by the deployment environment.
* Protect admission, employment, document, and payment-related records.
* Establish appropriate retention, deletion, and backup policies.
* Never commit real applicant documents or sensitive customer data into fixtures.
* Avoid exposing internal SQL errors or database details in public API responses.
* Restrict destructive database operations to explicitly configured development or test environments.
* Separate production, staging, development, and test database credentials.
* Review database permissions before deployment.

8. Backup and Recovery

Maintain a backup and recovery procedure appropriate to the deployment environment.

Recommended practices:

* Back up the database before production schema changes.
* Store backups securely with restricted access.
* Protect backups containing personal or confidential data.
* Define recovery objectives and retention periods.
* Test restoration periodically.
* Verify application functionality after restoration.
* Document the recovery process for failed migrations and accidental data changes.

A backup should not be considered reliable until restoration has been tested.

9. Deployment Checklist

Before deploying database changes to production, verify the following:

* [ ]	The configured database engine is MySQL.
* [ ]	The deployed MySQL version supports the schema features in use.
* [ ]	Database credentials are configured securely.
* [ ]	The target database has been backed up.
* [ ]	Migration filenames match the repository and migration runner.
* [ ]	Migration history has been checked.
* [ ]	Migrations have been tested in a non-production environment.
* [ ]	The resulting schema matches the application’s models and services.
* [ ]	Required reference data is present.
* [ ]	Demonstration fixtures have not been loaded into production.
* [ ]	Database permissions follow the principle of least privilege.
* [ ]	Application integration tests pass.
* [ ]	Monitoring and recovery procedures are available.

10. Source of Truth

The numbered migration files are the authoritative history of incremental database changes.

The consolidated schema.sql represents the schema for a fresh installation.

Whenever a migration changes the schema, update and test the consolidated schema so both installation paths produce equivalent structures.

Models, repositories, validators, services, and database constraints must remain aligned. When documentation conflicts with the actual implementation, investigate the discrepancy and update the relevant files rather than assuming the documented behavior is already implemented.

Before production deployment, verify the actual database engine, migration runner, environment configuration, and deployed schema against this documentation.

⸻

Maintenance principle: Keep the MedOrbits database schema version-controlled, migrations ordered and recoverable, seeds controlled, and fixtures synthetic, deterministic, and restricted to development or testing.