/**

* MedOrbits -- Authentication Integration Tests
* File: tests/integration/auth.integration.test.js
* Requirements:
* ●	Node.js >= 20
* ●	Running integration-test API
* ●	Dedicated test database
* IMPORTANT:
* Configure endpoint paths and request fields to match the actual API.
* Registration tests create accounts and should run only in an isolated
* integration-test environment.
    */

'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = (
process.env.AUTH_TEST_BASE_URL ||
process.env.TEST_BASE_URL ||
'http://127.0.0.1:3000'
).replace(/\/+$/, '');

const REGISTER_PATH =
process.env.AUTH_REGISTER_PATH || '/api/auth/register';

const LOGIN_PATH =
process.env.AUTH_LOGIN_PATH || '/api/auth/login';

const ME_PATH =
process.env.AUTH_ME_PATH || '/api/auth/me';

const LOGOUT_PATH =
process.env.AUTH_LOGOUT_PATH || '/api/auth/logout';

const PROTECTED_PATH =
process.env.AUTH_PROTECTED_TEST_PATH || '/api/users/me';

const TEST_PASSWORD =
process.env.AUTH_TEST_PASSWORD || 'Integration-Test-Password-92!';

const TIMEOUT_MS = Number(
process.env.AUTH_TEST_TIMEOUT_MS || 15000
);

const RUN_MUTATING_TESTS =
process.env.RUN_AUTH_MUTATING_TESTS === 'true';

function validateConfiguration() {
for (const [name, path] of Object.entries({
AUTH_REGISTER_PATH: REGISTER_PATH,
AUTH_LOGIN_PATH: LOGIN_PATH,
AUTH_ME_PATH: ME_PATH,
AUTH_LOGOUT_PATH: LOGOUT_PATH,
AUTH_PROTECTED_TEST_PATH: PROTECTED_PATH,
})) {
assert.ok(
path.startsWith('/'),
`${name} must start with /.`
);
}

assert.ok(
Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
'AUTH_TEST_TIMEOUT_MS must be positive.'
);

assert.ok(
typeof TEST_PASSWORD === 'string' &&
TEST_PASSWORD.length >= 12,
'AUTH_TEST_PASSWORD must be at least 12 characters.'
);
}

function buildUrl(path) {
return `${BASE_URL}${path}`;
}

async function apiRequest(path, {
method = 'GET',
token,
body,
headers = {},
} = {}) {
const controller = new AbortController();
const timeout = setTimeout(
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
const response = await fetch(buildUrl(path), {
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
clearTimeout(timeout);
}
}

function uniqueEmail() {
return `auth-test-${crypto.randomUUID()}@example.com`;
}

function registrationPayload(overrides = {}) {
return {
name: 'MedOrbits Integration Test',
email: uniqueEmail(),
password: TEST_PASSWORD,
...overrides,
};
}

function extractUser(response) {
const body = response.body;

if (!body || typeof body !== 'object') {
return null;
}

return body.user || body.data?.user || body.data || body;
}

function extractToken(response) {
const body = response.body;

if (!body || typeof body !== 'object') {
return null;
}

return (
body.accessToken ||
body.access_token ||
body.token ||
body.data?.accessToken ||
body.data?.access_token ||
body.data?.token ||
null
);
}

function assertNoServerError(response, label) {
assert.ok(
response.status < 500,
`${label}: unexpected HTTP ${response.status}; response=${JSON.stringify(response.body)}`
);
}

function assertRejected(response, label) {
assert.ok(
[400, 401, 403, 404, 409, 422, 429].includes(response.status),
`${label}: expected a client-error response, received HTTP ${response.status}.`
);
}

function requireMutatingTests() {
assert.equal(
RUN_MUTATING_TESTS,
true,
'Set RUN_AUTH_MUTATING_TESTS=true only in an isolated integration-test environment.'
);
}

describe('MedOrbits authentication integration tests', () => {
before(() => {
validateConfiguration();
});

describe('endpoint availability', () => {
it('responds to an authentication request without an internal server error', async () => {
const response = await apiRequest(LOGIN_PATH, {
method: 'POST',
body: {
email: 'nonexistent-auth-test@example.com',
password: 'Invalid-Test-Password-92!',
},
});

  assertNoServerError(response, 'Login endpoint');
  assert.ok(
    [200, 400, 401, 404, 405, 415, 422, 429].includes(response.status),
    `Unexpected login endpoint response: HTTP ${response.status}`
  );
});

});

describe('registration', () => {
it(
'registers a new user with valid input',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutatingTests();

    const payload = registrationPayload();
    const response = await apiRequest(REGISTER_PATH, {
      method: 'POST',
      body: payload,
    });
    assertNoServerError(response, 'User registration');
    assert.ok(
      [200, 201, 202].includes(response.status),
      `Expected registration success, received HTTP ${response.status}.`
    );
    const user = extractUser(response);
    if (user && typeof user === 'object') {
      assert.notEqual(
        user.password,
        payload.password,
        'The API must never return the submitted password.'
      );
      assert.equal(
        user.email,
        payload.email,
        'Registered user email does not match the submitted email.'
      );
      assert.notEqual(
        user.role,
        'admin',
        'Public registration must not create an administrator account.'
      );
    }
  }
);
it(
  'rejects registration with a malformed email address',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const response = await apiRequest(REGISTER_PATH, {
      method: 'POST',
      body: registrationPayload({
        email: 'invalid-email-address',
      }),
    });
    assertNoServerError(response, 'Malformed registration email');
    assertRejected(response, 'Malformed registration email');
  }
);
it(
  'rejects registration with a missing password',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const payload = registrationPayload();
    delete payload.password;
    const response = await apiRequest(REGISTER_PATH, {
      method: 'POST',
      body: payload,
    });
    assertNoServerError(response, 'Missing registration password');
    assertRejected(response, 'Missing registration password');
  }
);
it(
  'does not grant administrator privileges through registration fields',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const payload = registrationPayload({
      role: 'admin',
      isAdmin: true,
      permissions: ['*'],
      verified: true,
    });
    const response = await apiRequest(REGISTER_PATH, {
      method: 'POST',
      body: payload,
    });
    assertNoServerError(response, 'Privilege injection during registration');
    if ([200, 201, 202].includes(response.status)) {
      const user = extractUser(response);
      assert.ok(
        user && typeof user === 'object',
        'Successful registration should return a user object.'
      );
      assert.notEqual(user.role, 'admin');
      assert.notEqual(user.isAdmin, true);
      assert.notDeepEqual(user.permissions, ['*']);
    } else {
      assertRejected(response, 'Privilege injection during registration');
    }
  }
);

});

describe('login', () => {
it('rejects invalid credentials', async () => {
const response = await apiRequest(LOGIN_PATH, {
method: 'POST',
body: {
email: `unknown-${crypto.randomUUID()}@example.com`,
password: 'Invalid-Password-92!',
},
});

  assertNoServerError(response, 'Invalid login credentials');
  assertRejected(response, 'Invalid login credentials');
  assert.equal(
    extractToken(response),
    null,
    'Invalid credentials must not produce an access token.'
  );
});
it(
  'allows a newly registered user to log in',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const credentials = registrationPayload();
    const registration = await apiRequest(REGISTER_PATH, {
      method: 'POST',
      body: credentials,
    });
    assert.ok(
      [200, 201, 202].includes(registration.status),
      `Registration failed: HTTP ${registration.status}`
    );
    const login = await apiRequest(LOGIN_PATH, {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
      },
    });
    assertNoServerError(login, 'Login with registered credentials');
    assert.ok(
      [200, 201].includes(login.status),
      `Expected successful login, received HTTP ${login.status}.`
    );
    const token = extractToken(login);
    if (token !== null) {
      assert.ok(
        typeof token === 'string' && token.length > 0,
        'Successful login returned an empty token.'
      );
    }
  }
);
it('does not return a password in the login response', async () => {
  const response = await apiRequest(LOGIN_PATH, {
    method: 'POST',
    body: {
      email: `unknown-${crypto.randomUUID()}@example.com`,
      password: 'Invalid-Password-92!',
    },
  });
  assertNoServerError(response, 'Login response disclosure');
  const user = extractUser(response);
  if (user && typeof user === 'object') {
    assert.equal(
      Object.hasOwn(user, 'password'),
      false,
      'Login response must not expose a password field.'
    );
    assert.equal(
      Object.hasOwn(user, 'passwordHash'),
      false,
      'Login response must not expose a password hash.'
    );
  }
});

});

describe('token and protected-route behaviour', () => {
it('rejects an invalid bearer token on a protected endpoint', async () => {
const response = await apiRequest(PROTECTED_PATH, {
token: 'invalid.token.value',
});

  assertNoServerError(response, 'Invalid bearer token');
  assert.ok(
    [401, 403, 404].includes(response.status),
    `Invalid token was not denied: HTTP ${response.status}.`
  );
});
it('does not treat an empty bearer token as authenticated', async () => {
  const response = await apiRequest(PROTECTED_PATH, {
    headers: {
      Authorization: 'Bearer ',
    },
  });
  assertNoServerError(response, 'Empty bearer token');
  assert.ok(
    [401, 403, 404].includes(response.status),
    `Empty bearer token was not denied: HTTP ${response.status}.`
  );
});
it(
  'allows an authenticated user to access their own profile',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const credentials = registrationPayload();
    const registration = await apiRequest(REGISTER_PATH, {
      method: 'POST',
      body: credentials,
    });
    assert.ok(
      [200, 201, 202].includes(registration.status),
      `Registration failed: HTTP ${registration.status}`
    );
    const login = await apiRequest(LOGIN_PATH, {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
      },
    });
    assert.ok(
      [200, 201].includes(login.status),
      `Login failed: HTTP ${login.status}`
    );
    const token = extractToken(login);
    assert.ok(
      token,
      'Login response did not contain a recognized access token.'
    );
    const response = await apiRequest(ME_PATH, {
      token,
    });
    assertNoServerError(response, 'Authenticated profile request');
    assert.equal(
      response.status,
      200,
      `Authenticated profile request failed: HTTP ${response.status}`
    );
  }
);

});

describe('logout', () => {
it(
'accepts logout for an authenticated session',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutatingTests();

    const credentials = registrationPayload();
    const registration = await apiRequest(REGISTER_PATH, {
      method: 'POST',
      body: credentials,
    });
    assert.ok(
      [200, 201, 202].includes(registration.status),
      `Registration failed: HTTP ${registration.status}`
    );
    const login = await apiRequest(LOGIN_PATH, {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
      },
    });
    assert.ok(
      [200, 201].includes(login.status),
      `Login failed: HTTP ${login.status}`
    );
    const token = extractToken(login);
    assert.ok(
      token,
      'Login response did not contain a recognized access token.'
    );
    const response = await apiRequest(LOGOUT_PATH, {
      method: 'POST',
      token,
    });
    assertNoServerError(response, 'Authenticated logout');
    assert.ok(
      [200, 202, 204].includes(response.status),
      `Logout failed: HTTP ${response.status}`
    );
  }
);

});
});