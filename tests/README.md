# MedOrbits Test Suite

**Directory:** `tests/`

## Test Categories

- `unit/` — Small, isolated tests for utilities, validators, services, and middleware.
- `integration/` — Tests across connected application modules and controlled dependencies.
- `api/` — HTTP endpoint contract and behavior tests.
- `database/` — Database connectivity, migration, repository, and transaction tests.
- `security/` — Authentication, authorization, validation, rate limiting, and webhook security tests.
- `e2e/` — End-to-end user workflows.
- `accessibility/` — Accessibility checks for key pages, forms, and navigation.
- `fixtures/` — Deterministic test data.

## Running Tests

Use the test commands defined in `package.json`. This directory does not assume a specific test framework; test files must be implemented using the framework configured by the project.

## Rules

- Use isolated test databases and sandbox payment credentials.
- Never run destructive tests against production.
- Keep fixtures synthetic and free of real personal data.
- Make tests deterministic and clean up created records.
- Mock external services in unit tests; use controlled test or sandbox services for integration tests.
- Do not log secrets or sensitive payloads.
- Require tests for critical bug fixes and new behavior.
