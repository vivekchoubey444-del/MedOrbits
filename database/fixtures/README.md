MedOrbits Database Fixtures

Directory: database/fixtures/
Purpose: Synthetic data for local development, isolated database seeding, and automated testing.
Database: MySQL, using the adapter configured by MedOrbits.

1. Overview

This directory contains synthetic JSON fixtures for testing MedOrbits without relying on real users, live admissions data, or production payment records.

Fixtures provide predictable records for testing application workflows, validation, relationships, permissions, and exceptional states.

Fixtures are test data, not database migrations. They are not loaded automatically unless a configured script or test explicitly loads them.

2. Directory Structure

database/
└── fixtures/
    ├── README.md
    ├── applications.fixture.json
    ├── colleges.fixture.json
    ├── courses.fixture.json
    ├── payments.fixture.json
    └── users.fixture.json

Fixture inventory

File	Purpose
users.fixture.json	Synthetic users, roles, verification states, and account statuses.
applications.fixture.json	Application workflow scenarios.
colleges.fixture.json	Illustrative college records for testing.
courses.fixture.json	Illustrative course records for discovery workflows.
payments.fixture.json	Synthetic payment and refund lifecycle scenarios.

Keep fixture fields and relationships consistent with the actual database schema, models, validators, and application services.

Do not introduce unsupported database fields, roles, status values, or relationships. Where fixture identifiers differ from database primary keys, the loader must resolve them through an explicit mapping strategy.

3. Intended Uses

Fixtures may support tests for:

* User registration and authentication.
* Role-based access control and account verification.
* Application creation and status transitions.
* College and course discovery.
* Payment and refund state handling.
* API responses and input validation.
* Administrative dashboards and reporting.
* Missing, malformed, or incomplete records.
* Unique constraints and foreign-key relationships.
* Active, inactive, verified, and unverified accounts where supported.

4. Data Conventions

4.1 Identifiers

* Use deterministic synthetic identifiers where tests depend on specific records.
* Keep related identifiers consistent across fixture files.
* Do not assume fixture identifiers equal database primary keys.
* Resolve foreign-key references through the configured loader.
* Avoid duplicate values that violate unique constraints.

4.2 Timestamps

Use ISO 8601 timestamps in UTC with a Z suffix where timestamps are required.

Example:

{
  “createdAt”: “2026-01-10T09:00:00.000Z”,
  “updatedAt”: “2026-01-10T09:00:00.000Z”
}

Keep timestamps logically consistent. For example, an update should not precede creation, and a refund should not precede the original successful payment.

4.3 Statuses and roles

* Use only roles defined by the application’s role model and database seeds.
* Use only status values permitted by the relevant schema, enums, validators, and services.
* Do not assume values such as disabled, approved, succeeded, or partially_refunded are supported without checking the implementation.
* Keep fixture scenarios consistent with valid application state transitions.
* Do not bypass business validation to insert unsupported states.

4.4 Monetary values

* Follow the unit defined by the payment model.
* The current payment fixtures use integer minor units for INR: 150000 represents ₹1,500.00 when the unit is paise.
* Keep currency codes explicit where required.
* Ensure refund amounts are non-negative and do not exceed the original amount.
* Test partial and full refunds only where supported by the payment implementation.

4.5 Synthetic data

* Use reserved example email domains, such as example.invalid.
* Use fictional names and non-production contact details.
* Keep metadata limited to information needed for the scenario.
* Distinguish fixture-only metadata from actual application fields.
* Never represent synthetic institutions, accounts, or transactions as verified real-world records.

5. Relationships Between Fixtures

Related fixtures must reference records that exist in the same test dataset or can be resolved by the configured loader.

Examples include:

* Users associated with applications.
* Applications associated with courses and colleges.
* Payments associated with users, applications, or subscriptions.
* Colleges associated with universities, where supported.
* Courses associated with colleges or universities, where supported.

Suggested loading order

1. Roles and permissions.
2. Users.
3. Universities and colleges.
4. Courses.
5. Applications.
6. Subscriptions and payments, where applicable.

This order is illustrative, not mandatory. Follow the actual migrations, foreign-key definitions, and model relationships. If a course references a college, for example, the loader must ensure that the referenced college exists before inserting the dependent record.

6. Loading Fixtures

Before loading fixtures:

1. Initialize the intended database schema.
2. Confirm the target is an isolated development or test database.
3. Validate JSON syntax.
4. Check fields against the actual schema and models.
5. Verify supported roles, statuses, identifiers, and relationships.
6. Load records through an implemented, approved seeding process.
7. Run the relevant tests and verify expected outcomes.

The actual seeding command depends on the scripts and database adapter configured in the repository. Do not assume a fixture-loading command exists unless it has been implemented.

For MySQL, use the project’s configured database connection and parameterized queries. Resolve foreign-key references before inserting dependent records.

7. Idempotency and Database Safety

Where practical, fixture loading should be idempotent: repeated runs should not create unintended duplicate records.

Recommended practices:

* Use deterministic identifiers or documented unique keys.
* Define how existing records are handled.
* Avoid deleting unrelated records.
* Use transactions for data-loading operations where supported.
* Roll back failed transactional loads where possible.
* Account for MySQL DDL implicit commits; schema migrations should not be assumed to roll back like ordinary transactional data operations.

Destructive reset or reload operations must be explicitly restricted to a configured development or test environment. Do not rely on a manually supplied environment label alone if the database connection could still point to production.

8. Validation

8.1 Validate JSON syntax

Run the following from the repository root:

node -e ‘const fs = require(“node:fs”); const files = process.argv.slice(1); for (const file of files) { JSON.parse(fs.readFileSync(file, “utf8”)); console.log(`Valid JSON: ${file}`); }’ database/fixtures/*.json

This validates the JSON syntax of matching files. Node.js exits with an error if a file cannot be parsed.

If the directory is empty or a fixture is missing, the command’s behavior may vary by shell. Confirm the expected fixture files exist separately.

8.2 Validate schema compatibility

Valid JSON does not guarantee that the data matches the database or application.

Additional checks should cover:

* Required fields and data types.
* Unique identifiers and email addresses.
* Valid role references.
* User, application, college, course, and subscription relationships.
* Supported status values.
* Date and timestamp formats.
* Monetary amounts and refund totals.
* Compatibility with model validators and services.

Use a JSON Schema validator where schemas exist, and integration tests for database-specific constraints.

8.3 Validate relationships

Before considering fixtures ready:

1. Confirm referenced records exist or have a valid resolution strategy.
2. Check foreign-key requirements.
3. Verify relationships against business rules.
4. Confirm expected API and service behavior.
5. Ensure failed fixture loading does not leave unintended partial data.

9. Testing Guidelines

* Keep each fixture focused on a meaningful scenario.
* Use deterministic identifiers for tests that need exact records.
* Separate normal cases from validation failures and exceptional states.
* Test authorization independently from fixture setup.
* Verify account status and email verification through the actual authentication implementation.
* Exercise payment transitions through the appropriate application services.
* Never treat a fixture record as proof of a real payment or refund.
* Reset test data when needed for isolation.
* Avoid execution-order dependencies unless explicitly intended.

10. Security Requirements

* Never load fixtures into the production database.
* Never include real personal data, access tokens, API keys, session secrets, or payment credentials.
* Handle password hashes according to the actual authentication implementation.
* Do not treat placeholder password hashes as usable credentials.
* Never bypass authorization checks to make fixture-based tests pass.
* Use a dedicated test database and restrict destructive operations.
* Do not simulate provider confirmation by directly changing production payment statuses.
* Keep fixture accounts out of public-facing production data.
* Keep production credentials and database configuration separate from test configuration.

11. Maintenance

When models, validators, migrations, or database schemas change:

1. Update affected fixtures.
2. Remove unsupported fields and status values.
3. Verify relationships and unique constraints.
4. Update tests that depend on fixture identifiers.
5. Review role and permission changes.
6. Confirm payment amounts and refund scenarios match the payment model.
7. Run JSON syntax validation.
8. Run the relevant automated test suite.
9. Test fixture loading against a clean test database.
10. Check that changes introduce no real data or secrets.

Review fixture changes alongside relevant migrations, models, services, and tests.

12. Important Limitations

* Fixtures are illustrative test data, not authoritative college records or admission guidance.
* Fixture payment records do not establish that a provider transaction occurred.
* JSON fixtures do not replace database migrations or SQL seed files.
* Fixture compatibility must be verified against the actual MedOrbits implementation.
* A fixture file is not automatically loaded unless a configured script or test explicitly loads it.
* Unverified assumptions must be documented rather than treated as established application behavior.

13. Summary

Keep MedOrbits fixtures small, deterministic, secure, and consistent with the actual application implementation. Validate their syntax, verify database relationships, and load them only through a controlled development or test process.