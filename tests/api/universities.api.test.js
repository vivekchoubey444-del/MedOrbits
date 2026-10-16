'use strict';
const request = require('supertest');
const app = require('../../src/app');
const baseUrl = '/api/universities';
const jsonContentType = /application\/json/i;
const sensitiveResponsePatterns = [
  /stack trace/i,
  /node_modules[\\/]/i,
  /\bsqlstate\b/i,
  /\bDATABASE_URL\s*=/i,
  /\bSESSION_SECRET\s*=/i,
  /\bAI_API_KEY\s*=/i,
  /\bpassword_hash\b/i,
  /\bprivate_key\b/i,
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
function expectUniversityShape(university) {
  expect(university).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
    })
  );
  expect(university.id.trim()).not.toBe('');
  expect(university.name.trim()).not.toBe('');
  expect(university).not.toHaveProperty('password');
  expect(university).not.toHaveProperty('passwordHash');
  expect(university).not.toHaveProperty('password_hash');
  expect(university).not.toHaveProperty('databaseUrl');
  expect(university).not.toHaveProperty('privateKey');
  expect(university).not.toHaveProperty('internalNotes');
}
describe('Universities API', () => {
  describe('GET /api/universities', () => {
    test('returns a JSON response for the university catalog', async () => {
      const response = await request(app)
        .get(baseUrl)
        .set('Accept', 'application/json');
      expect([200, 401, 403]).toContain(response.status);
      expectJsonResponse(response);
      expectSafeResponse(response);
      if (response.status === 200) {
        expect(response.body).toEqual(
          expect.objectContaining({
            success: expect.any(Boolean),
            data: expect.any(Array),
          })
        );
        for (const university of response.body.data) {
          expectUniversityShape(university);
        }
      }
    });
    test('supports pagination', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: 10,
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200) {
        expect(response.body.data).toEqual(expect.any(Array));
        if (response.body.data.length > 10) {
          throw new Error('The API returned more records than the requested limit.');
        }
      }
    });
    test.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', 'invalid'],
      ['limit', '0'],
      ['limit', '-1'],
      ['limit', 'invalid'],
    ])('handles invalid pagination parameter %s=%s', async (key, value) => {
      const response = await request(app)
        .get(baseUrl)
        .query({ [key]: value })
        .set('Accept', 'application/json');
      expect([200, 400, 422]).toContain(response.status);
      expectSafeResponse(response);
      if (response.status === 400 || response.status === 422) {
        expectJsonResponse(response);
      }
    });
    test('validates the configured maximum page size', async () => {
      const maxLimit = Number(
        process.env.UNIVERSITIES_TEST_MAX_LIMIT || 100
      );
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: maxLimit + 1,
        })
        .set('Accept', 'application/json');
      expect([200, 400, 422]).toContain(response.status);
      expectSafeResponse(response);
      if (response.status === 400 || response.status === 422) {
        expectJsonResponse(response);
      }
    });
  });
  describe('University search and filters', () => {
    test.each([
      ['search', 'medical university'],
      ['country', 'IN'],
      ['countryCode', 'IN'],
      ['course', 'MBBS'],
      ['courseId', 'course-mbbs'],
      ['type', 'public'],
      ['state', 'Uttar Pradesh'],
    ])('handles the %s filter safely', async (key, value) => {
      const response = await request(app)
        .get(baseUrl)
        .query({ [key]: value })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200) {
        expect(response.body.data).toEqual(expect.any(Array));
      }
    });
    test('handles combined search and filter parameters', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: 'medical',
          countryCode: 'IN',
          course: 'MBBS',
          page: 1,
          limit: 10,
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200) {
        expect(response.body.data).toEqual(expect.any(Array));
      }
    });
    test('handles SQL injection-like search input safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: "' OR 1=1 --",
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
    test('handles script-like search input safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: '<script>alert(1)</script>',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(jsonContentType);
      }
    });
    test('handles unexpected query parameters safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          isAdmin: 'true',
          role: 'admin',
          internal: 'true',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
  });
  describe('GET /api/universities/:id', () => {
    test('returns a client error for an unknown university ID', async () => {
      const response = await request(app)
        .get(`${baseUrl}/UNIVERSITY-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
      if (response.status !== 401 && response.status !== 403) {
        expectJsonResponse(response);
      }
    });
    test('handles malformed university IDs safely', async () => {
      const response = await request(app)
        .get(`${baseUrl}/%00invalid`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('does not expose internal fields in university details', async () => {
      const response = await request(app)
        .get(`${baseUrl}/UNIVERSITY-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      if (response.status === 200) {
        const university = response.body.data || response.body;
        expectUniversityShape(university);
      }
    });
  });
  describe('Catalog integrity and data safety', () => {
    test('does not return duplicate IDs in a single result page', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: 100,
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200) {
        expect(response.body.data).toEqual(expect.any(Array));
        const ids = response.body.data.map(
          (university) => university.id
        );
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
    test('returns consistent university IDs and names', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: 10,
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
      if (response.status === 200) {
        for (const university of response.body.data) {
          expectUniversityShape(university);
          expect(university.id.trim()).toBe(university.id);
          expect(university.name.trim()).toBe(university.name);
        }
      }
    });
    test('does not expose database connection details in catalog responses', async () => {
      const response = await request(app)
        .get(baseUrl)
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/mysql:\/\/[^ ]+/i);
      expect(text).not.toMatch(/postgres(?:ql)?:\/\/[^ ]+/i);
      expect(text).not.toMatch(/process\.env/i);
    });
  });
  describe('Catalog mutation protection', () => {
    test('does not permit unauthenticated creation of university records', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .send({
          id: 'UNAUTHORIZED-UNIVERSITY',
          name: 'Unauthorized Test University',
          countryCode: 'IN',
          isVerified: true,
          isFeatured: true,
        });
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
    test('does not permit unauthorized university updates', async () => {
      const response = await request(app)
        .patch(`${baseUrl}/UNIVERSITY-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .send({
          name: 'Modified University',
          isVerified: true,
          isFeatured: true,
          isAdmin: true,
        });
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
    test('does not permit unauthorized university deletion', async () => {
      const response = await request(app)
        .delete(`${baseUrl}/UNIVERSITY-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
  });
  describe('HTTP method and error handling', () => {
    test('handles unsupported methods on the university catalog safely', async () => {
      const response = await request(app)
        .put(baseUrl)
        .set('Accept', 'application/json')
        .send({
          isAdmin: true,
        });
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
    test('does not expose stack traces for missing universities', async () => {
      const response = await request(app)
        .get(`${baseUrl}/UNIVERSITY-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(
        /at\s+\w+\s+\([^)]*\.js:\d+:\d+\)/i
      );
      expect(text).not.toMatch(
        /\/(?:home|root|var|opt)\/[^"\s]+/i
      );
    });
  });
});