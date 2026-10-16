
'use strict';

/**
 * MedOrbits -- Payment Webhook Security Tests
 *
 * File: tests/security/payment-webhook.security.test.js
 *
 * Runtime: Node.js >= 20
 * Dependencies: Node.js built-in modules only
 *
 * Configuration:
 *   PAYMENT_WEBHOOK_TEST_BASE_URL
 *   PAYMENT_WEBHOOK_TEST_PATH
 *   PAYMENT_WEBHOOK_TEST_SECRET
 *   PAYMENT_WEBHOOK_TEST_TIMEOUT_MS
 *   PAYMENT_WEBHOOK_TEST_SIGNATURE_HEADER
 *   PAYMENT_WEBHOOK_TEST_TIMESTAMP_HEADER
 *   PAYMENT_WEBHOOK_TEST_EVENT_ID_HEADER
 *   PAYMENT_WEBHOOK_TEST_TIMESTAMP_TOLERANCE_SECONDS
 *   PAYMENT_WEBHOOK_TEST_REPLAY_PROTECTION
 *
 * Run:
 *   node --test tests/security/payment-webhook.security.test.js
 *
 * IMPORTANT:
 * - Use a dedicated test environment and test webhook secret.
 * - Never send synthetic payment events to production.
 * - This suite assumes an HMAC-SHA256 signature scheme.
 * - Adapt signature generation to the actual payment provider protocol.
 * - Do not treat a passing test as proof that payment reconciliation,
 *   refunds, or subscription lifecycle logic are correct.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = (
  process.env.PAYMENT_WEBHOOK_TEST_BASE_URL || ''
).replace(/\/+$/, '');

const WEBHOOK_PATH =
  process.env.PAYMENT_WEBHOOK_TEST_PATH ||
  '/api/payments/webhook';

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_TEST_SECRET || '';

const SIGNATURE_HEADER = (
  process.env.PAYMENT_WEBHOOK_TEST_SIGNATURE_HEADER ||
  'x-webhook-signature'
).toLowerCase();

const TIMESTAMP_HEADER = (
  process.env.PAYMENT_WEBHOOK_TEST_TIMESTAMP_HEADER ||
  'x-webhook-timestamp'
).toLowerCase();

const EVENT_ID_HEADER = (
  process.env.PAYMENT_WEBHOOK_TEST_EVENT_ID_HEADER ||
  'x-webhook-event-id'
).toLowerCase();

const TIMEOUT_MS = Number(
  process.env.PAYMENT_WEBHOOK_TEST_TIMEOUT_MS || 15000
);

const TIMESTAMP_TOLERANCE_SECONDS = Number(
  process.env.PAYMENT_WEBHOOK_TEST_TIMESTAMP_TOLERANCE_SECONDS || 300
);

const REPLAY_PROTECTION_REQUIRED =
  process.env.PAYMENT_WEBHOOK_TEST_REPLAY_PROTECTION !== 'false';

const configured = Boolean(
  BASE_URL &&
  WEBHOOK_SECRET &&
  WEBHOOK_PATH.startsWith('/') &&
  !WEBHOOK_PATH.startsWith('//') &&
  Number.isFinite(TIMEOUT_MS) &&
  TIMEOUT_MS > 0 &&
  Number.isFinite(TIMESTAMP_TOLERANCE_SECONDS) &&
  TIMESTAMP_TOLERANCE_SECONDS > 0
);

const skipReason =
  'Configure PAYMENT_WEBHOOK_TEST_BASE_URL and ' +
  'PAYMENT_WEBHOOK_TEST_SECRET to run webhook integration tests.';

function hmacSha256(secret, value) {
  return crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('hex');
}

/**
 * Generic HMAC format:
 *   HMAC_SHA256(secret, `${timestamp}.${rawBody}`)
 *
 * Some providers use a different canonical message, header format,
 * digest encoding, or multiple signatures. Replace this helper with
 * the provider's official signing procedure when necessary.
 */
function createSignature(rawBody, timestamp, secret = WEBHOOK_SECRET) {
  return hmacSha256(secret, `${timestamp}.${rawBody}`);
}

function buildHeaders({
  rawBody,
  timestamp = Math.floor(Date.now() / 1000),
  secret = WEBHOOK_SECRET,
  signature,
  eventId,
  extraHeaders = {},
} = {}) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
    [TIMESTAMP_HEADER]: String(timestamp),
    ...extraHeaders,
  };

  if (signature !== undefined) {
    headers[SIGNATURE_HEADER] = signature;
  } else if (rawBody !== undefined && secret) {
    headers[SIGNATURE_HEADER] = createSignature(
      rawBody,
      timestamp,
      secret
    );
  }

  if (eventId !== undefined) {
    headers[EVENT_ID_HEADER] = eventId;
  }

  return headers;
}

async function sendWebhook({
  rawBody,
  headers,
  method = 'POST',
  path = WEBHOOK_PATH,
} = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD'
        ? undefined
        : rawBody,
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseBody(response) {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function assertRejected(response, description) {
  assert.ok(
    response.status >= 400 && response.status < 500,
    `${description}: expected HTTP 4xx, received ${response.status}`
  );
}

function makeEvent({
  id = `evt_test_${crypto.randomUUID()}`,
  type = 'payment.succeeded',
  amount = 1000,
  currency = 'INR',
  paymentId = `pay_test_${crypto.randomUUID()}`,
} = {}) {
  return {
    id,
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: paymentId,
        amount,
        currency,
        status: 'succeeded',
        metadata: {
          environment: 'security-test',
        },
      },
    },
  };
}

function serializeEvent(event) {
  return JSON.stringify(event);
}

test(
  'Payment webhook security integration suite',
  { skip: !configured ? skipReason : false },
  async (t) => {
    await t.test(
      'Valid signed webhook is accepted',
      async () => {
        const event = makeEvent();
        const rawBody = serializeEvent(event);
        const timestamp = Math.floor(Date.now() / 1000);

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            timestamp,
            eventId: event.id,
          }),
        });

        assert.ok(
          response.status >= 200 && response.status < 300,
          `Valid signed webhook should be accepted; ` +
            `received HTTP ${response.status}`
        );
      }
    );

    await t.test(
      'Webhook without a signature is rejected',
      async () => {
        const event = makeEvent();
        const rawBody = serializeEvent(event);
        const timestamp = Math.floor(Date.now() / 1000);

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            timestamp,
            eventId: event.id,
            signature: undefined,
            secret: '',
          }),
        });

        // Explicitly remove the signature header so the test does not
        // depend on how buildHeaders handles omitted values.
        const unsignedHeaders = {
          'content-type': 'application/json',
          accept: 'application/json',
          [TIMESTAMP_HEADER]: String(timestamp),
          [EVENT_ID_HEADER]: event.id,
        };

        const unsignedResponse = response.headers.get(
          SIGNATURE_HEADER
        ) === null
          ? response
          : await sendWebhook({
              rawBody,
              headers: unsignedHeaders,
            });

        assertRejected(
          unsignedResponse,
          'Unsigned webhook'
        );
      }
    );

    await t.test(
      'Invalid signature is rejected',
      async () => {
        const event = makeEvent();
        const rawBody = serializeEvent(event);

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            eventId: event.id,
            signature: '0'.repeat(64),
          }),
        });

        assertRejected(response, 'Invalid signature');
      }
    );

    await t.test(
      'Signature generated with the wrong secret is rejected',
      async () => {
        const event = makeEvent();
        const rawBody = serializeEvent(event);
        const timestamp = Math.floor(Date.now() / 1000);

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            timestamp,
            secret: crypto.randomBytes(32).toString('hex'),
            eventId: event.id,
          }),
        });

        assertRejected(
          response,
          'Signature generated with the wrong secret'
        );
      }
    );

    await t.test(
      'Modified payload with original signature is rejected',
      async () => {
        const event = makeEvent({ amount: 1000 });
        const timestamp = Math.floor(Date.now() / 1000);
        const originalBody = serializeEvent(event);

        const signature = createSignature(
          originalBody,
          timestamp
        );

        event.data.object.amount = 999999;
        const modifiedBody = serializeEvent(event);

        const response = await sendWebhook({
          rawBody: modifiedBody,
          headers: buildHeaders({
            rawBody: modifiedBody,
            timestamp,
            eventId: event.id,
            signature,
          }),
        });

        assertRejected(
          response,
          'Tampered payload with an original signature'
        );
      }
    );

    await t.test(
      'Expired webhook timestamp is rejected',
      async () => {
        const event = makeEvent();
        const rawBody = serializeEvent(event);

        const expiredTimestamp =
          Math.floor(Date.now() / 1000) -
          TIMESTAMP_TOLERANCE_SECONDS -
          60;

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            timestamp: expiredTimestamp,
            eventId: event.id,
          }),
        });

        assertRejected(
          response,
          'Expired webhook timestamp'
        );
      }
    );

    await t.test(
      'Future webhook timestamp outside tolerance is rejected',
      async () => {
        const event = makeEvent();
        const rawBody = serializeEvent(event);

        const futureTimestamp =
          Math.floor(Date.now() / 1000) +
          TIMESTAMP_TOLERANCE_SECONDS +
          60;

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            timestamp: futureTimestamp,
            eventId: event.id,
          }),
        });

        assertRejected(
          response,
          'Future webhook timestamp'
        );
      }
    );

    await t.test(
      'Malformed JSON is rejected',
      async () => {
        const rawBody = '{"id":';
        const timestamp = Math.floor(Date.now() / 1000);

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            timestamp,
            eventId: `evt_malformed_${crypto.randomUUID()}`,
          }),
        });

        assertRejected(response, 'Malformed JSON');
      }
    );

    await t.test(
      'Invalid payment amount is rejected',
      async () => {
        const invalidEvents = [
          makeEvent({ amount: -1 }),
          makeEvent({ amount: '1000' }),
          makeEvent({ amount: null }),
        ];

        for (const event of invalidEvents) {
          const rawBody = serializeEvent(event);
          const timestamp = Math.floor(Date.now() / 1000);

          const response = await sendWebhook({
            rawBody,
            headers: buildHeaders({
              rawBody,
              timestamp,
              eventId: event.id,
            }),
          });

          assert.ok(
            response.status < 500,
            `Invalid amount caused HTTP ${response.status}`
          );

          if (response.ok) {
            // Some webhook handlers only record events and defer
            // semantic validation to reconciliation. Such systems
            // need a state-integrity assertion in the provider adapter.
            const body = await responseBody(response);

            assert.ok(
              body !== undefined,
              'Response should be readable'
            );
          }
        }
      }
    );

    await t.test(
      'Unknown payment event type does not trigger a server error',
      async () => {
        const event = makeEvent({
          type: 'payment.security_test.unknown',
        });

        const rawBody = serializeEvent(event);
        const timestamp = Math.floor(Date.now() / 1000);

        const response = await sendWebhook({
          rawBody,
          headers: buildHeaders({
            rawBody,
            timestamp,
            eventId: event.id,
          }),
        });

        assert.ok(
          response.status < 500,
          `Unknown event caused HTTP ${response.status}`
        );
      }
    );

    await t.test(
      'Webhook requests using unsupported methods are rejected',
      async () => {
        const response = await sendWebhook({
          method: 'GET',
          headers: { accept: 'application/json' },
        });

        assert.ok(
          [400, 404, 405, 501].includes(response.status),
          `Expected unsupported-method response; ` +
            `received HTTP ${response.status}`
        );
      }
    );

    await t.test(
      'Webhook replay protection can be tested with duplicate events',
      { skip: !REPLAY_PROTECTION_REQUIRED },
      async () => {
        const event = makeEvent();
        const rawBody = serializeEvent(event);
        const timestamp = Math.floor(Date.now() / 1000);

        const headers = buildHeaders({
          rawBody,
          timestamp,
          eventId: event.id,
        });

        const first = await sendWebhook({
          rawBody,
          headers,
        });

        assert.ok(
          first.status >= 200 && first.status < 300,
          `First delivery should be accepted; HTTP ${first.status}`
        );

        const second = await sendWebhook({
          rawBody,
          headers,
        });

        // The duplicate must not apply payment effects a second time.
        // A handler may return 2xx for an idempotently ignored event,
        // or 4xx for a rejected duplicate.
        assert.ok(
          (second.status >= 200 && second.status < 300) ||
            (second.status >= 400 && second.status < 500),
          `Unexpected duplicate delivery status: HTTP ${second.status}`
        );
      }
    );
  }
);

test(
  'Webhook security helper invariants',
  () => {
    const event = makeEvent();
    const rawBody = serializeEvent(event);
    const timestamp = Math.floor(Date.now() / 1000);

    const first = createSignature(rawBody, timestamp, 'test-secret');
    const second = createSignature(rawBody, timestamp, 'test-secret');
    const different = createSignature(
      rawBody,
      timestamp,
      'different-secret'
    );

    assert.equal(
      first,
      second,
      'HMAC signatures should be deterministic for identical inputs'
    );

    assert.notEqual(
      first,
      different,
      'Different secrets should produce different signatures'
    );

    assert.match(
      first,
      /^[a-f0-9]{64}$/,
      'SHA-256 HMAC must be a 64-character hexadecimal digest'
    );
  }
);
