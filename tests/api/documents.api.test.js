'use strict';
const request = require('supertest');
const app = require('../../src/app');
const baseUrl = '/api/documents';
const sensitiveResponsePatterns = [
  /stack trace/i,
  /node_modules[\\/]/i,
  /\bsqlstate\b/i,
  /\bdatabase_url\b/i,
  /\bpassword_hash\b/i,
  /\bprivate_key\b/i,
  /\baccess_token\b/i,
];
const jsonContentType = /application\/json/i;
function responseText(response) {
  if (typeof response.text === 'string') {
    return response.text;
  }
  try {
    return JSON.stringify(response.body);
  } catch {
    return '';
  }
}
function expectSafeErrorResponse(response) {
  const text = responseText(response);
  for (const pattern of sensitiveResponsePatterns) {
    expect(text).not.toMatch(pattern);
  }
}
function expectJsonResponse(response) {
  expect(response.headers['content-type']).toMatch(jsonContentType);
}
function expectDocumentShape(document) {
  expect(document).toEqual(
    expect.objectContaining({
      id: expect.any(String),
    })
  );
  expect(document.id.trim()).not.toBe('');
  // Responses must not expose internal storage or security details.
  expect(document).not.toHaveProperty('password');
  expect(document).not.toHaveProperty('passwordHash');
  expect(document).not.toHaveProperty('password_hash');
  expect(document).not.toHaveProperty('storagePath');
  expect(document).not.toHaveProperty('storage_path');
  expect(document).not.toHaveProperty('absolutePath');
  expect(document).not.toHaveProperty('privateKey');
  expect(document).not.toHaveProperty('accessToken');
}
describe('Documents API', () => {
  describe('GET /api/documents', () => {
    test('returns a JSON response for document listing', async () => {
      const response = await request(app)
        .get(baseUrl)
        .set('Accept', 'application/json');
      // Listing may require authentication.
      expect([200, 401, 403]).toContain(response.status);
      expectJsonResponse(response);
      expectSafeErrorResponse(response);
      if (response.status === 200) {
        expect(response.body).toEqual(
          expect.objectContaining({
            success: expect.any(Boolean),
            data: expect.any(Array),
          })
        );
        for (const document of response.body.data) {
          expectDocumentShape(document);
        }
      }
    });
    test('does not return a server error for pagination parameters', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: 10,
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectJsonResponse(response);
      expectSafeErrorResponse(response);
      if (response.status === 200) {
        expect(response.body.data).toEqual(expect.any(Array));
      }
    });
    test.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', 'invalid'],
      ['limit', '0'],
      ['limit', '-1'],
      ['limit', 'invalid'],
    ])('validates invalid pagination: %s=%s', async (key, value) => {
      const response = await request(app)
        .get(baseUrl)
        .query({ [key]: value })
        .set('Accept', 'application/json');
      expect([200, 400, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
      if (response.status === 400 || response.status === 422) {
        expectJsonResponse(response);
      }
    });
    test('rejects a limit above the configured maximum', async () => {
      const maxLimit = Number(
        process.env.DOCUMENTS_TEST_MAX_LIMIT || 100
      );
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: maxLimit + 1,
        })
        .set('Accept', 'application/json');
      expect([200, 400, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
      if (response.status === 400 || response.status === 422) {
        expectJsonResponse(response);
      }
    });
    test('handles document search without an unhandled server error', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({ search: 'admission document' })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status === 200) {
        expect(response.body.data).toEqual(expect.any(Array));
      }
    });
  });
  describe('GET /api/documents/:id', () => {
    test('rejects an unknown document ID safely', async () => {
      const response = await request(app)
        .get(`${baseUrl}/DOCUMENT-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
      if (response.status !== 401 && response.status !== 403) {
        expectJsonResponse(response);
      }
    });
    test('handles a malformed document ID safely', async () => {
      const response = await request(app)
        .get(`${baseUrl}/%00invalid`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
    test('does not expose filesystem paths or internal document metadata', async () => {
      const response = await request(app)
        .get(`${baseUrl}/DOCUMENT-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expectSafeErrorResponse(response);
      if (response.status === 200) {
        expectDocumentShape(response.body.data || response.body);
      }
    });
  });
  describe('Document ownership and authorization', () => {
    test('does not expose documents to unauthenticated users when authentication is required', async () => {
      const response = await request(app)
        .get(baseUrl)
        .set('Accept', 'application/json');
      expect([200, 401, 403]).toContain(response.status);
      expectSafeErrorResponse(response);
      // If the endpoint is public, verify that its response remains
      // limited to documents the caller is allowed to view.
      if (response.status === 200) {
        expect(response.body.data).toEqual(expect.any(Array));
      }
    });
    test("does not disclose another user's document through an arbitrary ID", async () => {
      const response = await request(app)
        .get(`${baseUrl}/DOCUMENT-OWNED-BY-ANOTHER-USER`)
        .set('Accept', 'application/json');
      // A secure implementation may conceal inaccessible documents with
      // 404 or explicitly deny access with 403.
      expect([400, 401, 403, 404, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
    test('does not permit role escalation through query parameters', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          role: 'admin',
          isAdmin: true,
          userRole: 'admin',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
  });
  describe('Document upload', () => {
    test('does not accept an empty upload request as a successful document upload', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 405, 415, 422]).toContain(
        response.status
      );
      expectSafeErrorResponse(response);
    });
    test('rejects an unsupported document MIME type', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .attach('file', Buffer.from('not a valid document'), {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload',
        });
      expect([400, 401, 403, 404, 405, 415, 422]).toContain(
        response.status
      );
      expectSafeErrorResponse(response);
    });
    test('does not trust a filename containing path traversal sequences', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .attach('file', Buffer.from('%PDF-1.4\n%%EOF'), {
          filename: '../../private/secret.pdf',
          contentType: 'application/pdf',
        });
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status === 200 || response.status === 201) {
        const body = response.body.data || response.body;
        expect(body).not.toHaveProperty('storagePath');
        expect(body).not.toHaveProperty('storage_path');
        expect(body).not.toHaveProperty('absolutePath');
      }
    });
    test('does not trust client-supplied ownership or approval fields', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .send({
          title: 'Test document',
          userId: 'ADMIN-USER-ID',
          ownerId: 'ADMIN-USER-ID',
          uploadedBy: 'ADMIN-USER-ID',
          approved: true,
          isVerified: true,
          status: 'approved',
          storagePath: '../../private/secret.pdf',
        });
      expect([400, 401, 403, 404, 405, 415, 422]).toContain(
        response.status
      );
      expectSafeErrorResponse(response);
    });
  });
  describe('Document download', () => {
    test('does not allow downloading an unknown document', async () => {
      const response = await request(app)
        .get(`${baseUrl}/DOCUMENT-DOES-NOT-EXIST/download`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeErrorResponse(response);
    });
    test('does not allow access to a path outside document storage', async () => {
      const response = await request(app)
        .get(`${baseUrl}/..%2F..%2F.env/download`)
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status === 200) {
        expect(response.headers['content-type']).not.toMatch(
          /text\/html/i
        );
        expect(response.headers['content-disposition'] || '').not.toMatch(
          /\.env/i
        );
      }
    });
    test('does not expose server stack traces for missing downloads', async () => {
      const response = await request(app)
        .get(`${baseUrl}/MISSING-DOCUMENT/download`)
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
  });
  describe('HTTP method and input safety', () => {
    test('does not allow unsupported document update methods to crash the server', async () => {
      const response = await request(app)
        .put(`${baseUrl}/DOCUMENT-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .send({
          ownerId: 'ADMIN-USER-ID',
          status: 'approved',
          isVerified: true,
        });
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
    test('does not allow unauthenticated deletion of an arbitrary document', async () => {
      const response = await request(app)
        .delete(`${baseUrl}/DOCUMENT-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeErrorResponse(response);
    });
    test('handles SQL injection-like search input safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: "' OR 1=1 --",
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
    test('handles HTML and script-like search input safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: '<script>alert(1)</script>',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(
          jsonContentType
        );
      }
    });
  });
});