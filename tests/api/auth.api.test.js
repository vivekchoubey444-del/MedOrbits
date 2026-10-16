'use strict';
const request = require('supertest');
const app = require('../../src/app');
const registerUrl = '/api/auth/register';
const loginUrl = '/api/auth/login';
const validRegistration = {
  name: 'Test Applicant',
  email: 'new-user@example.com',
  password: 'Test-Only-Password-91!x',
};
const validLogin = {
  email: 'existing-user@example.com',
  password: 'Incorrect-Test-Password-91!x',
};
function expectValidationFailure(response) {
  expect([400, 422]).toContain(response.status);
}
function expectSafeAuthenticationError(response) {
  expect([400, 401, 422]).toContain(response.status);
  const serializedBody = JSON.stringify(response.body ?? {});
  const serializedBodyLower = serializedBody.toLowerCase();
  // Never expose internal implementation details.
  expect(serializedBody).not.toMatch(
    /stack trace|password hash|database url|sqlstate|node_modules/i
  );
  // Never echo the submitted password or sensitive login information.
  expect(serializedBody).not.toContain(validLogin.password);
  expect(serializedBody).not.toContain(validRegistration.password);
  // Authentication errors should not echo the submitted email address.
  expect(serializedBody).not.toContain(validLogin.email);
  // Check common names for sensitive response fields.
  const forbiddenFields = [
    '"password"',
    '"passwordhash"',
    '"password_hash"',
    '"accesstoken"',
    '"refreshtoken"',
    '"clientsecret"',
    '"privatekey"',
  ];
  for (const field of forbiddenFields) {
    expect(serializedBodyLower).not.toContain(field);
  }
}
describe('MedOrbits Authentication API', () => {
  describe('registration validation', () => {
    test('rejects a registration payload with required fields missing', async () => {
      const response = await request(app)
        .post(registerUrl)
        .send({});
      expectValidationFailure(response);
    });
    test('rejects malformed email addresses', async () => {
      const response = await request(app)
        .post(registerUrl)
        .send({
          ...validRegistration,
          email: 'not-an-email',
        });
      expectValidationFailure(response);
    });
    test('rejects passwords that do not meet the configured policy', async () => {
      const response = await request(app)
        .post(registerUrl)
        .send({
          ...validRegistration,
          password: '123',
        });
      expectValidationFailure(response);
    });
    test('rejects registration with an invalid name', async () => {
      const response = await request(app)
        .post(registerUrl)
        .send({
          ...validRegistration,
          name: '',
        });
      expectValidationFailure(response);
    });
    test('does not expose submitted passwords in registration errors', async () => {
      const response = await request(app)
        .post(registerUrl)
        .send({
          ...validRegistration,
          email: 'invalid-email',
        });
      expectValidationFailure(response);
      const body = JSON.stringify(response.body ?? {});
      expect(body).not.toContain(validRegistration.password);
    });
  });
  describe('login validation', () => {
    test('rejects a login payload with required fields missing', async () => {
      const response = await request(app)
        .post(loginUrl)
        .send({});
      expectValidationFailure(response);
    });
    test('rejects malformed email addresses', async () => {
      const response = await request(app)
        .post(loginUrl)
        .send({
          email: 'invalid-email',
          password: validLogin.password,
        });
      expectValidationFailure(response);
    });
    test('returns a safe error for invalid credentials', async () => {
      const response = await request(app)
        .post(loginUrl)
        .send(validLogin);
      expectSafeAuthenticationError(response);
    });
    test('does not return authentication tokens for invalid credentials', async () => {
      const response = await request(app)
        .post(loginUrl)
        .send(validLogin);
      expect([400, 401, 422]).toContain(response.status);
      const body = response.body || {};
      expect(body.accessToken).toBeUndefined();
      expect(body.refreshToken).toBeUndefined();
      expect(body.access_token).toBeUndefined();
      expect(body.refresh_token).toBeUndefined();
    });
    test('does not disclose whether an account exists', async () => {
      const existingAccountResponse = await request(app)
        .post(loginUrl)
        .send({
          email: validLogin.email,
          password: validLogin.password,
        });
      const nonexistentAccountResponse = await request(app)
        .post(loginUrl)
        .send({
          email: `missing-${Date.now()}@example.test`,
          password: validLogin.password,
        });
      expect([400, 401, 422]).toContain(
        existingAccountResponse.status
      );
      expect([400, 401, 422]).toContain(
        nonexistentAccountResponse.status
      );
      // Compare normalized public messages only when both responses
      // expose a message. Avoid requiring identical internal error objects.
      const existingMessage =
        existingAccountResponse.body?.message;
      const missingMessage =
        nonexistentAccountResponse.body?.message;
      if (
        typeof existingMessage === 'string' &&
        typeof missingMessage === 'string'
      ) {
        expect(existingMessage).toBe(missingMessage);
      }
    });
  });
  describe('rate limiting', () => {
    test('applies rate limits to sensitive authentication routes', async () => {
      const configuredLimit = Number(
        process.env.AUTH_TEST_RATE_LIMIT
      );
      if (
        !Number.isInteger(configuredLimit) ||
        configuredLimit < 1
      ) {
        throw new Error(
          'Set AUTH_TEST_RATE_LIMIT to the configured test limit ' +
          'before running this test.'
        );
      }
      const configuredWindowMs = Number(
        process.env.AUTH_TEST_RATE_LIMIT_WINDOW_MS || 60000
      );
      if (
        !Number.isFinite(configuredWindowMs) ||
        configuredWindowMs <= 0
      ) {
        throw new Error(
          'AUTH_TEST_RATE_LIMIT_WINDOW_MS must be a positive number.'
        );
      }
      const responses = [];
      for (
        let index = 0;
        index <= configuredLimit;
        index += 1
      ) {
        const response = await request(app)
          .post(loginUrl)
          .send({
            email: `rate-limit-${index}@example.test`,
            password: 'Invalid-Test-Password-91!x',
          });
        responses.push(response);
        if (response.status === 429) {
          break;
        }
      }
      expect(
        responses.some((response) => response.status === 429)
      ).toBe(true);
    });
  });
});