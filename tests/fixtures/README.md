Test Fixtures

Fixtures provide deterministic synthetic data for tests across the MedOrbits application.

Rules

* Use fictional users, institutions, applications, courses, and payment references.
* Never include real passwords, access tokens, bank details, identity documents, or private applicant data.
* Keep fixtures small, explicit, and easy to override.
* Avoid dependencies on production identifiers, live databases, or external services.
* Document required relationships, setup requirements, and reset procedures.
* Use sandbox-only identifiers and credentials for payment tests.
* Keep fixture fields aligned with the actual production model and validation rules.
* Use deterministic timestamps and values where tests depend on ordering or time.
* Never use fixture defaults as a substitute for production authorization or input validation.

Directory Structure

Recommended fixture files:

* user.fixture.js — synthetic user records and role variations.
* application.fixture.js — applications and ownership relationships.
* course.fixture.js — course records and publication states.
* payment.fixture.js — synthetic payment records and sandbox references.

Add additional fixture files only when a test suite needs them.

Relationships

When fixtures represent related records, use consistent synthetic identifiers.

For example, an application should reference the intended test user, and a payment should reference the intended test owner. Tests involving ownership must use separate users to verify access boundaries.

Do not assume that creating a fixture also creates its related database records. Integration tests must establish required relationships using the project’s actual test database setup.

Isolation and Reset

* Use a dedicated test database or isolated test schema for integration tests.
* Never point test cleanup scripts at production databases.
* Reset modified records and mock state between tests.
* Clean up database records created during a test, including related records where required.
* Reset in-memory rate-limit stores, queues, and mocks between relevant tests.
* Use provider sandbox environments for payment integration tests.

Usage

Import fixtures directly into tests:

const { makeUser } = require(‘./user.fixture’);
const { makeApplication } = require(‘./application.fixture’);
const { makeCourse } = require(‘./course.fixture’);
const { makePayment } = require(‘./payment.fixture’);
const user = makeUser({ id: ‘test-user-002’ });
const application = makeApplication({
  id: ‘test-application-002’,
  userId: user.id,
});
const course = makeCourse({
  id: ‘test-course-002’,
  published: true,
});
const payment = makePayment({
  id: ‘test-payment-002’,
  userId: user.id,
});
module.exports = {
  user,
  application,
  course,
  payment,
};

Use this combined example only when a test needs all four records. Individual tests should import only the fixtures they require.

Completion Criteria

A fixture is ready for use when its data is deterministic, contains no real sensitive information, matches the intended test schema, and documents any necessary relationships or cleanup. Fixtures provide test data; production behavior must be verified through separate unit, integration, API, and security tests.