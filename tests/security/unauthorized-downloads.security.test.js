
'use strict';

/**
 * MedOrbits -- Unauthorized Downloads Security Tests
 *
 * File: tests/security/unauthorized-downloads.security.test.js
 *
 * Runtime: Node.js >= 20
 * Dependencies: Node.js built-in modules only
 *
 * Configuration:
 *   DOWNLOAD_TEST_BASE_URL
 *   DOWNLOAD_TEST_TIMEOUT_MS
 *   DOWNLOAD_TEST_PRIVATE_PATH
 *   DOWNLOAD_TEST_USER_A_TOKEN
 *   DOWNLOAD_TEST_USER_B_TOKEN
 *   DOWNLOAD_TEST_USER_A_DOCUMENT_ID
 *   DOWNLOAD_TEST_USER_B_DOCUMENT_ID
 *   DOWNLOAD_TEST_DOWNLOAD_PATH_TEMPLATE
 *   DOWNLOAD_TEST_DOCUMENTS_PATH
 *
 * Defaults:
 *   Private download path: /api/documents/:id/download
 *
 * Run:
 *   node --test tests/security/unauthorized-downloads.security.test.js
 *
 * IMPORTANT:
 * - Run against a dedicated test environment.
 * - Use synthetic documents, never real identity documents.
 * - User A and User B must be separate low-privilege test accounts.
 * - Configure paths to match the actual MedOrbits document API.
 * - Never use production tokens or production document IDs.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = (
  process.env.DOWNLOAD_TEST_BASE_URL || ''
).replace(/\/+$/, '');

const TIMEOUT_MS = Number(
  process.env.DOWNLOAD_TEST_TIMEOUT_MS || 15000
);

const PRIVATE_PATH =
  process.env.DOWNLOAD_TEST_PRIVATE_PATH ||
  '/api/documents/:id/download';

const DOCUMENTS_PATH =
  process.env.DOWNLOAD_TEST_DOCUMENTS_PATH ||
  '/api/documents';

const USER_A_TOKEN =
  process.env.DOWNLOAD_TEST_USER_A_TOKEN || '';

const USER_B_TOKEN =
  process.env.DOWNLOAD_TEST_USER_B_TOKEN || '';

const USER_A_DOCUMENT_ID =
  process.env.DOWNLOAD_TEST_USER_A_DOCUMENT_ID || '';

const USER_B_DOCUMENT_ID =
  process.env.DOWNLOAD_TEST_USER_B_DOCUMENT_ID || '';

const configured = Boolean(
  BASE_URL &&
  Number.isFinite(TIMEOUT_MS) &&
  TIMEOUT_MS > 0 &&
  PRIVATE_PATH.startsWith('/') &&
  !PRIVATE_PATH.startsWith('//')
);

const skipReason =
  'Configure DOWNLOAD_TEST_BASE_URL to run download security tests.';

function urlForDocument(documentId) {
  const encodedId = encodeURIComponent(String(documentId));

  if (PRIVATE_PATH.includes(':id')) {
    return `${BASE_URL}${PRIVATE_PATH.replaceAll(':id', encodedId)}`;
  }

  return (
    `${BASE_URL}${PRIVATE_PATH.replace(/\/+$/, '')}/${encodedId}`
  );
}

function headers(token) {
  return {
    Accept: '*/*',
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
  };
}

async function request(url, {
  token,
  method = 'GET',
  extraHeaders = {},
} = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    return await fetch(url, {
      method,
      headers: {
        ...headers(token),
        ...extraHeaders,
      },
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function assertAccessDenied(response, description) {
  assert.ok(
    [401, 403, 404].includes(response.status),
    `${description}: expected 401, 403, or 404; ` +
      `received HTTP ${response.status}`
  );
}

async function readBody(response) {
  return response.arrayBuffer();
}

function assertNotPrivateFileContents(response, body, description) {
  const contentType = (
    response.headers.get('content-type') || ''
  ).toLowerCase();

  const disposition = (
    response.headers.get('content-disposition') || ''
  ).toLowerCase();

  const looksLikeDownload =
    disposition.includes('attachment') ||
    contentType.includes('application/pdf') ||
    contentType.includes('application/octet-stream') ||
    contentType.startsWith('image/');

  assert.equal(
    looksLikeDownload,
    false,
    `${description}: unauthorized response looks like a file download`
  );

  assert.equal(
    body.byteLength,
    0,
    `${description}: unauthorized response returned a body`
  );
}

async function assertUnauthorizedDownload(url, description) {
  const response = await request(url, {
    token: '',
  });

  assertAccessDenied(response, description);

  const body = await readBody(response);

  assertNotPrivateFileContents(
    response,
    body,
    description
  );
}

test(
  'Unauthorized downloads security integration suite',
  { skip: !configured ? skipReason : false },
  async (t) => {
    await t.test(
      'Private document download requires authentication',
      { skip: !USER_A_DOCUMENT_ID },
      async () => {
        await assertUnauthorizedDownload(
          urlForDocument(USER_A_DOCUMENT_ID),
          'Unauthenticated private document download'
        );
      }
    );

    await t.test(
      'User A cannot download User B document',
      { skip: !(USER_A_TOKEN && USER_B_DOCUMENT_ID) },
      async () => {
        const response = await request(
          urlForDocument(USER_B_DOCUMENT_ID),
          {
            token: USER_A_TOKEN,
          }
        );

        assertAccessDenied(
          response,
          'Cross-user document download'
        );

        const body = await readBody(response);

        assertNotPrivateFileContents(
          response,
          body,
          'Cross-user document download'
        );
      }
    );

    await t.test(
      'User B can download their own document',
      { skip: !(USER_B_TOKEN && USER_B_DOCUMENT_ID) },
      async () => {
        const response = await request(
          urlForDocument(USER_B_DOCUMENT_ID),
          {
            token: USER_B_TOKEN,
          }
        );

        assert.ok(
          response.status >= 200 && response.status < 300,
          `Document owner should be authorized; HTTP ${response.status}`
        );

        assert.ok(
          response.headers.get('content-type'),
          'Authorized download should identify its content type'
        );
      }
    );

    await t.test(
      'Invalid document identifiers cannot expose files',
      { skip: !USER_A_TOKEN },
      async () => {
        const invalidIds = [
          'undefined',
          'null',
          '..',
          '../admin',
          '%2e%2e%2fadmin',
          'nonexistent-security-test-document',
        ];

        for (const id of invalidIds) {
          const response = await request(
            urlForDocument(id),
            {
              token: USER_A_TOKEN,
            }
          );

          assert.ok(
            response.status >= 400 && response.status < 500,
            `Invalid document ID should produce 4xx; ` +
              `received HTTP ${response.status}`
          );

          const body = await readBody(response);

          assertNotPrivateFileContents(
            response,
            body,
            `Invalid document identifier "${id}"`
          );
        }
      }
    );

    await t.test(
      'Document download endpoint does not accept unsupported methods',
      { skip: !USER_A_DOCUMENT_ID },
      async () => {
        const response = await request(
          urlForDocument(USER_A_DOCUMENT_ID),
          {
            token: USER_A_TOKEN,
            method: 'TRACE',
          }
        );

        assert.ok(
          [400, 404, 405, 501].includes(response.status),
          `Unexpected TRACE response: HTTP ${response.status}`
        );
      }
    );

    await t.test(
      'Document listing does not expose private file contents',
      { skip: !USER_A_TOKEN },
      async () => {
        const response = await request(
          `${BASE_URL}${DOCUMENTS_PATH}`,
          {
            token: USER_A_TOKEN,
          }
        );

        assert.ok(
          response.status < 500,
          `Document listing returned HTTP ${response.status}`
        );

        if (!response.ok) {
          return;
        }

        const contentType = (
          response.headers.get('content-type') || ''
        ).toLowerCase();

        assert.ok(
          contentType.includes('json'),
          'Document listing should return JSON metadata, not raw file content'
        );

        const body = await response.json();

        assert.ok(
          body !== null &&
            (typeof body === 'object' || Array.isArray(body)),
          'Document listing should return a JSON object or array'
        );
      }
    );

    await t.test(
      'Download responses do not redirect to an untrusted destination',
      { skip: !USER_A_DOCUMENT_ID },
      async () => {
        const response = await request(
          urlForDocument(USER_A_DOCUMENT_ID),
          {
            token: '',
          }
        );

        assert.ok(
          response.status !== 301 &&
            response.status !== 302 &&
            response.status !== 303 &&
            response.status !== 307 &&
            response.status !== 308,
          'Unauthorized download must not redirect to a file URL'
        );

        assertAccessDenied(
          response,
          'Unauthorized download redirect probe'
        );

        const location = response.headers.get('location');

        assert.equal(
          location,
          null,
          'Unauthorized response must not disclose a download redirect URL'
        );
      }
    );
  }
);

test(
  'Unauthorized download test helper invariants',
  () => {
    assert.ok(
      PRIVATE_PATH.startsWith('/') &&
        !PRIVATE_PATH.startsWith('//'),
      'Private download path must be a relative API path'
    );

    assert.ok(
      Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
      'Timeout must be positive'
    );

    assertAccessDenied(
      { status: 403 },
      'Helper verification'
    );
  }
);
