MedOrbits — Integration Tests

Directory: tests/integration/

1. Purpose

Integration tests verify that MedOrbits components work together correctly across application boundaries.

They validate interactions among:

* HTTP routes, middleware, controllers, and services.
* Services and repository implementations.
* Repository operations and the test database.
* Authentication and authorization middleware.
* Application submission and retrieval workflows.
* Payment processing, refunds, and webhook handling.
* Notification delivery and persistence.
* Database constraints, transactions, and concurrent operations.

Integration tests complement unit tests and security tests. They do not replace either category.

2. Directory Structure

tests/
└── integration/
    ├── README.md
    ├── application.integration.test.js
    ├── auth.integration.test.js
    ├── controllers.integration.test.js
    ├── database-constraints.integration.test.js
    ├── notification.integration.test.js
    ├── payments.integration.test.js
    ├── repositories.integration.test.js
    │
    └── payments/
        ├── README.md
        ├── concurrent-refunds.integration.test.js
        ├── duplicate-events.integration.test.js
        └── webhook.integration.test.js

This is a reference inventory, not a guarantee that every listed test file exists or is fully implemented. Keep the directory structure synchronized with the files actually maintained in the repository.

3. Runtime Requirements

* Node.js 20 or later.
* The MedOrbits application configured for a dedicated test environment.
* A test database when tests exercise persistent storage.
* Valid test credentials for authenticated and ownership-sensitive workflows.
* Test-only payment-provider credentials or deterministic provider mocks where applicable.
* Network access between the test runner and the test application when tests use HTTP.

Use the Node.js built-in test runner unless the project’s existing test configuration specifies another runner.

4. Test Categories

4.1 Application integration

application.integration.test.js

Verify application-related workflows, including:

* Submission of valid applications.
* Rejection of invalid or incomplete payloads.
* Retrieval of persisted applications.
* Authentication and ownership enforcement.
* Handling of nonexistent application identifiers.
* Correct validation and error responses.
* Persistence consistency across independent requests.

Tests must use the application’s actual request schema and documented API contract.

4.2 Authentication integration

auth.integration.test.js

Verify:

* Successful authentication with valid test credentials.
* Rejection of invalid credentials.
* Required authentication for protected endpoints.
* Handling of missing, malformed, expired, or invalid tokens where supported.
* Correct identity propagation to downstream handlers.
* Session or token invalidation where implemented.
* Absence of passwords, hashes, tokens, and secrets in responses.

Do not use production credentials or real user accounts.

4.3 Controller integration

controllers.integration.test.js

Verify controller behavior through the application’s actual routing and middleware stack.

Cover:

* Request parsing and validation.
* Service invocation and response mapping.
* Authentication and authorization enforcement.
* Standard success and error response formats.
* Handling of expected service and repository failures.
* Appropriate HTTP status codes.

Keep isolated business-rule tests in the unit-test suite.

4.4 Database constraints

database-constraints.integration.test.js

Verify persistence-layer guarantees, including:

* Primary-key uniqueness.
* Unique constraints where required.
* Foreign-key integrity where supported.
* Required fields and nullability.
* Valid relationships between dependent records.
* Transaction rollback after failed operations.
* Referential integrity during updates and deletes.

Run these tests against an isolated test database using the same database engine and relevant migrations as the target deployment.

Do not assume an ORM-level validation replaces a database constraint.

4.5 Notification integration

notification.integration.test.js

Verify:

* Notification creation and persistence.
* Correct association with the intended user or resource.
* Authorization when retrieving notifications.
* Read/unread state changes where supported.
* Duplicate-notification handling where required.
* Graceful handling of delivery-provider failures.
* Protection of private notification content.

Use a test transport or mocked external delivery provider. Do not send real notifications to users.

4.6 Payment integration

payments.integration.test.js

Verify payment workflows using a provider sandbox or deterministic test doubles:

* Payment creation and retrieval.
* Input validation and currency handling.
* Authorization and resource ownership.
* Valid and invalid payment state transitions.
* Refund validation and authorization.
* Safe handling of provider errors.
* Idempotency and persistence guarantees.
* Exclusion of secrets and sensitive payment data from API responses.

Never use real payment credentials or initiate real charges in automated tests.

4.7 Repository integration

repositories.integration.test.js

Verify repository behavior against the actual persistence layer or through an explicitly documented API-level integration test.

Where direct repository tests are implemented, cover:

* Create, read, update, and delete behavior.
* Persistence across independent database sessions or requests.
* Filtering, pagination, and sorting where supported.
* Transaction behavior and rollback.
* Uniqueness and relationship constraints.
* Correct handling of nonexistent records.
* Isolation of records belonging to different users or tenants.
* Safe parameterized database operations.

Tests that exercise repositories directly should import the actual repository modules. Tests that call HTTP endpoints should be documented as API-level integration tests instead.

4.8 Payment-specific integration tests

payments/

* webhook.integration.test.js — signature validation, event processing, and rejection of forged webhook requests.
* duplicate-events.integration.test.js — idempotent processing of repeated provider events.
* concurrent-refunds.integration.test.js — concurrent refund requests, state consistency, and prevention of over-refunding.
* README.md — payment-specific test setup and execution instructions.

Use provider test events and isolated test records. Concurrency tests must verify persisted outcomes, not merely HTTP response codes.

5. Environment Configuration

Use environment variables or the project’s established test configuration to provide the application URL, test credentials, and database connection.

Example shell configuration:

export NODE_ENV=test
export TEST_BASE_URL=http://127.0.0.1:3000
# Optional integration-test credentials
export REPOSITORY_TEST_USER_A_TOKEN=‘test-user-a-token’
export REPOSITORY_TEST_USER_B_TOKEN=‘test-user-b-token’
# Enable only when using an isolated, disposable test environment
export RUN_MUTATING_REPOSITORY_TESTS=true

These values are examples. Configure only variables consumed by the test files you actually run.

If the application requires a database URL, configure the test database using the project’s existing environment-variable convention. Never point destructive tests at production or a shared database containing real user data.

Do not commit .env files, credentials, API secrets, access tokens, or production connection strings.

6. Preparing the Test Environment

Before running integration tests:

1. Install dependencies using the package manager and lockfile used by the project.
2. Configure the test environment.
3. Create or select a dedicated test database.
4. Apply the application’s test migrations or schema initialization.
5. Seed only the minimum test users, roles, and records required.
6. Start the application with test configuration when tests communicate over HTTP.
7. Confirm that test credentials have the expected permissions.
8. Verify that external services use sandbox endpoints, mocks, or test transports.
9. Ensure cleanup procedures cannot reach production resources.

Use deterministic fixtures and unique identifiers to prevent test collisions.

7. Running the Tests

Run all integration tests

From the repository root:

node —test tests/integration/**/*.test.js

Shell glob expansion differs across environments. If the command does not include nested files, use the project’s configured test script or run the relevant files explicitly.

Run an individual test file

node —test tests/integration/application.integration.test.js
node —test tests/integration/auth.integration.test.js
node —test tests/integration/controllers.integration.test.js
node —test tests/integration/database-constraints.integration.test.js
node —test tests/integration/notification.integration.test.js
node —test tests/integration/payments.integration.test.js
node —test tests/integration/repositories.integration.test.js

Run payment-specific tests

node —test tests/integration/payments/webhook.integration.test.js
node —test tests/integration/payments/duplicate-events.integration.test.js
node —test tests/integration/payments/concurrent-refunds.integration.test.js

Use the commands for files that exist in the current checkout. Confirm the test-runner and script configuration in package.json before adding or replacing project-wide scripts.

8. Test Design Requirements

8.1 Isolation

Each test must have a defined data boundary.

* Use unique identifiers for records created during a test.
* Avoid depending on execution order.
* Avoid modifying records shared by unrelated tests.
* Restore changed state or delete test-created records where safe.
* Use transactions or disposable database instances where appropriate.
* Make cleanup safe to execute even after partial test failure.

8.2 Persistence verification

When testing a write, verify the persisted result independently.

A successful HTTP response alone does not prove that a record was committed. Re-read the record through the appropriate repository, database session, or API endpoint.

8.3 Authorization and ownership

Test both authorized and unauthorized scenarios.

* A user must not access another user’s private records.
* Administrative operations must require the appropriate privileges.
* Client-supplied ownership fields must not override authenticated identity.
* Unauthenticated requests must not bypass protected middleware.
* Where appropriate, return 404 instead of 403 to avoid disclosing record existence.

Use fixtures with known ownership. A cross-user test is meaningful only when the test record’s owner is established independently.

8.4 Error handling

Tests should assert documented error behavior without requiring implementation-specific stack traces.

Verify that responses do not disclose:

* SQL queries or database connection strings.
* Stack traces and filesystem paths.
* Password hashes, access tokens, refresh tokens, or secrets.
* Internal provider credentials.
* Sensitive personal or payment information.

8.5 Concurrency and idempotency

For operations that may execute concurrently:

* Run requests concurrently against the same isolated fixture.
* Verify the final persisted state.
* Confirm that duplicate requests do not create unintended duplicate records.
* Verify that refunds, balances, inventory, and payment state cannot violate business invariants.
* Check that transaction isolation and database constraints enforce the intended guarantees.

8.6 External services

External systems should be sandboxed or mocked.

Examples include:

* Payment providers.
* Email and SMS gateways.
* Cloud storage.
* Identity providers.
* External education or recruitment APIs.

Tests must not depend on production services or deliver real communications.

9. Database and Cleanup Policy

Integration tests must use a dedicated database or an isolated database schema.

* Never truncate tables in a shared or production database.
* Never run destructive migrations against production.
* Use explicit test fixtures and deterministic teardown.
* Preserve audit records when testing audit requirements.
* Verify rollback behavior for failed transactions.
* Ensure concurrent test runs cannot delete one another’s data.

If the application supports transaction-based test isolation, use it where appropriate. For tests involving multiple connections, background jobs, or committed transactions, use disposable records or a dedicated test database instead.

10. Failure Diagnosis

Symptom	Possible cause	Recommended action
Connection refused	Application is not running or URL is incorrect	Start the test server and verify the base URL
401 Unauthorized	Missing, invalid, or expired test token	Generate valid test credentials
403 Forbidden	Fixture ownership or permissions do not match expectations	Verify the test user’s role and record owner
404 Not Found	Incorrect route, identifier, or fixture	Check route registration and seeded data
400 or 422	Payload does not match the API contract	Use the documented request schema
Duplicate-key error	Test data is not isolated or a fixture is reused	Generate unique identifiers and clean up safely
Database connection failure	Test database is unavailable or misconfigured	Check the test database configuration
Flaky concurrency test	Shared fixtures, timing assumptions, or missing transactional guarantees	Isolate fixtures and assert final persisted state

11. Acceptance Criteria

A repository or API integration test is complete when it:

* Exercises a real component boundary.
* Uses an isolated and reproducible test environment.
* Verifies observable behavior rather than implementation details alone.
* Covers relevant success, validation, authorization, and failure paths.
* Confirms persisted state when testing writes.
* Cleans up its own test data safely.
* Does not use production credentials or real customer data.
* Passes consistently when run independently and with the suite.
* Documents required fixtures and environment variables.
* Makes no claims about behavior that the test does not actually verify.

12. Relationship to Other Test Suites

Test suite	Primary responsibility
tests/unit/	Isolated functions, validators, services, and business rules
tests/integration/	Interactions across routes, services, repositories, and persistence
tests/security/	Authentication, authorization, access control, and abuse resistance
tests/ end-to-end suite, if present	Complete user journeys across the deployed application

Avoid duplicating every unit or security test in this directory. Integration tests should focus on whether the components enforce the intended behavior when connected.

13. Maintenance

When an API route, repository contract, database schema, or authorization policy changes:

1. Update the corresponding integration tests.
2. Update test fixtures and environment-variable documentation.
3. Confirm migrations and database constraints match the intended behavior.
4. Run the affected test file.
5. Run the complete integration suite.
6. Review test cleanup and ensure no production resources are referenced.
7. Update this README when the suite’s structure or execution process changes.

Maintenance rule: Keep test paths, environment variables, request payloads, and response assertions aligned with the actual MedOrbits implementation. Do not treat example routes or optional tests in this document as proof that the corresponding functionality exists.