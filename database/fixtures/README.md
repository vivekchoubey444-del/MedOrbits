Database Fixtures

Overview

This directory contains synthetic JSON fixtures used for local development, database seeding in isolated test environments, and automated testing of MedOrbits.

Fixtures provide predictable test data for validating application behavior without relying on real users, live admissions data, or production payment records.

Directory Structure

database/
└── fixtures/
    ├── README.md
    ├── applications.fixture.json
    ├── colleges.fixture.json
    ├── courses.fixture.json
    ├── payments.fixture.json
    └── users.fixture.json

Fixture Files

File	Purpose
users.fixture.json	Synthetic user accounts, roles, verification states, and account statuses.
applications.fixture.json	Example applications covering different application workflow states.
colleges.fixture.json	Illustrative college records for testing college-related features.
courses.fixture.json	Illustrative courses for education and course discovery workflows.
payments.fixture.json	Synthetic payment records for testing payment lifecycle and refund scenarios.

The available fields and relationships in each fixture must remain consistent with the corresponding MedOrbits models, database schema, validators, and application services.

Fixtures must not introduce unsupported database fields, role names, status values, or relationships. Where fixture identifiers differ from database primary keys, the fixture loader must resolve them using the appropriate model or mapping.

Intended Uses

Use fixtures to test:

* User registration and authentication workflows.
* Role-based access control and account verification.
* Application creation and status transitions.
* College and course discovery.
* Payment status handling and refund workflows.
* API responses, validation rules, and database relationships.
* Administrative dashboards and reporting.
* Error handling for invalid or incomplete records.
* Unique constraints and foreign-key relationships.
* Application behavior for active, inactive, verified, and unverified accounts, where supported.

Data Conventions

Identifiers

* Use synthetic, deterministic identifiers where tests depend on specific records.
* Keep fixture identifiers consistent across related fixture files.
* Do not assume that a fixture identifier is the same as a database primary key.
* Resolve foreign-key relationships through the actual database schema and model definitions.
* Avoid duplicate identifiers or values that violate database uniqueness constraints.

Timestamps

* Use ISO 8601 timestamps in UTC, with the Z suffix, when timestamps are required.
* Keep timestamp formats consistent across fixtures.
* Ensure that creation, update, submission, payment, and refund timestamps are logically consistent with the scenario being tested.

Example:

{
  “createdAt”: “2026-01-10T09:00:00.000Z”,
  “updatedAt”: “2026-01-10T09:00:00.000Z”
}

Statuses and Roles

* Use only roles supported by the application’s role definitions and database seeds.
* Use only status values supported by the relevant models, database columns, enums, and validators.
* Do not assume that statuses such as disabled, approved, succeeded, or partially_refunded are valid without checking the corresponding implementation.
* Keep test scenarios aligned with permitted application state transitions.
* Do not bypass application validation to insert unsupported states.

Monetary Values

* Represent monetary amounts using the unit defined by the payment model.
* The current payment fixture convention uses integer paise for INR amounts.
* Under this convention, 150000 represents ₹1,500.00.
* Keep currency codes explicit where required.
* Ensure that refund amounts do not exceed the original payment amount.
* Test partial and full refunds only where supported by the payment implementation.

Synthetic Data

* Use reserved example email domains, such as example.invalid, for synthetic accounts.
* Use fictional names and non-production contact details.
* Keep metadata limited to information needed for the test scenario.
* Clearly distinguish fixture-only attributes from fields supported by the actual application schema.

Relationships Between Fixtures

Related fixtures must reference records that exist in the same test dataset or can be resolved by the configured fixture loader.

Examples include:

* Users associated with applications.
* Applications associated with courses and colleges.
* Payments associated with users, applications, or subscriptions.
* Colleges associated with universities, where supported by the schema.
* Courses associated with colleges or universities, where supported by the application’s relationship model.

Before loading related records, verify the required insertion order and foreign-key constraints.

A typical dependency order is:

1. Roles and permissions.
2. Users.
3. Universities and colleges.
4. Courses.
5. Applications.
6. Subscriptions and payments, where applicable.

This order is illustrative. The actual order must follow the project’s migrations, foreign-key definitions, and fixture loader implementation.

Loading Fixtures

Fixtures are JSON data files, not database migrations.

Before using them:

1. Confirm that the target database schema has been initialized.
2. Confirm that the intended database is a dedicated development or test database.
3. Validate each JSON file.
4. Check that fixture fields match the corresponding model and database columns.
5. Verify supported roles, statuses, identifiers, and relationships.
6. Load fixtures only through an approved development or test seeding process.
7. Run automated tests and verify expected relationships and outcomes.

The exact seeding command depends on the database adapter and seeding scripts configured in the project. Do not assume a fixture-loading command exists unless it has been implemented.

For the MySQL configuration, use the project’s configured database adapter and connection settings. The loader should use parameterized queries, handle unique constraints appropriately, and resolve foreign-key references before inserting dependent records.

Idempotency

Where practical, fixture loaders should be idempotent: running them repeatedly should not create unintended duplicate records.

To support this:

* Use deterministic fixture identifiers or unique keys.
* Define an explicit strategy for records that already exist.
* Avoid deleting unrelated data during fixture loading.
* Use transactions for data-loading operations where appropriate and supported.
* Account for MySQL DDL implicit commits; schema migrations should not be assumed to roll back as ordinary transactional data operations do.

Any destructive reset or reload operation must be explicitly restricted to a configured development or test environment.

Validation

Validate JSON Syntax

Use Node.js to validate all JSON fixtures:

node -e ‘for (const f of process.argv.slice(1)) JSON.parse(require(“node:fs”).readFileSync(f, “utf8”)); console.log(“Fixture JSON is valid.”)’ database/fixtures/*.json

If a file contains invalid JSON, Node.js will report a parsing error and the command will stop before printing the success message.

Validate Schema Compatibility

JSON syntax validation does not verify database constraints, required fields, foreign keys, business rules, or application-specific status values.

Additional checks should verify:

* Required fields and data types.
* Unique email addresses and other unique values.
* Valid role references.
* Valid user, application, college, course, and subscription references.
* Supported status values.
* Valid date and timestamp formats.
* Valid monetary amounts and refund totals.
* Compatibility with model validators and application services.

These checks should be covered by the project’s validators, fixture loader, integration tests, and automated test suite.

Validate Relationships

Before considering fixtures ready for automated tests:

1. Confirm every referenced record exists or has a valid resolution strategy.
2. Confirm that the referenced records satisfy the applicable foreign-key constraints.
3. Confirm that relationships match the application’s business rules.
4. Verify that expected API responses and application workflows behave correctly.
5. Check that failed fixture loading does not leave unintended partial test data.

Testing Guidelines

Use fixtures to establish repeatable test scenarios.

Recommended practices:

* Keep each fixture focused on a meaningful scenario.
* Use deterministic identifiers for tests that require exact records.
* Separate ordinary success cases from validation failures and exceptional states.
* Test authorization independently from fixture setup.
* Verify that account status and email verification are enforced by the authentication implementation.
* Test payment lifecycle transitions through the appropriate application services.
* Avoid assuming that inserting a payment fixture proves that a real payment-provider transaction occurred.
* Reset test data between tests when required for isolation.
* Ensure tests do not depend on execution order unless explicitly designed to do so.

Security Requirements

* Never load test fixtures into the production database.
* Never include real personal information, access tokens, API keys, session secrets, or payment credentials.
* Treat password hashes and authentication fields according to the actual authentication implementation.
* Placeholder password hashes are not usable credentials and must not be treated as valid authentication data.
* Never bypass authorization checks merely to make fixture-based tests pass.
* Use a dedicated test database and restrict destructive seeding operations to explicitly configured environments.
* Do not use real payment-provider identifiers or simulate provider confirmation by directly changing production payment statuses.
* Do not expose fixture accounts as real users or administrative accounts in a deployed environment.
* Keep production credentials and database configuration separate from development and test configuration.

Maintenance

When application models, validators, migrations, or database schemas change:

1. Update affected fixture records.
2. Remove unsupported fields and statuses.
3. Verify relationships and unique constraints.
4. Update tests that depend on fixture identifiers.
5. Review any changes to role and permission definitions.
6. Confirm payment amounts and refund scenarios follow the current payment model.
7. Run JSON syntax validation.
8. Run the relevant automated test suite.
9. Verify fixture loading against a clean test database.
10. Review changes to ensure that no production data or secrets have been introduced.

Fixture changes should be reviewed alongside relevant migrations, models, services, and tests.

Important Notes

* These fixtures are illustrative test data.
* They are not authoritative college records, official course or admission information, real user accounts, or evidence of completed payments.
* JSON fixtures do not replace database migrations or SQL seed files.
* Fixture compatibility must be verified against the actual MedOrbits implementation.
* A fixture file is not automatically loaded unless a configured script or test explicitly loads it.
* Any assumptions that cannot be verified from the schema or application implementation must be documented in the relevant fixture or test.

Summary

Keep the MedOrbits database fixtures small, deterministic, secure, and consistent with the actual application implementation. Validate JSON syntax, verify database relationships, and load fixtures only through a controlled development or test process.