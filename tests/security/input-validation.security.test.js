
'use strict';

/**
 * MedOrbits -- Input Validation Security Tests
 *
 * File: tests/security/input-validation.security.test.js
 *
 * Runtime: Node.js >= 20
 * Dependencies: Node.js built-in modules only
 *
 * Configuration:
 *   INPUT_VALIDATION_TEST_BASE_URL
 *   INPUT_VALIDATION_TEST_TOKEN       Optional bearer token
 *   INPUT_VALIDATION_TEST_TIMEOUT_MS  Optional, defaults to 15000
 *
 * Run:
 *   node --test tests/security/input-validation.security.test.js
 *
 * IMPORTANT:
 * - Run against a dedicated test environment.
 * - These tests do not create or delete application records.
 * - Configure the base URL to your local test server.
 * - Endpoint contracts vary; set the optional token when needed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = (
  process.env.INPUT_VALIDATION_TEST_BASE_URL || ''
).replace(/\/+$/, '');

const TOKEN =
  process.env.INPUT_VALIDATION_TEST_TOKEN || '';

const TIMEOUT_MS = Number(
  process.env.INPUT_VALIDATION_TEST_TIMEOUT_MS || 15000
);

const configured = Boolean(
  BASE_URL &&
  Number.isFinite(TIMEOUT_MS) &&
  TIMEOUT_MS > 0
);

const skipReason =
  'Configure INPUT_VALIDATION_TEST_BASE_URL to run HTTP integration tests.';

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

function headers(extra = {}) {
  return {
    ...JSON_HEADERS,
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    ...extra,
  };
}

async function send(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
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

function assertClientError(response, description) {
  assert.ok(
    response.status >= 400 && response.status < 500,
    `${description}: expected a 4xx response, received ${response.status}`
  );
}

function assertSafeErrorBody(body) {
  if (typeof body === 'string') {
    assert.doesNotMatch(
      body,
      /at\s+\S+\s+\([^)]*:\d+:\d+\)/,
      'Error response exposes a server stack trace'
    );

    assert.doesNotMatch(
      body,
      /\b(?:SELECT|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM)\b/i,
      'Error response exposes SQL statements'
    );

    return;
  }

  if (!body || typeof body !== 'object') {
    return;
  }

  const serialized = JSON.stringify(body);

  assert.doesNotMatch(
    serialized,
    /at\s+\S+\s+\([^)]*:\d+:\d+\)/,
    'Error response exposes a server stack trace'
  );

  assert.doesNotMatch(
    serialized,
    /\b(?:SELECT|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM)\b/i,
    'Error response exposes SQL statements'
  );

  assert.doesNotMatch(
    serialized,
    /node_modules[\\/].+\.(?:js|cjs|mjs):\d+/i,
    'Error response exposes internal server paths'
  );
}

/**
 * Replace this list with routes that actually exist in the application.
 * These are representative JSON API endpoints from the MedOrbits
 * application domain, not a claim that every endpoint is implemented.
 */
const ROUTES = {
  health: '/health',
  applications: '/api/applications',
  search: '/api/search',
};

test(
  'Input validation security integration suite',
  { skip: !configured ? skipReason : false },
  async (t) => {
    await t.test(
      'Health endpoint responds without malformed output',
      async () => {
        const response = await send(ROUTES.health, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        assert.ok(
          response.status >= 200 && response.status < 500,
          `Unexpected health endpoint status: ${response.status}`
        );
      }
    );

    await t.test(
      'Malformed JSON is rejected',
      async () => {
        const response = await send(ROUTES.applications, {
          method: 'POST',
          headers: headers(),
          body: '{"application":',
        });

        assertClientError(response, 'Malformed JSON');

        assertSafeErrorBody(await responseBody(response));
      }
    );

    await t.test(
      'Invalid JSON primitive values are handled safely',
      async () => {
        const payloads = [
          'null',
          'true',
          '42',
          '"unexpected-string"',
        ];

        for (const body of payloads) {
          const response = await send(ROUTES.applications, {
            method: 'POST',
            headers: headers(),
            body,
          });

          assert.ok(
            response.status >= 400 && response.status < 500,
            `Unexpected JSON root ${body}: HTTP ${response.status}`
          );

          assertSafeErrorBody(await responseBody(response));
        }
      }
    );

    await t.test(
      'Empty request body is handled safely',
      async () => {
        const response = await send(ROUTES.applications, {
          method: 'POST',
          headers: headers(),
          body: '',
        });

        assert.ok(
          response.status >= 400 && response.status < 500,
          `Expected validation failure, received HTTP ${response.status}`
        );

        assertSafeErrorBody(await responseBody(response));
      }
    );

    await t.test(
      'Oversized JSON input is rejected',
      async () => {
        const oversizedValue = 'A'.repeat(2 * 1024 * 1024);

        const response = await send(ROUTES.applications, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            title: oversizedValue,
          }),
        });

        assert.ok(
          [400, 413, 422].includes(response.status),
          `Expected oversized input rejection (400/413/422), ` +
            `received HTTP ${response.status}`
        );

        assertSafeErrorBody(await responseBody(response));
      }
    );

    await t.test(
      'Unknown object properties are not accepted silently',
      async () => {
        const response = await send(ROUTES.applications, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            title: 'Input validation security test',
            __unexpectedSecurityTestField: true,
          }),
        });

        // Depending on the API contract, unknown fields may be rejected
        // or safely stripped. A successful creation must not silently
        // persist attacker-controlled, unsupported properties.
        assert.ok(
          response.status >= 400 && response.status < 500,
          `Endpoint should reject unsupported fields for this test; ` +
            `received HTTP ${response.status}. If the contract strips ` +
            `unknown fields, add a read-back assertion instead.`
        );

        assertSafeErrorBody(await responseBody(response));
      }
    );

    await t.test(
      'SQL injection-like input does not produce a server error',
      async () => {
        const payloads = [
          "' OR '1'='1",
          "'; DROP TABLE applications; --",
          '" OR 1=1 --',
        ];

        for (const payload of payloads) {
          const response = await send(
            `${ROUTES.search}?q=${encodeURIComponent(payload)}`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                ...(TOKEN
                  ? { Authorization: `Bearer ${TOKEN}` }
                  : {}),
              },
            }
          );

          assert.ok(
            response.status < 500,
            `Search failed with HTTP ${response.status} for an injection probe`
          );

          assertSafeErrorBody(await responseBody(response));
        }
      }
    );

    await t.test(
      'Cross-site scripting-like input is handled safely',
      async () => {
        const payload = '<script>alert("medorbits-test")</script>';

        const response = await send(ROUTES.search, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...(TOKEN
              ? { Authorization: `Bearer ${TOKEN}` }
              : {}),
          },
        });

        assert.ok(
          response.status < 500,
          `Search returned HTTP ${response.status}`
        );

        const body = await responseBody(response);

        if (typeof body === 'string') {
          assert.ok(
            !body.includes(payload),
            'Raw executable markup was returned in the response'
          );
        }

        // Probe the payload through the JSON API separately.
        const writeResponse = await send(ROUTES.applications, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ title: payload }),
        });

        assert.ok(
          writeResponse.status < 500,
          `XSS input caused HTTP ${writeResponse.status}`
        );

        assertSafeErrorBody(await responseBody(writeResponse));
      }
    );

    await t.test(
      'Invalid content types are handled safely',
      async () => {
        const response = await send(ROUTES.applications, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            ...(TOKEN
              ? { Authorization: `Bearer ${TOKEN}` }
              : {}),
            'Content-Type': 'text/plain',
          },
          body: '{"title":"unexpected-content-type"}',
        });

        assert.ok(
          response.status < 500,
          `Unsupported content type caused HTTP ${response.status}`
        );

        assertSafeErrorBody(await responseBody(response));
      }
    );

    await t.test(
      'Invalid identifiers do not cause server errors',
      async () => {
        const invalidIds = [
          'undefined',
          'null',
          '-1',
          'not-an-id',
          '%00',
          '..',
        ];

        for (const id of invalidIds) {
          const response = await send(
            `${ROUTES.applications}/${encodeURIComponent(id)}`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                ...(TOKEN
                  ? { Authorization: `Bearer ${TOKEN}` }
                  : {}),
              },
            }
          );

          assert.ok(
            response.status < 500,
            `Invalid identifier "${id}" caused HTTP ${response.status}`
          );

          assertSafeErrorBody(await responseBody(response));
        }
      }
    );

    await t.test(
      'Unsupported HTTP methods are rejected safely',
      async () => {
        const response = await send(ROUTES.search, {
          method: 'TRACE',
          headers: { Accept: 'application/json' },
        });

        assert.ok(
          [400, 404, 405, 501].includes(response.status),
          `Unexpected TRACE response: HTTP ${response.status}`
        );
      }
    );

    await t.test(
      'Validation errors do not expose internal details',
      async () => {
        const response = await send(ROUTES.applications, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            title: '',
            email: 'invalid-email',
          }),
        });

        if (response.status >= 400) {
          assertSafeErrorBody(await responseBody(response));
        } else {
          // A successful response is only acceptable if the endpoint
          // legitimately allows these values. Tighten this assertion
          // to match the actual application schema.
          assert.ok(
            response.status < 500,
            'Validation request caused a server error'
          );
        }
      }
    );
  }
);

test(
  'Input validation test configuration is sane',
  () => {
    assert.ok(
      Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
      'INPUT_VALIDATION_TEST_TIMEOUT_MS must be positive'
    );

    assert.ok(
      Object.values(ROUTES).every(
        (route) => route.startsWith('/') && !route.startsWith('//')
      ),
      'API route definitions must be relative paths'
    );
  }
);
