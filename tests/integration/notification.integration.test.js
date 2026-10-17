/**

* MedOrbits -- Notification Integration Tests
* File: tests/integration/notification.integration.test.js
* Coverage:
* ●	Notification endpoint availability
* ●	Authentication and authorization
* ●	Notification listing and response structure
* ●	Read-state updates
* ●	Input validation
* ●	Cross-user notification access
* Requirements:
* ●	Node.js >= 20
* ●	Running integration-test API
* ●	Dedicated test database and test users
* IMPORTANT:
* Endpoint paths, response structures, and mutation payloads must match
* the actual MedOrbits notification routes and controllers.
    */

'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = (
process.env.NOTIFICATION_TEST_BASE_URL ||
process.env.TEST_BASE_URL ||
'http://127.0.0.1:3000'
).replace(//+$/, '');

const NOTIFICATIONS_PATH =
process.env.NOTIFICATIONS_TEST_PATH || '/api/notifications';

const NOTIFICATION_PATH =
process.env.NOTIFICATION_TEST_PATH || '/api/notifications/:id';

const READ_PATH =
process.env.NOTIFICATION_READ_TEST_PATH ||
'/api/notifications/:id/read';

const READ_ALL_PATH =
process.env.NOTIFICATION_READ_ALL_TEST_PATH ||
'/api/notifications/read-all';

const USER_A_TOKEN =
process.env.NOTIFICATION_TEST_USER_A_TOKEN || '';

const USER_B_TOKEN =
process.env.NOTIFICATION_TEST_USER_B_TOKEN || '';

const TIMEOUT_MS = Number(
process.env.NOTIFICATION_TEST_TIMEOUT_MS || 15000
);

const RUN_MUTATING_TESTS =
process.env.RUN_NOTIFICATION_MUTATING_TESTS === 'true';

function validateConfiguration() {
assert.ok(
Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
'NOTIFICATION_TEST_TIMEOUT_MS must be positive.'
);

for (const [name, path] of Object.entries({
NOTIFICATIONS_PATH,
NOTIFICATION_PATH,
READ_PATH,
READ_ALL_PATH,
})) {
assert.ok(
path.startsWith('/'),
${name} must start with /.
);
}

assert.ok(
NOTIFICATION_PATH.includes(':id'),
'NOTIFICATION_TEST_PATH must contain the :id placeholder.'
);

assert.ok(
READ_PATH.includes(':id'),
'NOTIFICATION_READ_TEST_PATH must contain the :id placeholder.'
);
}

function urlFor(path) {
return ${BASE_URL}${path};
}

function notificationUrl(id) {
return NOTIFICATION_PATH.replace(
':id',
encodeURIComponent(String(id))
);
}

function readUrl(id) {
return READ_PATH.replace(
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
requestHeaders.Authorization = Bearer ${token};
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
${label}: unexpected HTTP ${response.status}; response=${JSON.stringify(response.body)}
);
}

function assertDenied(response, label) {
assert.ok(
[401, 403, 404].includes(response.status),
${label}: expected access denial, received HTTP ${response.status}.
);
}

function assertRejected(response, label) {
assert.ok(
[400, 401, 403, 404, 405, 409, 413, 415, 422, 429].includes(
response.status
),
${label}: expected a client-error response, received HTTP ${response.status}.
);
}

function extractNotifications(response) {
const body = response.body;

if (Array.isArray(body)) {
return body;
}

if (!body || typeof body !== 'object') {
return null;
}

if (Array.isArray(body.notifications)) {
return body.notifications;
}

if (Array.isArray(body.data?.notifications)) {
return body.data.notifications;
}

if (Array.isArray(body.data)) {
return body.data;
}

if (Array.isArray(body.results)) {
return body.results;
}

return null;
}

function extractNotification(response) {
const body = response.body;

if (!body || typeof body !== 'object') {
return null;
}

return (
body.notification ||
body.data?.notification ||
body.data ||
body
);
}

function extractNotificationId(notification) {
if (!notification || typeof notification !== 'object') {
return null;
}

return notification.id ??
notification._id ??
notification.notificationId ??
null;
}

function isSuccess(response) {
return [200, 201, 202, 204].includes(response.status);
}

function requireMutationOptIn() {
assert.equal(
RUN_MUTATING_TESTS,
true,
'Set RUN_NOTIFICATION_MUTATING_TESTS=true only in an isolated test environment.'
);
}

describe('MedOrbits notification integration tests', () => {
before(() => {
validateConfiguration();
});

describe('endpoint availability', () => {
it('handles a notification listing request without an internal server error', async () => {
const response = await request(NOTIFICATIONS_PATH, {
token: USER_A_TOKEN || undefined,
});

  assertNoServerError(response, 'Notification listing');
  assert.ok(
    [200, 401, 403, 404, 405].includes(response.status),
    `Unexpected notification listing status: ${response.status}`
  );
});

});

describe('authentication', () => {
it('rejects unauthenticated notification listing when the endpoint is private', async () => {
const response = await request(NOTIFICATIONS_PATH);

  assertNoServerError(response, 'Unauthenticated notification listing');
  assert.ok(
    [200, 401, 403, 404].includes(response.status),
    `Unexpected unauthenticated response: ${response.status}`
  );
  if (response.status === 200) {
    const notifications = extractNotifications(response);
    assert.ok(
      Array.isArray(notifications),
      'A public notification endpoint must return a documented list response.'
    );
  }
});
it('rejects an invalid token when retrieving a notification', async () => {
  const response = await request(notificationUrl('invalid-notification-id'), {
    token: 'invalid.notification.integration.token',
  });
  assertNoServerError(response, 'Invalid-token notification retrieval');
  assertDenied(
    response,
    'Invalid-token notification retrieval'
  );
});

});

describe('notification listing', () => {
it('returns a documented notification collection for an authenticated user', async (t) => {
if (!USER_A_TOKEN) {
t.skip('Set NOTIFICATION_TEST_USER_A_TOKEN.');
return;
}

  const response = await request(NOTIFICATIONS_PATH, {
    token: USER_A_TOKEN,
  });
  assertNoServerError(response, 'Authenticated notification listing');
  assert.equal(
    response.status,
    200,
    `Expected HTTP 200 for notification listing; received ${response.status}.`
  );
  const notifications = extractNotifications(response);
  assert.ok(
    Array.isArray(notifications),
    'Notification listing must return an array or a documented paginated collection.'
  );
  for (const notification of notifications) {
    assert.ok(
      notification && typeof notification === 'object',
      'Every notification must be an object.'
    );
    assert.ok(
      extractNotificationId(notification),
      'Each notification must have an identifier.'
    );
    assert.equal(
      Object.hasOwn(notification, 'password'),
      false,
      'Notification response must not expose a password field.'
    );
  }
});
it('handles pagination parameters safely', async (t) => {
  if (!USER_A_TOKEN) {
    t.skip('Set NOTIFICATION_TEST_USER_A_TOKEN.');
    return;
  }
  const separator = NOTIFICATIONS_PATH.includes('?') ? '&' : '?';
  const response = await request(
    `${NOTIFICATIONS_PATH}${separator}limit=10&page=1`,
    { token: USER_A_TOKEN }
  );
  assertNoServerError(response, 'Notification pagination');
  assert.ok(
    [200, 400, 422].includes(response.status),
    `Unexpected pagination response: HTTP ${response.status}.`
  );
  if (response.status === 200) {
    const notifications = extractNotifications(response);
    assert.ok(
      Array.isArray(notifications),
      'Paginated notification response must include a notification array.'
    );
    assert.ok(
      notifications.length <= 10,
      'The endpoint returned more than the requested page size.'
    );
  }
});
it('rejects invalid pagination values or handles them safely', async (t) => {
  if (!USER_A_TOKEN) {
    t.skip('Set NOTIFICATION_TEST_USER_A_TOKEN.');
    return;
  }
  const separator = NOTIFICATIONS_PATH.includes('?') ? '&' : '?';
  const response = await request(
    `${NOTIFICATIONS_PATH}${separator}limit=-100&page=-1`,
    { token: USER_A_TOKEN }
  );
  assertNoServerError(response, 'Invalid notification pagination');
  assert.ok(
    [200, 400, 422].includes(response.status),
    `Unexpected invalid pagination response: HTTP ${response.status}.`
  );
  if (response.status === 200) {
    const notifications = extractNotifications(response);
    assert.ok(
      Array.isArray(notifications),
      'Notification response must contain a list.'
    );
    assert.ok(
      notifications.length <= 100,
      'Invalid pagination parameters returned an unexpectedly large result set.'
    );
  }
});

});

describe('notification retrieval and ownership', () => {
it(
'prevents one user from reading another user's private notification',
{ skip: !RUN_MUTATING_TESTS },
async (t) => {
requireMutationOptIn();

    if (!USER_A_TOKEN || !USER_B_TOKEN) {
      t.skip(
        'Configure two distinct test users and provision a notification owned by User A.'
      );
      return;
    }
    const fixtureId = process.env.NOTIFICATION_USER_A_FIXTURE_ID;
    if (!fixtureId) {
      t.skip(
        'Set NOTIFICATION_USER_A_FIXTURE_ID to an existing private notification owned by User A.'
      );
      return;
    }
    const response = await request(notificationUrl(fixtureId), {
      token: USER_B_TOKEN,
    });
    assertNoServerError(response, 'Cross-user notification retrieval');
    assertDenied(
      response,
      'Cross-user notification retrieval'
    );
  }
);
it('does not resolve a malformed notification identifier to an unrelated record', async (t) => {
  if (!USER_A_TOKEN) {
    t.skip('Set NOTIFICATION_TEST_USER_A_TOKEN.');
    return;
  }
  const response = await request(notificationUrl('%00invalid-id'), {
    token: USER_A_TOKEN,
  });
  assertNoServerError(response, 'Malformed notification identifier');
  assert.ok(
    [400, 404, 422].includes(response.status),
    `Malformed identifier should be rejected; received HTTP ${response.status}.`
  );
});

});

describe('read-state updates', () => {
it(
'marks an owned notification as read',
{ skip: !RUN_MUTATING_TESTS },
async (t) => {
requireMutationOptIn();

    if (!USER_A_TOKEN) {
      t.skip('Set NOTIFICATION_TEST_USER_A_TOKEN.');
      return;
    }
    const fixtureId = process.env.NOTIFICATION_USER_A_FIXTURE_ID;
    if (!fixtureId) {
      t.skip(
        'Set NOTIFICATION_USER_A_FIXTURE_ID to an existing notification owned by User A.'
      );
      return;
    }
    const response = await request(readUrl(fixtureId), {
      method: 'PATCH',
      token: USER_A_TOKEN,
      body: {},
    });
    assertNoServerError(response, 'Mark notification as read');
    assert.ok(
      isSuccess(response) || response.status === 409,
      `Unexpected read-state response: HTTP ${response.status}.`
    );
    if (isSuccess(response) && response.status !== 204) {
      const notification = extractNotification(response);
      if (
        notification &&
        typeof notification === 'object' &&
        notification.isRead !== undefined
      ) {
        assert.equal(
          notification.isRead,
          true,
          'Successful read-state update should set isRead to true.'
        );
      } else if (
        notification &&
        typeof notification === 'object' &&
        notification.readAt !== undefined
      ) {
        assert.ok(
          notification.readAt,
          'Successful read-state update should set readAt.'
        );
      }
    }
  }
);
it(
  'does not allow one user to mark another user's notification as read',
  { skip: !RUN_MUTATING_TESTS },
  async (t) => {
    requireMutationOptIn();
    if (!USER_B_TOKEN) {
      t.skip('Set NOTIFICATION_TEST_USER_B_TOKEN.');
      return;
    }
    const fixtureId = process.env.NOTIFICATION_USER_A_FIXTURE_ID;
    if (!fixtureId) {
      t.skip(
        'Set NOTIFICATION_USER_A_FIXTURE_ID to an existing private notification owned by User A.'
      );
      return;
    }
    const response = await request(readUrl(fixtureId), {
      method: 'PATCH',
      token: USER_B_TOKEN,
      body: {},
    });
    assertNoServerError(response, 'Unauthorized notification read update');
    assertDenied(
      response,
      'Unauthorized notification read update'
    );
  }
);
it(
  'handles mark-all-as-read for the authenticated user',
  { skip: !RUN_MUTATING_TESTS },
  async (t) => {
    requireMutationOptIn();
    if (!USER_A_TOKEN) {
      t.skip('Set NOTIFICATION_TEST_USER_A_TOKEN.');
      return;
    }
    const response = await request(READ_ALL_PATH, {
      method: 'PATCH',
      token: USER_A_TOKEN,
      body: {},
    });
    assertNoServerError(response, 'Mark all notifications as read');
    assert.ok(
      [200, 202, 204, 404, 405].includes(response.status),
      `Unexpected mark-all-as-read response: HTTP ${response.status}.`
    );
  }
);

});

describe('input validation and method handling', () => {
it('does not accept unsupported HTTP methods for notification listing', async () => {
const response = await request(NOTIFICATIONS_PATH, {
method: 'TRACE',
});

  assert.ok(
    [400, 401, 403, 404, 405].includes(response.status),
    `Unexpected TRACE response: HTTP ${response.status}.`
  );
});
it('does not create notifications through an unauthenticated POST request', async () => {
  const response = await request(NOTIFICATIONS_PATH, {
    method: 'POST',
    body: {
      title: 'Unauthorized notification test',
      message: 'This request must not create a private notification.',
      isRead: false,
    },
  });
  assertNoServerError(response, 'Unauthenticated notification creation');
  assertRejected(
    response,
    'Unauthenticated notification creation'
  );
});

});
});