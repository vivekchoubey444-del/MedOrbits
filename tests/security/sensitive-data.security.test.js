
'use strict';

/**
 * MedOrbits -- Sensitive Data Exposure Security Tests
 *
 * File: tests/security/sensitive-data.security.test.js
 *
 * Runtime: Node.js >= 20
 * Dependencies: Node.js built-in modules only
 *
 * Configuration:
 *   SENSITIVE_DATA_TEST_BASE_URL
 *   SENSITIVE_DATA_TEST_TOKEN
 *   SENSITIVE_DATA_TEST_TIMEOUT_MS
 *   SENSITIVE_DATA_TEST_PROFILE_PATH
 *   SENSITIVE_DATA_TEST_USERS_PATH
 *   SENSITIVE_DATA_TEST_APPLICATIONS_PATH
 *   SENSITIVE_DATA_TEST_ADMIN_PATH
 *   SENSITIVE_DATA_TEST_INVALID_PATH
 *
 * Run:
 *   node --test tests/security/sensitive-data.security.test.js
 *
 * IMPORTANT:
 * - Use a dedicated test environment and test accounts.
 * - Route paths are configurable and must match the application.
 * - The test does not print response bodies or token values.
 * - Some personal data is legitimately returned to its authorized owner.
 *   Configure endpoint-specific allowlists instead of globally banning it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = (
  process.env.SENSITIVE_DATA_TEST_BASE_URL || ''
).replace(/\/+$/, '');

const TOKEN =
  process.env.SENSITIVE_DATA_TEST_TOKEN || '';

const TIMEOUT_MS = Number(
  process.env.SENSITIVE_DATA_TEST_TIMEOUT_MS || 15000
);

const PROFILE_PATH =
  process.env.SENSITIVE_DATA_TEST_PROFILE_PATH || '';

const USERS_PATH =
  process.env.SENSITIVE_DATA_TEST_USERS_PATH || '/api/users';

const APPLICATIONS_PATH =
  process.env.SENSITIVE_DATA_TEST_APPLICATIONS_PATH ||
  '/api/applications';

const ADMIN_PATH =
  process.env.SENSITIVE_DATA_TEST_ADMIN_PATH || '/api/admin';

const INVALID_PATH =
  process.env.SENSITIVE_DATA_TEST_INVALID_PATH ||
  '/api/__security_test_invalid_route__';

const configured = Boolean(
  BASE_URL &&
  Number.isFinite(TIMEOUT_MS) &&
  TIMEOUT_MS > 0
);

const skipReason =
  'Configure SENSITIVE_DATA_TEST_BASE_URL to run HTTP integration tests.';

const JSON_ACCEPT = {
  Accept: 'application/json',
};

const FORBIDDEN_RESPONSE_KEYS = new Set([
  'passwordhash',
  'hashedpassword',
  'passworddigest',
  'refreshtoken',
  'accesstoken',
  'secretkey',
  'privatekey',
  'clientsecret',
  'webhooksecret',
  'apikey',
  'authorizationtoken',
  'sessionsecret',
  'otpsecret',
  'mfas ecret',
  'cardnumber',
  'cvv',
  'cvc',
  'cardsecuritycode',
  'bankaccountpassword',
  'databaseurl',
  'connectionstring',
]);

const SENSITIVE_HEADERS = new Set([
  'x-powered-by',
  'x-debug-token',
  'x-internal-error',
  'x-stack-trace',
]);

function normalizeKey(key) {
  return String(key)
    .replace(/[-_\s]/g, '')
    .toLowerCase();
}

function authHeaders(extra = {}) {
  return {
    ...JSON_ACCEPT,
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    ...extra,
  };
}

async function request(path, {
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
      headers: authHeaders({
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

function inspectObject(value, path = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      inspectObject(item, `${path}[${index}]`, findings);
    });

    return findings;
  }

  if (!value || typeof value !== 'object') {
    return findings;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizeKey(key);

    if (FORBIDDEN_RESPONSE_KEYS.has(normalized)) {
      findings.push({
        type: 'forbidden-key',
        path: `${path}.${key}`,
      });
    }

    inspectObject(child, `${path}.${key}`, findings);
  }

  return findings;
}

function inspectText(value) {
  const textValue = typeof value === 'string'
    ? value
    : JSON.stringify(value ?? '');

  const findings = [];

  const patterns = [
    {
      name: 'private-key material',
      regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
    },
    {
      name: 'stack trace',
      regex: /\bat\s+\S+\s+\([^)]*:\d+:\d+\)/,
    },
    {
      name: 'internal source path',
      regex: /(?:\/app\/|\/srv\/|[A-Z]:\\[^ ]+)node_modules[\\/]/i,
    },
    {
      name: 'database connection URL',
      regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^/\s:@]+:[^@\s/]+@/i,
    },
    {
      name: 'JWT-like token',
      regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
    },
    {
      name: 'common secret assignment',
      regex: /\b(?:client_secret|webhook_secret|private_key|session_secret)\s*[:=]\s*["']?[^"'\s,}]{8,}/i,
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(textValue)) {
      findings.push(pattern.name);
    }
  }

  return findings;
}

function assertNoForbiddenKeys(body, description) {
  const findings = inspectObject(body);

  assert.equal(
    findings.length,
    0,
    `${description}: response contains forbidden sensitive fields`
  );
}

function assertNoSensitiveErrorDetails(body, description) {
  const findings = inspectText(body);

  assert.equal(
    findings.length,
    0,
    `${description}: response may expose internal diagnostic details`
  );
}

function assertNoSensitiveHeaders(response, description) {
  const exposed = [];

  for (const [name] of response.headers.entries()) {
    if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
      exposed.push(name);
    }
  }

  assert.deepEqual(
    exposed,
    [],
    `${description}: response contains diagnostic headers`
  );
}

function assertClientError(response, description) {
  assert.ok(
    response.status >= 400 && response.status < 500,
    `${description}: expected a 4xx response; received HTTP ${response.status}`
  );
}

test(
  'Sensitive data exposure security integration suite',
  { skip: !configured ? skipReason : false },
  async (t) => {
    await t.test(
      'Unauthenticated API responses do not expose sensitive fields',
      async () => {
        const response = await request(USERS_PATH, {
          headers: {
            Authorization: '',
          },
        });

        assert.ok(
          response.status < 500,
          `Users endpoint returned HTTP ${response.status}`
        );

        const body = await responseBody(response);

        assertNoForbiddenKeys(
          body,
          'Unauthenticated users endpoint'
        );

        assertNoSensitiveHeaders(
          response,
          'Unauthenticated users endpoint'
        );
      }
    );

    await t.test(
      'Authenticated user listing does not expose credential fields',
      async () => {
        const response = await request(USERS_PATH);

        assert.ok(
          response.status < 500,
          `Users endpoint returned HTTP ${response.status}`
        );

        const body = await responseBody(response);

        assertNoForbiddenKeys(
          body,
          'User listing endpoint'
        );
      }
    );

    await t.test(
      'Application responses do not expose payment credentials or secrets',
      async () => {
        const response = await request(APPLICATIONS_PATH);

        assert.ok(
          response.status < 500,
          `Applications endpoint returned HTTP ${response.status}`
        );

        const body = await responseBody(response);

        assertNoForbiddenKeys(
          body,
          'Applications endpoint'
        );
      }
    );

    await t.test(
      'Profile responses do not expose credential hashes or tokens',
      { skip: !PROFILE_PATH },
      async () => {
        const response = await request(PROFILE_PATH);

        assert.ok(
          response.status < 500,
          `Profile endpoint returned HTTP ${response.status}`
        );

        const body = await responseBody(response);

        assertNoForbiddenKeys(
          body,
          'Profile endpoint'
        );
      }
    );

    await t.test(
      'Administrative endpoints do not expose internal errors to unauthorized callers',
      async () => {
        const response = await request(ADMIN_PATH, {
          headers: {
            Authorization: '',
          },
        });

        assertClientError(
          response,
          'Unauthorized admin endpoint'
        );

        const body = await responseBody(response);

        assertNoSensitiveErrorDetails(
          body,
          'Unauthorized admin endpoint'
        );

        assertNoSensitiveHeaders(
          response,
          'Unauthorized admin endpoint'
        );
      }
    );

    await t.test(
      'Invalid route responses do not expose stack traces',
      async () => {
        const response = await request(INVALID_PATH, {
          headers: {
            Authorization: '',
          },
        });

        assert.ok(
          [400, 404, 405].includes(response.status),
          `Expected a client error for an invalid route; ` +
            `received HTTP ${response.status}`
        );

        const body = await responseBody(response);

        assertNoSensitiveErrorDetails(
          body,
          'Invalid route response'
        );

        assertNoSensitiveHeaders(
          response,
          'Invalid route response'
        );
      }
    );

    await t.test(
      'Malformed JSON errors do not reveal implementation details',
      async () => {
        const controller = new AbortController();

        const timeout = setTimeout(
          () => controller.abort(),
          TIMEOUT_MS
        );

        let response;

        try {
          response = await fetch(`${BASE_URL}${APPLICATIONS_PATH}`, {
            method: 'POST',
            headers: authHeaders({
              'Content-Type': 'application/json',
            }),
            body: '{"application":',
            redirect: 'manual',
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        assertClientError(
          response,
          'Malformed JSON request'
        );

        const body = await responseBody(response);

        assertNoSensitiveErrorDetails(
          body,
          'Malformed JSON response'
        );

        assertNoSensitiveHeaders(
          response,
          'Malformed JSON response'
        );
      }
    );

    await t.test(
      'Server errors do not disclose stack traces or database credentials',
      async () => {
        // This malformed identifier probes error handling without
        // intentionally causing an application-wide server failure.
        const response = await request(
          `${APPLICATIONS_PATH}/__invalid_security_test_id__`
        );

        assert.ok(
          response.status < 500,
          `Invalid identifier returned HTTP ${response.status}`
        );

        const body = await responseBody(response);

        assertNoSensitiveErrorDetails(
          body,
          'Invalid identifier response'
        );
      }
    );

    await t.test(
      'Responses do not include internal diagnostic headers',
      async () => {
        const response = await request(USERS_PATH);

        assert.ok(
          response.status < 500,
          `Users endpoint returned HTTP ${response.status}`
        );

        assertNoSensitiveHeaders(
          response,
          'Users endpoint'
        );
      }
    );
  }
);

test(
  'Sensitive data inspection helpers',
  () => {
    const safePayload = {
      id: 'user-test-1',
      displayName: 'Security Test User',
      role: 'user',
    };

    const unsafePayload = {
      user: {
        passwordHash: 'not-a-real-hash',
      },
    };

    assert.equal(
      inspectObject(safePayload).length,
      0,
      'Safe sample should have no forbidden fields'
    );

    assert.ok(
      inspectObject(unsafePayload).length > 0,
      'Credential-bearing sample should be detected'
    );

    assert.ok(
      inspectText(
        'Error: failure at handler (/app/node_modules/example.js:10:2)'
      ).length > 0,
      'Stack trace sample should be detected'
    );

    assert.ok(
      inspectText(
        'postgres://test-user:test-password@localhost:5432/testdb'
      ).length > 0,
      'Database URL sample should be detected'
    );
  }
);
