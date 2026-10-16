MedOrbits Database Seeds

Overview

The database/seeds/ directory contains SQL seed scripts for initializing baseline roles and permissions, illustrative education catalogue records, fictional institutions, and controlled demonstration data.

All seed scripts must remain compatible with the MedOrbits database schema, applied migrations, and supported MySQL version.

Database: MySQL 8.0.16+
Storage engine: InnoDB
Character set: utf8mb4

Safety: Run these scripts only against an authorized development or test database. The institution and applicant records are fictional and must never be presented as verified real-world records.

Directory Structure

database/seeds/
├── README.md
├── seed-roles.sql
├── seed-courses.sql
├── seed-colleges.sql
└── seed-demo-data.sql

Seed Files

File	Purpose	Prerequisites
seed-roles.sql	Inserts baseline roles, permissions, and role-permission assignments.	Required role and permission tables
seed-courses.sql	Inserts illustrative education course catalogue records.	003_create_courses.sql
seed-colleges.sql	Inserts fictional universities and colleges.	004_create_colleges_universities.sql
seed-demo-data.sql	Inserts a synthetic demonstration application.	Migrations 001–010, course and college seeds, and a pre-existing synthetic user

The migration filenames above must match the actual migration files in the repository. Verify the complete migration sequence before running the seeds.

Prerequisites

Before executing the seed scripts, confirm that:

* MySQL 8.0.16 or later is installed.
* The intended database exists and is configured for MedOrbits.
* Required migrations have been applied successfully.
* Required tables, columns, unique indexes, and foreign-key constraints exist.
* Transactional tables use InnoDB.
* The database uses utf8mb4 where required by the schema.
* A dedicated development or test database is being used.
* The synthetic user required by seed-demo-data.sql already exists.
* The database account has only the permissions needed to execute the seeds.

Execution Order

Run the scripts in the following order:

1. seed-roles.sql
2. seed-courses.sql
3. seed-colleges.sql
4. seed-demo-data.sql

The demonstration application depends on the course, college, and synthetic user records being available.

The role seed requires its corresponding role and permission tables. The course and institution seeds require their respective migrations to be applied before execution.

Important: The demonstration seed does not create a user account. It expects the synthetic user demo-applicant@example.invalid to exist already.

Database Configuration

Configure the database connection using the environment variables expected by the MedOrbits application.

Example .env configuration:

DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=medorbits_dev
DB_USER=medorbits_app
DB_PASSWORD=replace_with_a_secure_password

These values are examples. Use the actual variable names defined in the project’s database configuration, such as src/config/database.js and src/config/env.js.

Never commit real credentials to source control. Keep .env files containing secrets out of Git and maintain safe placeholders in .env.example.

Executing the Seeds

Run commands from the repository root.

1. Verify the target database

The MySQL client will prompt for the password.

mysql -h “$DB_HOST” \
  -P “${DB_PORT:-3306}” \
  -u “$DB_USER” \
  -p \
  -D “$DB_NAME” \
  -e “SELECT DATABASE() AS database_name, VERSION() AS mysql_version;”

Confirm that the returned database name identifies the intended development or test database.

2. Execute the seed scripts

mysql -h “$DB_HOST” -P “${DB_PORT:-3306}” \
  -u “$DB_USER” -p “$DB_NAME” \
  < database/seeds/seed-roles.sql
mysql -h “$DB_HOST” -P “${DB_PORT:-3306}” \
  -u “$DB_USER” -p “$DB_NAME” \
  < database/seeds/seed-courses.sql
mysql -h “$DB_HOST” -P “${DB_PORT:-3306}” \
  -u “$DB_USER” -p “$DB_NAME” \
  < database/seeds/seed-colleges.sql
mysql -h “$DB_HOST” -P “${DB_PORT:-3306}” \
  -u “$DB_USER” -p “$DB_NAME” \
  < database/seeds/seed-demo-data.sql

These commands assume the environment variables have been exported into the current shell. If they exist only in a .env file, load them using your approved local environment workflow first.

Do not put database passwords directly into command-line arguments or commit them to scripts.

Execution behavior: If a statement fails, stop and investigate before running subsequent scripts. Do not assume that a seed sequence is atomic across multiple files.

Data Safety

* Never run demonstration seeds against production without explicit review and authorization.
* Use fictional demonstration records only.
* Do not place real student information, credentials, or sensitive personal data in seed files.
* Never store plaintext passwords, API keys, access tokens, or payment credentials in seed files.
* Do not create fake payment records that could be mistaken for completed transactions.
* Preserve existing user-generated data when rerunning seeds.
* Restrict administrative role assignment to authorized administrators.
* Verify foreign-key relationships and database constraints.
* Use a dedicated database account with least-privilege permissions.
* Review seed changes before merging them into the main branch.

Idempotency

Seed scripts should be safe to execute repeatedly wherever practical.

For MySQL, INSERT ... ON DUPLICATE KEY UPDATE can prevent duplicate insertions when an applicable unique constraint exists.

For example:

ON DUPLICATE KEY UPDATE
    id = id;

This no-op update leaves the existing row unchanged when a duplicate-key conflict occurs.

However:

* The behavior depends on the actual unique indexes defined in the schema.
* The conflict may be triggered by a unique index other than the intended natural key.
* A no-op update does not repair incorrect existing data.
* A seed may insert zero rows if prerequisite records are missing.
* A successful SQL statement does not necessarily prove that all expected records exist.

Use stable unique identifiers such as course slugs, institution slugs, and application numbers where appropriate. Confirm that the corresponding columns have unique constraints.

Do not silently overwrite existing permissions, institutional relationships, or user-generated data. Use an explicit migration or reviewed maintenance operation when existing records need to change.

Validation

After executing the seed scripts, verify the expected records and relationships.

1. Verify roles

SELECT
    name,
    display_name,
    is_system
FROM roles
ORDER BY name;

2. Verify permissions

SELECT
    name,
    resource,
    action,
    is_system
FROM permissions
ORDER BY resource, action;

3. Verify role-permission assignments

SELECT
    r.name AS role_name,
    p.name AS permission_name
FROM role_permissions AS rp
INNER JOIN roles AS r
    ON r.id = rp.role_id
INNER JOIN permissions AS p
    ON p.id = rp.permission_id
ORDER BY r.name, p.name;

4. Verify course catalogue records

SELECT
    slug,
    code,
    category,
    duration_months,
    is_active
FROM courses
ORDER BY slug;

5. Verify fictional universities

SELECT
    slug,
    name,
    is_active
FROM universities
WHERE slug IN (
    ‘medorbits-demo-university’,
    ‘medorbits-sample-health-sciences-university’
)
ORDER BY slug;

6. Verify fictional colleges

SELECT
    c.slug AS college_slug,
    c.name AS college_name,
    u.slug AS university_slug,
    u.name AS university_name,
    c.is_active
FROM colleges AS c
LEFT JOIN universities AS u
    ON u.id = c.university_id
WHERE c.slug IN (
    ‘medorbits-demo-medical-college’,
    ‘medorbits-sample-dental-college’
)
ORDER BY c.slug;

7. Verify the synthetic demonstration application

SELECT
    application_number,
    applicant_name,
    applicant_email,
    status,
    submitted_at
FROM applications
WHERE application_number = ‘DEMO-APPLICATION-0001’;

8. Verify foreign-key integrity

Check that the seeded college records reference existing universities and that the demonstration application references the intended user, course, and college.

Finally, run the project’s automated test suite and any available database integration tests.

Validation note: The queries above inspect database state; they do not automatically assert that the expected number of rows exists. Automated validation should explicitly fail when required records or relationships are missing.

Troubleshooting

Duplicate-key errors

Check the relevant unique indexes and determine which constraint triggered the conflict. Verify that the existing row is correct before rerunning the seed.

Foreign-key errors

Confirm that prerequisite migrations and seed scripts have run successfully. Verify that referenced users, courses, universities, and colleges exist and that their identifiers match the expected records.

Missing columns or tables

Check the applied migrations and confirm that the SQL scripts match the current schema. Do not resolve schema mismatches by arbitrarily removing required columns from a seed.

No rows inserted

Check whether the required synthetic user, course slug, or institution slug exists. INSERT ... SELECT statements can complete without inserting a row when their selection criteria match nothing.

Transaction errors

Confirm that the affected tables use InnoDB. Remember that MySQL DDL statements can implicitly commit transactions; do not assume schema changes can be rolled back with a seed transaction.

Repeated execution changes unexpected records

Inspect the table’s unique indexes and the behavior of its duplicate-key clause. No-op duplicate handling prevents an update to the conflicting row but does not guarantee that the intended natural key caused the conflict.

Maintenance

Whenever database migrations or seed scripts change:

* Update the affected seed scripts and this README.
* Verify column names, data types, nullability, and allowed status values.
* Review unique indexes and foreign-key relationships.
* Confirm compatibility with the supported MySQL version.
* Test the full seed sequence against a clean development database.
* Test repeated execution for duplicate creation and unintended updates.
* Verify that fictional data remains clearly distinguishable from production data.
* Update the execution order and prerequisites when dependencies change.
* Review security-sensitive permission changes before merging.

Disclaimer

These seed scripts provide development and testing data only. They do not establish official admission information, verify real institutions, guarantee course eligibility, or constitute an official admission application. Course requirements and regulatory information must be verified independently through the relevant official authorities before publication.