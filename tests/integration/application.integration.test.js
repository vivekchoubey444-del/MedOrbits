/**

* MedOrbits -- Application Integration Tests
* File: tests/integration/application.integration.test.js
* Requirements:
* ●	Node.js >= 20
* ●	Running integration-test API
* ●	Dedicated test database
* ●	Test credentials for two separate users
* IMPORTANT:
* Configure endpoint paths and payload fields to match the actual API.
* Mutating tests require an isolated test environment.
    */

'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = (
process.env.APPLICATION_TEST_BASE_URL ||
process.env.TEST_BASE_URL ||
'http://127.0.0.1:3000'
).replace(//+$/, '');

const APPLICATIONS_PATH =
process.env.APPLICATIONS_TEST_PATH || '/api/applications';

const APPLICATION_PATH =
process.env.APPLICATION_TEST_PATH || '/api/applications/:id';

const USER_A_TOKEN = process.env.APPLICATION_TEST_USER_A_TOKEN || '';
const USER_B_TOKEN = process.env.APPLICATION_TEST_USER_B_TOKEN || '';

const TIMEOUT_MS = Number(
process.env.APPLICATION_TEST_TIMEOUT_MS || 15000
);

const RUN_MUTATING_TESTS =
process.env.RUN_APPLICATION_MUTATING_TESTS === 'true';

const VALID_APPLICATION = {
course: process.env.TEST_APPLICATION_COURSE || 'MBBS',
applicantName: 'Integration Test Applicant',
email: application-test-${crypto.randomUUID()}@example.com,
phone: '9000000000',
country: 'IN',
message: 'Automated integration test application.',
};

function validateConfiguration() {
assert.ok(
APPLICATIONS_PATH.startsWith('/'),
'APPLICATIONS_TEST_PATH must start with /.'
);

assert.ok(
APPLICATION_PATH.includes(':id'),
'APPLICATION_TEST_PATH must include the :id placeholder.'
);

assert.ok(
Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
'APPLICATION_TEST_TIMEOUT_MS must be positive.'
);
}

function buildUrl(path) {
return ${BASE_URL}${path};
}

function applicationUrl(id) {
return buildUrl(
APPLICATION_PATH.replace(':id', encodeURIComponent(id))
);
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
requestHeaders.Authorization = Bearer ${token};
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
clearTimeout(timeout);
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
[400, 401, 403, 404, 409, 413, 415, 422, 429].includes(response.status),
${label}: expected a client error, received HTTP ${response.status}.
);
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

function extractApplicationId(response) {
const application = extractApplication(response);

if (!application || typeof application !== 'object') {
return null;
}

return (
application.id ||
application.applicationId ||
application._id ||
null
);
}

function isSuccess(response) {
return [200, 201, 202].includes(response.status);
}

function requireMutatingTests() {
assert.equal(
RUN_MUTATING_TESTS,
true,
'Set RUN_APPLICATION_MUTATING_TESTS=true only for an isolated integration-test environment.'
);
}

describe('MedOrbits application integration tests', () => {
before(() => {
validateConfiguration();
});

describe('configuration and connectivity', () => {
it('requires test credentials for both test users', () => {
assert.ok(
USER_A_TOKEN,
'APPLICATION_TEST_USER_A_TOKEN is required.'
);

  assert.ok(
    USER_B_TOKEN,
    'APPLICATION_TEST_USER_B_TOKEN is required.'
  );
  assert.notEqual(
    USER_A_TOKEN,
    USER_B_TOKEN,
    'User A and User B must use distinct credentials.'
  );
});
it('responds without an internal server error to an application collection request', async () => {
  const response = await apiRequest(APPLICATIONS_PATH, {
    token: USER_A_TOKEN || undefined,
  });
  assertNoServerError(response, 'Application collection request');
  assert.ok(
    [200, 401, 403, 404, 405].includes(response.status),
    `Unexpected collection response: HTTP ${response.status}`
  );
});

});

describe('authentication and authorization', () => {
it('rejects application creation without authentication', async () => {
const response = await apiRequest(APPLICATIONS_PATH, {
method: 'POST',
body: VALID_APPLICATION,
});

  assertNoServerError(response, 'Unauthenticated application creation');
  assertRejected(response, 'Unauthenticated application creation');
});
it('rejects unauthenticated application collection access when the endpoint is private', async () => {
  const response = await apiRequest(APPLICATIONS_PATH);
  assertNoServerError(response, 'Unauthenticated collection request');
  assert.ok(
    [200, 401, 403, 404].includes(response.status),
    `Unexpected response: HTTP ${response.status}`
  );
  if (response.status === 200) {
    assert.ok(
      response.body &&
        typeof response.body === 'object' &&
        Array.isArray(response.body.applications || response.body.data),
      'A public collection endpoint should expose only its documented public response.'
    );
  }
});

});

describe('application validation', () => {
it(
'rejects an application with missing required fields',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutatingTests();

    const response = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {},
    });
    assertNoServerError(response, 'Missing-field application');
    assertRejected(response, 'Missing-field application');
  }
);
it(
  'rejects malformed email addresses',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const response = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {
        ...VALID_APPLICATION,
        email: 'not-an-email',
      },
    });
    assertNoServerError(response, 'Invalid email application');
    assertRejected(response, 'Invalid email application');
  }
);
it(
  'rejects unexpected privileged fields supplied by the client',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const response = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {
        ...VALID_APPLICATION,
        role: 'admin',
        status: 'approved',
        ownerId: 'another-user',
        isVerified: true,
      },
    });
    assertNoServerError(response, 'Privileged-field application');
    if (isSuccess(response)) {
      const application = extractApplication(response);
      assert.ok(
        application && typeof application === 'object',
        'Creation response did not contain an application object.'
      );
      assert.notEqual(
        application.role,
        'admin',
        'Client input must not assign an administrative role.'
      );
      assert.notEqual(
        application.status,
        'approved',
        'Client input must not bypass application review.'
      );
      assert.notEqual(
        application.isVerified,
        true,
        'Client input must not self-verify an application.'
      );
    } else {
      assertRejected(response, 'Privileged-field application');
    }
  }
);

});

describe('application creation and retrieval', () => {
it(
'creates an application with a valid payload',
{ skip: !RUN_MUTATING_TESTS },
async (t) => {
requireMutatingTests();

    const response = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {
        ...VALID_APPLICATION,
        email: `application-${crypto.randomUUID()}@example.com`,
      },
    });
    assertNoServerError(response, 'Valid application creation');
    assert.ok(
      isSuccess(response),
      `Expected application creation success, got HTTP ${response.status}.`
    );
    const id = extractApplicationId(response);
    assert.ok(
      id,
      'Successful creation response must expose an application identifier.'
    );
    t.diagnostic(`Created test application: ${id}`);
    const application = extractApplication(response);
    assert.ok(
      application && typeof application === 'object',
      'Creation response must contain an application object.'
    );
    assert.notEqual(
      application.status,
      'approved',
      'New applications must not be approved solely through client-supplied fields.'
    );
  }
);
it(
  'allows an authorized owner to retrieve an existing application',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const created = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {
        ...VALID_APPLICATION,
        email: `owner-${crypto.randomUUID()}@example.com`,
      },
    });
    assert.ok(
      isSuccess(created),
      `Application fixture creation failed: HTTP ${created.status}`
    );
    const id = extractApplicationId(created);
    assert.ok(id, 'Created application has no identifier.');
    const response = await apiRequest(
      applicationUrl(id).replace(BASE_URL, ''),
      { token: USER_A_TOKEN }
    );
    assertNoServerError(response, 'Owner application retrieval');
    assert.equal(
      response.status,
      200,
      `Owner should be able to retrieve their application; got HTTP ${response.status}.`
    );
    assert.equal(
      String(extractApplicationId(response)),
      String(id),
      'Retrieved application identifier does not match the requested resource.'
    );
  }
);

});

describe('cross-user access control', () => {
it(
'prevents another user from reading a private application',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutatingTests();

    const created = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {
        ...VALID_APPLICATION,
        email: `private-${crypto.randomUUID()}@example.com`,
      },
    });
    assert.ok(
      isSuccess(created),
      `Unable to create User A test application: HTTP ${created.status}`
    );
    const id = extractApplicationId(created);
    assert.ok(id, 'Created application has no identifier.');
    const response = await apiRequest(
      applicationUrl(id).replace(BASE_URL, ''),
      { token: USER_B_TOKEN }
    );
    assertNoServerError(response, 'Cross-user application retrieval');
    assert.ok(
      [403, 404].includes(response.status),
      `User B must not read User A's private application; received HTTP ${response.status}.`
    );
  }
);
it(
  'prevents another user from modifying a private application',
  { skip: !RUN_MUTATING_TESTS },
  async () => {
    requireMutatingTests();
    const created = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {
        ...VALID_APPLICATION,
        email: `protected-${crypto.randomUUID()}@example.com`,
      },
    });
    assert.ok(
      isSuccess(created),
      `Unable to create test application: HTTP ${created.status}`
    );
    const id = extractApplicationId(created);
    assert.ok(id, 'Created application has no identifier.');
    const response = await apiRequest(
      applicationUrl(id).replace(BASE_URL, ''),
      {
        method: 'PATCH',
        token: USER_B_TOKEN,
        body: {
          status: 'approved',
          message: 'Unauthorized status modification attempt',
        },
      }
    );
    assertNoServerError(response, 'Cross-user application modification');
    assert.ok(
      [403, 404, 405, 409, 422].includes(response.status),
      `Cross-user modification should be denied; received HTTP ${response.status}.`
    );
  }
);

});

describe('status transition protection', () => {
it(
'does not allow an ordinary applicant to approve an application',
{ skip: !RUN_MUTATING_TESTS },
async () => {
requireMutatingTests();

    const created = await apiRequest(APPLICATIONS_PATH, {
      method: 'POST',
      token: USER_A_TOKEN,
      body: {
        ...VALID_APPLICATION,
        email: `status-${crypto.randomUUID()}@example.com`,
      },
    });
    assert.ok(
      isSuccess(created),
      `Unable to create test application: HTTP ${created.status}`
    );
    const id = extractApplicationId(created);
    assert.ok(id, 'Created application has no identifier.');
    const response = await apiRequest(
      applicationUrl(id).replace(BASE_URL, ''),
      {
        method: 'PATCH',
        token: USER_A_TOKEN,
        body: {
          status: 'approved',
        },
      }
    );
    assertNoServerError(response, 'Applicant status modification');
    if (isSuccess(response)) {
      const application = extractApplication(response);
      assert.ok(
        application && typeof application === 'object',
        'Status update response did not contain an application object.'
      );
      assert.notEqual(
        application.status,
        'approved',
        'An applicant must not approve their own application.'
      );
    } else {
      assertRejected(response, 'Applicant status modification');
    }
  }
);

});
});