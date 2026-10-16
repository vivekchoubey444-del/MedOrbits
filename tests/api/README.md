# MedOrbits API Tests
## 1. Purpose
The `tests/api/` directory contains automated tests for the MedOrbits HTTP API.
These tests verify:
- API endpoint availability and response contracts.
- Authentication and authorization requirements.
- Request validation and error handling.
- User ownership and Insecure Direct Object Reference (IDOR) protection.
- Payment initiation and webhook signature verification.
- University, college, course, job, and document catalog behavior.
- Sensitive-data protection and mass-assignment prevention.
- Safe handling of malformed requests and unsupported HTTP methods.
The tests use Jest as the test runner and Supertest to send HTTP requests to the Express application.
## 2. Directory structure
```text
tests/
└── api/
    ├── README.md
    ├── applications.api.test.js
    ├── auth.api.test.js
    ├── colleges.api.test.js
    ├── courses.api.test.js
    ├── documents.api.test.js
    ├── error-responses.api.test.js
    ├── health.api.test.js
    ├── jobs.api.test.js
    ├── payments.api.test.js
    ├── universities.api.test.js
    └── user.api.test.js

This inventory reflects the API test files identified for this suite. Keep the directory listing synchronized with the actual repository.

3. Test file responsibilities

Test file	Responsibility
applications.api.test.js	Application listing, retrieval, submission, ownership, validation, and authorization
auth.api.test.js	Registration, login, authentication errors, and credential handling
colleges.api.test.js	College catalog, search, filtering, pagination, and college details
courses.api.test.js	Course catalog, course details, query validation, and read-only access
documents.api.test.js	Document access, upload validation, downloads, ownership, and storage-path protection
error-responses.api.test.js	Error response consistency, malformed requests, missing routes, and information leakage
health.api.test.js	Application health, liveness, readiness, and infrastructure information exposure
jobs.api.test.js	Job listing, search, filtering, job details, and privileged-field protection
payments.api.test.js	Payment authorization, initiation validation, webhook signatures, and payment-state integrity
universities.api.test.js	University catalog, university details, search, filters, and pagination
user.api.test.js	User profiles, ownership, profile updates, registration security, and sensitive-data protection

Tests must reflect the implemented route definitions and documented API contracts. A test file’s presence does not imply that its corresponding endpoint has been implemented.

4. Technology requirements

Recommended development dependencies:

* Node.js 20 or later.
* Jest.
* Supertest.
* The application’s Express instance.
* A dedicated test database for integration-dependent tests.

Install the required packages if they are not already present:

npm install —save-dev jest supertest

The application should expose its Express instance from:

src/app.js

Typical test imports:

‘use strict’;
const request = require(‘supertest’);
const app = require(‘../../src/app’);

Tests should import the app without unintentionally starting a production server or binding a network port.

5. Running API tests

Run the complete API test suite:

npx jest tests/api —runInBand

Run one test file:

npx jest tests/api/courses.api.test.js —runInBand

Run the payment tests:

npx jest tests/api/payments.api.test.js —runInBand

Run the document tests:

npx jest tests/api/documents.api.test.js —runInBand

Run tests in watch mode during development:

npx jest tests/api —watch

Run with coverage:

npx jest tests/api —coverage —runInBand

If package.json already defines equivalent scripts, prefer the repository’s established commands.

6. Jest configuration

The project should have one consistent Jest configuration.

Example configuration:

‘use strict’;
module.exports = {
  testEnvironment: ‘node’,
  testMatch: [
    ‘<rootDir>/tests/api/**/*.api.test.js’,
  ],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testTimeout: 15000,
};

If the repository already has a root Jest configuration that includes unit, integration, security, accessibility, or end-to-end tests, do not replace it with this API-only example. Merge the relevant settings instead.

7. Test environment and database safety

Tests that create, update, or delete records must use a dedicated test environment.

Recommended environment variables:

NODE_ENV=test
TEST_DATABASE_URL=mysql://test_user:test_password@127.0.0.1:3306/medorbits_test

Use the database driver and connection configuration actually implemented by the project.

Before running database-dependent tests, verify that:

* The test database exists.
* The connection points to the test database, not production.
* Required migrations have been applied.
* Required seed data has been loaded.
* Test records can be safely created and cleaned up.
* Gateway integrations use test credentials or mocks.

Never run destructive test setup against a production database.

Do not commit real passwords, access tokens, API keys, webhook secrets, or payment gateway credentials.

8. Authentication helpers

Some API tests require authenticated users with specific roles.

A shared authentication helper should issue valid test credentials through the application’s real authentication mechanism.

Example contract:

async function authenticateAs(role, userId) {
  // Create or locate a test user.
  // Assign the intended role through trusted test setup.
  // Authenticate through the application’s real mechanism.
  // Return the issued token and user ID.
}

Expected helper return shape:

{
  token: ‘test-issued-access-token’,
  userId: ‘TEST-USER-001’
}

This is an interface example, not a valid token or a complete implementation.

Tests must not bypass authentication by trusting a client-supplied role, user ID, or administrator flag.

9. Seed data and fixtures

Tests should use deterministic records created specifically for testing.

Example fixture categories:

* Test users with different roles.
* Applications owned by specific test users.
* Pending and completed payment records.
* Documents with known owners and access permissions.
* Universities, colleges, courses, and jobs.
* Valid and invalid request payloads.

Use unique test identifiers where appropriate.

Environment variables used by payment and ownership tests may include:

TEST_OWNED_PAYMENT_ID=
TEST_PENDING_PAYMENT_ID=
TEST_OTHER_USER_ID=
TEST_FOREIGN_APPLICATION_ID=

Populate these values only with IDs from the dedicated test database.

If a test requires a fixture, seed it during test setup or provide a documented fixture-loading step. Avoid relying on manually created records that may disappear or change.

10. Standard API response contracts

Use the response envelope documented by the actual application.

A common success response is:

{
  “success”: true,
  “data”: []
}

A common error response is:

{
  “success”: false,
  “message”: “Request could not be processed.”
}

These are illustrative examples. Do not require this exact envelope unless it matches the application’s response middleware and controllers.

Where applicable, test:

* HTTP status code.
* JSON content type.
* Required response properties.
* Data type and shape.
* Validation error details.
* Absence of sensitive fields.
* Consistency between success and error responses.

11. HTTP status expectations

Use the status codes defined by each endpoint’s contract.

Status	Typical meaning
200 OK	Successful retrieval or update
201 Created	Resource successfully created
204 No Content	Successful operation with no response body
400 Bad Request	Malformed or invalid request
401 Unauthorized	Authentication is missing or invalid
403 Forbidden	The caller is authenticated but lacks permission
404 Not Found	Resource or endpoint does not exist or is intentionally concealed
405 Method Not Allowed	HTTP method is unsupported
409 Conflict	Resource conflicts with existing state
415 Unsupported Media Type	Unsupported request content type
422 Unprocessable Content	Request content fails validation
429 Too Many Requests	Rate limit exceeded
500 Internal Server Error	Unexpected server failure
503 Service Unavailable	Required service is unavailable

Avoid accepting many unrelated status codes merely to make tests pass. Use exact assertions after confirming the endpoint’s intended behavior.

12. Security testing requirements

Authentication

Protected endpoints must reject missing or invalid credentials.

Authorization and IDOR

Users must not access or modify resources belonging to other users unless an explicit policy permits it.

Mass assignment

Client input must not grant privileged properties such as:

* Administrator roles.
* Ownership of another user’s resources.
* Payment completion status.
* Verification or approval status.
* Unrestricted permissions.

Payment integrity

Payment state must be established through trusted server-side gateway verification, not through client-supplied status fields.

Webhook requests must follow the configured provider’s signature-verification requirements.

Document access

Document downloads must verify authorization for the requested resource. User-controlled filenames and paths must not allow traversal outside the permitted storage location.

Sensitive-data protection

Responses must not expose:

* Password hashes.
* Authentication secrets.
* Private keys.
* Database connection strings.
* Internal stack traces.
* Unnecessary filesystem paths.
* Raw gateway secrets or credentials.

Input validation

Test malformed JSON, invalid identifiers, unsupported content types, invalid pagination, unexpected fields, and injection-like input.

A response that avoids a 500 status does not, by itself, prove that the input was handled correctly. Validate the expected status and resulting application behavior.

13. Health endpoint testing

The health tests should reflect the actual routes implemented by the application.

Typical endpoints include:

GET /health
GET /health/live
GET /health/ready

A liveness check generally verifies that the process can respond. A readiness check may additionally verify required dependencies and return 503 if the service cannot safely handle traffic.

Do not expose connection strings, environment variables, credentials, or detailed infrastructure errors through health responses.

14. Payment webhook testing

Webhook tests must use the payment provider’s actual signing algorithm and the raw request bytes when required by that provider.

The test suite should verify:

* Missing signatures are rejected.
* Invalid signatures are rejected.
* Valid test signatures are accepted.
* Invalid events cannot change payment state.
* Repeated events do not create duplicate payment effects.
* Event processing is idempotent.
* Payment amounts and currencies are checked against trusted server-side records.

Do not treat a hard-coded invalid signature as sufficient coverage of successful webhook verification.

15. Test isolation and cleanup

Each test should be independently repeatable.

Recommended practices:

1. Create test records with unique identifiers.
2. Avoid dependencies on test execution order.
3. Reset or roll back database state when appropriate.
4. Clean up records created by mutation tests.
5. Mock external services when live connectivity is unnecessary.
6. Prevent tests from contacting production payment gateways.
7. Use explicit timeouts for network-dependent operations.
8. Ensure parallel execution cannot corrupt shared fixtures.

When tests share database records, run them serially until isolation is reliable.

16. Test quality standards

API tests should:

* Assert expected outcomes rather than merely asserting that a request did not crash.
* Use exact status codes for established contracts.
* Verify both positive and negative authorization cases.
* Check state before and after security-sensitive operations.
* Avoid swallowing exceptions.
* Avoid unconditional success assertions.
* Avoid using production data.
* Keep test credentials outside version control.
* Include cleanup for records created by tests.
* Clearly identify required setup and seed data.

A placeholder helper that throws an error is an implementation requirement, not a passing test. Complete such helpers before treating the suite as executable.

17. Troubleshooting

Cannot find module supertest

Install the development dependency:

npm install —save-dev supertest

Cannot find module ../../src/app

Verify the actual application entry point and adjust the test import accordingly.

Unexpected 404 responses

Check route registration, API prefixes, router mounting, and whether the endpoint is implemented.

Unexpected 401 or 403 responses

Verify the test token, user role, ownership fixture, and authentication middleware.

Database connection failures

Verify NODE_ENV=test, test database credentials, database availability, migrations, and fixture setup.

Payment tests fail before making requests

Implement the authentication and payment-status helpers and seed the required test records.

Tests pass with overly broad status assertions

Replace broad status alternatives with the endpoint’s documented contract and add assertions about response contents and persisted state.

18. Completion checklist

Before considering the API suite ready:

* [ ]	All listed files exist in the repository.
* [ ]	Every required route matches the actual router.
* [ ]	Authentication helpers use real test-issued credentials.
* [ ]	Test database configuration is isolated from production.
* [ ]	Required fixture records are seeded automatically.
* [ ]	Payment webhook verification uses the provider’s signing rules.
* [ ]	Mutation tests clean up their data.
* [ ]	Security assertions verify actual authorization behavior.
* [ ]	Error responses do not leak sensitive implementation details.
* [ ]	Tests pass individually and as a complete suite.
* [ ]	CI runs the tests using test-only credentials and infrastructure.

⸻

Maintenance rule: Update this README whenever API test files, route contracts, authentication helpers, fixtures, or test execution commands change. The actual router, controller, validation schema, and documented response contract remain the source of truth.