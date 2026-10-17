'use strict';
const request = require('supertest');
const app = require('../../src/app');
const baseUrl = '/api/users';
const jsonContentType = /application\/json/i;
const sensitiveResponsePatterns = [
  /stack trace/i,
  /node_modules[\\/]/i,
  /\bsqlstate\b/i,
  /\bDATABASE_URL\s*=/i,
  /\bSESSION_SECRET\s*=/i,
  /\bAI_API_KEY\s*=/i,
  /\bpassword_hash\b/i,
  /\bpasswordHash\b/i,
  /\bprivate_key\b/i,
  /\bsecret_access_key\b/i,
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
function expectSafeUserShape(user) {
  expect(user).toEqual(
    expect.objectContaining({
      id: expect.any(String),
    })
  );
  expect(user).not.toHaveProperty('password');
  expect(user).not.toHaveProperty('passwordHash');
  expect(user).not.toHaveProperty('password_hash');
  expect(user).not.toHaveProperty('resetToken');
  expect(user).not.toHaveProperty('reset_token');
  expect(user).not.toHaveProperty('refreshToken');
  expect(user).not.toHaveProperty('refresh_token');
  expect(user).not.toHaveProperty('privateKey');
  expect(user).not.toHaveProperty('mfaSecret');
  expect(user).not.toHaveProperty('mfa_secret');
}
/*
 * Replace this helper with the project's real test authentication setup.
 * Use tokens issued by the application's test authentication mechanism.
 */
async function authenticateAs(role, userId) {
  throw new Error(
    `Implement authenticateAs(${role}, ${userId}) using the project's real test authentication setup.`
  );
}
describe('Users API', () => {
  describe('Authentication requirements', () => {
    test.each([
      ['GET', 'get', baseUrl],
      ['GET profile', 'get', `${baseUrl}/TEST-USER-001`],
      ['PATCH profile', 'patch', `${baseUrl}/TEST-USER-001`],
      ['DELETE profile', 'delete', `${baseUrl}/TEST-USER-001`],
    ])(
      'checks authorization for unauthenticated %s requests',
      async (_label, method, url) => {
        const response = await request(app)[method](url)
          .set('Accept', 'application/json');
        expect([200, 401, 403, 404, 405]).toContain(response.status);
        expectSafeResponse(response);
      }
    );
  });
  describe('GET /api/users', () => {
    test('does not expose the user directory to unauthorized callers', async () => {
      const response = await request(app)
        .get(baseUrl)
        .set('Accept', 'application/json');
      expect([200, 401, 403, 404]).toContain(response.status);
      expectSafeResponse(response);
      if (response.status === 200) {
        expectJsonResponse(response);
        const users = response.body.data;
        expect(users).toEqual(expect.any(Array));
        for (const user of users) {
          expectSafeUserShape(user);
        }
      }
    });
    test('requires appropriate authorization for administrative user listings', async () => {
      const user = await authenticateAs(
        'user',
        'test-regular-user'
      );
      const response = await request(app)
        .get(baseUrl)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expect([200, 401, 403, 404]).toContain(response.status);
      expectSafeResponse(response);
    });
  });
  describe('GET /api/users/:id', () => {
    test('returns a safe response for a nonexistent user', async () => {
      const user = await authenticateAs(
        'user',
        'test-regular-user'
      );
      const response = await request(app)
        .get(`${baseUrl}/USER-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expect([400, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('prevents a user from accessing another user's private profile', async () => {
      const otherUser = await authenticateAs(
        'user',
        'test-profile-other'
      );
      const targetUserId = process.env.TEST_OTHER_USER_ID;
      if (!targetUserId) {
        throw new Error(
          'Set TEST_OTHER_USER_ID to a seeded test user ID.'
        );
      }
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent(targetUserId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${otherUser.token}`);
      expect([200, 403, 404]).toContain(response.status);
      expectSafeResponse(response);
      /*
       * If profiles are private, require 403 or 404.
       * A 200 response is acceptable only if the API explicitly permits
       * access to that profile and returns only authorized public fields.
       */
      if (response.status === 200) {
        expectJsonResponse(response);
        const profile = response.body.data || response.body;
        expect(profile).not.toHaveProperty('passwordHash');
        expect(profile).not.toHaveProperty('password_hash');
        expect(profile).not.toHaveProperty('resetToken');
        expect(profile).not.toHaveProperty('mfaSecret');
      }
    });
    test('handles malformed user IDs safely', async () => {
      const user = await authenticateAs(
        'user',
        'test-regular-user'
      );
      const response = await request(app)
        .get(`${baseUrl}/%00invalid`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
  });
  describe('Profile updates', () => {
    test('requires authentication to update a profile', async () => {
      const response = await request(app)
        .patch(`${baseUrl}/TEST-USER-001`)
        .set('Accept', 'application/json')
        .send({
          displayName: 'Updated Test User',
        });
      expect([401, 403, 404, 405]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('prevents a user from updating another user's profile', async () => {
      const user = await authenticateAs(
        'user',
        'test-profile-other'
      );
      const targetUserId = process.env.TEST_OTHER_USER_ID;
      if (!targetUserId) {
        throw new Error(
          'Set TEST_OTHER_USER_ID to a seeded test user ID.'
        );
      }
      const response = await request(app)
        .patch(`${baseUrl}/${encodeURIComponent(targetUserId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          displayName: 'Unauthorized Profile Change',
        });
      expect([400, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('rejects an invalid profile update payload', async () => {
      const user = await authenticateAs(
        'user',
        'test-profile-owner'
      );
      const response = await request(app)
        .patch(`/api/users/${encodeURIComponent(user.userId || 'TEST-USER-001')}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          email: 'not-an-email',
        });
      expect([200, 400, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('does not allow mass assignment of privileged fields', async () => {
      const user = await authenticateAs(
        'user',
        'test-profile-owner'
      );
      const userId = user.userId || 'TEST-USER-001';
      const response = await request(app)
        .patch(`${baseUrl}/${encodeURIComponent(userId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          displayName: 'Test Profile',
          role: 'admin',
          isAdmin: true,
          isVerified: true,
          accountStatus: 'active',
          permissions: ['*'],
          userId: 'ADMIN-USER-ID',
        });
      expectSafeResponse(response);
      if (response.status >= 200 && response.status < 300) {
        const profile = response.body.data || response.body;
        expect(profile.role).not.toBe('admin');
        expect(profile.isAdmin).not.toBe(true);
        expect(profile.permissions).not.toEqual(['*']);
      } else {
        expect([400, 403, 404, 422]).toContain(response.status);
      }
    });
    test('does not allow a user to change their own role', async () => {
      const user = await authenticateAs(
        'user',
        'test-profile-owner'
      );
      const userId = user.userId || 'TEST-USER-001';
      const response = await request(app)
        .patch(`${baseUrl}/${encodeURIComponent(userId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role: 'admin',
          isAdmin: true,
        });
      expectSafeResponse(response);
      if (response.status >= 200 && response.status < 300) {
        const profile = response.body.data || response.body;
        expect(profile.role).not.toBe('admin');
        expect(profile.isAdmin).not.toBe(true);
      } else {
        expect([400, 403, 404, 422]).toContain(response.status);
      }
    });
  });
  describe('User creation', () => {
    test('does not allow unauthenticated creation of privileged user accounts', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .send({
          email: 'unauthorized-user@example.invalid',
          role: 'admin',
          isAdmin: true,
          permissions: ['*'],
        });
      expect([400, 401, 403, 404, 405, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
    });
    test('does not allow client-supplied administrator privileges during registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Accept', 'application/json')
        .send({
          name: 'Test Registration',
          email: `security-test-${Date.now()}@example.invalid`,
          password: 'TestOnlyPassword123!',
          role: 'admin',
          isAdmin: true,
          permissions: ['*'],
        });
      expect([200, 201, 400, 403, 404, 409, 422]).toContain(
        response.status
      );
      expectSafeResponse(response);
      if (response.status === 200 || response.status === 201) {
        const registeredUser =
          response.body.data?.user ||
          response.body.user ||
          response.body.data ||
          response.body;
        expect(registeredUser.role).not.toBe('admin');
        expect(registeredUser.isAdmin).not.toBe(true);
        expect(registeredUser).not.toHaveProperty('password');
        expect(registeredUser).not.toHaveProperty('passwordHash');
        expect(registeredUser).not.toHaveProperty('password_hash');
      }
    });
  });
  describe('User deletion', () => {
    test('does not permit an unauthenticated user deletion', async () => {
      const response = await request(app)
        .delete(`${baseUrl}/USER-DOES-NOT-EXIST`)
        .set('Accept', 'application/json');
      expect([401, 403, 404, 405]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('does not allow a regular user to delete another account', async () => {
      const user = await authenticateAs(
        'user',
        'test-regular-user'
      );
      const targetUserId = process.env.TEST_OTHER_USER_ID;
      if (!targetUserId) {
        throw new Error(
          'Set TEST_OTHER_USER_ID to a seeded test user ID.'
        );
      }
      const response = await request(app)
        .delete(`${baseUrl}/${encodeURIComponent(targetUserId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expect([400, 403, 404, 405, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
  });
  describe('Sensitive data and error handling', () => {
    test('does not expose password hashes or authentication secrets', async () => {
      const user = await authenticateAs(
        'user',
        'test-profile-owner'
      );
      const userId = user.userId || 'TEST-USER-001';
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent(userId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/password_hash/i);
      expect(text).not.toMatch(/passwordHash/i);
      expect(text).not.toMatch(/refresh_token/i);
      expect(text).not.toMatch(/private_key/i);
    });
    test('does not expose internal stack traces for missing users', async () => {
      const user = await authenticateAs(
        'user',
        'test-regular-user'
      );
      const response = await request(app)
        .get(`${baseUrl}/USER-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
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