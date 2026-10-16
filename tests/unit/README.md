
# MedOrbits — Unit Tests

## 1. Purpose

This directory contains unit tests for MedOrbits policies, services, middleware, utilities, and validators.

Unit tests verify individual components in isolation using controlled inputs, fixtures, and mocks. They should run quickly and must not depend on production services or production data.

## 2. Directory Structure

```text
tests/unit/
├── policies/
│   ├── admission.policy.test.js
│   ├── application.policy.test.js
│   ├── auth.policy.test.js
│   ├── candidate.policy.test.js
│   ├── college.policy.test.js
│   ├── counselling.policy.test.js
│   ├── course.policy.test.js
│   ├── document.policy.test.js
│   ├── employer.policy.test.js
│   ├── internship.policy.test.js
│   ├── job.policy.test.js
│   ├── payment.policy.test.js
│   ├── policy-utils.test.js
│   ├── subscription.policy.test.js
│   ├── university.policy.test.js
│   └── user.policy.test.js
│
├── services/
│   ├── application.service.test.js
│   ├── audit.service.test.js
│   ├── auth.service.test.js
│   ├── document.service.test.js
│   ├── payment.service.test.js
│   └── subscription.service.test.js
│
├── middleware.test.js
├── services.test.js
├── utils.test.js
├── validators.test.js
└── README.md
```

Only include test files for implemented modules. Add `recruitment.policy.test.js` when the corresponding policy is present.

## 3. Test Categories

### Policy Tests

Verify:
- Owner and non-owner access.
- Administrator and permission-based access.
- Counsellor, employer, and recruiter restrictions.
- Unauthenticated access denial.
- Protected-field modification attempts.
- Invalid status transitions.
- Access to private records and candidate data.

### Service Tests

Verify:
- Input validation and business rules.
- Repository success and failure behavior.
- Invalid state transitions.
- Audit-event creation and failure handling.
- Secret redaction and response sanitization.
- Payment and subscription lifecycle behavior.

### Middleware Tests

Verify:
- Authentication requirements.
- Authorization enforcement.
- Request validation.
- Rate limiting.
- Standardized error handling.

### Utility and Validator Tests

Verify:
- ID and pagination normalization.
- Object and string validation.
- Invalid, missing, or oversized input.
- Consistent error codes and response behavior.

## 4. Test Framework

Use Node.js’s built-in test runner (`node:test`) and assertions (`node:assert/strict`) unless the project already standardizes on another test framework.

Example:

```javascript
‘use strict’;

const test = require(‘node:test’);
const assert = require(‘node:assert/strict’);

test(‘returns the expected result’, () => {
  assert.equal(2 + 2, 4);
});
```

## 5. Running Tests

From the project root, run:

```bash
# Run the unit test suite
node —test tests/unit/**/*.test.js

# Run a specific policy test
node —test tests/unit/policies/application.policy.test.js

# Run a specific service test
node —test tests/unit/services/payment.service.test.js
```

Shell glob expansion varies by environment. If the recursive pattern does not work, use the project’s configured test script or Node.js test discovery.

If `package.json` defines an appropriate test script, prefer:

```bash
npm test
```

## 6. Mocking and Fixtures

- Mock repositories, payment providers, email providers, and external APIs.
- Use deterministic fixtures for users, applications, documents, and payments.
- Do not connect unit tests to production databases or payment accounts.
- Restore mocks and clean up temporary state after each test.

## 7. Security Requirements

- Test both allowed and denied authorization cases.
- Never trust roles, permissions, ownership IDs, or payment status supplied by clients.
- Verify that secrets and sensitive personal information are not returned.
- Test that repository failures do not produce false success responses.
- Do not treat a policy unit test as proof that an HTTP endpoint enforces the policy.

## 8. Naming Conventions

- Policy: `<name>.policy.test.js`
- Service: `<name>.service.test.js`
- Middleware: `<name>.middleware.test.js`
- Utilities: `<name>.test.js`

Use descriptive test names beginning with `allows`, `denies`, `rejects`, `returns`, or `throws`.

## 9. Completion Criteria

A unit test is complete when it:

1. Tests a real, implemented module.
2. Covers expected behavior and relevant failure cases.
3. Includes authorization-denial cases where applicable.
4. Runs deterministically and independently.
5. Passes in the project’s configured test environment.

## 10. Related Test Suites

Other test responsibilities belong in:

- `tests/integration/` — database, controllers, repositories, and external integrations.
- `tests/security/` — privilege escalation, IDOR, mass assignment, and sensitive-data exposure.
- `tests/api/` — HTTP endpoint contracts.
- `tests/e2e/` — complete user workflows.
- `tests/accessibility/` — keyboard, screen-reader, and accessibility checks.
