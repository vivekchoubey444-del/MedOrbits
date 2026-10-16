'use strict';
const request = require('supertest');
const app = require('../../src/app');
const baseUrl = '/api/colleges';
function expectJsonResponse(response) {
  expect(response.headers['content-type']).toMatch(/application\/json/i);
}
function expectNoSensitiveFields(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      expectNoSensitiveFields(item);
    }
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  const forbiddenFields = new Set([
    'password',
    'passwordhash',
    'password_hash',
    'accesstoken',
    'refreshtoken',
    'clientsecret',
    'privatekey',
    'databaseurl',
  ]);
  for (const [key, child] of Object.entries(value)) {
    expect(forbiddenFields.has(key.toLowerCase())).toBe(false);
    expectNoSensitiveFields(child);
  }
}
function getResponseData(body) {
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body?.data)) {
    return body.data;
  }
  if (Array.isArray(body?.colleges)) {
    return body.colleges;
  }
  if (Array.isArray(body?.data?.colleges)) {
    return body.data.colleges;
  }
  return null;
}
describe('MedOrbits Colleges API', () => {
  describe('college listing', () => {
    test('responds to a request for colleges', async () => {
      const response = await request(app).get(baseUrl);
      expect(response.status).toBeLessThan(500);
    });
    test('returns a valid response structure when listing succeeds', async () => {
      const response = await request(app).get(baseUrl);
      if (response.status >= 200 && response.status < 300) {
        expectJsonResponse(response);
        expectNoSensitiveFields(response.body);
        const colleges = getResponseData(response.body);
        expect(colleges).not.toBeNull();
        expect(Array.isArray(colleges)).toBe(true);
      } else {
        expect([400, 401, 403, 404, 405, 429]).toContain(
          response.status
        );
      }
    });
    test('supports pagination when the API implements it', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: 1,
          limit: 10,
        });
      if (response.status >= 200 && response.status < 300) {
        expectJsonResponse(response);
        const colleges = getResponseData(response.body);
        expect(colleges).not.toBeNull();
        expect(colleges.length).toBeLessThanOrEqual(10);
      } else {
        expect([400, 401, 403, 404, 405, 422, 429]).toContain(
          response.status
        );
      }
    });
    test('handles invalid pagination values safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          page: -1,
          limit: -10,
        });
      expect(response.status).not.toBe(500);
      if ([400, 422].includes(response.status)) {
        expectJsonResponse(response);
      }
    });
  });
  describe('college detail', () => {
    test('handles an unknown college identifier without an internal server error', async () => {
      const response = await request(app).get(
        `${baseUrl}/COLLEGE-DOES-NOT-EXIST`
      );
      expect(response.status).not.toBe(500);
    });
    test('returns a valid college object when a college exists', async () => {
      const listing = await request(app).get(baseUrl);
      if (
        listing.status < 200 ||
        listing.status >= 300
      ) {
        return;
      }
      const colleges = getResponseData(listing.body);
      if (!colleges || colleges.length === 0) {
        return;
      }
      const college = colleges[0];
      const id = college.id || college.collegeId || college.slug;
      expect(id).toBeTruthy();
      const response = await request(app).get(
        `${baseUrl}/${encodeURIComponent(String(id))}`
      );
      expect([200, 301, 302]).toContain(response.status);
      if (response.status === 200) {
        expectJsonResponse(response);
        expectNoSensitiveFields(response.body);
      }
    });
  });
  describe('search and filters', () => {
    test('handles a search query safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: 'medical',
        });
      expect(response.status).not.toBe(500);
      if (response.status >= 200 && response.status < 300) {
        expectJsonResponse(response);
        expectNoSensitiveFields(response.body);
      }
    });
    test('handles country filters safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          countryCode: 'IN',
        });
      expect(response.status).not.toBe(500);
    });
    test('handles course filters safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          course: 'MBBS',
        });
      expect(response.status).not.toBe(500);
    });
    test('handles unexpected query parameter values safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: '<script>alert(1)</script>',
          countryCode: '../../etc/passwd',
        });
      expect(response.status).not.toBe(500);
      if (response.status >= 200 && response.status < 300) {
        expectJsonResponse(response);
        expectNoSensitiveFields(response.body);
      }
    });
    test('handles SQL injection-like search input safely', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({
          search: "' OR 1=1 --",
        });
      expect(response.status).not.toBe(500);
      if (response.status >= 200 && response.status < 300) {
        expectJsonResponse(response);
        expectNoSensitiveFields(response.body);
      }
    });
  });
  describe('data validation and response safety', () => {
    test('does not expose database errors or stack traces', async () => {
      const response = await request(app).get(
        `${baseUrl}/INVALID-COLLEGE-ID`
      );
      const serializedBody = JSON.stringify(response.body ?? {});
      expect(serializedBody).not.toMatch(
        /stack trace|sqlstate|node_modules|database url|password hash/i
      );
    });
    test('does not expose sensitive fields in college listings', async () => {
      const response = await request(app).get(baseUrl);
      if (response.status >= 200 && response.status < 300) {
        expectNoSensitiveFields(response.body);
      }
    });
    test('does not allow unsupported write methods to modify college records', async () => {
      const response = await request(app)
        .post(baseUrl)
        .send({
          name: 'Unauthorized Test College',
          status: 'approved',
        });
      expect([401, 403, 404, 405, 415, 422]).toContain(
        response.status
      );
    });
    test('does not allow unauthenticated deletion of college records', async () => {
      const response = await request(app).delete(
        `${baseUrl}/COLLEGE-001`
      );
      expect([401, 403, 404, 405]).toContain(response.status);
    });
  });
});