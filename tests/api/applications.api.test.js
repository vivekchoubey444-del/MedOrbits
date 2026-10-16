'use strict';
const request = require('supertest');
const app = require('../../src/app');
const baseUrl = '/api/applications';
const validApplication = {
  courseId: 'COURSE-001',
  collegeId: 'COLLEGE-001',
  applicantName: 'Test Applicant',
  applicantEmail: 'applicant@example.com',
  notes: 'Application test',
};
/**
 * MedOrbits applications API security and validation tests.
 *
 * Required test setup:
 * - Jest
 * - Supertest
 * - A dedicated test database or isolated test fixtures
 * - A real test authentication adapter
 *
 * Authentication adapter contract:
 *
 * Configure MEDORBITS_TEST_AUTH_MODULE to point to a test-only module
 * exporting:
 *
 *   async function authenticateAsUser(userId, role)
 *     => { token: 'valid-test-token' }
 *
 * The adapter must create or retrieve a test user and issue a token
 * accepted by the application's real authentication middleware.
 *
 * Do not enable test authentication in production.
 */
const authModulePath = process.env.MEDORBITS_TEST_AUTH_MODULE;
let authenticationAdapter;
if (authModulePath) {
  // This module must be trusted, test-only code.
  // eslint-disable-next-line import/no-dynamic-require, global-require
  authenticationAdapter = require(require('node:path').resolve(authModulePath));
}
async function authenticateAsUser(userId, role = 'user') {
  if (
    !authenticationAdapter ||
    typeof authenticationAdapter.authenticateAsUser !== 'function'
  ) {
    throw new Error(
      'Configure MEDORBITS_TEST_AUTH_MODULE with a trusted test-only ' +
      'authentication adapter implementing authenticateAsUser(userId, role).'
    );
  }
  const identity = await authenticationAdapter.authenticateAsUser(
    userId,
    role
  );
  if (!identity || typeof identity.token !== 'string' || !identity.token) {
    throw new Error(
      'The authentication adapter must return a valid token.'
    );
  }
  return identity;
}
function authorization(token) {
  return `Bearer ${token}`;
}
function applicationIdOf(application) {
  return application?.id || application?.applicationId;
}
async function createApplicationAs(owner, overrides = {}) {
  const response = await request(app)
    .post(baseUrl)
    .set('Authorization', authorization(owner.token))
    .send({
      ...validApplication,
      applicantEmail: `applicant-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}@example.test`,
      ...overrides,
    });
  expect([200, 201]).toContain(response.status);
  const application = response.body?.data || response.body;
  const applicationId = applicationIdOf(application);
  expect(applicationId).toBeTruthy();
  return application;
}
function expectNoPrivilegeEscalation(application) {
  expect(application.ownerId).not.toBe('another-user');
  expect(application.userId).not.toBe('another-user');
  expect(application.role).not.toBe('admin');
  expect(application.status).not.toBe('approved');
}
describe('Applications API', () => {
  describe('authentication', () => {
    test('requires authentication for private application data', async () => {
      const endpoints = [
        { method: 'get', url: baseUrl },
        { method: 'get', url: `${baseUrl}/APP-001` },
        { method: 'post', url: baseUrl, body: validApplication },
        {
          method: 'patch',
          url: `${baseUrl}/APP-001`,
          body: { notes: 'Updated notes' },
        },
        { method: 'delete', url: `${baseUrl}/APP-001` },
      ];
      for (const endpoint of endpoints) {
        let operation = request(app)[endpoint.method](endpoint.url);
        if (endpoint.body) {
          operation = operation.send(endpoint.body);
        }
        const response = await operation;
        expect([401, 403]).toContain(response.status);
      }
    });
  });
  describe('ownership and role permissions', () => {
    test('prevents one applicant from accessing another applicant application', async () => {
      const owner = await authenticateAsUser('test-owner', 'user');
      const otherUser = await authenticateAsUser('test-other', 'user');
      const application = await createApplicationAs(owner);
      const applicationId = applicationIdOf(application);
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent(applicationId)}`)
        .set('Authorization', authorization(otherUser.token));
      expect([403, 404]).toContain(response.status);
    });
    test('prevents applicants from changing application ownership or privileged fields', async () => {
      const owner = await authenticateAsUser('test-owner', 'user');
      const application = await createApplicationAs(owner);
      const applicationId = applicationIdOf(application);
      const response = await request(app)
        .patch(`${baseUrl}/${encodeURIComponent(applicationId)}`)
        .set('Authorization', authorization(owner.token))
        .send({
          ownerId: 'another-user',
          userId: 'another-user',
          role: 'admin',
          status: 'approved',
        });
      if (response.status >= 200 && response.status < 300) {
        const updated = response.body?.data || response.body;
        expectNoPrivilegeEscalation(updated);
      } else {
        expect([400, 403, 404, 422]).toContain(response.status);
      }
      // Verify persisted state, not only the update response.
      const readBack = await request(app)
        .get(`${baseUrl}/${encodeURIComponent(applicationId)}`)
        .set('Authorization', authorization(owner.token));
      if (readBack.status === 200) {
        const persisted = readBack.body?.data || readBack.body;
        expectNoPrivilegeEscalation(persisted);
      }
    });
    test('restricts privileged status operations to authorized roles', async () => {
      const applicant = await authenticateAsUser(
        'test-applicant',
        'user'
      );
      const response = await request(app)
        .patch(`${baseUrl}/APP-001/status`)
        .set('Authorization', authorization(applicant.token))
        .send({ status: 'approved' });
      expect([401, 403, 404, 405, 422]).toContain(response.status);
    });
  });
  describe('payload validation', () => {
    test('rejects creation when required fields are missing', async () => {
      const user = await authenticateAsUser(
        'test-applicant',
        'user'
      );
      const response = await request(app)
        .post(baseUrl)
        .set('Authorization', authorization(user.token))
        .send({});
      expect([400, 422]).toContain(response.status);
    });
    test('rejects malformed applicant email addresses', async () => {
      const user = await authenticateAsUser(
        'test-applicant',
        'user'
      );
      const response = await request(app)
        .post(baseUrl)
        .set('Authorization', authorization(user.token))
        .send({
          ...validApplication,
          applicantEmail: 'not-an-email',
        });
      expect([400, 422]).toContain(response.status);
    });
    test('rejects invalid update payloads', async () => {
      const user = await authenticateAsUser(
        'test-applicant',
        'user'
      );
      const response = await request(app)
        .patch(`${baseUrl}/APP-001`)
        .set('Authorization', authorization(user.token))
        .send({
          applicantEmail: 'invalid-email',
        });
      expect([400, 404, 422]).toContain(response.status);
    });
    test('rejects or safely ignores unexpected privileged fields on creation', async () => {
      const user = await authenticateAsUser(
        'test-applicant',
        'user'
      );
      const response = await request(app)
        .post(baseUrl)
        .set('Authorization', authorization(user.token))
        .send({
          ...validApplication,
          applicantEmail:
            `mass-assignment-${Date.now()}@example.test`,
          ownerId: 'another-user',
          userId: 'another-user',
          role: 'admin',
          status: 'approved',
        });
      if (response.status >= 200 && response.status < 300) {
        const application = response.body?.data || response.body;
        expectNoPrivilegeEscalation(application);
      } else {
        expect([400, 403, 409, 415, 422]).toContain(response.status);
      }
    });
    test('rejects unsupported application status values', async () => {
      const user = await authenticateAsUser(
        'test-applicant',
        'user'
      );
      const application = await createApplicationAs(user);
      const applicationId = applicationIdOf(application);
      const response = await request(app)
        .patch(`${baseUrl}/${encodeURIComponent(applicationId)}`)
        .set('Authorization', authorization(user.token))
        .send({
          status: 'arbitrary-unapproved-status',
        });
      if (response.status >= 200 && response.status < 300) {
        const updated = response.body?.data || response.body;
        expect(updated.status).not.toBe(
          'arbitrary-unapproved-status'
        );
      } else {
        expect([400, 403, 404, 422]).toContain(response.status);
      }
    });
  });
  describe('response security', () => {
    test('does not expose password hashes, secrets, or authentication tokens', async () => {
      const user = await authenticateAsUser(
        'test-applicant',
        'user'
      );
      const application = await createApplicationAs(user);
      const applicationId = applicationIdOf(application);
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent(applicationId)}`)
        .set('Authorization', authorization(user.token));
      expect(response.status).toBe(200);
      const body = response.body?.data || response.body;
      const serialized = JSON.stringify(body).toLowerCase();
      for (const forbiddenField of [
        '"password"',
        '"passwordhash"',
        '"password_hash"',
        '"accesstoken"',
        '"refreshtoken"',
        '"clientsecret"',
        '"privatekey"',
      ]) {
        expect(serialized).not.toContain(forbiddenField);
      }
    });
  });
});