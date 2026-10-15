'use strict';

// Synthetic payment fixture; never use real payment credentials or card data.
function makePayment(overrides = {}) {
  return {
    id: 'test-payment-001',
    userId: 'test-user-001',
    amountMinor: 1000,
    currency: 'INR',
    status: 'pending',
    providerReference: 'sandbox-reference-001',
    ...overrides,
  };
}

module.exports = { makePayment };
