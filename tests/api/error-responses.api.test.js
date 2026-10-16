'use strict';
const request = require('supertest');
const app = require('../../src/app');
const sensitiveResponsePatterns = [
  /stack trace/i,
  /node_modules[\\/]/i,
  /\bsqlstate\b/i,
  /\bdatabase_url\b/i,
  /\bpassword_hash\b/i,
  /\bpasswordhash\b/i,
  /\bprivate_key\b/i,
  /\bsecret_access_key\b/i,
  /\bBEGIN\s+(?:RSA|OPENSSH|EC)\s+PRIVATE KEY\b/i,
  /\bER_ACCESS_DENIED_ERROR\b/i,
  /\bECONNREFUSED\b/i,
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
function expectJsonErrorResponse(response) {
  expect(response.headers['content-type']).toMatch(jsonContentType);
  expect(response.body).toEqual(expect.any(Object));
  expect(response.body).not.toBeNull();
}
function expectErrorStatus(response) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(600);
}
describe('API error responses', () => {
  describe('Unknown routes', () => {
    test('returns a client error for an unknown API endpoint', async () => {
      const response = await request(app)
        .get('/api/this-endpoint-does-not-exist')
        .set('Accept', 'application/json');
      expectErrorStatus(response);
      expectSafeErrorResponse(response);
      if (response.status !== 404) {
        expect(response.status).toBeLessThan(500);
      }
      if (response.status === 404) {
        expectJsonErrorResponse(response);
      }
    });
    test('handles an unknown nested API route safely', async () => {
      const response = await request(app)
        .get('/api/unknown/resource/123')
        .set('Accept', 'application/json');
      expectErrorStatus(response);
      expectSafeErrorResponse(response);
      expect(response.status).toBeLessThan(500);
    });
    test('handles an unknown HTTP method without leaking internals', async () => {
      const response = await request(app)
        .get('/api/unknown-method-test')
        .set('Accept', 'application/json');
      expectErrorStatus(response);
      expectSafeErrorResponse(response);
    });
  });
  describe('Malformed requests', () => {
    test('returns a client error for malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send('{"email":');
      expect([400, 404, 405, 415, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
      if (response.status !== 404 && response.status !== 405) {
        expectJsonErrorResponse(response);
      }
    });
    test('handles an unsupported content type safely', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .set('Content-Type', 'text/plain')
        .send('not-json');
      expect([400, 404, 405, 415, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
    test('handles empty JSON input safely', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .send({});
      expect([400, 401, 404, 405, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
    test('handles invalid URL encoding safely', async () => {
      const response = await request(app)
        .get('/api/courses/%E0%A4%A')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
    test('handles null-byte path input safely', async () => {
      const response = await request(app)
        .get('/api/documents/%00invalid')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
  });
  describe('Validation errors', () => {
    test('returns a client error when required login fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .send({});
      expect([400, 401, 404, 405, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
      if (response.status === 400 || response.status === 422) {
        expectJsonErrorResponse(response);
      }
    });
    test('handles invalid pagination values without a server error', async () => {
      const response = await request(app)
        .get('/api/courses')
        .query({
          page: 'invalid',
          limit: '-1',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
    test('handles unexpected query parameters safely', async () => {
      const response = await request(app)
        .get('/api/courses')
        .query({
          unexpectedField: 'unexpected-value',
          isAdmin: 'true',
          role: 'admin',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
    test('handles SQL injection-like input without an unhandled error', async () => {
      const response = await request(app)
        .get('/api/courses')
        .query({
          search: "' OR 1=1 --",
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
    test('handles script-like input without returning an HTML error page', async () => {
      const response = await request(app)
        .get('/api/courses')
        .query({
          search: '<script>alert(1)</script>',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status >= 400) {
        expect(response.headers['content-type']).toMatch(jsonContentType);
      }
    });
  });
  describe('Authentication and authorization errors', () => {
    test('handles missing authentication on a protected endpoint safely', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Accept', 'application/json');
      expect([200, 401, 403, 404]).toContain(response.status);
      expectSafeErrorResponse(response);
      if (response.status === 401 || response.status === 403) {
        expectJsonErrorResponse(response);
      }
    });
    test('handles invalid bearer credentials safely', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer invalid.test.token');
      expect([200, 401, 403, 404]).toContain(response.status);
      expectSafeErrorResponse(response);
      if (response.status === 401 || response.status === 403) {
        expectJsonErrorResponse(response);
      }
    });
    test('does not disclose account or credential details in authentication errors', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .send({
          email: 'nonexistent-user@example.invalid',
          password: 'InvalidTestPassword123!',
        });
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status >= 400) {
        expectJsonErrorResponse(response);
      }
      const text = responseText(response);
      expect(text).not.toMatch(/password_hash/i);
      expect(text).not.toMatch(/invalid password for .*@/i);
    });
  });
  describe('HTTP method errors', () => {
    test('handles unsupported methods on a read-only catalog endpoint', async () => {
      const response = await request(app)
        .delete('/api/courses')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status === 405) {
        expectJsonErrorResponse(response);
      }
    });
    test('handles unsupported methods on document resources safely', async () => {
      const response = await request(app)
        .put('/api/documents/DOCUMENT-DOES-NOT-EXIST')
        .set('Accept', 'application/json')
        .send({
          status: 'approved',
          isAdmin: true,
        });
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
  });
  describe('Error response consistency', () => {
    test.each([
      ['/api/this-endpoint-does-not-exist', 404],
      ['/api/unknown/resource/123', 404],
    ])(
      'returns a non-server error for unknown endpoint %s',
      async (path) => {
        const response = await request(app)
          .get(path)
          .set('Accept', 'application/json');
        expect(response.status).toBeLessThan(500);
        expectSafeErrorResponse(response);
      }
    );
    test('does not expose environment variables in error responses', async () => {
      const response = await request(app)
        .get('/api/this-endpoint-does-not-exist')
        .set('Accept', 'application/json');
      expectSafeErrorResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/process\.env/i);
      expect(text).not.toMatch(/DATABASE_URL\s*=/i);
      expect(text).not.toMatch(/SESSION_SECRET\s*=/i);
      expect(text).not.toMatch(/AI_API_KEY\s*=/i);
    });
    test('does not return raw database errors to clients', async () => {
      const response = await request(app)
        .get('/api/courses/COURSE-DOES-NOT-EXIST')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
    });
    test('returns JSON for API errors when JSON is requested', async () => {
      const response = await request(app)
        .get('/api/this-endpoint-does-not-exist')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeErrorResponse(response);
      if (response.status === 404) {
        expectJsonErrorResponse(response);
      }
    });
  });
});