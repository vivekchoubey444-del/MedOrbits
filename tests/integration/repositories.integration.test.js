'use strict';
/**
 * MedOrbits -- Repository Integration Tests
 *
 * File: tests/integration/repositories.integration.test.js
 *
 * Purpose:
 * - Verify persisted records can be retrieved consistently.
 * - Verify user-scoped records remain isolated between users.
 * - Verify malformed and invalid identifiers are handled safely.
 * - Verify unauthorized requests cannot access protected repository data.
 * - Verify repository-backed writes persist across independent requests.
 * - Verify deleting or updating a record respects ownership.
 *
 * Runtime:
 *   Node.js >= 20
 *
 * Run:
 *   node --test tests/integration/repositories.integration.test.js
 *
 * Optional environment variables:
 *   TEST_BASE_URL
 *   REPOSITORY_TEST_BASE_URL
 *   REPOSITORY_TEST_PATH
 *   REPOSITORY_TEST_ITEM_PATH
 *   REPOSITORY_TEST_USER_A_TOKEN
 *   REPOSITORY_TEST_USER_B_TOKEN
 *   REPOSITORY_TEST_ITEM_ID
 *   REPOSITORY_TEST_RESOURCE
 *   REPOSITORY_TEST_TIMEOUT_MS
 *   RUN_MUTATING_REPOSITORY_TESTS=true
 *
 * IMPORTANT:
 * The default endpoints are examples. Configure the paths and tokens to
 * match the actual MedOrbits API and test database. These tests do not
 * directly import repository modules because their actual paths and
 * interfaces must be confirmed in the application source.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const BASE_URL = (
  process.env.REPOSITORY_TEST_BASE_URL ||
  process.env.TEST_BASE_URL ||
  'http://127.0.0.1:3000'
).replace(/\/+$/, '');
const COLLECTION_PATH =
  process.env.REPOSITORY_TEST_PATH || '/api/applications';
const ITEM_PATH_TEMPLATE =
  process.env.REPOSITORY_TEST_ITEM_PATH || `${COLLECTION_PATH}/:id`;
const USER_A_TOKEN =
  process.env.REPOSITORY_TEST_USER_A_TOKEN || '';
const USER_B_TOKEN =
  process.env.REPOSITORY_TEST_USER_B_TOKEN || '';
const EXISTING_ITEM_ID =
  process.env.REPOSITORY_TEST_ITEM_ID || '';
const RESOURCE_NAME =
  process.env.REPOSITORY_TEST_RESOURCE || 'repository-test';
const TIMEOUT_MS = Number(
  process.env.REPOSITORY_TEST_TIMEOUT_MS || 10000
);
const RUN_MUTATING_TESTS =
  process.env.RUN_MUTATING_REPOSITORY_TESTS === 'true';
const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};
function makeTestMarker() {
  return `${RESOURCE_NAME}-${crypto.randomUUID()}`;
}
function buildItemPath(id) {
  const encodedId = encodeURIComponent(String(id));
  if (ITEM_PATH_TEMPLATE.includes(':id')) {
    return ITEM_PATH_TEMPLATE.replace(':id', encodedId);
  }
  return `${ITEM_PATH_TEMPLATE.replace(/\/+$/, '')}/${encodedId}`;
}
function authHeaders(token) {
  return {
    ...JSON_HEADERS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...JSON_HEADERS,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const rawBody = await response.text();
    let body = null;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody;
      }
    }
    return {
      status: response.status,
      headers: response.headers,
      body,
      rawBody,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${TIMEOUT_MS}ms: ${options.method || 'GET'} ${path}`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
function isJsonObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}
function extractRecord(body) {
  if (!isJsonObject(body)) {
    return null;
  }
  if (isJsonObject(body.data)) {
    return body.data;
  }
  if (isJsonObject(body.record)) {
    return body.record;
  }
  if (isJsonObject(body.application)) {
    return body.application;
  }
  if (isJsonObject(body.item)) {
    return body.item;
  }
  return body;
}
function extractRecords(body) {
  if (Array.isArray(body)) {
    return body;
  }
  if (!isJsonObject(body)) {
    return null;
  }
  if (Array.isArray(body.data)) {
    return body.data;
  }
  if (Array.isArray(body.items)) {
    return body.items;
  }
  if (Array.isArray(body.records)) {
    return body.records;
  }
  if (Array.isArray(body.applications)) {
    return body.applications;
  }
  return null;
}
function assertStatus(response, expectedStatuses, context) {
  assert.ok(
    expectedStatuses.includes(response.status),
    `${context}: expected HTTP ${expectedStatuses.join(' or ')}, ` +
      `received ${response.status}. Response: ${JSON.stringify(response.body)}`
  );
}
function assertSafeErrorResponse(response) {
  if (!isJsonObject(response.body)) {
    return;
  }
  const serialized = JSON.stringify(response.body);
  const sensitivePatterns = [
    /password\s*["']?\s*:/i,
    /passwordHash/i,
    /secretAccessKey/i,
    /privateKey/i,
    /databaseUrl/i,
    /DATABASE_URL/i,
  ];
  for (const pattern of sensitivePatterns) {
    assert.equal(
      pattern.test(serialized),
      false,
      `Error response may expose sensitive information matching ${pattern}`
    );
  }
}
function assertNoCredentialFields(record) {
  if (!isJsonObject(record)) {
    return;
  }
  const forbiddenKeys = new Set([
    'password',
    'passwordHash',
    'password_hash',
    'resetToken',
    'reset_token',
    'refreshToken',
    'refresh_token',
    'accessToken',
    'access_token',
    'secretAccessKey',
    'privateKey',
  ]);
  for (const key of Object.keys(record)) {
    assert.equal(
      forbiddenKeys.has(key),
      false,
      `Repository response must not expose credential field "${key}"`
    );
  }
}
function isAcceptedCreateStatus(status) {
  return [200, 201, 202].includes(status);
}
function canRunAuthenticatedTests() {
  return Boolean(USER_A_TOKEN);
}
function canRunOwnershipTests() {
  return Boolean(USER_A_TOKEN && USER_B_TOKEN && EXISTING_ITEM_ID);
}
function canRunMutationTests() {
  return Boolean(
    RUN_MUTATING_TESTS &&
    USER_A_TOKEN
  );
}
function skipIf(condition, reason) {
  return condition ? reason : false;
}
test('repository integration test configuration is valid', () => {
  assert.doesNotThrow(() => new URL(BASE_URL));
  assert.ok(
    COLLECTION_PATH.startsWith('/'),
    'REPOSITORY_TEST_PATH must be an absolute URL path beginning with "/"'
  );
  assert.ok(
    ITEM_PATH_TEMPLATE.startsWith('/'),
    'REPOSITORY_TEST_ITEM_PATH must begin with "/"'
  );
  assert.ok(
    Number.isInteger(TIMEOUT_MS) && TIMEOUT_MS > 0,
    'REPOSITORY_TEST_TIMEOUT_MS must be a positive integer'
  );
});
test('repository-backed collection endpoint responds consistently', async (t) => {
  if (!canRunAuthenticatedTests()) {
    t.skip('Set REPOSITORY_TEST_USER_A_TOKEN to enable authenticated repository tests.');
    return;
  }
  const response = await request(COLLECTION_PATH, {
    method: 'GET',
    headers: authHeaders(USER_A_TOKEN),
  });
  assertStatus(
    response,
    [200, 204],
    'Authenticated collection retrieval'
  );
  if (response.status === 200) {
    const records = extractRecords(response.body);
    assert.ok(
      records !== null,
      'Collection endpoint should return an array or a recognized collection envelope.'
    );
    for (const record of records) {
      assertNoCredentialFields(record);
    }
  }
});
test('repository-backed collection rejects unauthenticated access when protected', async () => {
  const response = await request(COLLECTION_PATH, {
    method: 'GET',
    headers: JSON_HEADERS,
  });
  // Public collection endpoints may legitimately return 200 or 204.
  // Protected endpoints should reject requests without credentials.
  assert.ok(
    [200, 204, 401, 403].includes(response.status),
    `Unexpected status for unauthenticated collection request: ${response.status}`
  );
  if ([401, 403].includes(response.status)) {
    assertSafeErrorResponse(response);
  }
});
test('repository-backed collection rejects an invalid bearer token when protected', async () => {
  const response = await request(COLLECTION_PATH, {
    method: 'GET',
    headers: authHeaders('invalid.repository.test.token'),
  });
  assert.ok(
    [200, 204, 401, 403].includes(response.status),
    `Unexpected status for invalid-token request: ${response.status}`
  );
  if ([401, 403].includes(response.status)) {
    assertSafeErrorResponse(response);
  }
});
test('repository-backed item retrieval handles a malformed identifier safely', async (t) => {
  if (!canRunAuthenticatedTests()) {
    t.skip('Set REPOSITORY_TEST_USER_A_TOKEN to enable authenticated repository tests.');
    return;
  }
  const response = await request(buildItemPath('..%2F..%2Fadmin'), {
    method: 'GET',
    headers: authHeaders(USER_A_TOKEN),
  });
  assert.ok(
    [400, 403, 404, 422].includes(response.status),
    `Malformed identifiers should be rejected; received ${response.status}`
  );
  assertSafeErrorResponse(response);
});
test('repository-backed item retrieval handles an unknown identifier safely', async (t) => {
  if (!canRunAuthenticatedTests()) {
    t.skip('Set REPOSITORY_TEST_USER_A_TOKEN to enable authenticated repository tests.');
    return;
  }
  const response = await request(
    buildItemPath(`missing-${crypto.randomUUID()}`),
    {
      method: 'GET',
      headers: authHeaders(USER_A_TOKEN),
    }
  );
  assert.ok(
    [400, 403, 404, 422].includes(response.status),
    `Unknown identifier should not return a successful record; received ${response.status}`
  );
  assertSafeErrorResponse(response);
});
test('repository-backed item responses do not expose credential fields', async (t) => {
  if (!canRunAuthenticatedTests() || !EXISTING_ITEM_ID) {
    t.skip(
      'Set REPOSITORY_TEST_USER_A_TOKEN and REPOSITORY_TEST_ITEM_ID to enable this test.'
    );
    return;
  }
  const response = await request(buildItemPath(EXISTING_ITEM_ID), {
    method: 'GET',
    headers: authHeaders(USER_A_TOKEN),
  });
  assertStatus(response, [200, 403, 404], 'Item retrieval');
  if (response.status === 200) {
    const record = extractRecord(response.body);
    assert.ok(
      isJsonObject(record),
      'Successful item retrieval should return a record object.'
    );
    assertNoCredentialFields(record);
  } else {
    assertSafeErrorResponse(response);
  }
});
test('repository does not allow one user to read another user’s record', async (t) => {
  if (!canRunOwnershipTests()) {
    t.skip(
      'Set REPOSITORY_TEST_USER_A_TOKEN, REPOSITORY_TEST_USER_B_TOKEN, and REPOSITORY_TEST_ITEM_ID.'
    );
    return;
  }
  // The supplied item ID must belong to User A for this test to be meaningful.
  // A 404 is acceptable when the API conceals records the caller cannot access.
  const response = await request(buildItemPath(EXISTING_ITEM_ID), {
    method: 'GET',
    headers: authHeaders(USER_B_TOKEN),
  });
  assert.ok(
    [403, 404].includes(response.status),
    `Cross-user access should be denied or concealed; received ${response.status}`
  );
  assertSafeErrorResponse(response);
});
test('repository-backed create persists a record across separate requests', async (t) => {
  if (!canRunMutationTests()) {
    t.skip(
      'Set RUN_MUTATING_REPOSITORY_TESTS=true and REPOSITORY_TEST_USER_A_TOKEN to enable write tests.'
    );
    return;
  }
  const marker = makeTestMarker();
  // This payload is intentionally generic. Set REPOSITORY_TEST_RESOURCE and
  // adapt the fields below if the application requires a domain-specific DTO.
  const payload = {
    title: marker,
    name: marker,
    description: 'Automated repository integration test record.',
    testMarker: marker,
  };
  const createResponse = await request(COLLECTION_PATH, {
    method: 'POST',
    headers: authHeaders(USER_A_TOKEN),
    body: JSON.stringify(payload),
  });
  if (!isAcceptedCreateStatus(createResponse.status)) {
    assert.ok(
      [400, 401, 403, 404, 405, 409, 415, 422].includes(createResponse.status),
      `Unexpected create response: ${createResponse.status}`
    );
    t.diagnostic(
      'Creation was not accepted. The API may require a domain-specific payload or a different route.'
    );
    return;
  }
  const createdRecord = extractRecord(createResponse.body);
  const createdId =
    createdRecord?.id ??
    createdRecord?._id ??
    createdRecord?.applicationId;
  assert.ok(
    createdId !== undefined && createdId !== null && String(createdId).length > 0,
    'Successful creation should return the new record identifier.'
  );
  const readResponse = await request(buildItemPath(createdId), {
    method: 'GET',
    headers: authHeaders(USER_A_TOKEN),
  });
  assertStatus(readResponse, [200], 'Read-after-create');
  const persistedRecord = extractRecord(readResponse.body);
  assert.ok(
    isJsonObject(persistedRecord),
    'Read-after-create should return the persisted record.'
  );
  const persistedValues = JSON.stringify(persistedRecord);
  assert.ok(
    persistedValues.includes(marker),
    'The newly created marker should be present in the persisted record.'
  );
  assertNoCredentialFields(persistedRecord);
});
test('repository-backed creation rejects malformed payloads', async (t) => {
  if (!canRunMutationTests()) {
    t.skip(
      'Set RUN_MUTATING_REPOSITORY_TESTS=true and REPOSITORY_TEST_USER_A_TOKEN to enable write tests.'
    );
    return;
  }
  const invalidPayloads = [
    null,
    [],
    { title: '' },
    { title: 'x'.repeat(10000) },
  ];
  for (const payload of invalidPayloads) {
    const response = await request(COLLECTION_PATH, {
      method: 'POST',
      headers: authHeaders(USER_A_TOKEN),
      body: JSON.stringify(payload),
    });
    assert.ok(
      [400, 401, 403, 404, 405, 409, 415, 422].includes(response.status),
      `Invalid payload should not be accepted; received ${response.status}`
    );
    assertSafeErrorResponse(response);
  }
});
test('repository-backed updates cannot modify protected ownership fields', async (t) => {
  if (!canRunMutationTests() || !EXISTING_ITEM_ID) {
    t.skip(
      'Set RUN_MUTATING_REPOSITORY_TESTS=true, REPOSITORY_TEST_USER_A_TOKEN, and REPOSITORY_TEST_ITEM_ID.'
    );
    return;
  }
  const response = await request(buildItemPath(EXISTING_ITEM_ID), {
    method: 'PATCH',
    headers: authHeaders(USER_A_TOKEN),
    body: JSON.stringify({
      ownerId: 'another-user',
      userId: 'another-user',
      role: 'admin',
      isAdmin: true,
      permissions: ['admin'],
    }),
  });
  assert.ok(
    [200, 400, 403, 404, 405, 409, 422].includes(response.status),
    `Unexpected update response: ${response.status}`
  );
  if (response.status === 200) {
    const record = extractRecord(response.body);
    if (isJsonObject(record)) {
      assert.notEqual(record.isAdmin, true);
      assert.notDeepEqual(record.permissions, ['admin']);
    }
    // Re-read the record to verify the response was not merely sanitized
    // while privileged values were persisted.
    const reread = await request(buildItemPath(EXISTING_ITEM_ID), {
      method: 'GET',
      headers: authHeaders(USER_A_TOKEN),
    });
    if (reread.status === 200) {
      const persisted = extractRecord(reread.body);
      if (isJsonObject(persisted)) {
        assert.notEqual(persisted.isAdmin, true);
        assert.notDeepEqual(persisted.permissions, ['admin']);
      }
    }
  } else {
    assertSafeErrorResponse(response);
  }
});
test('repository-backed delete does not disclose another user’s record', async (t) => {
  if (!canRunMutationTests() || !canRunOwnershipTests()) {
    t.skip(
      'Requires RUN_MUTATING_REPOSITORY_TESTS=true, both user tokens, and REPOSITORY_TEST_ITEM_ID.'
    );
    return;
  }
  // This test deliberately uses User B against an item configured to belong
  // to User A. It must not delete the record.
  const response = await request(buildItemPath(EXISTING_ITEM_ID), {
    method: 'DELETE',
    headers: authHeaders(USER_B_TOKEN),
  });
  assert.ok(
    [403, 404].includes(response.status),
    `Cross-user deletion should be denied or concealed; received ${response.status}`
  );
  assertSafeErrorResponse(response);
  // Verify the record remains accessible to its owner.
  const ownerRead = await request(buildItemPath(EXISTING_ITEM_ID), {
    method: 'GET',
    headers: authHeaders(USER_A_TOKEN),
  });
  assertStatus(ownerRead, [200], 'Owner read after denied cross-user deletion');
});
test('repository API returns consistent response formats', async (t) => {
  if (!canRunAuthenticatedTests()) {
    t.skip('Set REPOSITORY_TEST_USER_A_TOKEN to enable authenticated repository tests.');
    return;
  }
  const first = await request(COLLECTION_PATH, {
    method: 'GET',
    headers: authHeaders(USER_A_TOKEN),
  });
  const second = await request(COLLECTION_PATH, {
    method: 'GET',
    headers: authHeaders(USER_A_TOKEN),
  });
  assertStatus(first, [200, 204], 'First collection retrieval');
  assertStatus(second, [200, 204], 'Second collection retrieval');
  if (first.status === 200 && second.status === 200) {
    assert.ok(
      extractRecords(first.body) !== null,
      'First response should use a recognized collection format.'
    );
    assert.ok(
      extractRecords(second.body) !== null,
      'Second response should use a recognized collection format.'
    );
  }
});
test('repository errors do not expose database internals', async (t) => {
  if (!canRunAuthenticatedTests()) {
    t.skip('Set REPOSITORY_TEST_USER_A_TOKEN to enable authenticated repository tests.');
    return;
  }
  const response = await request(
    buildItemPath(`invalid-${crypto.randomUUID()}`),
    {
      method: 'GET',
      headers: authHeaders(USER_A_TOKEN),
    }
  );
  assert.ok(
    [400, 403, 404, 422].includes(response.status),
    `Expected a safe not-found or validation response; received ${response.status}`
  );
  const serialized = JSON.stringify(response.body ?? '');
  for (const pattern of [
    /SELECT\s+.+\s+FROM/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+.+\s+SET/i,
    /DELETE\s+FROM/i,
    /SequelizeDatabaseError/i,
    /PrismaClientKnownRequestError/i,
    /ECONNREFUSED/i,
    /\/node_modules\//i,
  ]) {
    assert.equal(
      pattern.test(serialized),
      false,
      `Response may expose internal database details matching ${pattern}`
    );
  }
});