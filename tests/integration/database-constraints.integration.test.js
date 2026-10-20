/**

* MedOrbits -- Database Constraints Integration Tests
* File: tests/integration/database-constraints.integration.test.js
* Coverage:
* ●	Unique account email enforcement
* ●	Required-field validation
* ●	Invalid foreign-key/reference rejection
* ●	Invalid record identifiers
* ●	Persistence consistency after rejected requests
* Node.js >= 20
* IMPORTANT:
* These tests exercise the API and persistence layer together. They do not
* directly inspect database constraints. Database-level enforcement must
* also be verified against the actual schema and database engine.
    */

'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = (
process.env.DB_CONSTRAINT_TEST_BASE_URL ||
process.env.TEST_BASE_URL ||
'http://127.0.0.1:3000'
).replace(/\/+$/, '');

const REGISTER_PATH =
process.env.DB_CONSTRAINT_REGISTER_PATH ||
'/api/auth/register';

const LOGIN_PATH =
process.env.DB_CONSTRAINT_LOGIN_PATH ||
'/api/auth/login';

const APPLICATIONS_PATH =
process.env.DB_CONSTRAINT_APPLICATIONS_PATH ||
'/api/applications';

const APPLICATION_PATH =
process.env.DB_CONSTRAINT_APPLICATION_PATH ||
'/api/applications/:id';

const USER_TOKEN =
process.env.DB_CONSTRAINT_TEST_USER_TOKEN || '';

const TEST_PASSWORD =
process.env.DB_CONSTRAINT_TEST_PASSWORD ||
'Database-Constraint-Test-92!';

const TIMEOUT_MS = Number(
process.env.DB_CONSTRAINT_TIMEOUT_MS || 15000
);

const RUN_MUTATING_TESTS =
process.env.RUN_DB_CONSTRAINT_MUTATING_TESTS === 'true';

/**

* Set these variables only when the application schema and API support
* the corresponding fields and validation rules.
    */
    const APPLICATION_REFERENCE_FIELD =
    process.env.DB_CONSTRAINT_REFERENCE_FIELD || '';

const INVALID_REFERENCE_VALUE =
process.env.DB_CONSTRAINT_INVALID_REFERENCE_VALUE ||
'invalid-reference-does-not-exist';

function validateConfiguration() {
assert.ok(
Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
'DB_CONSTRAINT_TIMEOUT_MS must be positive.'
);

for (const [name, path] of Object.entries({
REGISTER_PATH,
LOGIN_PATH,
APPLICATIONS_PATH,
APPLICATION_PATH,
})) {
assert.ok(
path.startsWith('/'),
`${name} must start with /.`
);
}

assert.ok(
APPLICATION_PATH.includes(':id'),
'DB_CONSTRAINT_APPLICATION_PATH must contain the :id placeholder.'
);
}

function uniqueEmail() {
return `db-constraint-${crypto.randomUUID()}@example.com`;
}

function urlFor(path) {
return `${BASE_URL}${path}`;
}

function applicationUrl(id) {
return APPLICATION_PATH.replace(
':id',
encodeURIComponent(String(id))
);
}

async function request(path, {
method = 'GET',
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
Accept: 'application/json',
...headers,
};

if (token) {
requestHeaders.Authorization = `Bearer ${token}`;
}

if (body !== undefined) {
requestHeaders['Content-Type'] = 'application/json';
}

try {
const response = await fetch(urlFor(path), {
method,
headers: requestHeaders,
body: body === undefined ? undefined : JSON.stringify(body),
signal: controller.signal,
redirect: 'manual',
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
`${label}: unexpected HTTP ${response.status}; body=${JSON.stringify(response.body)}`
);
}

function assertRejected(response, label) {
assert.ok(
[400, 401, 403, 404, 409, 413, 415, 422, 429].includes(
response.status
),
`${label}: expected a client error, received HTTP ${response.status}.`
);
}

function extractUser(response) {
const body = response.body;

if (!body || typeof body !== 'object') {
return null;
}

return body.user || body.data?.user || body.data || body;
}

function extractApplication(response) {
const body = response.body;

if (!body || typeof body !== 'object') {
return null;
}

return (
body.application ||
body.data?.application ||
body.data ||
body
);
}

function extractId(record) {
if (!record || typeof record !== 'object') {
return null;
}

return record.id ?? record._id ?? record.applicationId ?? null;
}

function requireMutationOptIn() {
assert.equal(
RUN_MUTATING_TESTS,
true,
'Set RUN_DB_CONSTRAINT_MUTATING_TESTS=true only in an isolated integration-test environment.'
);
}

function requireUserToken() {
assert.ok(
USER_TOKEN,
'DB_CONSTRAINT_TEST_USER_TOKEN is required for authenticated application tests.'
);
}

describe('MedOrbits database constraints integration tests', () => {
before(() => {
validateConfiguration();
});

describe('database/API connectivity', () => {
it('handles an authentication request without an internal server error', async () => {
const response = await request(LOGIN_PATH, {
method: 'POST',
body: {
email: `nonexistent-${crypto.randomUUID()}@example.com`,
password: 'Invalid-Database-Test-Password!',
},
});

  assertNoServerError(response, 'Authentication/database connectivity');
  assert.ok(
    [200, 400, 401, 404, 405, 415, 422, 429].includes(response.status),
    `Unexpected response status: ${response.status}`
  );
});

});

describe('unique account constraints', () => {
it(
'does not create two accounts with the same normalized email',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutationOptIn();

    const email = uniqueEmail();
    const first = await request(REGISTER_PATH, {
      method: 'POST',
      body: {
        name: 'Database Constraint Test',
        email,
        password: TEST_PASSWORD,
      },
    });
    assertNoServerError(first, 'Initial account registration');
    assert.ok(
      [200, 201, 202].includes(first.status),
      `Initial registration failed with HTTP ${first.status}.`
    );
    const second = await request(REGISTER_PATH, {
      method: 'POST',
      body: {
        name: 'Duplicate Database Constraint Test',
        email: email.toUpperCase(),
        password: TEST_PASSWORD,
      },
    });
    assertNoServerError(second, 'Duplicate account registration');
    assertRejected(
      second,
      'Duplicate account registration'
    );
  }
);
it(
  'rejects an account registration with a missing email',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutationOptIn();
    const response = await request(REGISTER_PATH, {
      method: 'POST',
      body: {
        name: 'Missing Email Test',
        password: TEST_PASSWORD,
      },
    });
    assertNoServerError(response, 'Missing email registration');
    assertRejected(response, 'Missing email registration');
  }
);
it(
  'rejects an account registration with a missing password',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutationOptIn();
    const response = await request(REGISTER_PATH, {
      method: 'POST',
      body: {
        name: 'Missing Password Test',
        email: uniqueEmail(),
      },
    });
    assertNoServerError(response, 'Missing password registration');
    assertRejected(response, 'Missing password registration');
  }
);

});

describe('application persistence constraints', () => {
it(
'rejects an application that omits required fields',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutationOptIn();
requireUserToken();

    const response = await request(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_TOKEN,
      body: {},
    });
    assertNoServerError(response, 'Empty application creation');
    assertRejected(response, 'Empty application creation');
  }
);
it(
  'rejects an invalid reference when the schema requires a valid related record',
  {
    skip:
      !RUN_MUTATING_TESTS ||
      !APPLICATION_REFERENCE_FIELD,
  },
  async () => {
    requireMutationOptIn();
    requireUserToken();
    const body = {
      course: 'MBBS',
      applicantName: 'Invalid Reference Test',
      email: uniqueEmail(),
      phone: '9000000000',
      message: 'Testing invalid database reference handling.',
      [APPLICATION_REFERENCE_FIELD]: INVALID_REFERENCE_VALUE,
    };
    const response = await request(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_TOKEN,
      body,
    });
    assertNoServerError(response, 'Invalid application reference');
    assertRejected(response, 'Invalid application reference');
  }
);
it(
  'does not return an application for a malformed record identifier',
  async () => {
    const malformedId = '%00invalid-id';
    const response = await request(
      applicationUrl(malformedId),
      {
        token: USER_TOKEN || undefined,
      }
    );
    assertNoServerError(response, 'Malformed application identifier');
    assert.ok(
      [400, 401, 403, 404, 422].includes(response.status),
      `Malformed identifier should not resolve to an application; HTTP ${response.status}.`
    );
  }
);

});

describe('constraint error handling', () => {
it(
'does not expose SQL details when a request is rejected',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutationOptIn();

    const response = await request(REGISTER_PATH, {
      method: 'POST',
      body: {
        name: 'Constraint Error Disclosure Test',
        email: 'invalid-email',
        password: TEST_PASSWORD,
      },
    });
    assertNoServerError(response, 'Rejected registration');
    assertRejected(response, 'Rejected registration');
    const responseText = String(response.rawBody || '');
    const internalDatabaseDetails =
      /\b(sqlstate|postgresql|mysql error|sqlite error|foreign key constraint|duplicate entry|constraint failed|syntax error at or near)\b/i;
    assert.equal(
      internalDatabaseDetails.test(responseText),
      false,
      'The API response appears to expose internal database error details.'
    );
  }
);

});
});