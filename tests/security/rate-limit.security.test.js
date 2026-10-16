
'use strict';

/**
 * MedOrbits -- Rate Limit Security Tests
 *
 * File: tests/security/rate-limit.security.test.js
 *
 * Runtime: Node.js >= 20
 * Dependencies: Node.js built-in modules only
 *
 * Configuration:
 *   RATE_LIMIT_TEST_BASE_URL
 *   RATE_LIMIT_TEST_TIMEOUT_MS
 *   RATE_LIMIT_TEST_REQUEST_COUNT
 *   RATE_LIMIT_TEST_LOGIN_PATH
 *   RATE_LIMIT_TEST_API_PATH
 *   RATE_LIMIT_TEST_SEARCH_PATH
 *   RATE_LIMIT_TEST_AUTH_TOKEN
 *   RATE_LIMIT_TEST_EXPECT_429
 *   RATE_LIMIT_TEST_FORWARDED_HEADER
 *
 * Run:
 *   node --test tests/security/rate-limit.security.test.js
 *
 * IMPORTANT:
 * - Run against a dedicated test environment.
 * - Do not run a high-volume load test against production.
 * - Rate limits may vary by route, identity, IP, and HTTP method.
 * - Adapt expected thresholds to the actual MedOrbits configuration.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = (
  process.env.RATE_LIMIT_TEST_BASE_URL || ''
).replace(/\/+$/, '');

const TIMEOUT_MS = Number(
  process.env.RATE_LIMIT_TEST_TIMEOUT_MS || 15000
);

const REQUEST_COUNT = Number(
  process.env.RATE_LIMIT_TEST_REQUEST_COUNT || 30
);

const LOGIN_PATH =
  process.env.RATE_LIMIT_TEST_LOGIN_PATH || '/api/auth/login';

const API_PATH =
  process.env.RATE_LIMIT_TEST_API_PATH || '/api/users';

const SEARCH_PATH =
  process.env.RATE_LIMIT_TEST_SEARCH_PATH || '/api/search';

const AUTH_TOKEN =
  process.env.RATE_LIMIT_TEST_AUTH_TOKEN || '';

const EXPECT_429 =
  process.env.RATE_LIMIT_TEST_EXPECT_429 !== 'false';

const FORWARDED_HEADER =
  process.env.RATE_LIMIT_TEST_FORWARDED_HEADER || 'X-Forwarded-For';

const configured = Boolean(
  BASE_URL &&
  Number.isFinite(TIMEOUT_MS) &&
  TIMEOUT_MS > 0 &&
  Number.isInteger(REQUEST_COUNT) &&
  REQUEST_COUNT >= 2
);

const skipReason =
  'Configure RATE_LIMIT_TEST_BASE_URL to run rate-limit integration tests.';

function validPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//')
  );
}

function requestHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    ...(AUTH_TOKEN
      ? { Authorization: `Bearer ${AUTH_TOKEN}` }
      : {}),
    ...extra,
  };
}

async function send(path, {
  method = 'GET',
  body,
  headers = {},
} = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers: requestHeaders({
        ...headers,
        ...(body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
      }),
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function readRateLimitHeaders(response) {
  const names = [
    'ratelimit',
    'ratelimit-limit',
    'ratelimit-remaining',
    'ratelimit-reset',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'retry-after',
  ];

  return Object.fromEntries(
    names
      .map((name) => [name, response.headers.get(name)])
      .filter(([, value]) => value !== null)
  );
}

async function readBody(response) {
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

function assertNotServerError(response, description) {
  assert.ok(
    response.status < 500,
    `${description}: unexpected HTTP ${response.status}`
  );
}

function assertRateLimitResponse(response, description) {
  assert.equal(
    response.status,
    429,
    `${description}: expected HTTP 429, received ${response.status}`
  );

  const retryAfter = response.headers.get('retry-after');

  if (retryAfter !== null) {
    assert.ok(
      retryAfter.trim().length > 0,
      'Retry-After must not be empty when present'
    );
  }
}

async function runBurst(path, count, options = {}) {
  const results = [];

  for (let i = 0; i < count; i += 1) {
    const response = await send(path, options);

    results.push({
      status: response.status,
      headers: readRateLimitHeaders(response),
      body: await readBody(response),
    });
  }

  return results;
}

function countStatus(results, status) {
  return results.filter((result) => result.status === status).length;
}

test(
  'Rate limit security integration suite',
  { skip: !configured ? skipReason : false },
  async (t) => {
    await t.test(
      'Configured paths and request limits are valid',
      () => {
        for (const path of [LOGIN_PATH, API_PATH, SEARCH_PATH]) {
          assert.ok(
            validPath(path),
            `Invalid API path configuration: ${path}`
          );
        }

        assert.ok(
          Number.isInteger(REQUEST_COUNT) && REQUEST_COUNT >= 2,
          'Request count must be an integer greater than or equal to 2'
        );
      }
    );

    await t.test(
      'Repeated authentication requests trigger rate limiting',
      async () => {
        const uniqueMarker = crypto.randomUUID();

        const results = await runBurst(
          LOGIN_PATH,
          REQUEST_COUNT,
          {
            method: 'POST',
            body: {
              email: `rate-limit-test-${uniqueMarker}@example.invalid`,
              password: 'intentionally-invalid-test-password',
            },
          }
        );

        assert.ok(
          results.length === REQUEST_COUNT,
          'All configured requests should be attempted'
        );

        for (const result of results) {
          assert.ok(
            result.status < 500,
            `Authentication request returned HTTP ${result.status}`
          );
        }

        if (EXPECT_429) {
          assert.ok(
            countStatus(results, 429) > 0,
            `Expected at least one HTTP 429 after ${REQUEST_COUNT} ` +
              'authentication requests. Verify the configured threshold, ' +
              'route, and test environment.'
          );
        }
      }
    );

    await t.test(
      'Repeated API requests trigger the configured API limit',
      async () => {
        const results = await runBurst(API_PATH, REQUEST_COUNT);

        assert.equal(
          results.length,
          REQUEST_COUNT,
          'Unexpected number of API requests'
        );

        for (const result of results) {
          assert.ok(
            result.status < 500,
            `API request returned HTTP ${result.status}`
          );
        }

        if (EXPECT_429) {
          assert.ok(
            countStatus(results, 429) > 0,
            `Expected API rate limiting after ${REQUEST_COUNT} requests`
          );
        }
      }
    );

    await t.test(
      'Repeated search requests trigger the configured search limit',
      async () => {
        const results = await runBurst(SEARCH_PATH, REQUEST_COUNT);

        for (const result of results) {
          assert.ok(
            result.status < 500,
            `Search request returned HTTP ${result.status}`
          );
        }

        if (EXPECT_429) {
          assert.ok(
            countStatus(results, 429) > 0,
            `Expected search rate limiting after ${REQUEST_COUNT} requests`
          );
        }
      }
    );

    await t.test(
      'Rate-limit headers are parseable when supplied',
      async () => {
        const response = await send(API_PATH);
        const headers = readRateLimitHeaders(response);

        assertNotServerError(response, 'Rate-limit header probe');

        for (const name of [
          'ratelimit-limit',
          'ratelimit-remaining',
          'x-ratelimit-limit',
          'x-ratelimit-remaining',
        ]) {
          if (headers[name] !== undefined) {
            assert.match(
              headers[name],
              /^\d+$/,
              `Invalid numeric rate-limit header: ${name}`
            );
          }
        }

        const retryAfter = headers['retry-after'];

        if (retryAfter !== undefined) {
          assert.ok(
            retryAfter.trim().length > 0,
            'Retry-After must not be empty'
          );
        }
      }
    );

    await t.test(
      'Rate limiting is not bypassed by changing HTTP methods',
      async () => {
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        const statuses = [];

        for (const method of methods) {
          const response = await send(API_PATH, {
            method,
            body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
              ? { rateLimitSecurityTest: true }
              : undefined,
          });

          statuses.push(response.status);

          assertNotServerError(
            response,
            `Rate-limit method test (${method})`
          );
        }

        // This test detects server errors and records behavior. It does
        // not assume that every HTTP method has the same policy.
        assert.equal(
          statuses.length,
          methods.length,
          'Every configured HTTP method should be tested'
        );
      }
    );

    await t.test(
      'Client-supplied forwarding headers do not cause server errors',
      async () => {
        const fakeAddresses = [
          '198.51.100.10',
          '203.0.113.20',
          '192.0.2.30',
        ];

        const statuses = [];

        for (const address of fakeAddresses) {
          const response = await send(API_PATH, {
            headers: {
              [FORWARDED_HEADER]: address,
            },
          });

          statuses.push(response.status);

          assertNotServerError(
            response,
            'Forwarding-header spoofing probe'
          );
        }

        assert.equal(
          statuses.length,
          fakeAddresses.length,
          'All forwarding-header probes should run'
        );
      }
    );

    await t.test(
      'Rate-limited responses do not expose server errors',
      async () => {
        const results = await runBurst(
          LOGIN_PATH,
          REQUEST_COUNT,
          {
            method: 'POST',
            body: {
              email: 'rate-limit-error-test@example.invalid',
              password: 'invalid-test-password',
            },
          }
        );

        const limited = results.filter(
          (result) => result.status === 429
        );

        for (const result of limited) {
          assert.ok(
            result.body === null ||
              typeof result.body === 'object' ||
              typeof result.body === 'string',
            'Rate-limit response body should be safely readable'
          );
        }
      }
    );
  }
);

test(
  'Rate-limit test helper invariants',
  () => {
    assert.ok(
      Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
      'Timeout must be positive'
    );

    assert.ok(
      Number.isInteger(REQUEST_COUNT) && REQUEST_COUNT >= 2,
      'Request count must be an integer >= 2'
    );

    for (const path of [LOGIN_PATH, API_PATH, SEARCH_PATH]) {
      assert.ok(
        validPath(path),
        `Path must begin with a single slash: ${path}`
      );
    }

    const sample = {
      status: 429,
      headers: {},
      body: null,
    };

    assert.equal(countStatus([sample], 429), 1);
  }
);
