
# MedOrbits Database Migrations

## Overview

This directory contains versioned SQL migrations for the MedOrbits application database.

Migrations define the database structure used by authentication, role-based access control, education guidance, college and university discovery, student applications, document management, recruitment, payments, subscriptions, notifications, and audit logging.

**Database target:** MySQL 8.0.16+  
**Storage engine:** InnoDB  
**Character set:** utf8mb4  
**Collation:** utf8mb4_0900_ai_ci

Execute migrations in numerical order using the project’s configured migration runner.

> Important: Do not execute these MySQL migrations against PostgreSQL. Do not mix PostgreSQL SQL syntax with the MySQL migration set.

## Directory Structure

```text
database/
└── migrations/
    ├── README.md
    ├── 001_create_users.sql
    ├── 002_create_roles_permissions.sql
    ├── 003_create_courses.sql
    ├── 004_create_colleges_universities.sql
    ├── 005_create_applications.sql
    ├── 006_create_documents.sql
    ├── 007_create_employers_jobs.sql
    ├── 008_create_subscriptions_payments.sql
    ├── 009_create_notifications.sql
    └── 010_create_audit_logs.sql
```

Verify the actual filenames in your repository before relying on this inventory.

## Migration Reference

| Migration | Description |
|—|—|
| `001_create_users.sql` | Creates user accounts, credentials, account statuses, and verification fields. |
| `002_create_roles_permissions.sql` | Creates roles, permissions, role-permission mappings, user-role mappings, and system authorization records. |
| `003_create_courses.sql` | Creates education course records. |
| `004_create_colleges_universities.sql` | Creates university and college records and their relationship. |
| `005_create_applications.sql` | Creates student application records and review workflow fields. |
| `006_create_documents.sql` | Creates document metadata and review status records. |
| `007_create_employers_jobs.sql` | Creates employer profiles and job listings. |
| `008_create_subscriptions_payments.sql` | Creates subscription and payment records. |
| `009_create_notifications.sql` | Creates in-app and delivery-channel notification records. |
| `010_create_audit_logs.sql` | Creates security and application activity audit records. |

## Execution Order and Dependencies

Apply migrations in numerical order:

1. **Users** — establishes the base user table.
2. **Roles and permissions** — establishes authorization tables and system role records.
3. **Courses** — establishes course records.
4. **Colleges and universities** — establishes education institution records.
5. **Applications** — references users, courses, and colleges.
6. **Documents** — references users and applications.
7. **Employers and jobs** — establishes employer profiles and job listings.
8. **Subscriptions and payments** — references users and subscriptions.
9. **Notifications** — references users.
10. **Audit logs** — references users and preserves historical actor information when a user is deleted.

Check every migration’s foreign keys before changing this order. Ensure all referenced tables exist before creating dependent tables.

## Migration Standards

- Use sequential, zero-padded migration filenames.
- Keep applied migrations immutable in shared environments.
- Create a new migration to modify an existing schema.
- Define foreign keys, indexes, and database constraints for data integrity.
- Keep schema changes consistent with application models, repositories, validators, and services.
- Separate schema creation from seed data where practical.
- Review destructive operations before execution.
- Never store credentials, production secrets, or real personal information in migration files.
- Generate application-facing UUIDs in Node.js using `crypto.randomUUID()` when the schema expects application-generated UUID values.
- Use `BIGINT UNSIGNED` consistently for primary and foreign keys where the referenced tables use that type.
- Use `DATETIME(3)` consistently for millisecond-precision timestamps.
- Use InnoDB for tables participating in foreign-key relationships.

## Running Migrations

Inspect the scripts defined in `package.json`:

```bash
npm run
```

Run the migration command configured by the project. For example, if the project defines a `migrate` script:

```bash
npm run migrate
```

The command is illustrative; verify that the script exists before running it.

A production-ready migration runner should:

1. Create a migration-history table if one does not exist.
2. Discover migration files in a deterministic order.
3. Record each successfully applied migration.
4. Prevent accidental duplicate execution.
5. Stop when a migration fails.
6. Report the failed migration and underlying database error.
7. Support deployment-safe locking so two instances cannot apply migrations concurrently.
8. Verify the expected database engine before executing SQL.
9. Avoid treating a partially applied MySQL DDL migration as fully rolled back.

MySQL DDL statements can implicitly commit. Do not assume a transaction can reverse an entire schema migration after a failure.

## MySQL Requirements

These migrations target **MySQL 8.0.16 or later**.

The migration set uses MySQL-compatible features such as:

- `BIGINT UNSIGNED AUTO_INCREMENT`
- `CHAR(36)` for application-generated UUID strings
- `DATETIME(3)` for timestamp storage
- `JSON` for structured metadata
- InnoDB foreign keys
- `CHECK` constraints
- MySQL-compatible indexes
- `ON DELETE RESTRICT`, `ON DELETE CASCADE`, and `ON DELETE SET NULL`

Some MySQL versions support JSON expression defaults, such as `DEFAULT (JSON_OBJECT())`, while others have different restrictions. Validate these expressions against the exact MySQL version used in development, testing, and production.

PostgreSQL-specific syntax such as `JSONB`, `TIMESTAMPTZ`, `INET`, `GENERATED BY DEFAULT AS IDENTITY`, `gen_random_uuid()`, `ON CONFLICT`, and partial indexes must not remain in the MySQL migration files unless deliberately replaced with MySQL-compatible implementations.

## Database Configuration

Keep the migration engine aligned with the application’s database adapter.

Typical environment configuration:

```dotenv
DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=medorbits
DB_USER=medorbits_app
DB_PASSWORD=replace_with_a_secure_secret
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT=10000
```

These values are examples. Use the actual variable names and configuration parser defined by `src/config/env.js` and `src/config/database.js`.

Do not commit real database credentials. Use a least-privilege application account and a separately controlled deployment or migration account when appropriate.

## Important Integration Considerations

### User roles

Migration `002` introduces normalized role assignments while the initial users table may also contain a `role` column.

Define one authoritative source for authorization. If both representations remain, document the synchronization strategy and test for inconsistencies. Authorization decisions must be enforced by the backend.

### Updated timestamps

Use `ON UPDATE CURRENT_TIMESTAMP(3)` where configured by the schema, or update timestamps explicitly in application services.

Do not assume every table automatically updates `updated_at`; verify each table definition.

### UUIDs and identifiers

If `public_id` has no database-generated default, the application must provide it on insertion.

Validate UUID format at the application boundary and avoid exposing internal numeric database IDs unnecessarily.

### Documents

Store uploaded files in private storage. The database should hold storage identifiers and metadata rather than public filesystem paths.

Validate file signatures, size, permitted MIME types, ownership, and access permissions. Do not trust the original filename or the client-supplied content type.

### Payments and subscriptions

Use integer minor currency units consistently. For INR, ₹1,500.00 is represented as `150000` paise when the application uses paise-based amounts.

Verify provider webhook signatures and payment status transitions on the backend. Never treat a client-side success redirect as authoritative payment confirmation.

Implement idempotency and provider transaction reconciliation. Add a dedicated refunds table if the application requires individual refund records, partial-refund amounts, and refund audit history.

### Notifications

Make notification workers idempotent and safe under concurrent execution. Implement retry limits, backoff, delivery failure handling, and scheduling rules.

A database status alone does not guarantee exactly-once delivery.

### Audit logs

Restrict access to audit records and avoid recording passwords, session cookies, authentication tokens, payment credentials, or unnecessary sensitive personal information.

Consider append-only application permissions and protected external log storage for stronger tamper resistance.

### Fixtures

Ensure records in `database/fixtures/` match the actual schema, required fields, status values, foreign keys, identifier formats, and JSON column expectations.

JSON fixture validation does not validate SQL migrations. Test migrations directly against MySQL.

## Validation and Testing

Before deploying migrations:

1. Confirm the configured database engine and version.
2. Back up important databases before production schema changes.
3. Apply the migrations to an isolated MySQL database.
4. Test the complete sequence on a clean database.
5. Verify foreign keys, indexes, uniqueness rules, and check constraints.
6. Test application registration, authentication, authorization, applications, document handling, recruitment, payments, and notifications.
7. Confirm the migration-history table accurately records applied files.
8. Test deployment against a representative existing database.
9. Review migration logs and confirm that every migration completed successfully.
10. Test backup restoration and recovery procedures.

## Rollback and Recovery

Do not assume every migration can be reversed safely.

- Define explicit rollback procedures where required.
- Review data-loss risks before dropping columns or tables.
- Prefer forward-fix migrations in shared environments when rollback could destroy data.
- Account for MySQL’s implicit DDL commits when designing recovery procedures.
- Never delete migration history merely to force a migration to run again.
- Back up data before destructive schema changes.

## Security

- Never commit production database passwords or connection strings.
- Use least-privilege database accounts.
- Restrict production migration execution to authorized deployment processes.
- Protect user documents, payment records, and audit logs.
- Enforce authorization in backend services and middleware.
- Keep database backups and logs appropriately protected.
- Avoid exposing SQL errors, internal database details, or sensitive identifiers to public API responses.

## Maintenance

When the database schema changes:

1. Add the next sequential migration file.
2. Document its purpose and dependencies.
3. Update related models, repositories, validators, and services.
4. Update fixtures and automated tests where necessary.
5. Test against both a clean database and a representative existing database.
6. Review indexes, constraints, and recovery implications.
7. Update this README when the migration inventory, engine, or execution process changes.

—

**Maintainer note:** This README documents the intended MySQL migration strategy. Verify the actual SQL files, database engine, migration runner, environment configuration, and application schema before treating the directory as production-ready.
