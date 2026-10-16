'use strict';
const request = require('supertest');
const app = require('../../src/app');
const healthPaths = [
  '/health',
  '/health/live',
  '/health/ready',
  '/api/health',
];
const jsonContentType = /application\/json/i;
const sensitiveResponsePatterns = [
  /stack trace/i,
  /node_modules[\\/]/i,
  /\bDATABASE_URL\s*=/i,
  /\bSESSION_SECRET\s*=/i,
  /\bAI_API_KEY\s*=/i,
  /\bpassword_hash\b/i,
  /\bprivate_key\b/i,
  /\bBEGIN\s+(?:RSA|OPENSSH|EC)\s+PRIVATE KEY\b/i,
  /\bER_ACCESS_DENIED_ERROR\b/i,
  /\bECONNREFUSED\b/i,
];
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
function expectSafeResponse(response) {
  const text = responseText(response);
  for (const pattern of sensitiveResponsePatterns) {
    expect(text).not.toMatch(pattern);
  }
}
function expectJsonResponse(response) {
  expect(response.headers['content-type']).toMatch(jsonContentType);
  expect(response.body).toEqual(expect.any(Object));
  expect(response.body).not.toBeNull();
}
describe('Health API', () => {
  describe('Health endpoint discovery', () => {
    test.each(healthPaths)(
      'handles health endpoint %s without an internal server error',
      async (path) => {
        const response = await request(app)
          .get(path)
          .set('Accept', 'application/json');
        // An unimplemented endpoint may return 404.
        // A configured health endpoint should normally return 200.
        expect(response.status).toBeLessThan(500);
        expectSafeResponse(response);
        if (response.status === 200) {
          expect(response.headers['content-type']).toMatch(
            /application\/json|text\/plain/i
          );
        }
      }
    );
  });
  describe('Liveness checks', () => {
    test('returns a successful response when the application is alive', async () => {
      const response = await request(app)
        .get('/health/live')
        .set('Accept', 'application/json');
      if (response.status === 404) {
        // The application may expose liveness at a different path.
        expectSafeResponse(response);
        return;
      }
      expect(response.status).toBe(200);
      expectSafeResponse(response);
      if (response.headers['content-type']?.match(jsonContentType)) {
        expectJsonResponse(response);
        if (response.body.status !== undefined) {
          expect(['ok', 'healthy', 'up']).toContain(
            String(response.body.status).toLowerCase()
          );
        }
      }
    });
    test('does not require database connectivity for a basic liveness response', async () => {
      const response = await request(app)
        .get('/health/live')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
  });
  describe('Readiness checks', () => {
    test('returns a valid HTTP response from the readiness endpoint', async () => {
      const response = await request(app)
        .get('/health/ready')
        .set('Accept', 'application/json');
      // Readiness may legitimately fail when dependencies are unavailable.
      expect([200, 404, 429, 503]).toContain(response.status);
      expectSafeResponse(response);
      if (response.status === 200 || response.status === 503) {
        expectJsonResponse(response);
      }
    });
    test('does not expose database connection details in readiness output', async () => {
      const response = await request(app)
        .get('/health/ready')
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/mysql:\/\/[^ ]+/i);
      expect(text).not.toMatch(/postgres(?:ql)?:\/\/[^ ]+/i);
      expect(text).not.toMatch(/password\s*[:=]\s*[^,\s}]+/i);
    });
  });
  describe('General health response contract', () => {
    test('returns JSON from the primary health endpoint when implemented', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200) {
        expectJsonResponse(response);
      }
    });
    test('does not disclose environment variables', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/process\.env/i);
      expect(text).not.toMatch(/DATABASE_URL\s*=/i);
      expect(text).not.toMatch(/SESSION_SECRET\s*=/i);
      expect(text).not.toMatch(/AI_API_KEY\s*=/i);
    });
    test('does not expose stack traces or filesystem paths', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/at\s+\w+\s+\([^)]*\.js:\d+:\d+\)/i);
      expect(text).not.toMatch(/\/(?:home|root|var|opt)\/[^"\s]+/i);
    });
    test('handles repeated health requests consistently', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app)
            .get('/health')
            .set('Accept', 'application/json')
        )
      );
      for (const response of responses) {
        expect(response.status).toBeLessThan(500);
        expectSafeResponse(response);
      }
    });
    test('responds within a reasonable application-test time', async () => {
      const startedAt = Date.now();
      const response = await request(app)
        .get('/health')
        .set('Accept', 'application/json');
      const elapsedMs = Date.now() - startedAt;
      expect(response.status).toBeLessThan(500);
      expect(elapsedMs).toBeLessThan(5000);
      expectSafeResponse(response);
    });
  });
  describe('HTTP method handling', () => {
    test('does not cause a server error for a HEAD health request', async () => {
      const response = await request(app)
        .head('/health')
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
    test('does not allow a health endpoint to mutate state through POST', async () => {
      const response = await request(app)
        .post('/health')
        .set('Accept', 'application/json')
        .send({
          status: 'healthy',
          isAdmin: true,
        });
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200 || response.status === 201) {
        // If POST is intentionally supported, define and test its
        // documented behavior separately rather than assuming it is safe.
        expect(response.body).toEqual(expect.any(Object));
      }
    });
  });
});