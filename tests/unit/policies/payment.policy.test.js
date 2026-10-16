
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canCreatePayment,
  canViewPayment,
  canRefundPayment,
  canCancelPayment,
  canUpdatePaymentStatus,
  canProcessPaymentWebhook,
  canViewPaymentDetails,
} = require('../../../src/policies/payment.policy');

function makeActor(overrides = {}) {
  return {
    id: 'user-001',
    role: 'user',
    permissions: [],
    isSuspended: false,
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'admin-001',
    role: 'admin',
    ...overrides,
  });
}

function withPermission(permission, overrides = {}) {
  return makeActor({
    permissions: [permission],
    ...overrides,
  });
}

function makePayment(overrides = {}) {
  return {
    id: 'payment-001',
    userId: 'user-001',
    employerId: null,
    amount: 5000,
    currency: 'INR',
    status: 'pending',
    refundedAt: null,
    disputed: false,
    refundPending: false,
    ...overrides,
  };
}

// --------------------------------------------------
// Payment creation
// --------------------------------------------------

test('canCreatePayment allows supported user roles', () => {
  for (const role of [
    'user',
    'student',
    'candidate',
    'employer',
  ]) {
    assert.equal(
      canCreatePayment(makeActor({ role }), {}),
      true,
      `Expected ${role} to create a payment`
    );
  }
});

test('canCreatePayment allows administrators', () => {
  assert.equal(canCreatePayment(makeAdmin(), {}), true);
});

test('canCreatePayment allows payments:create:any permission', () => {
  assert.equal(
    canCreatePayment(
      withPermission('payments:create:any', {
        role: 'guest',
        isSuspended: true,
      }),
      { userId: 'another-user' }
    ),
    true
  );
});

test('canCreatePayment allows payments for the acting user', () => {
  assert.equal(
    canCreatePayment(
      makeActor({ id: 'user-001' }),
      { userId: 'user-001' }
    ),
    true
  );

  assert.equal(
    canCreatePayment(
      makeActor({ id: 'user-001' }),
      { payerId: 'user-001' }
    ),
    true
  );

  assert.equal(
    canCreatePayment(
      makeActor({ id: 'user-001' }),
      { customerUserId: 'user-001' }
    ),
    true
  );
});

test('canCreatePayment denies payments for another user', () => {
  assert.equal(
    canCreatePayment(
      makeActor({ id: 'user-001' }),
      { userId: 'user-002' }
    ),
    false
  );

  assert.equal(
    canCreatePayment(
      makeActor({ id: 'user-001' }),
      { payerId: 'user-002' }
    ),
    false
  );

  assert.equal(
    canCreatePayment(
      makeActor({ id: 'user-001' }),
      { customerUserId: 'user-002' }
    ),
    false
  );
});

test('canCreatePayment denies suspended users', () => {
  assert.equal(
    canCreatePayment(
      makeActor({ isSuspended: true }),
      {}
    ),
    false
  );
});

test('canCreatePayment denies unsupported roles', () => {
  for (const role of [
    'guest',
    'recruiter',
    'support',
    'unknown',
  ]) {
    assert.equal(
      canCreatePayment(makeActor({ role }), {}),
      false
    );
  }
});

test('canCreatePayment denies missing actors', () => {
  assert.equal(canCreatePayment(null, {}), false);
  assert.equal(canCreatePayment(undefined, {}), false);
});

test('canCreatePayment permits omitted input', () => {
  assert.equal(canCreatePayment(makeActor()), true);
});

// --------------------------------------------------
// Payment visibility
// --------------------------------------------------

test('canViewPayment allows the payment owner', () => {
  assert.equal(
    canViewPayment(makeActor(), makePayment()),
    true
  );
});

test('canViewPayment supports payerId ownership', () => {
  assert.equal(
    canViewPayment(
      makeActor({ id: 'user-001' }),
      makePayment({
        userId: null,
        payerId: 'user-001',
      })
    ),
    true
  );
});

test('canViewPayment supports customerUserId ownership', () => {
  assert.equal(
    canViewPayment(
      makeActor({ id: 'user-001' }),
      makePayment({
        userId: null,
        payerId: null,
        customerUserId: 'user-001',
      })
    ),
    true
  );
});

test('canViewPayment supports ownerId ownership', () => {
  assert.equal(
    canViewPayment(
      makeActor({ id: 'user-001' }),
      makePayment({
        userId: null,
        payerId: null,
        customerUserId: null,
        ownerId: 'user-001',
      })
    ),
    true
  );
});

test('canViewPayment allows administrators', () => {
  assert.equal(
    canViewPayment(makeAdmin(), makePayment()),
    true
  );
});

test('canViewPayment allows payments:read:any permission', () => {
  assert.equal(
    canViewPayment(
      withPermission('payments:read:any', {
        id: 'reviewer-001',
      }),
      makePayment()
    ),
    true
  );
});

test('canViewPayment allows authorized employer access', () => {
  assert.equal(
    canViewPayment(
      withPermission('payments:read:employer', {
        id: 'employer-user-001',
        role: 'employer',
        employerId: 'employer-001',
      }),
      makePayment({
        userId: 'customer-001',
        employerId: 'employer-001',
      })
    ),
    true
  );
});

test('canViewPayment denies employer access without permission', () => {
  assert.equal(
    canViewPayment(
      makeActor({
        role: 'employer',
        employerId: 'employer-001',
      }),
      makePayment({
        userId: 'customer-001',
        employerId: 'employer-001',
      })
    ),
    false
  );
});

test('canViewPayment denies employer access for another employer', () => {
  assert.equal(
    canViewPayment(
      withPermission('payments:read:employer', {
        role: 'employer',
        employerId: 'employer-002',
      }),
      makePayment({
        userId: 'customer-001',
        employerId: 'employer-001',
      })
    ),
    false
  );
});

test('canViewPayment requires the employer role for employer access', () => {
  assert.equal(
    canViewPayment(
      withPermission('payments:read:employer', {
        role: 'user',
        employerId: 'employer-001',
      }),
      makePayment({
        userId: 'customer-001',
        employerId: 'employer-001',
      })
    ),
    false
  );
});

test('canViewPayment denies unrelated users', () => {
  assert.equal(
    canViewPayment(
      makeActor({ id: 'user-002' }),
      makePayment()
    ),
    false
  );
});

test('canViewPayment denies missing actors and payments', () => {
  assert.equal(canViewPayment(null, makePayment()), false);
  assert.equal(canViewPayment(makeActor(), null), false);
  assert.equal(canViewPayment(makeActor(), undefined), false);
});

// --------------------------------------------------
// Refund authorization
// --------------------------------------------------

test('canRefundPayment allows administrators to refund succeeded payments', () => {
  assert.equal(
    canRefundPayment(
      makeAdmin(),
      makePayment({ status: 'succeeded' })
    ),
    true
  );
});

test('canRefundPayment allows payments:refund permission', () => {
  assert.equal(
    canRefundPayment(
      withPermission('payments:refund'),
      makePayment({ status: 'succeeded' })
    ),
    true
  );
});

test('canRefundPayment denies payment owners without refund permission', () => {
  assert.equal(
    canRefundPayment(
      makeActor(),
      makePayment({ status: 'succeeded' })
    ),
    false
  );
});

test('canRefundPayment denies refunds for non-succeeded payments', () => {
  for (const status of [
    'created',
    'pending',
    'requires_action',
    'failed',
    'cancelled',
    'refunded',
  ]) {
    assert.equal(
      canRefundPayment(
        makeAdmin(),
        makePayment({ status })
      ),
      false,
      `Expected status ${status} to be non-refundable`
    );
  }
});

test('canRefundPayment normalizes payment status', () => {
  assert.equal(
    canRefundPayment(
      makeAdmin(),
      makePayment({ status: ' SUCCEEDED ' })
    ),
    true
  );
});

test('canRefundPayment denies already-refunded payments', () => {
  assert.equal(
    canRefundPayment(
      makeAdmin(),
      makePayment({
        status: 'succeeded',
        refundedAt: '2026-01-01T00:00:00.000Z',
      })
    ),
    false
  );
});

test('canRefundPayment denies disputed payments', () => {
  assert.equal(
    canRefundPayment(
      makeAdmin(),
      makePayment({
        status: 'succeeded',
        disputed: true,
      })
    ),
    false
  );
});

test('canRefundPayment denies payments with pending refunds', () => {
  assert.equal(
    canRefundPayment(
      makeAdmin(),
      makePayment({
        status: 'succeeded',
        refundPending: true,
      })
    ),
    false
  );
});

test('canRefundPayment permits refunds when guard fields are false', () => {
  assert.equal(
    canRefundPayment(
      makeAdmin(),
      makePayment({
        status: 'succeeded',
        refundedAt: null,
        disputed: false,
        refundPending: false,
      })
    ),
    true
  );
});

test('canRefundPayment denies missing actors and payments', () => {
  assert.equal(canRefundPayment(null, makePayment()), false);
  assert.equal(canRefundPayment(makeAdmin(), null), false);
});

// --------------------------------------------------
// Payment cancellation
// --------------------------------------------------

test('canCancelPayment allows owners to cancel created payments', () => {
  assert.equal(
    canCancelPayment(
      makeActor(),
      makePayment({ status: 'created' })
    ),
    true
  );
});

test('canCancelPayment allows owners to cancel pending payments', () => {
  assert.equal(
    canCancelPayment(
      makeActor(),
      makePayment({ status: 'pending' })
    ),
    true
  );
});

test('canCancelPayment allows owners to cancel payments requiring action', () => {
  assert.equal(
    canCancelPayment(
      makeActor(),
      makePayment({ status: 'requires_action' })
    ),
    true
  );
});

test('canCancelPayment supports payerId ownership', () => {
  assert.equal(
    canCancelPayment(
      makeActor(),
      makePayment({
        userId: null,
        payerId: 'user-001',
        status: 'pending',
      })
    ),
    true
  );
});

test('canCancelPayment allows administrators to cancel eligible payments', () => {
  for (const status of ['created', 'pending', 'requires_action']) {
    assert.equal(
      canCancelPayment(
        makeAdmin(),
        makePayment({ status })
      ),
      true
    );
  }
});

test('canCancelPayment allows payments:cancel:any permission', () => {
  assert.equal(
    canCancelPayment(
      withPermission('payments:cancel:any', {
        id: 'operator-001',
      }),
      makePayment({
        userId: 'customer-001',
        status: 'pending',
      })
    ),
    true
  );
});

test('canCancelPayment denies cancellation of succeeded payments', () => {
  assert.equal(
    canCancelPayment(
      makeAdmin(),
      makePayment({ status: 'succeeded' })
    ),
    false
  );
});

test('canCancelPayment denies cancellation of failed payments', () => {
  assert.equal(
    canCancelPayment(
      makeAdmin(),
      makePayment({ status: 'failed' })
    ),
    false
  );
});

test('canCancelPayment denies cancellation of refunded payments', () => {
  assert.equal(
    canCancelPayment(
      makeAdmin(),
      makePayment({ status: 'refunded' })
    ),
    false
  );
});

test('canCancelPayment denies cancellation by unrelated users', () => {
  assert.equal(
    canCancelPayment(
      makeActor({ id: 'user-002' }),
      makePayment({ status: 'pending' })
    ),
    false
  );
});

test('canCancelPayment normalizes status', () => {
  assert.equal(
    canCancelPayment(
      makeActor(),
      makePayment({ status: ' PENDING ' })
    ),
    true
  );
});

test('canCancelPayment denies missing actors and payments', () => {
  assert.equal(canCancelPayment(null, makePayment()), false);
  assert.equal(canCancelPayment(makeActor(), null), false);
});

// --------------------------------------------------
// Payment status updates
// --------------------------------------------------

test('canUpdatePaymentStatus allows administrators', () => {
  assert.equal(canUpdatePaymentStatus(makeAdmin()), true);
});

test('canUpdatePaymentStatus allows payments:status:update permission', () => {
  assert.equal(
    canUpdatePaymentStatus(
      withPermission('payments:status:update')
    ),
    true
  );
});

test('canUpdatePaymentStatus denies ordinary users', () => {
  assert.equal(
    canUpdatePaymentStatus(makeActor()),
    false
  );
});

test('canUpdatePaymentStatus denies anonymous actors', () => {
  assert.equal(canUpdatePaymentStatus(null), false);
  assert.equal(canUpdatePaymentStatus(undefined), false);
});

test('canUpdatePaymentStatus does not trust isAdmin alone', () => {
  assert.equal(
    canUpdatePaymentStatus(
      makeActor({
        role: 'user',
        isAdmin: true,
        permissions: [],
      })
    ),
    false
  );
});

// --------------------------------------------------
// Payment webhook verification
// --------------------------------------------------

test('canProcessPaymentWebhook accepts a verified provider event with raw bytes', () => {
  assert.equal(
    canProcessPaymentWebhook({
      source: 'verified-payment-provider',
      signatureVerified: true,
      rawBody: Buffer.from('{"event":"payment.succeeded"}'),
    }),
    true
  );
});

test('canProcessPaymentWebhook requires the exact trusted source', () => {
  assert.equal(
    canProcessPaymentWebhook({
      source: 'client',
      signatureVerified: true,
      rawBody: Buffer.from('payment event'),
    }),
    false
  );
});

test('canProcessPaymentWebhook requires signature verification', () => {
  assert.equal(
    canProcessPaymentWebhook({
      source: 'verified-payment-provider',
      signatureVerified: false,
      rawBody: Buffer.from('payment event'),
    }),
    false
  );
});

test('canProcessPaymentWebhook requires a Buffer raw body', () => {
  assert.equal(
    canProcessPaymentWebhook({
      source: 'verified-payment-provider',
      signatureVerified: true,
      rawBody: '{"event":"payment.succeeded"}',
    }),
    false
  );

  assert.equal(
    canProcessPaymentWebhook({
      source: 'verified-payment-provider',
      signatureVerified: true,
      rawBody: new Uint8Array([1, 2, 3]),
    }),
    false
  );
});

test('canProcessPaymentWebhook rejects empty raw bodies', () => {
  assert.equal(
    canProcessPaymentWebhook({
      source: 'verified-payment-provider',
      signatureVerified: true,
      rawBody: Buffer.alloc(0),
    }),
    false
  );
});

test('canProcessPaymentWebhook rejects missing and malformed contexts', () => {
  assert.equal(canProcessPaymentWebhook(), false);
  assert.equal(canProcessPaymentWebhook(null), false);
  assert.equal(canProcessPaymentWebhook('verified'), false);
  assert.equal(canProcessPaymentWebhook({}), false);
});

// --------------------------------------------------
// Payment details
// --------------------------------------------------

test('canViewPaymentDetails allows the payment owner', () => {
  assert.equal(
    canViewPaymentDetails(
      makeActor(),
      makePayment()
    ),
    true
  );
});

test('canViewPaymentDetails allows administrators', () => {
  assert.equal(
    canViewPaymentDetails(
      makeAdmin(),
      makePayment()
    ),
    true
  );
});

test('canViewPaymentDetails allows payments:read:any permission', () => {
  assert.equal(
    canViewPaymentDetails(
      withPermission('payments:read:any'),
      makePayment()
    ),
    true
  );
});

test('canViewPaymentDetails denies unauthorized users', () => {
  assert.equal(
    canViewPaymentDetails(
      makeActor({ id: 'user-002' }),
      makePayment()
    ),
    false
  );
});

test('canViewPaymentDetails denies missing actors and payments', () => {
  assert.equal(
    canViewPaymentDetails(null, makePayment()),
    false
  );

  assert.equal(
    canViewPaymentDetails(makeActor(), null),
    false
  );
});

// --------------------------------------------------
// Authorization boundaries
// --------------------------------------------------

test('unknown roles receive no implicit payment privileges', () => {
  const unknown = makeActor({
    id: 'unknown-001',
    role: 'payment_operator',
    permissions: [],
  });

  const payment = makePayment();

  assert.equal(canCreatePayment(unknown, {}), false);
  assert.equal(canViewPayment(unknown, payment), false);
  assert.equal(canRefundPayment(unknown, payment), false);
  assert.equal(canCancelPayment(unknown, payment), false);
  assert.equal(canUpdatePaymentStatus(unknown), false);
  assert.equal(canViewPaymentDetails(unknown, payment), false);
});

test('an isAdmin flag alone grants no administrative payment privileges', () => {
  const forgedAdmin = makeActor({
    id: 'forged-admin',
    role: 'user',
    isAdmin: true,
    permissions: [],
  });

  const payment = makePayment({
    userId: 'another-user',
    status: 'succeeded',
  });

  assert.equal(canViewPayment(forgedAdmin, payment), false);
  assert.equal(canRefundPayment(forgedAdmin, payment), false);
  assert.equal(canUpdatePaymentStatus(forgedAdmin), false);
  assert.equal(canViewPaymentDetails(forgedAdmin, payment), false);
});

test('payment creation policy does not replace trusted amount validation', () => {
  // Creation authorization only decides whether the actor may
  // initiate a payment. The service must derive financial values
  // from trusted server-side records.
  assert.equal(
    canCreatePayment(makeActor(), {
      amount: -100000,
      currency: 'INVALID',
    }),
    true
  );
});
