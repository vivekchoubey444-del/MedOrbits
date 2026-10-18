/**

* MedOrbits -- Payment Webhook Integration Tests
* File: tests/integration/payments/webhook.integration.test.js
* Requirements:
* ●	Node.js >= 20
* ●	Dedicated integration-test environment
* ●	Sandbox payment provider or deterministic webhook fixture
* IMPORTANT:
* This test file assumes an HMAC-SHA256 signature over the exact raw
* request body. Adapt signature generation, payload schema, and expected
* responses to match the real payment provider and MedOrbits API.
* Never run mutating webhook tests against production.
    */

'use strict';

const { describe, it, before } = require('node:test');
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

const PAYMENT_ID = process.env.TEST_PAYMENT_ID || '';
const TEST_TOKEN = process.env.PAYMENT_TEST_TOKEN || '';
const WEBHOOK_SECRET =
process.env.PAYMENT_WEBHOOK_TEST_SECRET || '';

const SIGNATURE_HEADER =
process.env.PAYMENT_WEBHOOK_SIGNATURE_HEADER ||
'x-webhook-signature';

const SIGNATURE_FORMAT =
process.env.PAYMENT_WEBHOOK_SIGNATURE_FORMAT || 'hex';

const WEBHOOK_AUTH_MODE =
process.env.PAYMENT_WEBHOOK_AUTH_MODE || 'hmac-sha256';

const EVENT_ID_HEADER =
process.env.PAYMENT_EVENT_ID_HEADER || 'x-event-id';

const EVENT_ID_FIELD =
process.env.PAYMENT_EVENT_ID_FIELD || 'id';

const EVENT_TYPE =
process.env.PAYMENT_TEST_EVENT_TYPE || 'payment.succeeded';

const AMOUNT_MINOR = Number(
process.env.TEST_PAYMENT_AMOUNT_MINOR || 10000
);

const CURRENCY =
process.env.TEST_PAYMENT_CURRENCY || 'INR';

const TIMEOUT_MS = Number(
process.env.PAYMENT_TEST_TIMEOUT_MS || 15000
);

const RUN_MUTATING_TESTS =
process.env.RUN_MUTATING_PAYMENT_TESTS === 'true';

function validateConfiguration() {
assert.ok(
WEBHOOK_PATH.startsWith('/'),
'PAYMENT_WEBHOOK_TEST_PATH must start with /.'
);

assert.ok(
Number.isSafeInteger(AMOUNT_MINOR) && AMOUNT_MINOR > 0,
'TEST_PAYMENT_AMOUNT_MINOR must be a positive integer in minor currency units.'
);

assert.ok(
Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
'PAYMENT_TEST_TIMEOUT_MS must be a positive number.'
);

assert.ok(
['hex', 'sha256=', 'base64'].includes(SIGNATURE_FORMAT),
'PAYMENT_WEBHOOK_SIGNATURE_FORMAT must be hex, sha256=, or base64.'
);

if (WEBHOOK_AUTH_MODE === 'hmac-sha256') {
assert.ok(
WEBHOOK_SECRET,
'PAYMENT_WEBHOOK_TEST_SECRET is required for HMAC webhook tests.'
);
}

if (WEBHOOK_AUTH_MODE === 'bearer') {
assert.ok(
TEST_TOKEN,
'PAYMENT_TEST_TOKEN is required for bearer-authenticated webhook tests.'
);
}
}

function createEvent({
id = evt_${crypto.randomUUID()},
paymentId = PAYMENT_ID || 'pay_test_fixture',
amount = AMOUNT_MINOR,
type = EVENT_TYPE,
currency = CURRENCY,
} = {}) {
return {
[EVENT_ID_FIELD]: id,
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

function createSignature(rawBody) {
const digest = crypto
.createHmac('sha256', WEBHOOK_SECRET)
.update(rawBody)
.digest(SIGNATURE_FORMAT === 'base64' ? 'base64' : 'hex');

return SIGNATURE_FORMAT === 'sha256='
? sha256=${digest}
: digest;
}

async function sendWebhook({
event,
rawBody,
signature,
omitSignature = false,
omitEventIdHeader = false,
headerEventId,
contentType = 'application/json',
extraHeaders = {},
} = {}) {
const body =
rawBody !== undefined
? rawBody
: JSON.stringify(event);

const headers = {
'Content-Type': contentType,
Accept: 'application/json',
...extraHeaders,
};

if (!omitEventIdHeader) {
const id = headerEventId ?? event?.[EVENT_ID_FIELD];

if (id !== undefined && id !== null && String(id).length > 0) {
  headers[EVENT_ID_HEADER] = String(id);
}

}

if (WEBHOOK_AUTH_MODE === 'hmac-sha256' && !omitSignature) {
headers[SIGNATURE_HEADER] =
signature ?? createSignature(body);
} else if (WEBHOOK_AUTH_MODE === 'bearer') {
headers.Authorization = Bearer ${TEST_TOKEN};
}

const controller = new AbortController();
const timer = setTimeout(
() => controller.abort(),
TIMEOUT_MS
);

try {
const response = await fetch(
${BASE_URL}${WEBHOOK_PATH},
{
method: 'POST',
headers,
body,
signal: controller.signal,
redirect: 'manual',
}
);

const text = await response.text();
let parsed = null;
if (text) {
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
}
return {
  status: response.status,
  headers: response.headers,
  body: parsed,
  rawBody: text,
};

} finally {
clearTimeout(timer);
}
}

async function getPayment() {
assert.ok(
PAYMENT_ID,
'TEST_PAYMENT_ID is required to inspect payment state.'
);

assert.ok(
TEST_TOKEN,
'PAYMENT_TEST_TOKEN is required to inspect payment state.'
);

const path = PAYMENT_PATH.replace(
':paymentId',
encodeURIComponent(PAYMENT_ID)
);

const controller = new AbortController();
const timer = setTimeout(
() => controller.abort(),
TIMEOUT_MS
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

const text = await response.text();
let body = null;
if (text) {
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
}
return {
  status: response.status,
  body,
  rawBody: text,
};

} finally {
clearTimeout(timer);
}
}

function assertNoServerError(response, label) {
assert.ok(
response.status < 500,
${label} returned HTTP ${response.status}: ${JSON.stringify(response.body)}
);
}

function assertRejected(response, label) {
assert.ok(
[400, 401, 403, 404, 409, 415, 422].includes(response.status),
${label}: expected a client-error response, received HTTP ${response.status}.
);
}

function isAcknowledged(response) {
return [200, 201, 202, 204].includes(response.status);
}

function extractPayment(response) {
const body = response.body;
if (!body || typeof body !== 'object') return null;

return body.payment || body.data?.payment || body.data || body;
}

function eventId() {
return evt_test_${crypto.randomUUID()};
}

describe('Payment webhook integration', () => {
before(() => {
validateConfiguration();
});

describe('webhook endpoint', () => {
it('does not redirect webhook requests to another URL', async () => {
const event = createEvent();

  const response = await sendWebhook({ event });
  assert.ok(
    response.status < 500,
    `Webhook endpoint returned HTTP ${response.status}.`
  );
  assert.ok(
    response.status < 300 || response.status >= 400,
    `Webhook endpoint unexpectedly redirected with HTTP ${response.status}.`
  );
});
it(
  'accepts a correctly signed event',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    assert.ok(
      PAYMENT_ID,
      'Set TEST_PAYMENT_ID to a dedicated sandbox payment.'
    );
    const event = createEvent({
      id: eventId(),
      paymentId: PAYMENT_ID,
    });
    const response = await sendWebhook({ event });
    assertNoServerError(response, 'Valid signed event');
    assert.ok(
      isAcknowledged(response),
      `Expected valid event acknowledgement, got HTTP ${response.status}.`
    );
  }
);

});

describe('signature verification', () => {
it(
'rejects a missing signature',
{
skip:
!RUN_MUTATING_TESTS ||
WEBHOOK_AUTH_MODE !== 'hmac-sha256',
},
async () => {
const event = createEvent({ id: eventId() });

    const response = await sendWebhook({
      event,
      omitSignature: true,
    });
    assertNoServerError(response, 'Missing signature');
    assertRejected(response, 'Missing signature');
  }
);
it(
  'rejects an invalid signature',
  {
    skip:
      !RUN_MUTATING_TESTS ||
      WEBHOOK_AUTH_MODE !== 'hmac-sha256',
  },
  async () => {
    const event = createEvent({ id: eventId() });
    const response = await sendWebhook({
      event,
      signature: 'invalid-signature',
    });
    assertNoServerError(response, 'Invalid signature');
    assertRejected(response, 'Invalid signature');
  }
);
it(
  'rejects a payload modified after its signature was generated',
  {
    skip:
      !RUN_MUTATING_TESTS ||
      WEBHOOK_AUTH_MODE !== 'hmac-sha256',
  },
  async () => {
    const event = createEvent({ id: eventId() });
    const originalBody = JSON.stringify(event);
    const signature = createSignature(originalBody);
    const modifiedEvent = {
      ...event,
      data: {
        object: {
          ...event.data.object,
          amount: AMOUNT_MINOR + 500,
        },
      },
    };
    const response = await sendWebhook({
      event: modifiedEvent,
      signature,
    });
    assertNoServerError(response, 'Modified signed payload');
    assertRejected(response, 'Modified signed payload');
  }
);

});

describe('payload validation', () => {
it(
'rejects malformed JSON',
{ skip: !RUN_MUTATING_TESTS },
async () => {
const rawBody = '{"id":';

    const response = await sendWebhook({
      event: undefined,
      rawBody,
      signature:
        WEBHOOK_AUTH_MODE === 'hmac-sha256'
          ? createSignature(rawBody)
          : undefined,
    });
    assertNoServerError(response, 'Malformed JSON');
    assertRejected(response, 'Malformed JSON');
  }
);
it(
  'rejects an event without an event identifier',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    const event = createEvent();
    delete event[EVENT_ID_FIELD];
    const response = await sendWebhook({
      event,
      omitEventIdHeader: true,
    });
    assertNoServerError(response, 'Missing event identifier');
    assertRejected(response, 'Missing event identifier');
  }
);
it(
  'rejects an invalid payment amount',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    const event = createEvent({
      id: eventId(),
      amount: -1,
    });
    const response = await sendWebhook({ event });
    assertNoServerError(response, 'Negative payment amount');
    assertRejected(response, 'Negative payment amount');
  }
);
it(
  'rejects an unsupported content type',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    const event = createEvent({ id: eventId() });
    const response = await sendWebhook({
      event,
      contentType: 'text/plain',
    });
    assertNoServerError(response, 'Unsupported content type');
    assertRejected(response, 'Unsupported content type');
  }
);

});

describe('idempotency and duplicate delivery', () => {
it(
'acknowledges repeated delivery without repeating payment effects',
{ skip: !RUN_MUTATING_TESTS },
async () => {
assert.ok(
PAYMENT_ID,
'Set TEST_PAYMENT_ID to a dedicated sandbox payment.'
);

    const event = createEvent({
      id: eventId(),
      paymentId: PAYMENT_ID,
    });
    const before = await getPayment();
    assert.equal(
      before.status,
      200,
      'Unable to retrieve payment before webhook delivery.'
    );
    const first = await sendWebhook({ event });
    assertNoServerError(first, 'First event delivery');
    assert.ok(
      isAcknowledged(first),
      `First event was not acknowledged: HTTP ${first.status}.`
    );
    const second = await sendWebhook({ event });
    assertNoServerError(second, 'Duplicate event delivery');
    assert.ok(
      isAcknowledged(second) || second.status === 409,
      `Unexpected duplicate delivery response: HTTP ${second.status}.`
    );
    const after = await getPayment();
    assert.equal(
      after.status,
      200,
      'Unable to retrieve payment after duplicate delivery.'
    );
    const beforePayment = extractPayment(before);
    const afterPayment = extractPayment(after);
    assert.ok(beforePayment && afterPayment);
    for (const field of [
      'refundedAmount',
      'refundedAmountMinor',
      'amountRefunded',
      'refundCount',
    ]) {
      if (
        beforePayment[field] !== undefined &&
        afterPayment[field] !== undefined
      ) {
        assert.equal(
          afterPayment[field],
          beforePayment[field],
          `Duplicate event unexpectedly changed "${field}".`
        );
      }
    }
  }
);
it(
  'handles simultaneous delivery of the same event',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    const event = createEvent({
      id: eventId(),
      paymentId: PAYMENT_ID,
    });
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        sendWebhook({ event })
      )
    );
    for (const response of responses) {
      assertNoServerError(
        response,
        'Concurrent webhook delivery'
      );
      assert.ok(
        isAcknowledged(response) || response.status === 409,
        `Unexpected concurrent delivery response: HTTP ${response.status}.`
      );
    }
    assert.ok(
      responses.some(isAcknowledged),
      'No concurrent delivery was acknowledged.'
    );
  }
);

});

describe('payment-state integrity', () => {
it(
'keeps payment amounts valid after event processing',
{ skip: !RUN_MUTATING_TESTS },
async () => {
const response = await getPayment();

    assert.equal(
      response.status,
      200,
      'Payment lookup failed after webhook processing.'
    );
    const payment = extractPayment(response);
    assert.ok(
      payment && typeof payment === 'object',
      'Expected a payment object in the response.'
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
          Number.isSafeInteger(payment[field]) &&
            payment[field] >= 0,
          `Payment field "${field}" must be a non-negative integer.`
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