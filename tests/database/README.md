MedOrbits Database Tests

1. Purpose

The tests/database/ directory contains automated tests and shared utilities for verifying MedOrbits database connectivity, repository operations, schema constraints, indexes, migrations, and transaction behavior.

The test suite is intended to detect:

* Database connection and configuration failures.
* Repository CRUD and query-handling defects.
* Missing or ineffective database constraints.
* Missing indexes and incorrect index behavior.
* Migration naming and migration-history inconsistencies.
* Transaction commit, rollback, and atomicity failures.
* Unsafe database test configuration.
* Data integrity issues and inconsistent database behavior.

Security requirement: Database tests must run only against a dedicated test database. Never use production credentials or a production database.

2. Directory structure

tests/
└── database/
    ├── setup.js
    ├── connection.test.js
    ├── constraints.test.js
    ├── indexes.test.js
    ├── migrations.test.js
    ├── repositories.test.js
    ├── transactions.test.js
    └── README.md

File responsibilities

File	Responsibility
setup.js	Shared MySQL connection, configuration validation, and lifecycle helpers
connection.test.js	Database connectivity and connection configuration
constraints.test.js	Primary keys, unique constraints, required fields, and related database rules
indexes.test.js	Index metadata, uniqueness, and indexed query behavior
migrations.test.js	Migration file naming, migration history, and migration tracking checks
repositories.test.js	Repository-style CRUD operations and parameterized queries
transactions.test.js	Transaction commit, rollback, atomicity, isolation, and connection cleanup
README.md	Database testing setup, execution, safety, and maintenance guidance

Each test file should have a clearly defined responsibility and avoid unnecessary duplication.

3. Requirements

* Node.js 20 or later.
* MySQL-compatible test database.
* mysql2 package.
* Dedicated test database with a clearly identifiable test name.
* Database credentials with only the privileges required by the tests.
* Project migration runner and repository modules where actual application integration is required.

Install the MySQL driver if it is not already installed:

npm install mysql2

4. Environment configuration

The shared setup module, tests/database/setup.js, uses the following environment variables.

Variable	Required	Description
NODE_ENV	Yes	Must be test
TEST_DATABASE_URL	Yes	MySQL connection URL for the dedicated test database
MIGRATIONS_DIR	For migration tests	Migration directory when different from the test’s configured default
MIGRATIONS_TABLE	Optional	Migration history table name when different from migrations

Example connection URL:

mysql://test_user:test_password@127.0.0.1:3306/medorbits_test

Example environment configuration:

export NODE_ENV=test
export TEST_DATABASE_URL=“mysql://test_user:test_password@127.0.0.1:3306/medorbits_test”

For credentials containing reserved URL characters, percent-encode the username and password.

Do not commit actual database credentials to source control. Use your local environment or a secret manager in CI.

Database safety requirements

1. Set NODE_ENV=test.
2. Use a dedicated, disposable test database.
3. Ensure the database name contains a clear test marker, such as medorbits_test.
4. Never point TEST_DATABASE_URL at a production database.
5. Do not print database credentials in logs.
6. Use a restricted database account instead of an administrative account.
7. Review all tests that create, modify, truncate, or drop database objects.
8. Confirm the database target before running destructive integration tests.

The setup module validates configuration and checks the connected database. These checks reduce risk but cannot prove that a database is disposable. Verify the target and credentials independently.

5. Shared database setup

Import the shared connection utilities from setup.js:

‘use strict’;
const {
  connectTestDatabase,
  getTestDatabaseConnection,
  closeTestDatabase,
} = require(‘./setup’);

Example using Node.js’s built-in test runner

‘use strict’;
const assert = require(‘node:assert/strict’);
const {
  before,
  after,
  test,
} = require(‘node:test’);
const {
  connectTestDatabase,
  getTestDatabaseConnection,
  closeTestDatabase,
} = require(‘./setup’);
before(async () => {
  await connectTestDatabase();
});
after(async () => {
  await closeTestDatabase();
});
test(‘test database connection is available’, () => {
  const connection = getTestDatabaseConnection();
  assert.ok(connection);
});

This example verifies that the shared connection is available. It does not verify repository behavior, schema correctness, or transaction semantics.

Lifecycle requirements

* Connect before database-dependent tests execute.
* Close the connection after the suite completes.
* Ensure cleanup executes even when a test fails.
* Avoid registering Jest lifecycle hooks in a node:test suite.
* Do not close a shared connection while other tests are still using it.
* Isolate tests that require independent connections or concurrent transactions.

The example assumes sequential suite setup and teardown. For concurrent test execution, use appropriately isolated connections or test databases.

6. Running the tests

Run all database tests

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
node —test tests/database/*.test.js

This command assumes every test file in the directory is compatible with Node.js’s built-in test runner and the configured database setup.

If your environment variables are not already exported, provide the test database URL explicitly:

NODE_ENV=test \
TEST_DATABASE_URL=“mysql://test_user:test_password@127.0.0.1:3306/medorbits_test” \
node —test tests/database/*.test.js

Run individual test files

Connection tests

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
node —test tests/database/connection.test.js

Constraint tests

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
node —test tests/database/constraints.test.js

Index tests

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
node —test tests/database/indexes.test.js

Migration tests

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
node —test tests/database/migrations.test.js

Repository tests

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
node —test tests/database/repositories.test.js

Transaction tests

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
node —test tests/database/transactions.test.js

Add an npm script

Merge the following entry into the existing scripts object in package.json:

{
  “scripts”: {
    “test:database”: “node —test tests/database/*.test.js”
  }
}

Run the suite with:

NODE_ENV=test \
TEST_DATABASE_URL=“$TEST_DATABASE_URL” \
npm run test:database

Do not replace the existing scripts object or remove other project scripts when adding this entry.

7. Test responsibilities

7.1 Connection tests

The connection suite should verify that:

* The configured test database can be reached.
* Missing or invalid configuration fails clearly.
* The connected database matches the expected database.
* Connection cleanup works after tests complete.
* Connection errors are handled without exposing credentials.
* Connection setup does not silently connect to an unintended database.

7.2 Constraint tests

The constraint suite should verify applicable database rules, including:

* Primary-key uniqueness.
* Unique email addresses or other business identifiers.
* Required fields and NOT NULL constraints.
* Foreign-key relationships.
* Valid values for constrained fields.
* Transaction rollback where applicable.
* Referential integrity when records are updated or deleted.

Test actual database constraints rather than relying exclusively on application-level validation.

7.3 Index tests

The index suite should verify that:

* Required indexes exist.
* Unique indexes reject duplicate values.
* Composite indexes have the intended column order.
* Indexed queries return correct results.
* Database-specific index metadata can be inspected.
* Index definitions are consistent with the schema.

An index existing does not prove that the database uses it for a particular query. Query-plan assertions should be separate, database-specific tests.

7.4 Migration tests

The migration suite should verify that:

* Migration files follow the project’s naming convention.
* Migration versions are unique.
* Migration history is readable.
* Recorded versions follow the project’s migration policy.
* Applying pending migrations produces the expected schema.
* Re-running the migration runner does not apply completed migrations again.
* Rollback behavior is tested where the migration system supports down migrations.

Migration execution and rollback tests should use a disposable database or isolated schema.

Important: Migration filename and history checks alone do not prove that migrations execute correctly. The complete integration suite should call the actual MedOrbits migration runner.

7.5 Repository tests

The repository suite should verify that:

* Records can be created and retrieved.
* Missing records produce predictable results.
* Updates affect only the intended fields.
* Deletions follow the repository contract.
* Database uniqueness and other constraints are enforced.
* Queries use parameterized values.
* Transactions and foreign-key relationships are respected.
* Repository methods handle database errors consistently.

Repository tests should import the actual MedOrbits repository modules. Standalone example queries test database behavior but do not establish that the production repository implementation is correct.

7.6 Transaction tests

The transaction suite, transactions.test.js, should verify the behavior of MedOrbits’ actual transaction implementation.

Commit behavior

* Successful transactions commit all intended changes.
* Committed records are visible to subsequent transactions according to the configured isolation level.
* A transaction does not report success before the commit operation succeeds.

Rollback behavior

* Failed transactions roll back changes made within the transaction.
* Partial writes are not persisted after a transaction fails.
* Errors during transactional operations are propagated correctly.
* Rollback failures are handled without hiding the original failure.

Atomicity and consistency

* Related database changes succeed or fail together.
* Database constraints remain enforced within transactions.
* A failed operation does not leave partially updated business records.
* Payment, application, subscription, and other multi-step operations preserve their required invariants.

Connection handling

* All statements within a transaction use the same database connection.
* Connections are released after commit or rollback.
* Exceptions do not leave connections or transactions open.
* A failed transaction does not accidentally reuse a connection with an open transaction.

Concurrency and isolation

* Concurrent transactions do not produce unintended lost updates.
* Locking and isolation behavior match the requirements of the selected database engine.
* Deadlocks and serialization failures are handled according to the application’s retry policy.
* Nested transactions follow the documented strategy, such as savepoints or explicit rejection.

Use isolated records, temporary tables, or a dedicated test schema. Do not run destructive transaction tests against production or shared staging databases.

A rollback test should verify the database state after rollback, not merely assert that an exception was thrown.

8. Migration and schema consistency

MedOrbits should maintain one authoritative database schema strategy.

Document the following in the project’s database documentation:

* The database engine and supported versions.
* The migration tool or runner.
* The location of migration files.
* The migration versioning convention.
* The migration history table.
* The process for applying migrations in development, test, staging, and production.
* Whether rollback is supported.
* How schema changes are reviewed.
* How backups and recovery are handled.

Do not independently create or modify production tables from test setup code.

Database tests should use the intended test schema or temporary database objects and should not conflict with production schema management.

9. Cleanup and test isolation

Every test must clean up records and temporary database objects that it creates.

Recommended practices:

* Generate unique identifiers for test records.
* Use transactions and rollback when safe and appropriate.
* Use isolated temporary tables or schemas for metadata tests.
* Prevent concurrent tests from modifying the same fixture records.
* Never assume auto-increment IDs begin at 1.
* Close connections even when a test fails.
* Use teardown hooks and finally blocks for cleanup.
* Ensure every transaction is committed or rolled back.
* Release database connections after transaction completion.
* Avoid dropping shared application tables during routine test cleanup.
* Ensure parallel CI jobs use isolated databases or schemas.

If multiple test suites execute concurrently, use independent test databases, schemas, or carefully isolated fixtures where necessary.

10. CI integration

A CI pipeline should:

1. Start a disposable MySQL service.
2. Create a dedicated test database and restricted test account.
3. Install project dependencies.
4. Configure the test environment variables.
5. Apply the intended test schema and migrations.
6. Run the database tests.
7. Capture test output and failure reports.
8. Destroy the disposable database after the job completes.

Do not run destructive database tests against a shared staging or production database.

CI should fail when a required database test fails. Do not silently skip tests that are mandatory for the configured environment.

11. Troubleshooting

Problem	Likely cause	Recommended action
TEST_DATABASE_URL is required	Environment variable is missing	Configure the dedicated test database URL
Database-name validation fails	Database name lacks a test marker	Use a name such as medorbits_test
Authentication failure	Incorrect credentials or database grants	Verify the restricted test account
Connection timeout	MySQL is unavailable or inaccessible	Check service status, hostname, port, and network access
Migration directory missing	Incorrect migration path	Set MIGRATIONS_DIR to the actual directory
Migration history table missing	Migration bootstrap has not run	Initialize the migration system in the test database
Duplicate-key error	A fixture reused a unique value	Generate unique test identifiers
Transaction changes remain after failure	Rollback was not executed or was ineffective	Check the transaction wrapper and verify database state
Connection remains busy after a test	Transaction or connection was not released	Add reliable rollback and teardown handling
Concurrent tests interfere	Shared mutable fixtures or DDL operations	Isolate records, schemas, or databases
Rollback test fails	Migration or transaction logic is incomplete	Review rollback behavior and the transaction contract

12. Completion criteria

The database test suite is ready for CI when:

* [ ]	The test database is explicitly configured and isolated.
* [ ]	Connection setup and teardown are reliable.
* [ ]	Database tests cannot run accidentally under NODE_ENV=production.
* [ ]	Schema constraints are tested against the real schema.
* [ ]	Required indexes and their definitions are verified.
* [ ]	Migration tests invoke the actual migration runner.
* [ ]	Repository tests exercise the actual MedOrbits repository modules.
* [ ]	Transaction tests verify commit, rollback, atomicity, and connection cleanup.
* [ ]	Concurrency and isolation tests cover critical transactional workflows.
* [ ]	Test data is isolated and cleaned up.
* [ ]	Failures identify the relevant operation without exposing secrets.
* [ ]	Tests pass against the database engine and version used by the project.

13. Maintenance policy

Update this documentation and the corresponding tests whenever MedOrbits changes:

* Database engine or driver.
* Database schema or constraints.
* Migration tool or versioning strategy.
* Repository interfaces or query behavior.
* Transaction wrappers or isolation requirements.
* Test runner or CI configuration.
* Database connection and credential management.

Final rule: Keep database tests isolated, repeatable, and aligned with the real MedOrbits implementation. Never treat an illustrative test or a skipped assertion as proof that the production database layer is correct.