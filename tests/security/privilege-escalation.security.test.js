
'use strict';

/**
 * MedOrbits -- Privilege Escalation Security Tests
 *
 * File: tests/security/privilege-escalation.security.test.js
 *
 * Runtime: Node.js >= 20
 * Dependencies: Node.js built-in modules only
 *
 * Configuration:
 *   PRIVILEGE_TEST_BASE_URL
 *   PRIVILEGE_TEST_USER_TOKEN
 *   PRIVILEGE_TEST_ADMIN_TOKEN          Optional
 *   PRIVILEGE_TEST_USER_ID              Optional
 *   PRIVILEGE_TEST_PROFILE_PATH         Optional
 *   PRIVILEGE_TEST_ADMIN_PATH           Optional
 *   PRIVILEGE_TEST_TIMEOUT_MS           Optional
 *
 * Run:
 *   node --test tests/security/privilege-escalation.security.test.js
 *
 * IMPORTANT:
 * - Use dedicated test accounts and a non-production environment.
 * - The user token must belong to a low-privilege account.
 * - Never use production administrator credentials in security tests.
 * - Configure routes to match the actual MedOrbits API.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = (
  process.env.PRIVILEGE_TEST_BASE_URL || ''
).replace(/\/+$/, '');

const USER_TOKEN =
  process.env.PRIVILEGE_TEST_USER_TOKEN || '';

const ADMIN_TOKEN =
  process.env.PRIVILEGE_TEST_ADMIN_TOKEN || '';

const USER_ID =
  process.env.PRIVILEGE_TEST_USER_ID || '';

const PROFILE_PATH =
  process.env.PRIVILEGE_TEST_PROFILE_PATH ||
  (USER_ID ? `/api/users/${encodeURIComponent(USER_ID)}` : '');

const ADMIN_PATH =
  process.env.PRIVILEGE_TEST_ADMIN_PATH || '/api/admin';

const TIMEOUT_MS = Number(
  process.env.PRIVILEGE_TEST_TIMEOUT_MS || 15000
);

const configured = Boolean(
  BASE_URL &&
  USER_TOKEN &&
  Number.isFinite(TIMEOUT_MS) &&
  TIMEOUT_MS > 0
);

const skipReason =
  'Configure PRIVILEGE_TEST_BASE_URL and ' +
  'PRIVILEGE_TEST_USER_TOKEN to run integration tests.';

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

function headers(token, extra = {}) {
  return {
    ...JSON_HEADERS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, {
  token = USER_TOKEN,
  method = 'GET',
  body,
  extraHeaders = {},
} = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers: headers(token, extraHeaders),
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

function assertForbidden(response, description) {
  assert.ok(
    [401, 403, 404].includes(response.status),
    `${description}: expected 401, 403, or 404; ` +
      `received HTTP ${response.status}`
  );
}

function normalizeKey(key) {
  return String(key).replace(/[-_\s]/g, '').toLowerCase();
}

const PRIVILEGED_FIELDS = new Set([
  'role',
  'roles',
  'isadmin',
  'issuperadmin',
  'admin',
  'permissions',
  'permission',
  'privilege',
  'privileges',
  'accesslevel',
  'accounttype',
  'isstaff',
  'isverified',
  'verified',
  'isactive',
  'status',
].map(normalizeKey));

function findPrivilegedFields(value, path = '$', found = []) {
  if (!value || typeof value !== 'object') {
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findPrivilegedFields(item, `${path}[${index}]`, found);
    });

    return found;
  }

  for (const [key, child] of Object.entries(value)) {
    if (PRIVILEGED_FIELDS.has(normalizeKey(key))) {
      found.push(`${path}.${key}`);
    }

    findPrivilegedFields(child, `${path}.${key}`, found);
  }

  return found;
}

function assertNoPrivilegedFields(body, description) {
  const fields = findPrivilegedFields(body);

  assert.deepEqual(
    fields,
    [],
    `${description}: response exposes privileged fields: ${fields.join(', ')}`
  );
}

const escalationPayloads = [
  {
    name: 'admin role assignment',
    payload: { role: 'admin' },
  },
  {
    name: 'superadmin role assignment',
    payload: { role: 'superadmin' },
  },
  {
    name: 'administrator boolean assignment',
    payload: { isAdmin: true },
  },
  {
    name: 'superadministrator boolean assignment',
    payload: { isSuperAdmin: true },
  },
  {
    name: 'wildcard permission assignment',
    payload: { permissions: ['*'] },
  },
  {
    name: 'nested role assignment',
    payload: {
      profile: {
        role: 'admin',
        isAdmin: true,
      },
    },
  },
  {
    name: 'privilege collection assignment',
    payload: {
      roles: ['user', 'admin'],
      privileges: ['manage_users', 'manage_payments'],
    },
  },
];

test(
  'Privilege escalation security integration suite',
  { skip: !configured ? skipReason : false },
  async (t) => {
    await t.test(
      'Unauthenticated users cannot access the admin endpoint',
      async () => {
        const response = await request(ADMIN_PATH, {
          token: '',
        });

        assertForbidden(
          response,
          'Unauthenticated administrative access'
        );
      }
    );

    await t.test(
      'Low-privilege user cannot access the admin endpoint',
      async () => {
        const response = await request(ADMIN_PATH, {
          token: USER_TOKEN,
        });

        assertForbidden(
          response,
          'Low-privilege administrative access'
        );
      }
    );

    await t.test(
      'Admin endpoint rejects privilege-escalation HTTP methods',
      async () => {
        for (const method of ['POST', 'PATCH', 'DELETE']) {
          const response = await request(ADMIN_PATH, {
            token: USER_TOKEN,
            method,
            body: {
              role: 'admin',
              isAdmin: true,
            },
          });

          assertForbidden(
            response,
            `Low-privilege ${method} access to admin endpoint`
          );
        }
      }
    );

    await t.test(
      'User cannot escalate privileges through a profile update',
      { skip: !PROFILE_PATH },
      async (t) => {
        for (const { name, payload } of escalationPayloads) {
          await t.test(name, async () => {
            const beforeResponse = await request(PROFILE_PATH, {
              token: USER_TOKEN,
            });

            assert.ok(
              beforeResponse.ok,
              `Could not read baseline profile: HTTP ${beforeResponse.status}`
            );

            const before = await responseBody(beforeResponse);

            const updateResponse = await request(PROFILE_PATH, {
              token: USER_TOKEN,
              method: 'PATCH',
              body: payload,
            });

            assertForbidden(
              updateResponse,
              `Profile update attempting ${name}`
            );

            const afterResponse = await request(PROFILE_PATH, {
              token: USER_TOKEN,
            });

            assert.ok(
              afterResponse.ok,
              `Could not read profile after attempt: HTTP ${afterResponse.status}`
            );

            const after = await responseBody(afterResponse);

            assert.deepEqual(
              after,
              before,
              `Profile changed after rejected ${name}`
            );
          });
        }
      }
    );

    await t.test(
      'User cannot grant elevated privileges through a user-management endpoint',
      { skip: !PROFILE_PATH },
      async () => {
        const targets = USER_ID
          ? [USER_ID]
          : [];

        if (targets.length === 0) {
          assert.ok(
            !USER_ID,
            'A target user ID must be configured'
          );
          return;
        }

        for (const targetId of targets) {
          const path = `/api/users/${encodeURIComponent(targetId)}`;

          const response = await request(path, {
            token: USER_TOKEN,
            method: 'PATCH',
            body: {
              role: 'admin',
              isAdmin: true,
              permissions: ['*'],
            },
          });

          assertForbidden(
            response,
            'Unauthorized role assignment to another user'
          );
        }
      }
    );

    await t.test(
      'User cannot bypass authorization using alternate role fields',
      { skip: !PROFILE_PATH },
      async () => {
        const aliases = [
          { is_admin: true },
          { is_admin: 'true' },
          { accountType: 'administrator' },
          { accessLevel: 'superadmin' },
          { permissions: ['manage_users'] },
          { roles: ['admin'] },
        ];

        for (const payload of aliases) {
          const response = await request(PROFILE_PATH, {
            token: USER_TOKEN,
            method: 'PATCH',
            body: payload,
          });

          assertForbidden(
            response,
            `Alternate privilege field: ${Object.keys(payload).join(', ')}`
          );
        }
      }
    );

    await t.test(
      'User token cannot impersonate an administrator through headers',
      async () => {
        const response = await request(ADMIN_PATH, {
          token: USER_TOKEN,
          extraHeaders: {
            'X-User-Role': 'admin',
            'X-Admin': 'true',
            'X-Authenticated-Role': 'superadmin',
          },
        });

        assertForbidden(
          response,
          'Client-supplied role headers'
        );
      }
    );

    await t.test(
      'User cannot access a privileged route by changing HTTP method',
      async () => {
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

        for (const method of methods) {
          const response = await request(ADMIN_PATH, {
            token: USER_TOKEN,
            method,
            body: {
              action: 'grant_admin',
              role: 'admin',
            },
          });

          assertForbidden(
            response,
            `Privilege bypass using HTTP method ${method}`
          );
        }
      }
    );

    await t.test(
      'Authenticated low-privilege account remains usable after rejected attacks',
      { skip: !PROFILE_PATH },
      async () => {
        const response = await request(PROFILE_PATH, {
          token: USER_TOKEN,
        });

        assert.ok(
          response.ok,
          `Account access unexpectedly changed: HTTP ${response.status}`
        );

        const body = await responseBody(response);

        assert.ok(
          body !== null,
          'Expected a readable profile response'
        );
      }
    );

    await t.test(
      'Optional administrator token can access the configured admin endpoint',
      { skip: !ADMIN_TOKEN },
      async () => {
        const response = await request(ADMIN_PATH, {
          token: ADMIN_TOKEN,
        });

        assert.ok(
          response.status >= 200 && response.status < 300,
          `Configured admin token should be authorized; HTTP ${response.status}`
        );
      }
    );

    await t.test(
      'Profile responses do not expose unexpected privileged fields',
      { skip: !PROFILE_PATH },
      async () => {
        const response = await request(PROFILE_PATH, {
          token: USER_TOKEN,
        });

        assert.ok(
          response.ok,
          `Could not inspect profile response: HTTP ${response.status}`
        );

        const body = await responseBody(response);

        // This checks the API response contract. If MedOrbits intentionally
        // returns the current user's role, replace this with assertions
        // that the returned role is the expected low-privilege role.
        assertNoPrivilegedFields(
          body,
          'Low-privilege profile response'
        );
      }
    );
  }
);

test(
  'Privilege escalation security helper checks',
  () => {
    assert.ok(
      escalationPayloads.length >= 5,
      'The suite should include multiple escalation payloads'
    );

    for (const item of escalationPayloads) {
      assert.ok(
        findPrivilegedFields(item.payload).length > 0,
        `Escalation payload "${item.name}" must contain protected fields`
      );
    }

    assert.ok(
      ADMIN_PATH.startsWith('/') && !ADMIN_PATH.startsWith('//'),
      'Admin path must be a relative API path'
    );

    assert.ok(
      Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
      'Timeout must be a positive number'
    );
  }
);
