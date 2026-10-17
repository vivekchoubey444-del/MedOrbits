'use strict';
const request = require('supertest');
const crypto = require('node:crypto');
const app = require('../../src/app');
const baseUrl = '/api/payments';
const webhookUrl = `${baseUrl}/webhook`;
const validInitiationPayload = {
  applicationId: 'TEST-APPLICATION-001',
  amount: 1000,
  currency: 'INR',
  purpose: 'application_fee',
};
const sensitiveResponsePatterns = [
  /stack trace/i,
  /node_modules[\\/]/i,
  /\bsqlstate\b/i,
  /\bDATABASE_URL\s*=/i,
  /\bSESSION_SECRET\s*=/i,
  /\bAI_API_KEY\s*=/i,
  /\bpassword_hash\b/i,
  /\bprivate_key\b/i,
  /\bBEGIN\s+(?:RSA|OPENSSH|EC)\s+PRIVATE KEY\b/i,
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
  expect(response.headers['content-type']).toMatch(/application\/json/i);
}
function expectClientError(response) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
}
/*
 * TEST SETUP REQUIRED
 *
 * Replace these helpers with the project's real test authentication and
 * test-database adapters. Use only a dedicated test database and credentials.
 *
 * Do not use production payment records, live gateway credentials, or real
 * customer tokens in this suite.
 */
async function authenticateAs(role, userId) {
  throw new Error(
    `Implement authenticateAs(${role}, ${userId}) using the project's real test authentication setup.`
  );
}
async function getPaymentStatus(paymentId) {
  throw new Error(
    `Implement getPaymentStatus(${paymentId}) using the test database.`
  );
}
describe('Payments API', () => {
  describe('payment record authorization', () => {
    test('requires authorization to access payment records', async () => {
      const endpoints = [
        { method: 'get', url: baseUrl },
        { method: 'get', url: `${baseUrl}/TEST-PAYMENT-001` },
        { method: 'post', url: baseUrl },
      ];
      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.url)
          .set('Accept', 'application/json');
        expect([401, 403]).toContain(response.status);
        expectSafeResponse(response);
      }
    });
    test('prevents users from accessing another user's payment record', async () => {
      const otherUser = await authenticateAs(
        'user',
        'test-payment-other'
      );
      const paymentId = process.env.TEST_OWNED_PAYMENT_ID;
      if (!paymentId) {
        throw new Error(
          'Set TEST_OWNED_PAYMENT_ID to a seeded payment owned by test-payment-owner.'
        );
      }
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent(paymentId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${otherUser.token}`);
      expect([403, 404]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('allows an authorized owner to access their own payment when it exists', async () => {
      const owner = await authenticateAs(
        'user',
        'test-payment-owner'
      );
      const paymentId = process.env.TEST_OWNED_PAYMENT_ID;
      if (!paymentId) {
        throw new Error(
          'Set TEST_OWNED_PAYMENT_ID to a seeded payment owned by test-payment-owner.'
        );
      }
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent(paymentId)}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${owner.token}`);
      expect([200, 404]).toContain(response.status);
      expectSafeResponse(response);
      if (response.status === 200) {
        expectJsonResponse(response);
      }
    });
    test('prevents a regular user from accessing administrative payment functions', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-user'
      );
      const response = await request(app)
        .get(`${baseUrl}/admin`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expect([401, 403, 404]).toContain(response.status);
      expectSafeResponse(response);
    });
  });
  describe('payment initiation validation', () => {
    test('rejects an empty payment initiation payload', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-user'
      );
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});
      expect([400, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test.each([
      ['negative amount', { amount: -1 }],
      ['zero amount', { amount: 0 }],
      ['invalid currency', { currency: 'INVALID' }],
      ['missing application ID', { applicationId: '' }],
      ['non-numeric amount', { amount: 'not-a-number' }],
      ['null amount', { amount: null }],
      ['unsupported purpose', { purpose: 'unsupported-purpose' }],
    ])(
      'rejects an invalid initiation request: %s',
      async (_case, overrides) => {
        const user = await authenticateAs(
          'user',
          'test-payment-user'
        );
        const response = await request(app)
          .post(baseUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            ...validInitiationPayload,
            ...overrides,
          });
        expect([400, 422]).toContain(response.status);
        expectSafeResponse(response);
      }
    );
    test('does not allow client-supplied payment status or verification overrides', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-user'
      );
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          ...validInitiationPayload,
          status: 'paid',
          paymentStatus: 'success',
          verified: true,
          amountPaid: 0,
          gatewayTransactionId: 'CLIENT-FORGED-TRANSACTION',
        });
      expectSafeResponse(response);
      if (response.status >= 200 && response.status < 300) {
        const payment = response.body.data || response.body;
        expect(payment.status).not.toBe('paid');
        expect(payment.paymentStatus).not.toBe('success');
        expect(payment.verified).not.toBe(true);
        expect(payment.gatewayTransactionId).not.toBe(
          'CLIENT-FORGED-TRANSACTION'
        );
      } else {
        expect([400, 403, 422]).toContain(response.status);
      }
    });
    test('does not allow the client to change the payment amount using alternate fields', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-user'
      );
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          ...validInitiationPayload,
          amount: 1000,
          amountPaid: 1,
          total: 1,
          payableAmount: 1,
          discount: 1000,
        });
      expectSafeResponse(response);
      if (response.status >= 200 && response.status < 300) {
        const payment = response.body.data || response.body;
        if (payment.amount !== undefined) {
          expect(Number(payment.amount)).toBe(1000);
        }
      } else {
        expect([400, 403, 422]).toContain(response.status);
      }
    });
    test('does not allow a user to initiate payment for another user's application', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-other'
      );
      const foreignApplicationId =
        process.env.TEST_FOREIGN_APPLICATION_ID ||
        'TEST-APPLICATION-OWNED-BY-ANOTHER-USER';
      const response = await request(app)
        .post(baseUrl)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          ...validInitiationPayload,
          applicationId: foreignApplicationId,
        });
      expect([400, 403, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
  });
  describe('webhook signature verification', () => {
    test('rejects webhook requests without a signature', async () => {
      const response = await request(app)
        .post(webhookUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          event: 'payment.succeeded',
          data: {
            paymentId: 'TEST-PAYMENT-001',
          },
        });
      expect([400, 401, 403]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('rejects a webhook with an invalid signature', async () => {
      const response = await request(app)
        .post(webhookUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('x-webhook-signature', 'invalid-signature')
        .send({
          event: 'payment.succeeded',
          data: {
            paymentId: 'TEST-PAYMENT-001',
          },
        });
      expect([400, 401, 403]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('does not mark a payment successful after an invalid webhook', async () => {
      const paymentId = process.env.TEST_PENDING_PAYMENT_ID;
      if (!paymentId) {
        throw new Error(
          'Set TEST_PENDING_PAYMENT_ID to a seeded pending payment.'
        );
      }
      const before = await getPaymentStatus(paymentId);
      const response = await request(app)
        .post(webhookUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('x-webhook-signature', 'invalid-signature')
        .send({
          event: 'payment.succeeded',
          data: { paymentId },
        });
      expect([400, 401, 403]).toContain(response.status);
      expectSafeResponse(response);
      const after = await getPaymentStatus(paymentId);
      expect(after).toBe(before);
    });
    test('rejects a malformed webhook payload', async () => {
      const response = await request(app)
        .post(webhookUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('x-webhook-signature', 'invalid-signature')
        .send({});
      expect([400, 401, 403, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('does not accept a client-supplied success flag as proof of payment', async () => {
      const response = await request(app)
        .post(webhookUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('x-webhook-signature', 'invalid-signature')
        .send({
          event: 'payment.succeeded',
          success: true,
          verified: true,
          status: 'paid',
          data: {
            paymentId: 'TEST-PAYMENT-001',
            status: 'paid',
          },
        });
      expect([400, 401, 403, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
  });
  describe('payment error handling', () => {
    test('returns a safe error for an unknown payment ID', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-user'
      );
      const response = await request(app)
        .get(`${baseUrl}/PAYMENT-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expect([400, 404, 422]).toContain(response.status);
      expectSafeResponse(response);
    });
    test('handles SQL injection-like payment IDs safely', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-user'
      );
      const response = await request(app)
        .get(`${baseUrl}/${encodeURIComponent("' OR 1=1 --")}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expect(response.status).toBeLessThan(500);
      expectSafeResponse(response);
    });
    test('does not expose internal database or gateway details', async () => {
      const user = await authenticateAs(
        'user',
        'test-payment-user'
      );
      const response = await request(app)
        .get(`${baseUrl}/PAYMENT-DOES-NOT-EXIST`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${user.token}`);
      expectSafeResponse(response);
      const text = responseText(response);
      expect(text).not.toMatch(/process\.env/i);
      expect(text).not.toMatch(/authorization:\s*bearer/i);
      expect(text).not.toMatch(/secret key/i);
    });
  });
});