MedOrbits Payment Integration Tests

1. Purpose

This directory contains integration tests for payment processing, refund concurrency, webhook authentication, and duplicate-event handling.

The tests are designed to detect payment-related regressions, including duplicate financial operations, invalid refund amounts, webhook signature failures, and inconsistent payment states.

Important: These tests are templates that must match the actual MedOrbits API, database schema, payment provider, and webhook verification implementation. A passing test suite does not by itself prove payment security.

2. Directory Structure

tests/
└── integration/
    └── payments/
        ├── README.md
        ├── concurrent-refunds.integration.test.js
        ├── duplicate-events.integration.test.js
        └── webhook.integration.test.js

Test responsibilities

Test file	Coverage
concurrent-refunds.integration.test.js	Concurrent refund requests, refundable-balance limits, idempotency, and payment-state consistency.
duplicate-events.integration.test.js	Duplicate webhook delivery, concurrent event delivery, event identifier reuse, and conflicting event payloads.
webhook.integration.test.js	Webhook endpoint behaviour, signature verification, payload validation, duplicate delivery, and payment-state integrity.

The files overlap intentionally: duplicate-events.integration.test.js focuses on event deduplication, while webhook.integration.test.js covers broader webhook validation and processing behaviour.

3. Prerequisites

* Node.js 20 or later.
* Project dependencies installed.
* A running MedOrbits API integration-test instance.
* A dedicated test database.
* A sandbox payment or deterministic payment fixture.
* Test credentials authorized to inspect the fixture payment.
* A sandbox webhook secret or provider-specific test-signature configuration.
* The correct endpoint paths and payload schema for the implementation.

Do not run mutating payment tests against production payments, live payment credentials, or production customer data.

4. Configuration

The test files support configuration through environment variables. Names and requirements vary by test file.

Variable	Purpose
PAYMENT_TEST_BASE_URL	Base URL of the test API.
TEST_BASE_URL	Fallback base URL in applicable files.
PAYMENT_TEST_TOKEN	Test credential for payment inspection and applicable authenticated requests.
TEST_PAYMENT_ID	Identifier of the dedicated sandbox payment.
PAYMENT_TEST_PATH	Payment lookup endpoint template.
PAYMENT_WEBHOOK_TEST_PATH	Webhook endpoint path.
PAYMENT_WEBHOOK_TEST_SECRET	Test HMAC secret where applicable.
PAYMENT_WEBHOOK_SIGNATURE_HEADER	Signature header name.
PAYMENT_WEBHOOK_SIGNATURE_FORMAT	Supported signature encoding in the supplied templates.
PAYMENT_WEBHOOK_AUTH_MODE	Webhook authentication mode configured in the test.
PAYMENT_EVENT_ID_HEADER	Optional event identifier header name.
PAYMENT_EVENT_ID_FIELD	Event identifier field in the payload.
TEST_PAYMENT_AMOUNT_MINOR	Fixture amount in the smallest currency unit.
TEST_PAYMENT_CURRENCY	Fixture currency, such as INR.
RUN_MUTATING_PAYMENT_TESTS	Explicit opt-in for tests that send mutating events or refunds.
PAYMENT_TEST_TIMEOUT_MS	Request timeout in milliseconds.

Use the exact variable names referenced by each test file. Do not assume every variable is required by every test.

5. Running the Tests

Run all payment integration tests from the repository root:

node —test tests/integration/payments/*.integration.test.js

Run an individual test file:

node —test tests/integration/payments/concurrent-refunds.integration.test.js
node —test tests/integration/payments/duplicate-events.integration.test.js
node —test tests/integration/payments/webhook.integration.test.js

Some tests require RUN_MUTATING_PAYMENT_TESTS=true. Tests that mutate payment state should only run after the test environment, fixtures, and provider sandbox have been verified.

6. Example Environment Setup

Use your own sandbox values and adapt endpoint paths to the actual implementation.

export PAYMENT_TEST_BASE_URL=“http://127.0.0.1:3000”
export PAYMENT_TEST_TOKEN=“your_test_token”
export PAYMENT_WEBHOOK_TEST_SECRET=“your_sandbox_webhook_secret”
export TEST_PAYMENT_ID=“your_sandbox_payment_id”
export TEST_PAYMENT_AMOUNT_MINOR=“10000”
export TEST_PAYMENT_CURRENCY=“INR”
export RUN_MUTATING_PAYMENT_TESTS=“true”
node —test tests/integration/payments/*.integration.test.js

Never commit populated environment files containing secrets. Use a local ignored environment file or your CI secret manager.

7. Security and Correctness Requirements

Webhook authentication

* Verify webhook signatures according to the provider’s official specification.
* Verify signatures against the exact raw request body when required by the provider.
* Reject invalid signatures and malformed payloads.
* Validate event types, payment identifiers, currency, and amount.
* Do not trust client-supplied payment status as proof of a successful transaction.

Duplicate event processing

* Store processed event identifiers persistently.
* Enforce deduplication atomically so concurrent requests cannot process the same event twice.
* Handle retries without repeating financial side effects.
* Detect conflicting payloads that reuse an existing event identifier.
* Return the documented acknowledgement or conflict response for duplicate deliveries.

Concurrent refunds

* Check refundable balances within an atomic transaction or equivalent concurrency-safe mechanism.
* Enforce the maximum refundable amount.
* Use provider idempotency keys where supported.
* Reconcile provider and local payment states.
* Prevent negative balances and duplicate refund records.

Data integrity

* Store money in integer minor units or an equivalent exact-decimal representation.
* Validate currency and amount consistency.
* Keep payment and refund records consistent after failures and retries.
* Avoid logging webhook secrets, access tokens, or unnecessary personal information.

8. Test Isolation and Repeatability

Payment integration tests can change financial state. Use a dedicated fixture and restore or recreate it as needed.

Recommended fixture strategy:

1. Create or select a dedicated sandbox payment.
2. Record its original amount, currency, and state.
3. Run tests with unique event identifiers and idempotency keys.
4. Verify payment and refund records after processing.
5. Recreate or reset the fixture before rerunning state-mutating tests.
6. Clean up temporary records where safe and supported.

Do not assume that a payment can be refunded repeatedly or that webhook events can be replayed against the same fixture without side effects.

9. Interpreting Failures

When a test fails, check:

* API availability and route registration.
* Endpoint paths and request payload structure.
* Authentication and authorization configuration.
* Provider-specific webhook signature format.
* Test payment state and remaining refundable balance.
* Event deduplication and database transaction handling.
* Whether the expected response codes match the API contract.

Do not weaken an assertion solely to obtain a passing result. Establish the intended behaviour first, then correct the implementation or test.

A test returning a successful HTTP status does not prove that duplicate processing was prevented. Verify persisted payment records and actual financial side effects.

10. Limitations

These integration tests do not replace:

* Payment-provider sandbox certification or reconciliation tests.
* Database transaction and concurrency reviews.
* Dependency and vulnerability scanning.
* Production configuration and secret-management reviews.
* Independent security testing.
* Tests for all provider-specific event types and failure modes.

The supplied templates assume particular endpoint patterns and, in places, HMAC-SHA256 webhook signatures. Adapt them when the implementation uses another provider, timestamped signatures, a different event schema, or different payment-state fields.

11. CI Recommendations

For continuous integration:

* Use isolated database fixtures and sandbox credentials.
* Keep secrets in CI secret storage.
* Run non-mutating validation tests on ordinary pull requests where practical.
* Run mutating payment tests against disposable fixtures.
* Preserve test logs without exposing secrets or personal information.
* Fail the pipeline when critical payment invariants are violated.
* Avoid parallel execution against the same mutable payment fixture.

12. Maintenance Checklist

When changing payment or webhook code:

* [ ]	Update endpoint and payload assumptions in affected tests.
* [ ]	Test valid and invalid webhook signatures.
* [ ]	Test repeated and concurrent event delivery.
* [ ]	Test conflicting event identifiers.
* [ ]	Test concurrent refunds and over-refund prevention.
* [ ]	Verify persisted records and payment-state consistency.
* [ ]	Run the complete payment integration suite.
* [ ]	Update this README when files or configuration variables change.

13. Reporting Payment Vulnerabilities

Report confirmed issues privately to the project maintainers. Include the affected endpoint, test environment, reproducible steps, expected behaviour, actual behaviour, and financial or security impact.

Do not include live credentials, real customer payment details, webhook secrets, or unnecessary personal information in reports.