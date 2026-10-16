/**

* MedOrbits -- Payments Integration Tests
* File: tests/integration/payments.integration.test.js
* Coverage:
* ●	Payment endpoint availability
* ●	Authentication and authorization
* ●	Payment creation and input validation
* ●	Payment retrieval and ownership
* ●	Payment amount and currency integrity
* ●	Refund amount validation
* Requirements:
* ●	Node.js >= 20
* ●	Running integration-test API
* ●	Dedicated payment-provider sandbox
* ●	Isolated test database
* IMPORTANT:
* Adapt endpoint paths, payloads, response fields, and payment-provider
* integration to the actual MedOrbits implementation.
* Never run mutating payment tests against production.
    */

‘use strict’;

const { describe, it, before } = require(‘node:test’);
const assert = require(‘node:assert/strict’);
const crypto = require(‘node:crypto’);

const BASE_URL = (
process.env.PAYMENT_TEST_BASE_URL ||
process.env.TEST_BASE_URL ||
‘http://127.0.0.1:3000’
).replace(//+$/, ‘’);

const PAYMENTS_PATH =
process.env.PAYMENTS_TEST_PATH || ‘/api/payments’;

const PAYMENT_PATH =
process.env.PAYMENT_TEST_PATH || ‘/api/payments/:id’;

const REFUNDS_PATH =
process.env.PAYMENT_REFUNDS_TEST_PATH ||
‘/api/payments/:id/refunds’;

const USER_A_TOKEN =
process.env.PAYMENT_TEST_USER_A_TOKEN ||
process.env.PAYMENT_TEST_TOKEN ||
‘’;

const USER_B_TOKEN =
process.env.PAYMENT_TEST_USER_B_TOKEN || ‘’;

const PAYMENT_ID =
process.env.TEST_PAYMENT_ID || ‘’;

const AMOUNT_MINOR = Number(
process.env.TEST_PAYMENT_AMOUNT_MINOR || 10000
);

const CURRENCY =
process.env.TEST_PAYMENT_CURRENCY || ‘INR’;

const TIMEOUT_MS = Number(
process.env.PAYMENT_TEST_TIMEOUT_MS || 15000
);

const RUN_MUTATING_TESTS =
process.env.RUN_MUTATING_PAYMENT_TESTS === ‘true’;

function validateConfiguration() {
assert.ok(
Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
‘PAYMENT_TEST_TIMEOUT_MS must be positive.’
);

assert.ok(
Number.isSafeInteger(AMOUNT_MINOR) && AMOUNT_MINOR > 0,
‘TEST_PAYMENT_AMOUNT_MINOR must be a positive integer in minor currency units.’
);

assert.match(
CURRENCY,
/^[A-Z]{3}$/,
‘TEST_PAYMENT_CURRENCY must be a three-letter uppercase currency code.’
);

for (const [name, path] of Object.entries({
PAYMENTS_PATH,
PAYMENT_PATH,
REFUNDS_PATH,
})) {
assert.ok(path.startsWith(’/’), ${name} must start with /.);
}

assert.ok(
PAYMENT_PATH.includes(’:id’),
‘PAYMENT_TEST_PATH must contain the :id placeholder.’
);

assert.ok(
REFUNDS_PATH.includes(’:id’),
‘PAYMENT_REFUNDS_TEST_PATH must contain the :id placeholder.’
);
}

function urlFor(path) {
return ${BASE_URL}${path};
}

function paymentUrl(id) {
return PAYMENT_PATH.replace(’:id’, encodeURIComponent(String(id)));
}

function refundsUrl(id) {
return REFUNDS_PATH.replace(’:id’, encodeURIComponent(String(id)));
}

async function request(path, {
method = ‘GET’,
token,
body,
headers = {},
} = {}) {
const controller = new AbortController();

const timer = setTimeout(
() => controller.abort(),
TIMEOUT_MS
);

const requestHeaders = {
Accept: ‘application/json’,
…headers,
};

if (token) {
requestHeaders.Authorization = Bearer ${token};
}

if (body !== undefined) {
requestHeaders[‘Content-Type’] = ‘application/json’;
}

try {
const response = await fetch(urlFor(path), {
method,
headers: requestHeaders,
body: body === undefined ? undefined : JSON.stringify(body),
signal: controller.signal,
redirect: ‘manual’,
});

const rawBody = await response.text();
let parsedBody = null;
if (rawBody) {
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = rawBody;
  }
}
return {
  status: response.status,
  headers: response.headers,
  body: parsedBody,
  rawBody,
};

} finally {
clearTimeout(timer);
}
}

function assertNoServerError(response, label) {
assert.ok(
response.status < 500,
${label}: unexpected HTTP ${response.status}; response=${JSON.stringify(response.body)}
);
}

function assertRejected(response, label) {
assert.ok(
[400, 401, 403, 404, 409, 413, 415, 422, 429].includes(
response.status
),
${label}: expected a client-error response, received HTTP ${response.status}.
);
}

function assertDenied(response, label) {
assert.ok(
[401, 403, 404].includes(response.status),
${label}: expected access denial, received HTTP ${response.status}.
);
}

function isSuccess(response) {
return [200, 201, 202].includes(response.status);
}

function extractPayment(response) {
const body = response.body;

if (!body || typeof body !== ‘object’) {
return null;
}

return body.payment || body.data?.payment || body.data || body;
}

function extractPaymentId(response) {
const payment = extractPayment(response);

if (!payment || typeof payment !== ‘object’) {
return null;
}

return payment.id ?? payment._id ?? payment.paymentId ?? null;
}

function requireMutationOptIn() {
assert.equal(
RUN_MUTATING_TESTS,
true,
‘Set RUN_MUTATING_PAYMENT_TESTS=true only in an isolated payment sandbox.’
);
}

function newIdempotencyKey() {
return medorbits-payment-test-${crypto.randomUUID()};
}

function paymentCreationPayload(overrides = {}) {
return {
amount: AMOUNT_MINOR,
currency: CURRENCY,
description: ‘MedOrbits payment integration test’,
…overrides,
};
}

describe(‘MedOrbits payment integration tests’, () => {
before(() => {
validateConfiguration();
});

describe(‘payment endpoint availability’, () => {
it(‘handles a payment collection request without an internal server error’, async () => {
const response = await request(PAYMENTS_PATH, {
token: USER_A_TOKEN || undefined,
});

  assertNoServerError(response, 'Payment collection');
  assert.ok(
    [200, 401, 403, 404, 405].includes(response.status),
    `Unexpected payment collection status: ${response.status}.`
  );
});

});

describe(‘authentication and authorization’, () => {
it(‘rejects payment creation without authentication’, async () => {
const response = await request(PAYMENTS_PATH, {
method: ‘POST’,
body: paymentCreationPayload(),
});

  assertNoServerError(response, 'Unauthenticated payment creation');
  assertRejected(response, 'Unauthenticated payment creation');
});
it('rejects an invalid bearer token when retrieving a payment', async () => {
  const id = PAYMENT_ID || 'invalid-test-payment-id';
  const response = await request(paymentUrl(id), {
    token: 'invalid.payment.integration.token',
  });
  assertNoServerError(response, 'Invalid-token payment retrieval');
  assertDenied(response, 'Invalid-token payment retrieval');
});
it(
  'prevents another user from retrieving a private payment',
  { skip: !RUN_MUTATING_TESTS },
  async (t) => {
    requireMutationOptIn();
    if (!USER_A_TOKEN || !USER_B_TOKEN) {
      t.skip('Configure distinct User A and User B test tokens.');
      return;
    }
    if (!PAYMENT_ID) {
      t.skip('Set TEST_PAYMENT_ID to a payment owned by User A.');
      return;
    }
    const response = await request(paymentUrl(PAYMENT_ID), {
      token: USER_B_TOKEN,
    });
    assertNoServerError(response, 'Cross-user payment retrieval');
    assertDenied(response, 'Cross-user payment retrieval');
  }
);

});

describe(‘payment creation and validation’, () => {
it(
‘creates a payment with a valid amount and currency’,
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutationOptIn();

    assert.ok(
      USER_A_TOKEN,
      'Set PAYMENT_TEST_USER_A_TOKEN or PAYMENT_TEST_TOKEN.'
    );
    const response = await request(PAYMENTS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      headers: {
        'Idempotency-Key': newIdempotencyKey(),
      },
      body: paymentCreationPayload(),
    });
    assertNoServerError(response, 'Valid payment creation');
    assert.ok(
      isSuccess(response),
      `Expected payment creation success, received HTTP ${response.status}.`
    );
    const payment = extractPayment(response);
    assert.ok(
      payment && typeof payment === 'object',
      'Payment creation response must contain a payment object.'
    );
    const id = extractPaymentId(response);
    assert.ok(
      id,
      'Payment creation response must contain a payment identifier.'
    );
    if (payment.currency !== undefined) {
      assert.equal(
        String(payment.currency).toUpperCase(),
        CURRENCY
      );
    }
    if (payment.amount !== undefined) {
      assert.equal(
        payment.amount,
        AMOUNT_MINOR,
        'Returned payment amount does not match the requested amount.'
      );
    }
  }
);
it(
  'rejects zero-value payments',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutationOptIn();
    assert.ok(USER_A_TOKEN, 'A test user token is required.');
    const response = await request(PAYMENTS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: paymentCreationPayload({ amount: 0 }),
    });
    assertNoServerError(response, 'Zero-value payment');
    assertRejected(response, 'Zero-value payment');
  }
);
it(
  'rejects negative payment amounts',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutationOptIn();
    assert.ok(USER_A_TOKEN, 'A test user token is required.');
    const response = await request(PAYMENTS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: paymentCreationPayload({ amount: -1 }),
    });
    assertNoServerError(response, 'Negative payment amount');
    assertRejected(response, 'Negative payment amount');
  }
);
it(
  'rejects malformed payment amounts',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutationOptIn();
    assert.ok(USER_A_TOKEN, 'A test user token is required.');
    const response = await request(PAYMENTS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: paymentCreationPayload({ amount: 'not-a-number' }),
    });
    assertNoServerError(response, 'Malformed payment amount');
    assertRejected(response, 'Malformed payment amount');
  }
);
it(
  'rejects unsupported currency codes',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutationOptIn();
    assert.ok(USER_A_TOKEN, 'A test user token is required.');
    const response = await request(PAYMENTS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: paymentCreationPayload({ currency: 'INVALID' }),
    });
    assertNoServerError(response, 'Unsupported currency');
    assertRejected(response, 'Unsupported currency');
  }
);
it(
  'does not allow client-supplied payment status to mark a payment as completed',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutationOptIn();
    assert.ok(USER_A_TOKEN, 'A test user token is required.');
    const response = await request(PAYMENTS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: paymentCreationPayload({
        status: 'completed',
        paid: true,
        verified: true,
      }),
    });
    assertNoServerError(response, 'Client-supplied payment status');
    if (isSuccess(response)) {
      const payment = extractPayment(response);
      assert.ok(payment && typeof payment === 'object');
      assert.notEqual(
        payment.status,
        'completed',
        'Client input must not independently mark a payment as completed.'
      );
      assert.notEqual(
        payment.paid,
        true,
        'Client input must not independently mark a payment as paid.'
      );
      assert.notEqual(
        payment.verified,
        true,
        'Client input must not independently verify a payment.'
      );
    } else {
      assertRejected(response, 'Client-supplied payment status');
    }
  }
);

});

describe(‘payment retrieval and integrity’, () => {
it(
‘retrieves the configured sandbox payment’,
{ skip: !PAYMENT_ID || !USER_A_TOKEN },
async () => {
const response = await request(paymentUrl(PAYMENT_ID), {
token: USER_A_TOKEN,
});

    assertNoServerError(response, 'Sandbox payment retrieval');
    assert.equal(
      response.status,
      200,
      `Unable to retrieve configured test payment: HTTP ${response.status}.`
    );
    const payment = extractPayment(response);
    assert.ok(
      payment && typeof payment === 'object',
      'Payment endpoint must return a payment object.'
    );
    const id = extractPaymentId(response);
    assert.equal(
      String(id),
      String(PAYMENT_ID),
      'Returned payment identifier does not match the requested payment.'
    );
    if (payment.amount !== undefined) {
      assert.ok(
        Number.isSafeInteger(payment.amount) &&
          payment.amount >= 0,
        'Payment amount must be a non-negative integer in minor currency units.'
      );
    }
    if (payment.currency !== undefined) {
      assert.match(
        String(payment.currency),
        /^[A-Z]{3}$/i,
        'Payment currency must be a valid three-letter code.'
      );
    }
  }
);
it(
  'does not expose internal secrets in a payment response',
  { skip: !PAYMENT_ID || !USER_A_TOKEN },
  async () => {
    const response = await request(paymentUrl(PAYMENT_ID), {
      token: USER_A_TOKEN,
    });
    assertNoServerError(response, 'Payment response disclosure');
    if (response.status !== 200) {
      assertDenied(response, 'Payment response disclosure');
      return;
    }
    const payment = extractPayment(response);
    assert.ok(payment && typeof payment === 'object');
    for (const field of [
      'password',
      'passwordHash',
      'clientSecretKey',
      'webhookSecret',
      'privateKey',
    ]) {
      assert.equal(
        Object.hasOwn(payment, field),
        false,
        `Payment response must not expose "${field}".`
      );
    }
  }
);

});

describe(‘refund validation’, () => {
it(
‘rejects a zero-value refund’,
{ skip: !RUN_MUTATING_TESTS || !PAYMENT_ID },
async () => {
requireMutationOptIn();

    assert.ok(USER_A_TOKEN, 'A test user token is required.');
    const response = await request(refundsUrl(PAYMENT_ID), {
      method: 'POST',
      token: USER_A_TOKEN,
      headers: {
        'Idempotency-Key': newIdempotencyKey(),
      },
      body: {
        amount: 0,
        currency: CURRENCY,
        reason: 'Zero-value refund validation test',
      },
    });
    assertNoServerError(response, 'Zero-value refund');
    assertRejected(response, 'Zero-value refund');
  }
);
it(
  'rejects a negative refund amount',
  { skip: !RUN_MUTATING_TESTS || !PAYMENT_ID },
  async () => {
    requireMutationOptIn();
    assert.ok(USER_A_TOKEN, 'A test user token is required.');
    const response = await request(refundsUrl(PAYMENT_ID), {
      method: 'POST',
      token: USER_A_TOKEN,
      headers: {
        'Idempotency-Key': newIdempotencyKey(),
      },
      body: {
        amount: -1,
        currency: CURRENCY,
        reason: 'Negative refund validation test',
      },
    });
    assertNoServerError(response, 'Negative refund');
    assertRejected(response, 'Negative refund');
  }
);

});
});