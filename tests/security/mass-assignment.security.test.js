
'use strict';

/**
 * MedOrbits -- Mass Assignment Security Tests
 *
 * File: tests/security/mass-assignment.security.test.js
 *
 * Runtime: Node.js >= 20
 * Dependencies: Node.js built-in modules only
 *
 * Configuration:
 *   MASS_ASSIGNMENT_TEST_BASE_URL
 *   MASS_ASSIGNMENT_TEST_TOKEN
 *   MASS_ASSIGNMENT_TEST_USER_ID
 *   MASS_ASSIGNMENT_TEST_APPLICATION_ID
 *   MASS_ASSIGNMENT_TEST_PROFILE_PATH
 *   MASS_ASSIGNMENT_TEST_APPLICATION_PATH
 *   MASS_ASSIGNMENT_TEST_TIMEOUT_MS
 *
 * Run:
 *   node --test tests/security/mass-assignment.security.test.js
 *
 * Security objectives:
 * - Reject or safely ignore protected fields in user-controlled input.
 * - Prevent privilege escalation through role or admin fields.
 * - Prevent ownership reassignment.
 * - Prevent application status and approval manipulation.
 * - Prevent modification of server-managed audit fields.
 *
 * IMPORTANT:
 * Use a dedicated test environment and a low-privilege test account.
 * Adapt endpoint paths and editable fields to the actual API contract.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = (
  process.env.MASS_ASSIGNMENT_TEST_BASE_URL || ''
).replace(/\/+$/, '');

const TOKEN =
  process.env.MASS_ASSIGNMENT_TEST_TOKEN || '';

const USER_ID =
  process.env.MASS_ASSIGNMENT_TEST_USER_ID || '';

const APPLICATION_ID =
  process.env.MASS_ASSIGNMENT_TEST_APPLICATION_ID || '';

const PROFILE_PATH =
  process.env.MASS_ASSIGNMENT_TEST_PROFILE_PATH ||
  (USER_ID ? `/api/users/${encodeURIComponent(USER_ID)}` : '');

const APPLICATION_PATH =
  process.env.MASS_ASSIGNMENT_TEST_APPLICATION_PATH ||
  (
    APPLICATION_ID
      ? `/api/applications/${encodeURIComponent(APPLICATION_ID)}`
      : ''
  );

const TIMEOUT_MS = Number(
  process.env.MASS_ASSIGNMENT_TEST_TIMEOUT_MS || 15000
);

const configured = Boolean(
  BASE_URL &&
  TOKEN &&
  Number.isFinite(TIMEOUT_MS) &&
  TIMEOUT_MS > 0
);

const skipReason =
  'Configure MASS_ASSIGNMENT_TEST_BASE_URL and ' +
  'MASS_ASSIGNMENT_TEST_TOKEN to run HTTP integration tests.';

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

/**
 * Fields that should normally be controlled exclusively by trusted
 * server-side logic or a dedicated privileged workflow.
 *
 * Adjust these names to match the MedOrbits data model.
 */
const PROTECTED_FIELDS = [
  'role',
  'roles',
  'isAdmin',
  'isSuperAdmin',
  'admin',
  'permissions',
  'permission',
  'userId',
  'ownerId',
  'createdBy',
  'updatedBy',
  'applicantId',
  'status',
  'approvalStatus',
  'approved',
  'isApproved',
  'verified',
  'isVerified',
  'emailVerified',
  'isActive',
  'accountStatus',
  'subscriptionStatus',
  'subscriptionPlan',
  'subscriptionExpiresAt',
  'creditScore',
  'riskLevel',
  'passwordHash',
  'refreshToken',
  'createdAt',
  'updatedAt',
  'deletedAt',
];

function requestHeaders(extra = {}) {
  return {
    ...JSON_HEADERS,
    Authorization: `Bearer ${TOKEN}`,
    ...extra,
  };
}

async function request(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: requestHeaders(options.headers || {}),
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function assertClientError(response, description) {
  assert.ok(
    response.status >= 400 && response.status < 500,
    `${description}: expected a 4xx response, received HTTP ${response.status}`
  );
}

function normalizeKey(key) {
  return String(key)
    .replace(/[-_\s]/g, '')
    .toLowerCase();
}

function collectProtectedFields(value, path = '$', found = []) {
  if (!value || typeof value !== 'object') {
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectProtectedFields(item, `${path}[${index}]`, found);
    });

    return found;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const protectedNames = new Set(
      PROTECTED_FIELDS.map(normalizeKey)
    );

    if (protectedNames.has(normalized)) {
      found.push({
        path: `${path}.${key}`,
        key,
        value: child,
      });
    }

    collectProtectedFields(child, `${path}.${key}`, found);
  }

  return found;
}

function assertNoProtectedFields(value, description) {
  const found = collectProtectedFields(value);

  assert.deepEqual(
    found,
    [],
    `${description}: response exposed protected fields: ` +
      found.map((field) => field.path).join(', ')
  );
}

/**
 * These payloads intentionally contain privileged or server-managed
 * fields. They must never be accepted as ordinary user-editable data.
 */
const privilegeEscalationPayload = {
  role: 'admin',
  roles: ['admin', 'superadmin'],
  isAdmin: true,
  isSuperAdmin: true,
  admin: true,
  permissions: ['*'],
  permission: '*',
};

const ownershipTamperingPayload = {
  userId: 'attacker-controlled-user',
  ownerId: 'attacker-controlled-owner',
  createdBy: 'attacker-controlled-creator',
  updatedBy: 'attacker-controlled-updater',
  applicantId: 'attacker-controlled-applicant',
};

const workflowTamperingPayload = {
  status: 'approved',
  approvalStatus: 'approved',
  approved: true,
  isApproved: true,
  verified: true,
  isVerified: true,
  emailVerified: true,
  isActive: true,
  accountStatus: 'active',
  subscriptionStatus: 'active',
  subscriptionPlan: 'enterprise',
  creditScore: 999,
  riskLevel: 'low',
};

const auditTamperingPayload = {
  createdAt: '2000-01-01T00:00:00.000Z',
  updatedAt: '2000-01-01T00:00:00.000Z',
  deletedAt: null,
  passwordHash: 'attacker-controlled-hash',
  refreshToken: 'attacker-controlled-token',
};

const fullMassAssignmentPayload = {
  displayName: 'Mass assignment security test',
  ...privilegeEscalationPayload,
  ...ownershipTamperingPayload,
  ...workflowTamperingPayload,
  ...auditTamperingPayload,
};

test(
  'Mass assignment security integration suite',
  { skip: !configured ? skipReason : false },
  async (t) => {
    await t.test(
      'Configuration uses explicit API paths',
      () => {
        assert.ok(
          PROFILE_PATH === '' ||
            (PROFILE_PATH.startsWith('/') &&
              !PROFILE_PATH.startsWith('//')),
          'Profile path must be an absolute API path'
        );

        assert.ok(
          APPLICATION_PATH === '' ||
            (APPLICATION_PATH.startsWith('/') &&
              !APPLICATION_PATH.startsWith('//')),
          'Application path must be an absolute API path'
        );
      }
    );

    await t.test(
      'User profile endpoint does not grant administrator privileges',
      { skip: !PROFILE_PATH },
      async () => {
        const beforeResponse = await request(PROFILE_PATH, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        assert.ok(
          beforeResponse.ok,
          `Could not read baseline profile: HTTP ${beforeResponse.status}`
        );

        const before = await responseBody(beforeResponse);

        const response = await request(PROFILE_PATH, {
          method: 'PATCH',
          body: JSON.stringify(privilegeEscalationPayload),
        });

        // Strict rejection is expected for this test contract.
        // If the API strips protected fields, replace this with a
        // read-back assertion proving no privilege was granted.
        assertClientError(
          response,
          'Profile privilege escalation attempt'
        );

        const afterResponse = await request(PROFILE_PATH, {
          method: 'GET',
        });

        assert.ok(
          afterResponse.ok,
          `Could not verify profile after attack: HTTP ${afterResponse.status}`
        );

        const after = await responseBody(afterResponse);

        assert.deepEqual(
          after,
          before,
          'Profile changed after a rejected privilege escalation attempt'
        );
      }
    );

    await t.test(
      'User cannot reassign ownership through profile updates',
      { skip: !PROFILE_PATH },
      async () => {
        const beforeResponse = await request(PROFILE_PATH, {
          method: 'GET',
        });

        assert.ok(
          beforeResponse.ok,
          `Could not read baseline profile: HTTP ${beforeResponse.status}`
        );

        const before = await responseBody(beforeResponse);

        const response = await request(PROFILE_PATH, {
          method: 'PATCH',
          body: JSON.stringify(ownershipTamperingPayload),
        });

        assertClientError(
          response,
          'Profile ownership reassignment attempt'
        );

        const afterResponse = await request(PROFILE_PATH, {
          method: 'GET',
        });

        assert.ok(
          afterResponse.ok,
          `Could not verify profile ownership: HTTP ${afterResponse.status}`
        );

        const after = await responseBody(afterResponse);

        assert.deepEqual(
          after,
          before,
          'Profile or ownership data changed after a rejected request'
        );
      }
    );

    await t.test(
      'Application endpoint rejects protected workflow-field changes',
      { skip: !APPLICATION_PATH },
      async () => {
        const beforeResponse = await request(APPLICATION_PATH, {
          method: 'GET',
        });

        assert.ok(
          beforeResponse.ok,
          `Could not read baseline application: HTTP ${beforeResponse.status}`
        );

        const before = await responseBody(beforeResponse);

        const response = await request(APPLICATION_PATH, {
          method: 'PATCH',
          body: JSON.stringify(workflowTamperingPayload),
        });

        assertClientError(
          response,
          'Application approval/status manipulation attempt'
        );

        const afterResponse = await request(APPLICATION_PATH, {
          method: 'GET',
        });

        assert.ok(
          afterResponse.ok,
          `Could not verify application after attack: HTTP ${afterResponse.status}`
        );

        const after = await responseBody(afterResponse);

        assert.deepEqual(
          after,
          before,
          'Application data changed after rejected workflow manipulation'
        );
      }
    );

    await t.test(
      'Application endpoint rejects owner and applicant reassignment',
      { skip: !APPLICATION_PATH },
      async () => {
        const beforeResponse = await request(APPLICATION_PATH, {
          method: 'GET',
        });

        assert.ok(
          beforeResponse.ok,
          `Could not read baseline application: HTTP ${beforeResponse.status}`
        );

        const before = await responseBody(beforeResponse);

        const response = await request(APPLICATION_PATH, {
          method: 'PATCH',
          body: JSON.stringify(ownershipTamperingPayload),
        });

        assertClientError(
          response,
          'Application ownership reassignment attempt'
        );

        const afterResponse = await request(APPLICATION_PATH, {
          method: 'GET',
        });

        assert.ok(
          afterResponse.ok,
          `Could not verify application after attack: HTTP ${afterResponse.status}`
        );

        const after = await responseBody(afterResponse);

        assert.deepEqual(
          after,
          before,
          'Application ownership changed after a rejected request'
        );
      }
    );

    await t.test(
      'Server-managed audit fields cannot be overwritten',
      { skip: !PROFILE_PATH },
      async () => {
        const beforeResponse = await request(PROFILE_PATH, {
          method: 'GET',
        });

        assert.ok(
          beforeResponse.ok,
          `Could not read baseline profile: HTTP ${beforeResponse.status}`
        );

        const before = await responseBody(beforeResponse);

        const response = await request(PROFILE_PATH, {
          method: 'PATCH',
          body: JSON.stringify(auditTamperingPayload),
        });

        assertClientError(
          response,
          'Audit field overwrite attempt'
        );

        const afterResponse = await request(PROFILE_PATH, {
          method: 'GET',
        });

        assert.ok(
          afterResponse.ok,
          `Could not verify audit fields: HTTP ${afterResponse.status}`
        );

        const after = await responseBody(afterResponse);

        assert.deepEqual(
          after,
          before,
          'Server-managed fields changed after a rejected request'
        );
      }
    );

    await t.test(
      'Nested privilege escalation payload is rejected',
      { skip: !PROFILE_PATH },
      async () => {
        const response = await request(PROFILE_PATH, {
          method: 'PATCH',
          body: JSON.stringify({
            profile: {
              displayName: 'Security test',
              role: 'admin',
              isAdmin: true,
            },
            settings: {
              permissions: ['*'],
            },
          }),
        });

        assertClientError(
          response,
          'Nested privilege escalation attempt'
        );
      }
    );

    await t.test(
      'Full mass-assignment payload cannot change protected fields',
      { skip: !PROFILE_PATH },
      async () => {
        const beforeResponse = await request(PROFILE_PATH, {
          method: 'GET',
        });

        assert.ok(
          beforeResponse.ok,
          `Could not read baseline profile: HTTP ${beforeResponse.status}`
        );

        const before = await responseBody(beforeResponse);

        const response = await request(PROFILE_PATH, {
          method: 'PATCH',
          body: JSON.stringify(fullMassAssignmentPayload),
        });

        assertClientError(
          response,
          'Full mass-assignment payload'
        );

        const afterResponse = await request(PROFILE_PATH, {
          method: 'GET',
        });

        assert.ok(
          afterResponse.ok,
          `Could not verify profile after full attack: HTTP ${afterResponse.status}`
        );

        const after = await responseBody(afterResponse);

        assert.deepEqual(
          after,
          before,
          'Profile changed after a rejected mass-assignment request'
        );
      }
    );
  }
);

test(
  'Mass assignment security payload definitions',
  () => {
    assert.ok(
      PROTECTED_FIELDS.length > 0,
      'Protected field inventory must not be empty'
    );

    for (const payload of [
      privilegeEscalationPayload,
      ownershipTamperingPayload,
      workflowTamperingPayload,
      auditTamperingPayload,
    ]) {
      assert.ok(
        Object.keys(payload).length > 0,
        'Each attack payload must contain test fields'
      );
    }

    assert.ok(
      collectProtectedFields(fullMassAssignmentPayload).length > 0,
      'Full attack payload must include protected fields'
    );
  }
);
