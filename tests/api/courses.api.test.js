'use strict';
const request = require('supertest');
const app = require('../../src/app');
describe('MedOrbits Courses API', () => {
  const baseUrl = '/api/courses';
  const configuredMax = Number(
    process.env.COURSES_TEST_MAX_LIMIT || 100
  );
  function expectSafeErrorResponse(response) {
    const serializedBody = JSON.stringify(response.body ?? {});
    expect(serializedBody).not.toMatch(
      /stack trace|node_modules|sqlstate|database url|password hash/i
    );
    expect(serializedBody).not.toMatch(
      /mysql:\/\/|postgres:\/\/|postgresql:\/\//i
    );
  }
  function expectCourseListResponse(response) {
    expect(response.headers['content-type']).toMatch(
      /application\/json/i
    );
    expect(response.body).toEqual(
      expect.objectContaining({
        success: expect.any(Boolean),
        data: expect.any(Array),
      })
    );
    for (const course of response.body.data) {
      expect(course).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        })
      );
      expect(course.id.trim()).not.toBe('');
      expect(course.name.trim()).not.toBe('');
    }
  }
  describe('course list response', () => {
    test('returns the documented course list response', async () => {
      const response = await request(app)
        .get(baseUrl)
        .expect(200);
      expectCourseListResponse(response);
    });
    test('returns a success flag when the course list is empty', async () => {
      const response = await request(app)
        .get(baseUrl)
        .expect(200);
      expect(typeof response.body.success).toBe('boolean');
      expect(response.body.data).toEqual(expect.any(Array));
    });
    test('does not expose sensitive implementation details', async () => {
      const response = await request(app)
        .get(baseUrl)
        .expect(200);
      expectSafeErrorResponse(response);
    });
    test('returns unique course identifiers', async () => {
      const response = await request(app)
        .get(baseUrl)
        .expect(200);
      expectCourseListResponse(response);
      const ids = response.body.data.map((course) => course.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
  describe('filters and pagination', () => {
    test('accepts valid pagination parameters', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: 10,
        })
        .expect(200);
      expectCourseListResponse(response);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
    test.each([
      ['page', '0'],
      ['page', '-1'],
      ['page', 'invalid'],
      ['page', '1.5'],
      ['limit', '0'],
      ['limit', '-5'],
      ['limit', 'invalid'],
      ['limit', '1.5'],
    ])(
      'validates invalid %s parameter: %s',
      async (parameter, value) => {
        const response = await request(app)
          .get(baseUrl)
          .query({
            page: 1,
            limit: 10,
            [parameter]: value,
          });
        expect([400, 422]).toContain(response.status);
        expectSafeErrorResponse(response);
      }
    );
    test('rejects pagination limits above the configured maximum', async () => {
      expect(Number.isInteger(configuredMax)).toBe(true);
      expect(configuredMax).toBeGreaterThan(0);
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: configuredMax + 1,
        });
      expect([400, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
    test('handles supported filters without returning a server error', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          category: 'medical',
          search: 'medicine',
          page: 1,
          limit: 10,
        });
      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expectCourseListResponse(response);
      } else {
        expect([400, 422]).toContain(response.status);
        expectSafeErrorResponse(response);
      }
    });
    test('handles an empty search query safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: '',
          page: 1,
          limit: 10,
        });
      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expectCourseListResponse(response);
      } else {
        expect([400, 422]).toContain(response.status);
      }
    });
    test('handles SQL injection-like search input safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: "' OR 1=1 --",
          page: 1,
          limit: 10,
        });
      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expectCourseListResponse(response);
      } else {
        expect([400, 422]).toContain(response.status);
      }
      expectSafeErrorResponse(response);
    });
    test('handles HTML-like search input safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: '<script>alert(1)</script>',
        });
      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expectCourseListResponse(response);
      } else {
        expect([400, 422]).toContain(response.status);
      }
      expectSafeErrorResponse(response);
    });
  });
  describe('course identifiers', () => {
    test('handles an unknown course identifier safely', async () => {
      const response = await request(app)
        .get(`${baseUrl}/COURSE-DOES-NOT-EXIST`);
      expect([400, 404, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
    test('rejects malformed course identifiers safely', async () => {
      const response = await request(app)
        .get(`${baseUrl}/%00invalid`);
      expect([400, 404, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
    test('handles an encoded path traversal-like identifier safely', async () => {
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent('../../etc/passwd')}`);
      expect([400, 404, 422]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
  });
  describe('HTTP method handling', () => {
    test('does not allow unsupported course creation through the public API', async () => {
      const response = await request(app)
        .post(baseUrl)
        .send({
          id: 'COURSE-UNAUTHORIZED',
          name: 'Unauthorized Course',
        });
      expect([401, 403, 404, 405, 415, 422]).toContain(
        response.status
      );
      expectSafeErrorResponse(response);
    });
    test('does not allow unsupported course deletion through the public API', async () => {
      const response = await request(app)
        .delete(`${baseUrl}/COURSE-001`);
      expect([401, 403, 404, 405]).toContain(response.status);
      expectSafeErrorResponse(response);
    });
  });
});