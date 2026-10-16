'use strict';
/**
 * MedOrbits -- Payment Test Fixtures
 *
 * File: tests/fixtures/payments.js
 *
 * Purpose:
 *   Provide deterministic synthetic payment, refund, and webhook fixtures
 *   for unit, integration, API, idempotency, concurrency, and security tests.
 *
 * Security:
 *   - No real payment credentials or live payment operations.
 *   - Provider identifiers and signatures are synthetic.
 *   - Client payloads exclude server-managed payment state.
 *   - Never trust client-supplied amounts, ownership, payment status,
 *     refund status, provider references, or webhook verification results.
 *   - Verify webhook signatures and enforce idempotency in application code.
 *
 * Usage:
 *   const {
 *     PAYMENT_STATUSES,
 *     REFUND_STATUSES,
 *     WEBHOOK_EVENT_TYPES,
 *     createPayment,
 *     createPaymentPayload,
 *     createRefund,
 *     createWebhookEvent,
 *   } = require('../fixtures/payments');
 */
const PAYMENT_STATUSES = Object.freeze({
  CREATED: 'created',
  PENDING: 'pending',
  PROCESSING: 'processing',
  AUTHORIZED: 'authorized',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PARTIALLY_REFUNDED: 'partially_refunded',
  REFUNDED: 'refunded',
});
const REFUND_STATUSES = Object.freeze({
  REQUESTED: 'requested',
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});
const PAYMENT_METHODS = Object.freeze({
  CARD: 'card',
  UPI: 'upi',
  NET_BANKING: 'net_banking',
  WALLET: 'wallet',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
});
const PAYMENT_PURPOSES = Object.freeze({
  CONSULTATION: 'consultation',
  APPLICATION_FEE: 'application_fee',
  COUNSELLING_FEE: 'counselling_fee',
  SUBSCRIPTION: 'subscription',
  DOCUMENT_SERVICE: 'document_service',
  OTHER: 'other',
});
const WEBHOOK_EVENT_TYPES = Object.freeze({
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_PENDING: 'payment.pending',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_CANCELLED: 'payment.cancelled',
  REFUND_CREATED: 'refund.created',
  REFUND_SUCCEEDED: 'refund.succeeded',
  REFUND_FAILED: 'refund.failed',
});
const PAYMENT_STATUS_VALUES = Object.freeze(
  Object.values(PAYMENT_STATUSES)
);
const REFUND_STATUS_VALUES = Object.freeze(
  Object.values(REFUND_STATUSES)
);
const PAYMENT_METHOD_VALUES = Object.freeze(
  Object.values(PAYMENT_METHODS)
);
const PAYMENT_PURPOSE_VALUES = Object.freeze(
  Object.values(PAYMENT_PURPOSES)
);
const WEBHOOK_EVENT_TYPE_VALUES = Object.freeze(
  Object.values(WEBHOOK_EVENT_TYPES)
);
const DEFAULT_PAYMENT = Object.freeze({
  id: 'payment_test_0001',
  paymentNumber: 'MO-PAY-TEST-0001',
  userId: 'user_test_0001',
  applicationId: 'app_test_0001',
  subscriptionId: null,
  purpose: PAYMENT_PURPOSES.CONSULTATION,
  amountMinor: 10000,
  currency: 'INR',
  status: PAYMENT_STATUSES.PENDING,
  paymentMethod: PAYMENT_METHODS.UPI,
  provider: 'test_provider',
  providerPaymentId: 'provider_payment_test_0001',
  providerOrderId: 'provider_order_test_0001',
  idempotencyKey: 'idem_test_payment_0001',
  description: 'Synthetic payment fixture.',
  metadata: Object.freeze({
    testFixture: true,
  }),
  failureCode: null,
  failureMessage: null,
  authorizedAt: null,
  paidAt: null,
  failedAt: null,
  cancelledAt: null,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
});
const DEFAULT_REFUND = Object.freeze({
  id: 'refund_test_0001',
  refundNumber: 'MO-REF-TEST-0001',
  paymentId: DEFAULT_PAYMENT.id,
  userId: DEFAULT_PAYMENT.userId,
  amountMinor: 10000,
  currency: 'INR',
  status: REFUND_STATUSES.REQUESTED,
  provider: 'test_provider',
  providerRefundId: 'provider_refund_test_0001',
  idempotencyKey: 'idem_test_refund_0001',
  reason: 'Synthetic refund fixture.',
  failureCode: null,
  failureMessage: null,
  requestedAt: '2026-10-02T09:00:00.000Z',
  processedAt: null,
  createdAt: '2026-10-02T09:00:00.000Z',
  updatedAt: '2026-10-02T09:00:00.000Z',
});
const DEFAULT_WEBHOOK_EVENT = Object.freeze({
  id: 'webhook_test_0001',
  eventId: 'provider_event_test_0001',
  provider: 'test_provider',
  eventType: WEBHOOK_EVENT_TYPES.PAYMENT_SUCCEEDED,
  paymentId: DEFAULT_PAYMENT.id,
  providerPaymentId: DEFAULT_PAYMENT.providerPaymentId,
  payload: Object.freeze({
    id: 'provider_event_test_0001',
    type: WEBHOOK_EVENT_TYPES.PAYMENT_SUCCEEDED,
    data: Object.freeze({
      paymentId: DEFAULT_PAYMENT.providerPaymentId,
      amountMinor: DEFAULT_PAYMENT.amountMinor,
      currency: DEFAULT_PAYMENT.currency,
      status: PAYMENT_STATUSES.SUCCEEDED,
    }),
  }),
  signature: 'synthetic-invalid-signature-for-tests-only',
  signatureVerified: false,
  processingStatus: 'received',
  attempts: 0,
  processedAt: null,
  lastError: null,
  receivedAt: '2026-10-02T10:00:00.000Z',
  createdAt: '2026-10-02T10:00:00.000Z',
});
/**
 * Recursively clones arrays and plain objects.
 *
 * @param {*} value
 * @returns {*}
 */
function clone(value) {
  if (Array.isArray(value)) {
    return value.map(clone);
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new TypeError(
        'Fixture values must contain plain objects only'
      );
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        clone(item),
      ])
    );
  }
  return value;
}
function assertPlainObject(value, label) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
}
function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}
function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(
      `${label} must be a non-negative safe integer in minor currency units`
    );
  }
}
/**
 * Creates a synthetic payment record.
 *
 * amountMinor uses the smallest currency unit:
 *   INR 100.00 = 10000 paise.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createPayment(overrides = {}) {
  assertPlainObject(overrides, 'Payment overrides');
  const payment = {
    ...clone(DEFAULT_PAYMENT),
    ...clone(overrides),
  };
  if (overrides.metadata !== undefined) {
    assertPlainObject(overrides.metadata, 'Payment metadata');
    payment.metadata = clone(overrides.metadata);
  }
  assertNonNegativeInteger(
    payment.amountMinor,
    'Payment amountMinor'
  );
  return payment;
}
/**
 * Creates a client-submittable payment initiation payload.
 *
 * Server-managed fields are intentionally excluded:
 *   id, paymentNumber, userId, status, providerPaymentId,
 *   providerOrderId, failure fields, payment timestamps.
 *
 * The server must determine the payable amount from trusted pricing or
 * invoice records, not from a client-supplied amount.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createPaymentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Payment payload overrides');
  return {
    purpose: DEFAULT_PAYMENT.purpose,
    applicationId: DEFAULT_PAYMENT.applicationId,
    subscriptionId: DEFAULT_PAYMENT.subscriptionId,
    currency: DEFAULT_PAYMENT.currency,
    paymentMethod: DEFAULT_PAYMENT.paymentMethod,
    idempotencyKey: DEFAULT_PAYMENT.idempotencyKey,
    description: DEFAULT_PAYMENT.description,
    ...clone(overrides),
  };
}
/**
 * Creates multiple payments with unique synthetic identifiers.
 *
 * @param {number} [count=3]
 * @param {object} [overrides]
 * @returns {object[]}
 */
function createPaymentSet(count = 3, overrides = {}) {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > 1000
  ) {
    throw new RangeError(
      'Payment count must be an integer from 0 to 1000'
    );
  }
  assertPlainObject(overrides, 'Payment set overrides');
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    const payment = createPayment({
      ...clone(overrides),
      id: `payment_test_${sequence}`,
      paymentNumber: `MO-PAY-TEST-${sequence}`,
      userId: `user_test_${sequence}`,
      applicationId: `app_test_${sequence}`,
      providerPaymentId: `provider_payment_test_${sequence}`,
      providerOrderId: `provider_order_test_${sequence}`,
      idempotencyKey: `idem_test_payment_${sequence}`,
    });
    // Keep identifiers unique when shared overrides are provided.
    payment.id = `payment_test_${sequence}`;
    payment.paymentNumber = `MO-PAY-TEST-${sequence}`;
    payment.userId = `user_test_${sequence}`;
    payment.applicationId = `app_test_${sequence}`;
    payment.providerPaymentId = `provider_payment_test_${sequence}`;
    payment.providerOrderId = `provider_order_test_${sequence}`;
    payment.idempotencyKey = `idem_test_payment_${sequence}`;
    return payment;
  });
}
/**
 * Creates a payment belonging to another synthetic user.
 *
 * Useful for IDOR and cross-user payment access tests.
 *
 * @param {string} [userId]
 * @param {object} [overrides]
 * @returns {object}
 */
function createForeignPayment(
  userId = 'user_test_foreign',
  overrides = {}
) {
  assertNonEmptyString(userId, 'Foreign payment user ID');
  assertPlainObject(overrides, 'Foreign payment overrides');
  return createPayment({
    id: 'payment_test_foreign_0001',
    paymentNumber: 'MO-PAY-TEST-FOREIGN-0001',
    userId,
    applicationId: 'app_test_foreign_0001',
    providerPaymentId: 'provider_payment_test_foreign_0001',
    providerOrderId: 'provider_order_test_foreign_0001',
    idempotencyKey: 'idem_test_payment_foreign_0001',
    ...clone(overrides),
    userId,
  });
}
/**
 * Creates a payment with a selected status.
 *
 * This helper does not validate workflow transitions.
 *
 * @param {string} status
 * @param {object} [overrides]
 * @returns {object}
 */
function createPaymentWithStatus(status, overrides = {}) {
  if (!PAYMENT_STATUS_VALUES.includes(status)) {
    throw new RangeError(`Unsupported payment status: ${status}`);
  }
  assertPlainObject(overrides, 'Payment status overrides');
  return createPayment({
    status,
    ...clone(overrides),
  });
}
/**
 * Creates a deliberately hostile payment payload for mass-assignment tests.
 *
 * The application should reject or ignore untrusted server-managed fields.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createMassAssignmentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Mass-assignment overrides');
  return {
    ...createPaymentPayload(),
    id: 'payment_test_attacker_controlled',
    paymentNumber: 'MO-PAY-ATTACKER-CONTROLLED',
    userId: 'user_test_attacker',
    amountMinor: 1,
    status: PAYMENT_STATUSES.SUCCEEDED,
    providerPaymentId: 'attacker_provider_payment',
    providerOrderId: 'attacker_provider_order',
    paidAt: '2026-10-01T09:00:00.000Z',
    failureCode: null,
    isAdmin: true,
    role: 'admin',
    ...clone(overrides),
  };
}
/**
 * Creates a synthetic refund record.
 *
 * Refund amount must be validated against the successfully paid,
 * unrefunded balance by the actual application.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createRefund(overrides = {}) {
  assertPlainObject(overrides, 'Refund overrides');
  const refund = {
    ...clone(DEFAULT_REFUND),
    ...clone(overrides),
  };
  assertNonNegativeInteger(
    refund.amountMinor,
    'Refund amountMinor'
  );
  return refund;
}
/**
 * Creates a refund with a selected status.
 *
 * @param {string} status
 * @param {object} [overrides]
 * @returns {object}
 */
function createRefundWithStatus(status, overrides = {}) {
  if (!REFUND_STATUS_VALUES.includes(status)) {
    throw new RangeError(`Unsupported refund status: ${status}`);
  }
  assertPlainObject(overrides, 'Refund status overrides');
  return createRefund({
    status,
    ...clone(overrides),
  });
}
/**
 * Creates multiple refunds with unique synthetic identifiers.
 *
 * @param {number} [count=2]
 * @param {object} [overrides]
 * @returns {object[]}
 */
function createRefundSet(count = 2, overrides = {}) {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > 1000
  ) {
    throw new RangeError(
      'Refund count must be an integer from 0 to 1000'
    );
  }
  assertPlainObject(overrides, 'Refund set overrides');
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    const refund = createRefund({
      ...clone(overrides),
      id: `refund_test_${sequence}`,
      refundNumber: `MO-REF-TEST-${sequence}`,
      providerRefundId: `provider_refund_test_${sequence}`,
      idempotencyKey: `idem_test_refund_${sequence}`,
    });
    refund.id = `refund_test_${sequence}`;
    refund.refundNumber = `MO-REF-TEST-${sequence}`;
    refund.providerRefundId = `provider_refund_test_${sequence}`;
    refund.idempotencyKey = `idem_test_refund_${sequence}`;
    return refund;
  });
}
/**
 * Creates a synthetic webhook event record.
 *
 * signatureVerified defaults to false. Tests that exercise successful
 * webhook processing must use a valid test-provider signature or a
 * deliberately isolated verifier stub.
 *
 * Never use this boolean as a substitute for cryptographic verification
 * in production code.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createWebhookEvent(overrides = {}) {
  assertPlainObject(overrides, 'Webhook event overrides');
  const event = {
    ...clone(DEFAULT_WEBHOOK_EVENT),
    ...clone(overrides),
  };
  if (overrides.payload !== undefined) {
    assertPlainObject(overrides.payload, 'Webhook payload');
    event.payload = clone(overrides.payload);
  }
  return event;
}
/**
 * Creates a successful payment webhook event.
 *
 * This creates synthetic event data only; it does not create a valid
 * provider signature.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createSuccessfulPaymentWebhook(overrides = {}) {
  assertPlainObject(overrides, 'Successful webhook overrides');
  const payment = createPayment({
    status: PAYMENT_STATUSES.SUCCEEDED,
    ...clone(overrides.payment),
  });
  const eventId = overrides.eventId || 'provider_event_success_test_0001';
  return createWebhookEvent({
    id: 'webhook_test_success_0001',
    eventId,
    eventType: WEBHOOK_EVENT_TYPES.PAYMENT_SUCCEEDED,
    paymentId: payment.id,
    providerPaymentId: payment.providerPaymentId,
    payload: {
      id: eventId,
      type: WEBHOOK_EVENT_TYPES.PAYMENT_SUCCEEDED,
      data: {
        paymentId: payment.providerPaymentId,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        status: PAYMENT_STATUSES.SUCCEEDED,
      },
    },
    signatureVerified: false,
    ...clone(overrides.event),
  });
}
/**
 * Creates two webhook deliveries representing the same provider event.
 *
 * Useful for idempotency and duplicate-delivery tests.
 *
 * @param {object} [overrides]
 * @returns {{ first: object, duplicate: object }}
 */
function createDuplicateWebhookEvents(overrides = {}) {
  assertPlainObject(overrides, 'Duplicate webhook overrides');
  const eventId = overrides.eventId || 'provider_event_duplicate_test_0001';
  const first = createWebhookEvent({
    eventId,
    id: 'webhook_test_delivery_0001',
    ...clone(overrides.event),
  });
  const duplicate = createWebhookEvent({
    ...clone(first),
    id: 'webhook_test_delivery_0002',
  });
  // Provider event identity and payload are intentionally identical.
  duplicate.eventId = first.eventId;
  duplicate.eventType = first.eventType;
  duplicate.payload = clone(first.payload);
  return {
    first,
    duplicate,
  };
}
/**
 * Creates a deliberately hostile webhook event.
 *
 * Use this to test rejection of forged event data, invalid signatures,
 * mismatched payment amounts, and unexpected status changes.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createInvalidWebhookEvent(overrides = {}) {
  assertPlainObject(overrides, 'Invalid webhook overrides');
  return createWebhookEvent({
    id: 'webhook_test_invalid_0001',
    eventId: 'provider_event_invalid_test_0001',
    eventType: WEBHOOK_EVENT_TYPES.PAYMENT_SUCCEEDED,
    signature: 'invalid-signature-test-only',
    signatureVerified: false,
    payload: {
      id: 'provider_event_invalid_test_0001',
      type: WEBHOOK_EVENT_TYPES.PAYMENT_SUCCEEDED,
      data: {
        paymentId: 'unknown_provider_payment',
        amountMinor: 1,
        currency: 'INR',
        status: PAYMENT_STATUSES.SUCCEEDED,
      },
    },
    ...clone(overrides),
  });
}
/**
 * Creates a synthetic payment concurrency scenario.
 *
 * Useful for testing atomic state transitions, duplicate processing,
 * and oversubscription of refundable balances.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createConcurrentPaymentScenario(overrides = {}) {
  assertPlainObject(overrides, 'Concurrency scenario overrides');
  return {
    payment: createPayment({
      status: PAYMENT_STATUSES.SUCCEEDED,
      ...clone(overrides.payment),
    }),
    requestedRefunds: [
      createRefund({
        id: 'refund_test_concurrent_0001',
        amountMinor: 6000,
        ...clone(overrides.firstRefund),
      }),
      createRefund({
        id: 'refund_test_concurrent_0002',
        amountMinor: 6000,
        ...clone(overrides.secondRefund),
      }),
    ],
    expectedTotalRefundMinor: 12000,
    expectedPaymentAmountMinor: 10000,
    // The test should assert that committed successful refunds never
    // exceed the original successful payment amount.
  };
}
/**
 * Creates a synthetic payment/refund idempotency scenario.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createIdempotencyScenario(overrides = {}) {
  assertPlainObject(overrides, 'Idempotency scenario overrides');
  const idempotencyKey =
    overrides.idempotencyKey || 'idem_test_repeated_request_0001';
  return {
    idempotencyKey,
    firstRequest: createPaymentPayload({
      idempotencyKey,
      ...clone(overrides.payload),
    }),
    repeatedRequest: createPaymentPayload({
      idempotencyKey,
      ...clone(overrides.payload),
    }),
    expectedSingleLogicalPayment: true,
  };
}
module.exports = {
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_PURPOSES,
  WEBHOOK_EVENT_TYPES,
  PAYMENT_STATUS_VALUES,
  REFUND_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PURPOSE_VALUES,
  WEBHOOK_EVENT_TYPE_VALUES,
  DEFAULT_PAYMENT,
  DEFAULT_REFUND,
  DEFAULT_WEBHOOK_EVENT,
  createPayment,
  createPaymentPayload,
  createPaymentSet,
  createForeignPayment,
  createPaymentWithStatus,
  createMassAssignmentPayload,
  createRefund,
  createRefundWithStatus,
  createRefundSet,
  createWebhookEvent,
  createSuccessfulPaymentWebhook,
  createDuplicateWebhookEvents,
  createInvalidWebhookEvent,
  createConcurrentPaymentScenario,
  createIdempotencyScenario,
};