MedOrbits — Test Suite Documentation

Directory: tests/
Purpose: Automated quality assurance for the MedOrbits education consultancy, admissions, document management, payments, and career services platform.

────────

1. Overview

The MedOrbits test suite verifies application behavior, API contracts, database integrity, authorization, payment processing, accessibility, and critical user workflows.

The suite is organized into the following categories:

|Directory              |Purpose                                                                                        |
|————————|————————————————————————————————|
|`unit/`                |Isolated functions, validators, utilities, and business rules                                  |
|`integration/`         |Interactions between controllers, services, repositories, and infrastructure                   |
|`integration/payments/`|Payment webhooks, duplicate events, and concurrent refunds                                     |
|`api/`                 |HTTP endpoints, response contracts, validation, and access control                             |
|`database/`            |Connections, migrations, constraints, indexes, repositories, and transactions                  |
|`security/`            |Authentication, authorization, IDOR, privilege escalation, and information leakage             |
|`accessibility/`       |WCAG-oriented checks, forms, navigation, contrast, keyboard access, and screen-reader semantics|
|`e2e/`                 |Complete user journeys across the application                                                  |
|`fixtures/`            |Reusable test data and payloads                                                                |

Important: The existence of a test file does not prove that its tests pass or that its associated application feature is implemented. Test coverage must be verified by executing the suite.

2. Directory structure

The following is the intended structure based on the current repository inventory.

tests/
├── README.md
│
├── accessibility/
│   ├── README.md
│   ├── color-contrast.test.js
│   ├── forms.accessibility.test.js
│   ├── homepage.accessibility.test.js
│   ├── keyboard-navigation.test.js
│   ├── navigation.accessibility.test.js
│   └── screen-reader.test.js
│
├── api/
│   ├── README.md
│   ├── applications.api.test.js
│   ├── auth.api.test.js
│   ├── colleges.api.test.js
│   ├── courses.api.test.js
│   ├── documents.api.test.js
│   ├── error-responses.api.test.js
│   ├── health.api.test.js
│   ├── jobs.api.test.js
│   ├── payments.api.test.js
│   ├── universities.api.test.js
│   └── user.api.test.js
│
├── database/
│   ├── README.md
│   ├── connection.test.js
│   ├── constraints.test.js
│   ├── indexes.test.js
│   ├── migrations.test.js
│   ├── repositories.test.js
│   ├── setup.js
│   └── transactions.test.js
│
├── e2e/
│   ├── README.md
│   ├── admin-workflow.e2e.test.js
│   ├── application-submission.e2e.test.js
│   ├── authentication.e2e.test.js
│   ├── document-upload.e2e.test.js
│   └── payment-checkout.e2e.test.js
│
├── fixtures/
│   ├── README.md
│   ├── applications.js
│   ├── candidates.js
│   ├── courses.js
│   ├── documents.js
│   ├── employers.js
│   ├── payments.js
│   ├── subscriptions.js
│   └── users.js
│
├── integration/
│   ├── README.md
│   ├── application.integration.test.js
│   ├── auth.integration.test.js
│   ├── controllers.integration.test.js
│   ├── database-constraints.integration.test.js
│   ├── notification.integration.test.js
│   ├── payments.integration.test.js
│   ├── repositories.integration.test.js
│   │
│   └── payments/
│       ├── README.md
│       ├── concurrent-refunds.integration.test.js
│       ├── duplicate-events.integration.test.js
│       └── webhook.integration.test.js
│
├── security/
│   ├── README.md
│   ├── authentication.security.test.js
│   ├── authorization.security.test.js
│   ├── idor.security.test.js
│   ├── input-validation.security.test.js
│   ├── mass-assignment.security.test.js
│   ├── payment-webhook.security.test.js
│   ├── privilege-escalation.security.test.js
│   ├── rate-limit.security.test.js
│   ├── sensitive-data.security.test.js
│   └── unauthorized-downloads.security.test.js
│
└── unit/
    └── validators.test.js

Treat this as the intended inventory, not an independently verified filesystem listing. Confirm actual filenames before enforcing the tree in CI.

3. Test file responsibilities

3.1 Unit tests

File: unit/validators.test.js

Test isolated validation logic, including:

• Required fields.
• Data types and formats.
• String length boundaries.
• Numeric limits.
• Email and identifier validation.
• Invalid or unsupported values.
• Consistent validation error structures.

Unit tests should avoid database and network dependencies unless explicitly required.

3.2 API tests

|File                         |Responsibilities                                                                               |
|——————————|————————————————————————————————|
|`applications.api.test.js`   |Application retrieval, submission, ownership, validation, and access control                   |
|`auth.api.test.js`           |Registration, login, credential validation, and authentication errors                          |
|`colleges.api.test.js`       |College catalog, search, filters, pagination, and details                                      |
|`courses.api.test.js`        |Course catalog, course details, query validation, and catalog access                           |
|`documents.api.test.js`      |Document access, uploads, downloads, ownership, and storage-path protection                    |
|`error-responses.api.test.js`|Error responses, malformed requests, missing routes, and sensitive-data leakage                |
|`health.api.test.js`         |Health, liveness, readiness, and infrastructure information exposure                           |
|`jobs.api.test.js`           |Job listing, filtering, search, details, and privileged-field protection                       |
|`payments.api.test.js`       |Payment authorization, initiation validation, webhook signatures, and payment-state integrity  |
|`universities.api.test.js`   |University catalog, details, search, filters, and pagination                                   |
|`user.api.test.js`           |User profiles, profile updates, ownership, registration security, and sensitive-data protection|

All API tests must follow the actual route definitions, request schemas, authentication mechanism, and response contracts implemented by MedOrbits.

3.3 Integration tests

|File                                      |Responsibilities                                                    |
|——————————————|———————————————————————|
|`application.integration.test.js`         |Application workflow across connected components                    |
|`auth.integration.test.js`                |Authentication integration with application services and persistence|
|`controllers.integration.test.js`         |Controller interactions with services, repositories, and middleware |
|`database-constraints.integration.test.js`|Database constraints enforced through real database operations      |
|`notification.integration.test.js`        |Notification creation, dispatch adapters, and failure handling      |
|`payments.integration.test.js`            |Payment lifecycle integration                                       |
|`repositories.integration.test.js`        |Repository behavior against the configured persistence layer        |

Payment-specific integration tests are documented separately in Section 6.

3.4 Database tests

|File                  |Responsibilities                                                   |
|-———————|-——————————————————————|
|`connection.test.js`  |Connection establishment, failure handling, and cleanup            |
|`constraints.test.js` |Foreign keys, uniqueness, nullability, and other schema constraints|
|`indexes.test.js`     |Required index definitions and relevant query behavior             |
|`migrations.test.js`  |Migration execution, ordering, and schema state                    |
|`repositories.test.js`|Database repository operations                                     |
|`transactions.test.js`|Commit, rollback, and transaction isolation behavior               |
|`setup.js`            |Test database initialization and shared database helpers           |

Database tests must use the database driver and schema actually configured by the application.

3.5 Security tests

|File                                     |Responsibilities                                             |
|——————————————|-————————————————————|
|`authentication.security.test.js`        |Missing, invalid, expired, or malformed credentials          |
|`authorization.security.test.js`         |Role-based and resource-level access control                 |
|`idor.security.test.js`                  |Unauthorized access to another user’s resources              |
|`input-validation.security.test.js`      |Malformed, unexpected, and injection-like input              |
|`mass-assignment.security.test.js`       |Unauthorized modification of protected properties            |
|`payment-webhook.security.test.js`       |Webhook authenticity and payment-state protection            |
|`privilege-escalation.security.test.js`  |Attempts to obtain unauthorized roles or permissions         |
|`rate-limit.security.test.js`            |Enforcement of configured request limits                     |
|`sensitive-data.security.test.js`        |Prevention of sensitive information leakage                  |
|`unauthorized-downloads.security.test.js`|Document download authorization and path traversal protection|

Security tests must assert the expected authorization decision and, where applicable, verify that persistent state has not changed.

3.6 Accessibility tests

|File                              |Responsibilities                                                             |
|-———————————|——————————————————————————|
|`color-contrast.test.js`          |Text contrast and non-text interface contrast                                |
|`forms.accessibility.test.js`     |Accessible labels, instructions, errors, and validation feedback             |
|`homepage.accessibility.test.js`  |Homepage structure and primary interactions                                  |
|`keyboard-navigation.test.js`     |Keyboard access, focus order, focus visibility, and keyboard traps           |
|`navigation.accessibility.test.js`|Navigation landmarks, menus, links, and current-page state                   |
|`screen-reader.test.js`           |Semantic HTML, accessible names, ARIA relationships, and status announcements|

Target WCAG 2.2 Level AA. Automated checks are necessary but do not replace manual keyboard and assistive-technology testing.

3.7 End-to-end tests

|File                                |Responsibilities                                         |
|————————————|———————————————————|
|`admin-workflow.e2e.test.js`        |Administrative workflows and protected operations        |
|`application-submission.e2e.test.js`|Application form completion, submission, and confirmation|
|`authentication.e2e.test.js`        |Login and authentication journeys                        |
|`document-upload.e2e.test.js`       |File selection, upload, validation, and completion       |
|`payment-checkout.e2e.test.js`      |Checkout, payment initiation, and payment-result handling|

E2E tests must use the actual E2E runner configured by the repository. Do not assume that Jest is the E2E runner until package.json and the test configuration confirm it.

4. Fixture conventions

The fixtures/ directory contains reusable, deterministic test data.

|File              |Responsibilities                               |
|——————|————————————————|
|`applications.js` |Application payloads and records               |
|`candidates.js`   |Candidate profiles                             |
|`courses.js`      |Course records                                 |
|`documents.js`    |Document metadata and upload scenarios         |
|`employers.js`    |Employer and organization records              |
|`payments.js`     |Payment records and payment-state scenarios    |
|`subscriptions.js`|Subscription lifecycle scenarios               |
|`users.js`        |User profiles and role scenarios               |
|`README.md`       |Fixture usage, structure, and maintenance rules|

Fixture requirements

• Use synthetic data, not real customer records.
• Keep fixture data separate from database insertion and cleanup logic.
• Use stable identifiers for deterministic tests.
• Define explicit ownership relationships for authorization tests.
• Avoid embedding production credentials or reusable secrets.
• Ensure fixtures match the actual model and validation schemas.
• Clean up records created by mutation tests.

Removed fixture filenames

The supplied repository screenshots mark these filenames as deleted:

• applications.fixture.js
• courses.fixture.js
• payments.fixture.js
• users.fixture.js

The corresponding current filenames are:

• applications.js
• courses.js
• payments.js
• users.js

Update imports to use the current names. Do not maintain duplicate implementations solely to preserve the removed names.

Example:

const applications = require(‘../fixtures/applications’);
const courses = require(‘../fixtures/courses’);
const payments = require(‘../fixtures/payments’);
const users = require(‘../fixtures/users’);

Adjust the relative path according to the importing file’s location and the actual export format of each fixture.

5. Removed E2E filenames

The supplied screenshots mark these files as deleted:

• login.e2e.test.js
• payment.e2e.test.js
• registration.e2e.test.js

The current intended E2E inventory uses:

• authentication.e2e.test.js
• payment-checkout.e2e.test.js

Registration coverage should be maintained in the appropriate authentication journey or another explicitly documented test.

Before removing old files permanently, confirm that their unique scenarios have been migrated. Do not assume that renaming a file preserves all its previous coverage.

6. Payment integration tests

Directory: tests/integration/payments/

|File                                    |Responsibilities                                                          |
|-—————————————|—————————————————————————|
|`concurrent-refunds.integration.test.js`|Prevent duplicate or conflicting refund effects during concurrent requests|
|`duplicate-events.integration.test.js`  |Verify idempotent handling of repeated gateway events                     |
|`webhook.integration.test.js`           |Verify signed event processing and payment-state transitions              |
|`README.md`                             |Payment test setup, provider simulation, and execution instructions       |

Payment integration tests must verify:

• Valid signature verification.
• Rejection of invalid signatures.
• Correct handling of repeated events.
• Atomic or otherwise safe state transitions.
• Consistent payment amounts and currencies.
• Protection against duplicate refunds.
• Correct rollback or recovery behavior after failures.

Use provider test credentials or mocks. Never initiate live charges or refunds during automated tests.

7. Technology and dependencies

Use the project’s existing configuration.

Typical tooling may include:

• Node.js 20 or later.
• Jest for unit, API, and integration tests.
• Supertest for Express HTTP testing.
• The configured SQL database driver.
• Browser automation for E2E tests.
• axe-core or jest-axe for accessibility checks.

Before installing dependencies, inspect package.json and the lockfile.

Do not replace an existing test runner or database adapter without an explicit architecture change.

8. Test environment and database safety

Tests must run in an isolated environment.

Illustrative environment variables:

NODE_ENV=test
TEST_DATABASE_URL=mysql://test_user:test_password@127.0.0.1:3306/medorbits_test

Use the actual database driver and environment variable names required by the project. The example URL is not a claim that the repository currently uses this exact configuration.

Before database tests run:

1. Verify that the database is a dedicated test database.
2. Apply required migrations.
3. Load the required fixtures.
4. Verify that test-only credentials are configured.
5. Disable or mock live payment operations.
6. Ensure cleanup is safe and repeatable.

Never run destructive test setup against production data.

9. Authentication helpers

Tests requiring authentication must use valid credentials issued through the application’s real test authentication mechanism.

An authentication helper should create or locate a test user, assign the intended role through trusted test setup, and return a valid issued token.

Example return contract:

{
  token: ‘test-issued-access-token’,
  userId: ‘TEST-USER-001’,
}

This is an interface example, not a valid token.

Do not simulate administrator access by trusting client-supplied role fields. Any helper that throws an error until implemented must be completed before the associated suite can be considered runnable.

10. API response and HTTP status conventions

Test the response envelope actually implemented by MedOrbits.

Illustrative success response:

{
  “success”: true,
  “data”: []
}

Illustrative error response:

{
  “success”: false,
  “message”: “Request could not be processed.”
}

These examples are not mandatory contracts unless they match the application.

Use appropriate status codes according to the documented API contract:

|Status|Meaning                                                   |
|——|-———————————————————|
|`200` |Successful operation                                      |
|`201` |Resource created                                          |
|`204` |Successful operation with no response body                |
|`400` |Invalid request                                           |
|`401` |Missing or invalid authentication                         |
|`403` |Insufficient permission                                   |
|`404` |Resource or endpoint not found, or intentionally concealed|
|`405` |Unsupported HTTP method                                   |
|`409` |Conflict                                                  |
|`415` |Unsupported media type                                    |
|`422` |Validation failure                                        |
|`429` |Rate limit exceeded                                       |
|`500` |Unexpected server failure                                 |
|`503` |Service unavailable                                       |

Prefer exact status assertions when the endpoint contract is known. Avoid accepting unrelated status codes just to make a test pass.

11. Security requirements

The test suite should verify the following security properties.

Authentication and authorization

• Protected routes reject missing or invalid credentials.
• Roles and permissions are assigned by trusted server-side logic.
• Users cannot access other users’ private resources without permission.
• Administrative operations require the appropriate role.

Input handling

• Request bodies and query parameters are validated.
• Injection-like input cannot alter query structure.
• Unexpected fields cannot bypass validation.
• File paths and identifiers cannot be used to escape permitted storage.

Sensitive information

Responses must not expose unnecessary:

• Password hashes.
• Access or refresh tokens.
• Private keys.
• Database connection strings.
• Environment variables.
• Stack traces.
• Internal filesystem paths.
• Payment gateway secrets.

Payment integrity

• Payment status is determined through trusted server-side verification.
• Invalid webhooks cannot mark payments successful.
• Repeated events do not duplicate financial effects.
• Refunds and other financial operations are protected against concurrency errors.

12. Accessibility requirements

Target WCAG 2.2 Level AA.

Verify:

• Semantic HTML and accessible names.
• Sufficient text and interface contrast.
• Keyboard accessibility and visible focus.
• Logical focus order.
• Accessible labels and validation messages.
• Heading hierarchy and navigation landmarks.
• Meaningful image alternatives.
• Screen-reader-compatible status announcements.
• Responsive layouts and zoom behavior.

Automated accessibility tests do not establish full conformance. Manual keyboard and screen-reader testing is required for important user journeys.

13. Running tests

Use the project’s existing npm scripts where available.

Run all Jest-discovered tests

npx jest —runInBand

This command assumes the root Jest configuration discovers the relevant test files.

Run individual categories

npx jest tests/unit —runInBand
npx jest tests/integration —runInBand
npx jest tests/api —runInBand
npx jest tests/database —runInBand
npx jest tests/security —runInBand
npx jest tests/accessibility —runInBand

Run payment integration tests

npx jest tests/integration/payments —runInBand

Run E2E tests

If E2E tests use Jest:

npx jest tests/e2e —runInBand

If they use another runner, execute the configured E2E command instead.

Run coverage

npx jest —coverage —runInBand

14. Jest configuration

A typical Jest configuration for Node-based tests is:

‘use strict’;

module.exports = {
  testEnvironment: ‘node’,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testTimeout: 15000,
};

This is a reference configuration only. Preserve the actual root configuration and merge settings instead of replacing project-specific test discovery, setup files, coverage thresholds, or environment configuration.

15. Test isolation and cleanup

Each test should be deterministic and independently repeatable.

• Create records through test setup.
• Use stable fixture data where possible.
• Avoid dependencies on test execution order.
• Roll back or clean up database mutations.
• Mock external services when live connectivity is unnecessary.
• Prevent tests from reaching production services.
• Close database connections and browser resources.
• Use explicit timeouts for asynchronous operations.
• Run shared-state tests serially until isolation is reliable.

Tests should not silently skip essential authorization or persistence assertions.

16. CI integration

A suitable CI sequence is:

1. Install dependencies using the lockfile.
2. Validate required environment variables.
3. Run unit tests.
4. Start isolated test database services.
5. Apply migrations and load fixtures.
6. Run integration and database tests.
7. Run API and security tests.
8. Run accessibility tests.
9. Run E2E tests with the configured runner.
10. Publish test and coverage reports.
11. Fail the pipeline when required checks fail.

CI must use test-only credentials and must not print secrets to logs.

17. Troubleshooting

Module not found

Check dependency installation, file names, relative imports, and the configured module system.

Database connection failures

Verify the test database, connection URL, migrations, and required environment variables.

Authentication failures

Verify that the helper issues a real test token and that the seeded user’s role and ownership match the scenario.

Unexpected API status codes

Compare the assertion with the actual route, middleware, controller, and documented API contract.

E2E failures

Verify the E2E runner, application startup, browser installation, base URL, selectors, and asynchronous page behavior.

Inconsistent test results

Investigate shared mutable fixtures, parallel execution, missing cleanup, and external dependencies.

Deleted test files

Check imports, test discovery, npm scripts, and CI configuration. Confirm that required scenarios were migrated before treating the deletion as complete.

18. Definition of done

Before release, verify:

☐ The directory inventory matches the actual repository.
☐ Required test dependencies and runners are configured.
☐ Unit tests pass.
☐ Integration and database tests pass against isolated infrastructure.
☐ API response contracts are verified.
☐ Authentication and authorization tests pass.
☐ Payment webhook and idempotency tests pass.
☐ Security tests cover the intended threat model.
☐ Accessibility checks and manual reviews are completed.
☐ Critical E2E workflows pass.
☐ Fixtures are deterministic and cleanup is reliable.
☐ Removed files are not referenced by active configuration.
☐ CI uses test-only credentials and services.
☐ Required checks pass before deployment.

19. Maintenance policy

Update this document whenever:

• Test files are added, renamed, or removed.
• Fixture names or exports change.
• The test runner or dependencies change.
• API contracts or authentication mechanisms change.
• Database setup or migrations change.
• E2E workflows or accessibility tooling change.
• CI execution commands change.

The actual application implementation, route contracts, schema, test configuration, and test results remain the authoritative sources of truth.