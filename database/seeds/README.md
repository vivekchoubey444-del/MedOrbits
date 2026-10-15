
# MedOrbits Database Seeds

## Overview

This directory contains SQL seed scripts for initializing reference data, baseline permissions, and controlled demonstration data in MedOrbits.

All seed scripts must remain compatible with the database schema and migrations used by the application.

**Database:** MySQL 8.0.16+  
**Storage engine:** InnoDB  
**Character set:** `utf8mb4`

## Directory Structure

```text
database/seeds/
├── README.md
├── seed-roles.sql
├── seed-courses.sql
├── seed-colleges.sql
└── seed-demo-data.sql
```

## Seed Files

| File | Purpose |
|—|—|
| `seed-roles.sql` | Inserts baseline roles, permissions, and role-permission assignments. |
| `seed-courses.sql` | Inserts illustrative education course catalogue records. |
| `seed-colleges.sql` | Inserts illustrative university and college records. |
| `seed-demo-data.sql` | Adds synthetic demonstration records for development and testing. |

## Prerequisites

Before executing the seed scripts, confirm that:

- MySQL 8.0.16 or later is installed.
- The intended database exists and is configured for MedOrbits.
- Migrations `001` through `010` have been applied successfully.
- Required tables, unique indexes, and foreign-key constraints exist.
- The database uses InnoDB for transactional tables.
- A dedicated development or test database is being used.
- The synthetic user required by `seed-demo-data.sql` already exists.

## Execution Order

Run the seed scripts in this order:

1. `seed-roles.sql`
2. `seed-courses.sql`
3. `seed-colleges.sql`
4. `seed-demo-data.sql`

The demonstration application depends on the course, college, and synthetic user records being available.

## Database Configuration

Configure the database connection using the environment variables expected by the MedOrbits application.

Example:

```dotenv
DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=medorbits_dev
DB_USER=medorbits_app
DB_PASSWORD=replace_with_a_secure_password
```

Use your project’s actual database configuration and environment variable names. Never commit real credentials to source control.

## Executing the Seeds

Run commands from the repository root.

First, verify the target database:

```bash
mysql -h “$DB_HOST” \
  -P “${DB_PORT:-3306}” \
  -u “$DB_USER” \
  -p \
  -D “$DB_NAME” \
  -e “SELECT DATABASE(), VERSION();”
```

Then execute each seed script:

```bash
mysql -h “$DB_HOST” \
  -P “${DB_PORT:-3306}” \
  -u “$DB_USER” \
  -p \
  “$DB_NAME” < database/seeds/seed-roles.sql

mysql -h “$DB_HOST” \
  -P “${DB_PORT:-3306}” \
  -u “$DB_USER” \
  -p \
  “$DB_NAME” < database/seeds/seed-courses.sql

mysql -h “$DB_HOST” \
  -P “${DB_PORT:-3306}” \
  -u “$DB_USER” \
  -p \
  “$DB_NAME” < database/seeds/seed-colleges.sql

mysql -h “$DB_HOST” \
  -P “${DB_PORT:-3306}” \
  -u “$DB_USER” \
  -p \
  “$DB_NAME” < database/seeds/seed-demo-data.sql
```

The MySQL client prompts for the password. Do not place passwords directly in command-line arguments.

**Important:** Confirm that the selected database is a development or test database before executing these commands.

## Data Safety

- Never run demonstration seeds against production without explicit review and authorization.
- Use synthetic demonstration records only.
- Do not insert real student information, passwords, or credentials.
- Never store plaintext passwords, API keys, or payment credentials in seed files.
- Do not create fake payment records that could be mistaken for completed transactions.
- Preserve existing user-generated data when rerunning seeds.
- Verify foreign-key relationships and database constraints.
- Restrict access to the database account used for seeding.

## Idempotency

Seed scripts should be safe to execute repeatedly wherever practical.

For MySQL, use unique constraints and `INSERT ... ON DUPLICATE KEY UPDATE` where appropriate.

For records that must not be overwritten, use a no-op duplicate clause, such as:

```sql
ON DUPLICATE KEY UPDATE id = id;
```

This approach depends on the relevant unique indexes being present. Review all unique constraints because a duplicate-key conflict may involve a unique index other than the intended natural key.

Avoid silently overwriting existing user-generated data or modifying existing permissions without an explicit migration or maintenance decision.

## Validation

After executing the seed scripts:

1. Confirm that the expected roles and permissions exist.
2. Verify role-permission assignments.
3. Confirm that course records have the expected slugs and active status.
4. Verify that demonstration universities and colleges exist.
5. Confirm that the synthetic user exists before running the demo-data seed.
6. Verify that the demonstration application has the expected application number.
7. Check foreign-key relationships and unique constraints.
8. Run the automated test suite.

Example validation queries:

```sql
— Verify seeded roles.
SELECT name, display_name, is_system
FROM roles
ORDER BY name;

— Verify course catalogue records.
SELECT slug, code, is_active
FROM courses
ORDER BY slug;

— Verify demonstration institutions.
SELECT slug, name, is_active
FROM colleges
WHERE slug = ‘medorbits-demo-medical-college’;

— Verify the synthetic demonstration application.
SELECT application_number, status
FROM applications
WHERE application_number = ‘DEMO-APPLICATION-0001’;
```

## Troubleshooting

### Duplicate-key errors

Confirm that the seed scripts use the intended unique keys and that the table definitions match the applied migrations.

### Foreign-key errors

Run the prerequisite seeds first and confirm that the referenced user, course, university, and college records exist.

### Missing columns

Check that all required migrations have been applied and that the seed scripts match the current schema.

### Transaction errors

Confirm that the affected tables use InnoDB. Remember that MySQL DDL statements can implicitly commit transactions; do not assume schema changes can be rolled back with a seed transaction.

## Maintenance

Whenever database migrations change:

- Update affected seed scripts.
- Verify required columns, data types, and status values.
- Review unique indexes and foreign-key relationships.
- Check that scripts remain compatible with the supported MySQL version.
- Test the complete seed sequence against a clean development database.
- Confirm repeated execution does not create duplicate records.
- Update this README whenever seed files, prerequisites, or execution order change.

## Disclaimer

These seed scripts provide development and testing data only. They do not establish official admission information, verify real institutions, guarantee course eligibility, or constitute an official admission application.
