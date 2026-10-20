/**

* MedOrbits -- Concurrent Refund Integration Tests
* File: tests/integration/payments/concurrent-refunds.integration.test.js
* Purpose:
* ●	Detect duplicate refunds caused by concurrent requests.
* ●	Verify idempotent refund processing.
* ●	Verify refund amounts cannot exceed the refundable balance.
* ●	Verify payment state remains consistent after concurrent requests.
* Requirements:
* ●	Node.js >= 20
* ●	A dedicated integration-test environment
* ●	A payment provider sandbox or deterministic mock
* ●	A test payment with a known refundable balance
* IMPORTANT:
* Adapt endpoint paths, payloads, and response assertions to the actual API.
* Never execute these tests against production payments.
    */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = (
process.env.PAYMENT_TEST_BASE_URL ||
process.env.TEST_BASE_URL ||
'http://127.0.0.1:3000'
).replace(/\/+$/, '');

const REFUND_PATH =
process.env.REFUND_TEST_PATH || '/api/payments/:paymentId/refunds';

const PAYMENT_PATH =
process.env.PAYMENT_TEST_PATH || '/api/payments/:paymentId';

const TEST_TOKEN = process.env.PAYMENT_TEST_TOKEN || '';

const PAYMENT_ID = process.env.TEST_PAYMENT_ID || '';
const ORIGINAL_AMOUNT_MINOR = Number(
process.env.TEST_PAYMENT_AMOUNT_MINOR || 10000
);

const REFUNDABLE_AMOUNT_MINOR = Number(
process.env.TEST_REFUNDABLE_AMOUNT_MINOR ||
ORIGINAL_AMOUNT_MINOR
);

const CURRENCY = process.env.TEST_PAYMENT_CURRENCY || 'INR';

const REQUEST_TIMEOUT_MS = Number(
process.env.PAYMENT_TEST_TIMEOUT_MS || 15000
);

const ENABLE_MUTATING_TESTS =
process.env.RUN_MUTATING_PAYMENT_TESTS === 'true';

const IDEMPOTENCY_HEADER =
process.env.REFUND_IDEMPOTENCY_HEADER || 'Idempotency-Key';

const MUTATING_TESTS_REQUIRE_EXPLICIT_ENABLE =
'Set RUN_MUTATING_PAYMENT_TESTS=true only for an isolated payment test environment.';

function assertConfiguration() {
assert.ok(
PAYMENT_ID,
'TEST_PAYMENT_ID must identify a dedicated test payment.'
);

assert.ok(
TEST_TOKEN,
'PAYMENT_TEST_TOKEN must contain a valid test-environment credential.'
);

assert.ok(
Number.isSafeInteger(ORIGINAL_AMOUNT_MINOR) &&
ORIGINAL_AMOUNT_MINOR > 0,
'TEST_PAYMENT_AMOUNT_MINOR must be a positive integer in minor currency units.'
);

assert.ok(
Number.isSafeInteger(REFUNDABLE_AMOUNT_MINOR) &&
REFUNDABLE_AMOUNT_MINOR >= 0 &&
REFUNDABLE_AMOUNT_MINOR <= ORIGINAL_AMOUNT_MINOR,
'TEST_REFUNDABLE_AMOUNT_MINOR must be between zero and the original payment amount.'
);

assert.ok(
Number.isFinite(REQUEST_TIMEOUT_MS) && REQUEST_TIMEOUT_MS > 0,
'PAYMENT_TEST_TIMEOUT_MS must be a positive number.'
);
}

function endpoint(pathTemplate, paymentId = PAYMENT_ID) {
return `${BASE_URL}${pathTemplate.replace( ':paymentId', encodeURIComponent(paymentId) )}`;
}

function authHeaders(extra = {}) {
return {
Authorization: `Bearer ${TEST_TOKEN}`,
Accept: 'application/json',
...extra,
};
}

async function request(path, options = {}) {
const controller = new AbortController();
const timeout = setTimeout(
() => controller.abort(),
REQUEST_TIMEOUT_MS
);

try {
const response = await fetch(`${BASE_URL}${path}`, {
...options,
headers: authHeaders(options.headers || {}),
signal: controller.signal,
redirect: 'manual',
});

const rawBody = await response.text();
let body = null;
if (rawBody) {
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = rawBody;
  }
}
return {
  status: response.status,
  headers: response.headers,
  body,
  rawBody,
};

} finally {
clearTimeout(timeout);
}
}

async function getPayment() {
return request(
PAYMENT_PATH.replace(
':paymentId',
encodeURIComponent(PAYMENT_ID)
),
{ method: 'GET' }
);
}

async function createRefund({
amountMinor,
idempotencyKey,
paymentId = PAYMENT_ID,
}) {
const path = REFUND_PATH.replace(
':paymentId',
encodeURIComponent(paymentId)
);

const headers = {
'Content-Type': 'application/json',
};

if (idempotencyKey) {
headers[IDEMPOTENCY_HEADER] = idempotencyKey;
}

return request(path, {
method: 'POST',
headers,
body: JSON.stringify({
amount: amountMinor,
currency: CURRENCY,
reason: 'Integration test refund',
}),
});
}

function isAcceptedRefundStatus(status) {
return [200, 201, 202].includes(status);
}

function refundId(response) {
const body = response.body;
if (!body || typeof body !== 'object') return null;

return (
body.refundId ||
body.refund?.id ||
body.data?.refundId ||
body.data?.id ||
null
);
}

function refundAmountMinor(response) {
const body = response.body;
if (!body || typeof body !== 'object') return null;

const amount =
body.amount ??
body.refund?.amount ??
body.data?.amount ??
body.data?.refund?.amount;

return Number.isSafeInteger(amount) ? amount : null;
}

function assertNoServerError(response, message) {
assert.ok(
response.status < 500,
`${message}: unexpected server error ${response.status}; body=${JSON.stringify(response.body)}`
);
}

function assertRefundRejected(response, message) {
assert.ok(
[400, 401, 403, 404, 409, 422, 429].includes(response.status),
`${message}: expected a client error or conflict response, got ${response.status}`
);
}

function newIdempotencyKey(prefix) {
return `${prefix}-${crypto.randomUUID()}`;
}

describe('Concurrent refund integration tests', () => {
before(() => {
assertConfiguration();
});

describe('test environment safety', () => {
it('requires explicit opt-in before sending mutating refund requests', () => {
assert.equal(
ENABLE_MUTATING_TESTS,
true,
MUTATING_TESTS_REQUIRE_EXPLICIT_ENABLE
);
});

it('can retrieve the payment used by the test fixture', async () => {
  const response = await getPayment();
  assert.ok(
    [200, 401, 403, 404].includes(response.status),
    `Unexpected payment lookup status: ${response.status}`
  );
  assert.notEqual(
    response.status,
    404,
    'The configured test payment was not found. Verify PAYMENT_TEST_PATH and TEST_PAYMENT_ID.'
  );
  assert.equal(
    response.status,
    200,
    'The test credential must be authorized to inspect the test payment.'
  );
});

});

describe('concurrent refund requests', () => {
it(
'does not process duplicate refunds when identical requests arrive concurrently',
{ skip: !ENABLE_MUTATING_TESTS },
async () => {
const key = newIdempotencyKey('concurrent-refund');
const amount = Math.min(100, REFUNDABLE_AMOUNT_MINOR);

    assert.ok(amount > 0, 'The test payment must have a refundable balance.');
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        createRefund({
          amountMinor: amount,
          idempotencyKey: key,
        })
      )
    );
    for (const response of responses) {
      assertNoServerError(
        response,
        'Concurrent refund request'
      );
    }
    const accepted = responses.filter((response) =>
      isAcceptedRefundStatus(response.status)
    );
    assert.ok(
      accepted.length >= 1,
      `At least one request should be accepted or queued. Statuses: ${responses
        .map((response) => response.status)
        .join(', ')}`
    );
    const ids = accepted.map(refundId).filter(Boolean);
    if (ids.length > 1) {
      assert.equal(
        new Set(ids).size,
        1,
        'Requests using the same idempotency key returned different refund IDs.'
      );
    }
    const amounts = accepted
      .map(refundAmountMinor)
      .filter((value) => value !== null);
    for (const returnedAmount of amounts) {
      assert.equal(
        returnedAmount,
        amount,
        'Accepted refund response contains an unexpected amount.'
      );
    }
  }
);
it(
  'does not allow concurrent unique refunds to exceed the refundable balance',
  { skip: !ENABLE_MUTATING_TESTS },
  async () => {
    assert.ok(
      REFUNDABLE_AMOUNT_MINOR >= 2,
      'Use a test payment with a refundable balance of at least two minor units.'
    );
    const amount = Math.floor(
      REFUNDABLE_AMOUNT_MINOR / 2
    ) + 1;
    const responses = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        createRefund({
          amountMinor: amount,
          idempotencyKey: newIdempotencyKey(
            `over-refund-${index}`
          ),
        })
      )
    );
    for (const response of responses) {
      assertNoServerError(
        response,
        'Concurrent unique refund request'
      );
    }
    const accepted = responses.filter((response) =>
      isAcceptedRefundStatus(response.status)
    );
    assert.ok(
      accepted.length < responses.length,
      'All oversized concurrent refunds were accepted; verify atomic balance checks and refund serialization.'
    );
    const totalAcceptedAmount = accepted.reduce(
      (total, response) => {
        const returnedAmount = refundAmountMinor(response);
        return total + (returnedAmount ?? amount);
      },
      0
    );
    assert.ok(
      totalAcceptedAmount <= REFUNDABLE_AMOUNT_MINOR,
      `Accepted refund amounts (${totalAcceptedAmount}) exceed the configured refundable balance (${REFUNDABLE_AMOUNT_MINOR}).`
    );
  }
);

});

describe('refund validation', () => {
it(
'rejects zero-value refunds',
{ skip: !ENABLE_MUTATING_TESTS },
async () => {
const response = await createRefund({
amountMinor: 0,
idempotencyKey: newIdempotencyKey('zero-refund'),
});

    assertRefundRejected(response, 'Zero-value refund');
  }
);
it(
  'rejects negative refund amounts',
  { skip: !ENABLE_MUTATING_TESTS },
  async () => {
    const response = await createRefund({
      amountMinor: -1,
      idempotencyKey: newIdempotencyKey('negative-refund'),
    });
    assertRefundRejected(response, 'Negative refund');
  }
);
it(
  'rejects amounts larger than the original payment',
  { skip: !ENABLE_MUTATING_TESTS },
  async () => {
    const response = await createRefund({
      amountMinor: ORIGINAL_AMOUNT_MINOR + 1,
      idempotencyKey: newIdempotencyKey('excess-refund'),
    });
    assertRefundRejected(response, 'Refund exceeding original payment');
  }
);
it(
  'rejects malformed refund amounts',
  { skip: !ENABLE_MUTATING_TESTS },
  async () => {
    const path = REFUND_PATH.replace(
      ':paymentId',
      encodeURIComponent(PAYMENT_ID)
    );
    const response = await request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [IDEMPOTENCY_HEADER]: newIdempotencyKey('invalid-refund'),
      },
      body: JSON.stringify({
        amount: 'not-a-number',
        currency: CURRENCY,
        reason: 'Invalid amount integration test',
      }),
    });
    assertRefundRejected(response, 'Malformed refund amount');
  }
);

});

describe('idempotency', () => {
it(
'returns a consistent result when the same refund is retried',
{ skip: !ENABLE_MUTATING_TESTS },
async () => {
const amount = Math.min(100, REFUNDABLE_AMOUNT_MINOR);
assert.ok(amount > 0, 'The test payment must have a refundable balance.');

    const key = newIdempotencyKey('refund-retry');
    const [first, second] = await Promise.all([
      createRefund({
        amountMinor: amount,
        idempotencyKey: key,
      }),
      createRefund({
        amountMinor: amount,
        idempotencyKey: key,
      }),
    ]);
    assertNoServerError(first, 'Initial refund request');
    assertNoServerError(second, 'Repeated refund request');
    assert.ok(
      isAcceptedRefundStatus(first.status),
      `Initial refund was not accepted: ${first.status}`
    );
    assert.ok(
      isAcceptedRefundStatus(second.status) ||
        second.status === 409,
      `Unexpected retry response: ${second.status}`
    );
    const firstId = refundId(first);
    const secondId = refundId(second);
    if (
      isAcceptedRefundStatus(second.status) &&
      firstId &&
      secondId
    ) {
      assert.equal(
        secondId,
        firstId,
        'An idempotent retry created or returned a different refund.'
      );
    }
  }
);

});

describe('payment-state consistency', () => {
it(
'does not expose an impossible payment amount or negative refundable balance after refunds',
{ skip: !ENABLE_MUTATING_TESTS },
async () => {
const response = await getPayment();

    assert.equal(
      response.status,
      200,
      'Unable to retrieve the payment after the refund operations.'
    );
    assert.ok(
      response.body && typeof response.body === 'object',
      'Payment endpoint must return a JSON object.'
    );
    const body = response.body;
    const payment = body.payment || body.data?.payment || body.data || body;
    const original =
      payment.originalAmount ??
      payment.originalAmountMinor ??
      payment.amount;
    const refunded =
      payment.refundedAmount ??
      payment.refundedAmountMinor ??
      payment.amountRefunded;
    const refundable =
      payment.refundableAmount ??
      payment.refundableAmountMinor ??
      payment.amountRemaining;
    if (Number.isSafeInteger(original)) {
      assert.ok(
        original >= 0,
        'Original payment amount must not be negative.'
      );
    }
    if (Number.isSafeInteger(refunded)) {
      assert.ok(
        refunded >= 0,
        'Total refunded amount must not be negative.'
      );
      if (Number.isSafeInteger(original)) {
        assert.ok(
          refunded <= original,
          'Total refunded amount exceeds the original payment amount.'
        );
      }
    }
    if (Number.isSafeInteger(refundable)) {
      assert.ok(
        refundable >= 0,
        'Refundable balance must not be negative.'
      );
      if (
        Number.isSafeInteger(original) &&
        Number.isSafeInteger(refunded)
      ) {
        assert.equal(
          original - refunded,
          refundable,
          'Original amount minus refunded amount does not match the refundable balance.'
        );
      }
    }
  }
);

});
});