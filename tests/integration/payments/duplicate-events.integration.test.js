/**

* MedOrbits -- Duplicate Payment Events Integration Tests
* File: tests/integration/payments/duplicate-events.integration.test.js
* Coverage:
* ●	Duplicate webhook delivery
* ●	Concurrent delivery of the same event
* ●	Event idempotency
* ●	Conflicting payloads using the same event ID
* ●	Invalid or missing event identifiers
* ●	Payment-state consistency after duplicate delivery
* Node.js >= 20
* IMPORTANT:
* Configure the endpoint, authentication/signature mechanism, and event
* schema to match the actual application. Use only a payment-provider
* sandbox or a dedicated integration-test environment.
    */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = (
process.env.PAYMENT_TEST_BASE_URL ||
process.env.TEST_BASE_URL ||
'http://127.0.0.1:3000'
).replace(//+$/, '');

const WEBHOOK_PATH =
process.env.PAYMENT_WEBHOOK_TEST_PATH ||
'/api/payments/webhook';

const PAYMENT_PATH =
process.env.PAYMENT_TEST_PATH ||
'/api/payments/:paymentId';

const TEST_TOKEN = process.env.PAYMENT_TEST_TOKEN || '';
const PAYMENT_ID = process.env.TEST_PAYMENT_ID || '';

const EVENT_ID_HEADER =
process.env.PAYMENT_EVENT_ID_HEADER || 'x-event-id';

const EVENT_ID_FIELD =
process.env.PAYMENT_EVENT_ID_FIELD || 'id';

const EVENT_TYPE =
process.env.PAYMENT_TEST_EVENT_TYPE || 'payment.succeeded';

const EVENT_AMOUNT_MINOR = Number(
process.env.TEST_PAYMENT_AMOUNT_MINOR || 10000
);

const CURRENCY = process.env.TEST_PAYMENT_CURRENCY || 'INR';

const REQUEST_TIMEOUT_MS = Number(
process.env.PAYMENT_TEST_TIMEOUT_MS || 15000
);

const ENABLE_MUTATING_TESTS =
process.env.RUN_MUTATING_PAYMENT_TESTS === 'true';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_TEST_SECRET || '';

const SIGNATURE_HEADER =
process.env.PAYMENT_WEBHOOK_SIGNATURE_HEADER || 'x-webhook-signature';

const SIGNATURE_FORMAT =
process.env.PAYMENT_WEBHOOK_SIGNATURE_FORMAT || 'hex';

const WEBHOOK_AUTH_MODE =
process.env.PAYMENT_WEBHOOK_AUTH_MODE || 'hmac-sha256';

function assertConfiguration() {
assert.ok(
PAYMENT_ID,
'TEST_PAYMENT_ID must identify a dedicated sandbox payment.'
);

assert.ok(
Number.isSafeInteger(EVENT_AMOUNT_MINOR) && EVENT_AMOUNT_MINOR > 0,
'TEST_PAYMENT_AMOUNT_MINOR must be a positive integer.'
);

assert.ok(
Number.isFinite(REQUEST_TIMEOUT_MS) && REQUEST_TIMEOUT_MS > 0,
'PAYMENT_TEST_TIMEOUT_MS must be a positive number.'
);

assert.ok(
WEBHOOK_PATH.startsWith('/'),
'PAYMENT_WEBHOOK_TEST_PATH must be an absolute path.'
);

if (WEBHOOK_AUTH_MODE === 'hmac-sha256') {
assert.ok(
WEBHOOK_SECRET,
'PAYMENT_WEBHOOK_TEST_SECRET is required for HMAC-signed webhook tests.'
);
}

assert.ok(
['hex', 'sha256=', 'base64'].includes(SIGNATURE_FORMAT),
'PAYMENT_WEBHOOK_SIGNATURE_FORMAT must be hex, sha256=, or base64.'
);
}

function makeEvent({
id,
paymentId = PAYMENT_ID,
amount = EVENT_AMOUNT_MINOR,
type = EVENT_TYPE,
currency = CURRENCY,
} = {}) {
return {
[EVENT_ID_FIELD]: id || evt_${crypto.randomUUID()},
type,
created: Math.floor(Date.now() / 1000),
data: {
object: {
id: paymentId,
amount,
currency,
status: 'succeeded',
},
},
};
}

function signatureFor(rawBody) {
const digest = crypto
.createHmac('sha256', WEBHOOK_SECRET)
.update(rawBody)
.digest(SIGNATURE_FORMAT === 'base64' ? 'base64' : 'hex');

return SIGNATURE_FORMAT === 'sha256='
? sha256=${digest}
: digest;
}

async function postWebhook(event, options = {}) {
const rawBody =
typeof options.rawBody === 'string'
? options.rawBody
: JSON.stringify(event);

const headers = {
'Content-Type': 'application/json',
[EVENT_ID_HEADER]: String(
options.headerEventId ?? event?.[EVENT_ID_FIELD] ?? ''
),
};

if (WEBHOOK_AUTH_MODE === 'bearer') {
assert.ok(
TEST_TOKEN,
'PAYMENT_TEST_TOKEN is required for bearer-authenticated webhook tests.'
);
headers.Authorization = Bearer ${TEST_TOKEN};
} else if (WEBHOOK_AUTH_MODE === 'hmac-sha256') {
headers[SIGNATURE_HEADER] = signatureFor(rawBody);
}

if (options.signature !== undefined) {
headers[SIGNATURE_HEADER] = options.signature;
}

if (options.omitEventIdHeader) {
delete headers[EVENT_ID_HEADER];
}

if (options.extraHeaders) {
Object.assign(headers, options.extraHeaders);
}

const controller = new AbortController();
const timeout = setTimeout(
() => controller.abort(),
REQUEST_TIMEOUT_MS
);

try {
const response = await fetch(${BASE_URL}${WEBHOOK_PATH}, {
method: 'POST',
headers,
body: rawBody,
signal: controller.signal,
redirect: 'manual',
});

const responseText = await response.text();
let body = null;
if (responseText) {
  try {
    body = JSON.parse(responseText);
  } catch {
    body = responseText;
  }
}
return {
  status: response.status,
  headers: response.headers,
  body,
  rawBody: responseText,
};

} finally {
clearTimeout(timeout);
}
}

async function getPayment() {
assert.ok(TEST_TOKEN, 'PAYMENT_TEST_TOKEN is required to inspect payment state.');

const path = PAYMENT_PATH.replace(
':paymentId',
encodeURIComponent(PAYMENT_ID)
);

const controller = new AbortController();
const timeout = setTimeout(
() => controller.abort(),
REQUEST_TIMEOUT_MS
);

try {
const response = await fetch(${BASE_URL}${path}, {
method: 'GET',
headers: {
Authorization: Bearer ${TEST_TOKEN},
Accept: 'application/json',
},
signal: controller.signal,
redirect: 'manual',
});

const responseText = await response.text();
let body = null;
if (responseText) {
  try {
    body = JSON.parse(responseText);
  } catch {
    body = responseText;
  }
}
return {
  status: response.status,
  body,
  rawBody: responseText,
};

} finally {
clearTimeout(timeout);
}
}

function isSuccessfulWebhook(response) {
return [200, 201, 202, 204].includes(response.status);
}

function assertNoServerError(response, label) {
assert.ok(
response.status < 500,
${label} returned HTTP ${response.status}: ${JSON.stringify(response.body)}
);
}

function extractPayment(response) {
const body = response.body;
if (!body || typeof body !== 'object') return null;

return body.payment || body.data?.payment || body.data || body;
}

function extractEventId(response) {
const body = response.body;
if (!body || typeof body !== 'object') return null;

return (
body.eventId ||
body.id ||
body.data?.eventId ||
body.event?.id ||
null
);
}

function newEventId(prefix = 'evt_test') {
return ${prefix}_${crypto.randomUUID()};
}

describe('Duplicate payment event integration tests', () => {
before(() => {
assertConfiguration();
});

describe('configuration and baseline', () => {
it('requires explicit opt-in for tests that deliver mutating events', () => {
assert.equal(
ENABLE_MUTATING_TESTS,
true,
'Set RUN_MUTATING_PAYMENT_TESTS=true only in an isolated sandbox environment.'
);
});

it('can retrieve the configured test payment', async () => {
  const response = await getPayment();
  assert.equal(
    response.status,
    200,
    `Payment lookup failed with HTTP ${response.status}. Verify PAYMENT_TEST_PATH, TEST_PAYMENT_ID, and PAYMENT_TEST_TOKEN.`
  );
  assert.ok(
    extractPayment(response),
    'Payment endpoint did not return a recognizable payment object.'
  );
});

});

describe('duplicate event delivery', () => {
it(
'does not apply the same payment event twice',
{ skip: !ENABLE_MUTATING_TESTS },
async () => {
const eventId = newEventId('evt_duplicate');
const event = makeEvent({ id: eventId });

    const first = await postWebhook(event);
    assertNoServerError(first, 'First webhook delivery');
    assert.ok(
      isSuccessfulWebhook(first),
      `First webhook delivery was not accepted: HTTP ${first.status}`
    );
    const second = await postWebhook(event);
    assertNoServerError(second, 'Duplicate webhook delivery');
    assert.ok(
      isSuccessfulWebhook(second) || second.status === 409,
      `Duplicate event was neither acknowledged nor explicitly rejected: HTTP ${second.status}`
    );
    const firstResponseEventId = extractEventId(first);
    const secondResponseEventId = extractEventId(second);
    if (firstResponseEventId && secondResponseEventId) {
      assert.equal(
        secondResponseEventId,
        firstResponseEventId,
        'Duplicate deliveries returned different event identities.'
      );
    }
  }
);
it(
  'handles simultaneous deliveries of the same event idempotently',
  { skip: !ENABLE_MUTATING_TESTS },
  async () => {
    const event = makeEvent({
      id: newEventId('evt_concurrent'),
    });
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => postWebhook(event))
    );
    for (const response of responses) {
      assertNoServerError(response, 'Concurrent webhook delivery');
      assert.ok(
        isSuccessfulWebhook(response) || response.status === 409,
        `Unexpected concurrent-delivery response: HTTP ${response.status}`
      );
    }
    const accepted = responses.filter(isSuccessfulWebhook);
    assert.ok(
      accepted.length >= 1,
      'At least one delivery should be acknowledged.'
    );
    const responseEventIds = accepted
      .map(extractEventId)
      .filter(Boolean);
    if (responseEventIds.length > 1) {
      assert.equal(
        new Set(responseEventIds).size,
        1,
        'Concurrent deliveries produced inconsistent event identities.'
      );
    }
  }
);

});

describe('event identity and payload integrity', () => {
it(
'rejects a missing event identifier',
{ skip: !ENABLE_MUTATING_TESTS },
async () => {
const event = makeEvent({ id: '' });
delete event[EVENT_ID_FIELD];

    const response = await postWebhook(event, {
      omitEventIdHeader: true,
    });
    assertNoServerError(response, 'Missing event identifier');
    assert.ok(
      [400, 401, 403, 422].includes(response.status),
      `Expected missing event ID to be rejected, got HTTP ${response.status}`
    );
  }
);
it(
  'does not process a different payload as a new event when its event ID has already been used',
  { skip: !ENABLE_MUTATING_TESTS },
  async () => {
    const eventId = newEventId('evt_conflict');
    const original = makeEvent({
      id: eventId,
      amount: EVENT_AMOUNT_MINOR,
    });
    const conflicting = makeEvent({
      id: eventId,
      amount: EVENT_AMOUNT_MINOR + 1,
    });
    const first = await postWebhook(original);
    assertNoServerError(first, 'Original event delivery');
    assert.ok(
      isSuccessfulWebhook(first),
      `Original event was not accepted: HTTP ${first.status}`
    );
    const second = await postWebhook(conflicting);
    assertNoServerError(second, 'Conflicting duplicate event');
    assert.ok(
      [400, 409, 422].includes(second.status),
      `Expected conflicting payload with reused event ID to be rejected, got HTTP ${second.status}. If the API acknowledges duplicates with 2xx, verify persisted payload hashes and event processing state independently.`
    );
  }
);

});

describe('webhook authenticity', () => {
it(
'rejects an invalid webhook signature',
{ skip: !ENABLE_MUTATING_TESTS || WEBHOOK_AUTH_MODE !== 'hmac-sha256' },
async () => {
const event = makeEvent({
id: newEventId('evt_bad_signature'),
});

    const response = await postWebhook(event, {
      signature: 'invalid-signature',
    });
    assertNoServerError(response, 'Invalid webhook signature');
    assert.ok(
      [400, 401, 403, 422].includes(response.status),
      `Expected invalid signature rejection, got HTTP ${response.status}`
    );
  }
);

});

describe('payment state consistency', () => {
it(
'keeps payment data structurally valid after duplicate event delivery',
{ skip: !ENABLE_MUTATING_TESTS },
async () => {
const response = await getPayment();

    assert.equal(
      response.status,
      200,
      `Payment lookup failed after event delivery: HTTP ${response.status}`
    );
    const payment = extractPayment(response);
    assert.ok(
      payment && typeof payment === 'object',
      'Payment response is not an object.'
    );
    for (const field of [
      'amount',
      'originalAmount',
      'originalAmountMinor',
      'refundedAmount',
      'refundedAmountMinor',
    ]) {
      if (payment[field] !== undefined) {
        assert.ok(
          Number.isSafeInteger(payment[field]) && payment[field] >= 0,
          `Payment field "${field}" must be a non-negative integer in minor currency units.`
        );
      }
    }
    const original =
      payment.originalAmountMinor ??
      payment.originalAmount ??
      payment.amount;
    const refunded =
      payment.refundedAmountMinor ??
      payment.refundedAmount ??
      payment.amountRefunded;
    if (
      Number.isSafeInteger(original) &&
      Number.isSafeInteger(refunded)
    ) {
      assert.ok(
        refunded <= original,
        'Refunded amount exceeds the original payment amount.'
      );
    }
  }
);

});
});