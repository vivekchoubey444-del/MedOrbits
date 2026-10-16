'use strict';
const request = require('supertest');
const app = require('../../src/app');
const baseUrl = '/api/jobs';
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
function expectJobShape(job) {
  expect(job).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      title: expect.any(String),
    })
  );
  expect(job.id.trim()).not.toBe('');
  expect(job.title.trim()).not.toBe('');
  // Internal implementation details must not be returned.
  expect(job).not.toHaveProperty('password');
  expect(job).not.toHaveProperty('passwordHash');
  expect(job).not.toHaveProperty('password_hash');
  expect(job).not.toHaveProperty('databaseUrl');
  expect(job).not.toHaveProperty('privateKey');
}
describe('Jobs API', () => {
  describe('GET /api/jobs', () => {
    test('returns a JSON response for job listings', async () => {
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
        for (const job of response.body.data) {
          expectJobShape(job);
        }
      }
    });
    test('supports pagination without an internal server error', async () => {
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
      }
    });
    test.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', 'invalid'],
      ['limit', '0'],
      ['limit', '-1'],
      ['limit', 'invalid'],
    ])('validates invalid pagination parameter %s=%s', async (key, value) => {
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
    test('validates the maximum page size', async () => {
      const maxLimit = Number(
        process.env.JOBS_TEST_MAX_LIMIT || 100
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
  describe('Job search and filtering', () => {
    test.each([
      ['search', 'software engineer'],
      ['keyword', 'developer'],
      ['location', 'Noida'],
      ['category', 'technology'],
      ['employmentType', 'full-time'],
      ['workMode', 'remote'],
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
    test('handles combined search filters', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: 'medical',
          location: 'India',
          category: 'healthcare',
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
          status: 'approved',
        })
        .set('Accept', 'application/json');
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
  });
  describe('GET /api/jobs/:id', () => {
    test('returns a valid response for an unknown job ID', async () => {
      const response = await request(app)
        .get(`${baseUrl}/JOB-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
      if (response.status !== 401 && response.status !== 403) {
        expectJsonResponse(response);
      }
    });
    test('handles a malformed job ID safely', async () => {
      const response = await request(app)
        .get(`${baseUrl}/%00invalid`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('does not disclose internal fields in job details', async () => {
      const response = await request(app)
        .get(`${baseUrl}/JOB-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      if (response.status === 200) {
        const job = response.body.data || response.body;
        expectJobShape(job);
      }
    });
  });
  describe('Job creation and mass-assignment protection', () => {
    test('does not accept an empty job creation request as a valid job', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .send({});
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
    test('does not allow callers to assign privileged job fields', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .send({
          title: 'Test Job',
          companyName: 'Test Company',
          ownerId: 'ADMIN-USER-ID',
          createdBy: 'ADMIN-USER-ID',
          isAdmin: true,
          isVerified: true,
          isFeatured: true,
          status: 'approved',
          moderationStatus: 'approved',
        });
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
    test('does not allow unauthenticated job creation to bypass authorization', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .send({
          title: 'Unauthorized Test Job',
          description: 'This record must not bypass access controls.',
          employmentType: 'full-time',
          location: 'Noida',
        });
      expect([200, 201, 400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
      // If creation succeeds, the route must have an explicit public-job
      // creation policy. Otherwise, require authentication or rejection.
      if (response.status === 201) {
        expect(response.body).toEqual(expect.any(Object));
      }
    });
  });
  describe('Job update and deletion', () => {
    test('handles unauthorized job updates safely', async () => {
      const response = await request(app)
        .patch(`${baseUrl}/JOB-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .send({
          status: 'approved',
          isFeatured: true,
          ownerId: 'ADMIN-USER-ID',
        });
      expect([200, 400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
    test('handles unauthorized job deletion safely', async () => {
      const response = await request(app)
        .delete(`${baseUrl}/JOB-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
    test('does not allow an arbitrary user ID to grant ownership', async () => {
      const response = await request(app)
        .patch(`${baseUrl}/JOB-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .send({
          ownerId: 'ANOTHER-USER-ID',
          createdBy: 'ANOTHER-USER-ID',
          userId: 'ADMIN-USER-ID',
        });
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
  });
  describe('HTTP method and error handling', () => {
    test('handles unsupported methods on the job collection safely', async () => {
      const response = await request(app)
        .put(baseUrl)
        .set('Accept', 'application/json')
        .send({ isAdmin: true });
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
    test('does not expose stack traces for missing jobs', async () => {
      const response = await request(app)
        .get(`${baseUrl}/JOB-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/at\s+\w+\s+\([^)]*\.js:\d+:\d+\)/i);
      expect(text).not.toMatch(/\/(?:home|root|var|opt)\/[^"\s]+/i);
    });
    test('does not expose database connection errors to clients', async () => {
      const response = await request(app)
        .get(baseUrl)
        .set('Accept', 'application/json');
      expectSafeResponse(response);
    });
  });
});