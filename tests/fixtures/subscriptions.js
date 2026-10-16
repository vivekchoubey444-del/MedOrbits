'use strict';
/**
 * MedOrbits -- Subscription Test Fixtures
 *
 * File: tests/fixtures/subscriptions.js
 *
 * Purpose:
 *   Provide deterministic subscription plans and subscription records for
 *   unit, integration, API, billing, authorization, and security tests.
 *
 * Security:
 *   - Uses synthetic test data only.
 *   - Does not initiate real payments or renewals.
 *   - Does not grant access to paid features by itself.
 *   - Server-managed fields must not be trusted from client payloads.
 *   - Subscription access must be determined by trusted server-side state.
 *   - Billing operations must be idempotent and concurrency-safe.
 *
 * Usage:
 *   const {
 *     SUBSCRIPTION_STATUSES,
 *     BILLING_INTERVALS,
 *     createSubscriptionPlan,
 *     createSubscription,
 *     createSubscriptionPayload,
 *     createExpiredSubscription,
 *     createCancelledSubscription,
 *     createMassAssignmentPayload,
 *   } = require('../fixtures/subscriptions');
 */
const SUBSCRIPTION_STATUSES = Object.freeze({
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  UNPAID: 'unpaid',
  EXPIRED: 'expired',
});
const BILLING_INTERVALS = Object.freeze({
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  ONE_TIME: 'one_time',
});
const SUBSCRIPTION_PLAN_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});
const SUBSCRIPTION_STATUSES_VALUES = Object.freeze(
  Object.values(SUBSCRIPTION_STATUSES)
);
const BILLING_INTERVAL_VALUES = Object.freeze(
  Object.values(BILLING_INTERVALS)
);
const SUBSCRIPTION_PLAN_STATUS_VALUES = Object.freeze(
  Object.values(SUBSCRIPTION_PLAN_STATUSES)
);
const DEFAULT_SUBSCRIPTION_PLAN = Object.freeze({
  id: 'plan_test_0001',
  code: 'MO-PLAN-TEST-0001',
  slug: 'test-monthly-plan',
  name: 'Test Monthly Plan',
  description: 'Synthetic subscription plan for automated testing.',
  currency: 'INR',
  amountMinor: 49900,
  billingInterval: BILLING_INTERVALS.MONTHLY,
  intervalCount: 1,
  trialDays: 0,
  features: Object.freeze([
    'priority_support',
    'admission_guidance',
  ]),
  limits: Object.freeze({
    applications: 10,
    documentUploads: 20,
    consultations: 2,
  }),
  status: SUBSCRIPTION_PLAN_STATUSES.ACTIVE,
  isPublic: true,
  createdAt: '2026-10-01T08:30:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
});
const DEFAULT_SUBSCRIPTION = Object.freeze({
  id: 'subscription_test_0001',
  subscriptionNumber: 'MO-SUB-TEST-0001',
  userId: 'user_test_0001',
  planId: DEFAULT_SUBSCRIPTION_PLAN.id,
  status: SUBSCRIPTION_STATUSES.ACTIVE,
  currency: 'INR',
  amountMinor: 49900,
  billingInterval: BILLING_INTERVALS.MONTHLY,
  intervalCount: 1,
  provider: 'test_provider',
  providerCustomerId: 'provider_customer_test_0001',
  providerSubscriptionId: 'provider_subscription_test_0001',
  idempotencyKey: 'idem_test_subscription_0001',
  trialStart: null,
  trialEnd: null,
  currentPeriodStart: '2026-10-01T09:00:00.000Z',
  currentPeriodEnd: '2026-11-01T09:00:00.000Z',
  cancelAtPeriodEnd: false,
  cancelAt: null,
  cancelledAt: null,
  endedAt: null,
  latestPaymentId: 'payment_test_0001',
  metadata: Object.freeze({
    testFixture: true,
  }),
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
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
 * Creates a synthetic subscription plan.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createSubscriptionPlan(overrides = {}) {
  assertPlainObject(overrides, 'Subscription plan overrides');
  const plan = {
    ...clone(DEFAULT_SUBSCRIPTION_PLAN),
    ...clone(overrides),
  };
  for (const field of ['limits']) {
    if (overrides[field] !== undefined) {
      assertPlainObject(overrides[field], `${field} overrides`);
      plan[field] = {
        ...clone(DEFAULT_SUBSCRIPTION_PLAN[field]),
        ...clone(overrides[field]),
      };
    }
  }
  if (overrides.features !== undefined) {
    if (!Array.isArray(overrides.features)) {
      throw new TypeError('Plan features must be an array');
    }
    plan.features = clone(overrides.features);
  }
  assertNonNegativeInteger(
    plan.amountMinor,
    'Plan amountMinor'
  );
  if (!BILLING_INTERVAL_VALUES.includes(plan.billingInterval)) {
    throw new RangeError(
      `Unsupported billing interval: ${plan.billingInterval}`
    );
  }
  if (!SUBSCRIPTION_PLAN_STATUS_VALUES.includes(plan.status)) {
    throw new RangeError(
      `Unsupported plan status: ${plan.status}`
    );
  }
  if (
    !Number.isInteger(plan.intervalCount) ||
    plan.intervalCount < 1
  ) {
    throw new RangeError('Plan intervalCount must be a positive integer');
  }
  return plan;
}
/**
 * Creates a synthetic subscription record.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createSubscription(overrides = {}) {
  assertPlainObject(overrides, 'Subscription overrides');
  const subscription = {
    ...clone(DEFAULT_SUBSCRIPTION),
    ...clone(overrides),
  };
  if (overrides.metadata !== undefined) {
    assertPlainObject(overrides.metadata, 'Subscription metadata');
    subscription.metadata = clone(overrides.metadata);
  }
  assertNonNegativeInteger(
    subscription.amountMinor,
    'Subscription amountMinor'
  );
  if (!SUBSCRIPTION_STATUSES_VALUES.includes(subscription.status)) {
    throw new RangeError(
      `Unsupported subscription status: ${subscription.status}`
    );
  }
  if (!BILLING_INTERVAL_VALUES.includes(subscription.billingInterval)) {
    throw new RangeError(
      `Unsupported billing interval: ${subscription.billingInterval}`
    );
  }
  if (
    !Number.isInteger(subscription.intervalCount) ||
    subscription.intervalCount < 1
  ) {
    throw new RangeError(
      'Subscription intervalCount must be a positive integer'
    );
  }
  return subscription;
}
/**
 * Creates a client-submittable subscription request.
 *
 * Server-managed fields are intentionally excluded:
 *   id, subscriptionNumber, userId, status, amountMinor,
 *   provider identifiers, billing periods, cancellation state,
 *   payment references, and timestamps.
 *
 * The server must resolve the plan and price from trusted records.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createSubscriptionPayload(overrides = {}) {
  assertPlainObject(overrides, 'Subscription payload overrides');
  return {
    planId: DEFAULT_SUBSCRIPTION.planId,
    idempotencyKey: DEFAULT_SUBSCRIPTION.idempotencyKey,
    ...clone(overrides),
  };
}
/**
 * Creates multiple subscriptions with distinct synthetic identities.
 *
 * @param {number} [count=3]
 * @param {object} [overrides]
 * @returns {object[]}
 */
function createSubscriptionSet(count = 3, overrides = {}) {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > 1000
  ) {
    throw new RangeError(
      'Subscription count must be an integer from 0 to 1000'
    );
  }
  assertPlainObject(overrides, 'Subscription set overrides');
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    const subscription = createSubscription({
      ...clone(overrides),
      id: `subscription_test_${sequence}`,
      subscriptionNumber: `MO-SUB-TEST-${sequence}`,
      userId: `user_test_${sequence}`,
      providerCustomerId: `provider_customer_test_${sequence}`,
      providerSubscriptionId: `provider_subscription_test_${sequence}`,
      idempotencyKey: `idem_test_subscription_${sequence}`,
    });
    subscription.id = `subscription_test_${sequence}`;
    subscription.subscriptionNumber = `MO-SUB-TEST-${sequence}`;
    subscription.userId = `user_test_${sequence}`;
    subscription.providerCustomerId = `provider_customer_test_${sequence}`;
    subscription.providerSubscriptionId =
      `provider_subscription_test_${sequence}`;
    subscription.idempotencyKey = `idem_test_subscription_${sequence}`;
    return subscription;
  });
}
/**
 * Creates a subscription owned by another synthetic user.
 *
 * Useful for cross-user authorization and IDOR tests.
 *
 * @param {string} [userId]
 * @param {object} [overrides]
 * @returns {object}
 */
function createForeignSubscription(
  userId = 'user_test_foreign',
  overrides = {}
) {
  assertNonEmptyString(userId, 'Foreign subscription user ID');
  assertPlainObject(overrides, 'Foreign subscription overrides');
  return createSubscription({
    id: 'subscription_test_foreign_0001',
    subscriptionNumber: 'MO-SUB-TEST-FOREIGN-0001',
    userId,
    providerCustomerId: 'provider_customer_test_foreign_0001',
    providerSubscriptionId: 'provider_subscription_test_foreign_0001',
    idempotencyKey: 'idem_test_subscription_foreign_0001',
    ...clone(overrides),
    userId,
  });
}
/**
 * Creates a subscription with a selected status.
 *
 * This helper does not validate workflow transitions.
 *
 * @param {string} status
 * @param {object} [overrides]
 * @returns {object}
 */
function createSubscriptionWithStatus(status, overrides = {}) {
  if (!SUBSCRIPTION_STATUSES_VALUES.includes(status)) {
    throw new RangeError(`Unsupported subscription status: ${status}`);
  }
  assertPlainObject(overrides, 'Subscription status overrides');
  return createSubscription({
    status,
    ...clone(overrides),
  });
}
/**
 * Creates a synthetic expired subscription.
 *
 * Timestamps are fixed for deterministic tests.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createExpiredSubscription(overrides = {}) {
  assertPlainObject(overrides, 'Expired subscription overrides');
  return createSubscription({
    id: 'subscription_test_expired_0001',
    subscriptionNumber: 'MO-SUB-TEST-EXPIRED-0001',
    status: SUBSCRIPTION_STATUSES.EXPIRED,
    currentPeriodStart: '2026-08-01T09:00:00.000Z',
    currentPeriodEnd: '2026-09-01T09:00:00.000Z',
    endedAt: '2026-09-01T09:00:00.000Z',
    ...clone(overrides),
  });
}
/**
 * Creates a synthetic cancelled subscription.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createCancelledSubscription(overrides = {}) {
  assertPlainObject(overrides, 'Cancelled subscription overrides');
  return createSubscription({
    id: 'subscription_test_cancelled_0001',
    subscriptionNumber: 'MO-SUB-TEST-CANCELLED-0001',
    status: SUBSCRIPTION_STATUSES.CANCELLED,
    cancelAtPeriodEnd: false,
    cancelledAt: '2026-10-15T09:00:00.000Z',
    endedAt: '2026-10-15T09:00:00.000Z',
    ...clone(overrides),
  });
}
/**
 * Creates a subscription scheduled to cancel at the end of its period.
 *
 * The subscription remains active until the effective cancellation date
 * according to the application's billing rules.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createCancellationScheduledSubscription(overrides = {}) {
  assertPlainObject(overrides, 'Scheduled cancellation overrides');
  return createSubscription({
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    cancelAtPeriodEnd: true,
    cancelAt: '2026-11-01T09:00:00.000Z',
    cancelledAt: null,
    endedAt: null,
    ...clone(overrides),
  });
}
/**
 * Creates a synthetic trial subscription.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createTrialSubscription(overrides = {}) {
  assertPlainObject(overrides, 'Trial subscription overrides');
  return createSubscription({
    id: 'subscription_test_trial_0001',
    subscriptionNumber: 'MO-SUB-TEST-TRIAL-0001',
    status: SUBSCRIPTION_STATUSES.TRIALING,
    trialStart: '2026-10-01T09:00:00.000Z',
    trialEnd: '2026-10-08T09:00:00.000Z',
    currentPeriodStart: '2026-10-01T09:00:00.000Z',
    currentPeriodEnd: '2026-11-01T09:00:00.000Z',
    ...clone(overrides),
  });
}
/**
 * Creates a synthetic past-due subscription.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createPastDueSubscription(overrides = {}) {
  assertPlainObject(overrides, 'Past-due subscription overrides');
  return createSubscription({
    id: 'subscription_test_past_due_0001',
    subscriptionNumber: 'MO-SUB-TEST-PAST-DUE-0001',
    status: SUBSCRIPTION_STATUSES.PAST_DUE,
    ...clone(overrides),
  });
}
/**
 * Creates a deliberately hostile payload for mass-assignment tests.
 *
 * The application should reject or ignore client attempts to modify
 * server-managed fields.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createMassAssignmentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Mass-assignment overrides');
  return {
    ...createSubscriptionPayload(),
    id: 'subscription_test_attacker_controlled',
    subscriptionNumber: 'MO-SUB-ATTACKER-CONTROLLED',
    userId: 'user_test_attacker',
    amountMinor: 1,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    providerCustomerId: 'attacker_provider_customer',
    providerSubscriptionId: 'attacker_provider_subscription',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '2099-01-01T00:00:00.000Z',
    latestPaymentId: 'payment_test_attacker_controlled',
    isAdmin: true,
    role: 'admin',
    ...clone(overrides),
  };
}
/**
 * Creates a synthetic subscription renewal scenario.
 *
 * Does not charge a payment method or advance a real subscription.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createRenewalScenario(overrides = {}) {
  assertPlainObject(overrides, 'Renewal scenario overrides');
  return {
    subscription: createSubscription({
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      ...clone(overrides.subscription),
    }),
    idempotencyKey:
      overrides.idempotencyKey || 'idem_test_renewal_0001',
    renewalNumber: 2,
    expectedAmountMinor:
      overrides.expectedAmountMinor ??
      DEFAULT_SUBSCRIPTION.amountMinor,
    expectedCurrency:
      overrides.expectedCurrency ||
      DEFAULT_SUBSCRIPTION.currency,
    expectedSingleCharge: true,
  };
}
/**
 * Creates a synthetic subscription entitlement scenario.
 *
 * Tests should derive access from the application's authoritative
 * subscription state and policy, not from this fixture's boolean alone.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createEntitlementScenario(overrides = {}) {
  assertPlainObject(overrides, 'Entitlement scenario overrides');
  return {
    userId: 'user_test_0001',
    subscription: createSubscription(),
    feature: 'priority_support',
    expectedAccess: true,
    ...clone(overrides),
  };
}
/**
 * Creates a subscription idempotency scenario.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createIdempotencyScenario(overrides = {}) {
  assertPlainObject(overrides, 'Idempotency scenario overrides');
  const idempotencyKey =
    overrides.idempotencyKey || 'idem_test_subscription_repeat_0001';
  const payloadOverrides = clone(overrides.payload || {});
  return {
    idempotencyKey,
    firstRequest: createSubscriptionPayload({
      ...payloadOverrides,
      idempotencyKey,
    }),
    repeatedRequest: createSubscriptionPayload({
      ...payloadOverrides,
      idempotencyKey,
    }),
    expectedSingleLogicalSubscription: true,
  };
}
module.exports = {
  SUBSCRIPTION_STATUSES,
  BILLING_INTERVALS,
  SUBSCRIPTION_PLAN_STATUSES,
  SUBSCRIPTION_STATUSES_VALUES,
  BILLING_INTERVAL_VALUES,
  SUBSCRIPTION_PLAN_STATUS_VALUES,
  DEFAULT_SUBSCRIPTION_PLAN,
  DEFAULT_SUBSCRIPTION,
  createSubscriptionPlan,
  createSubscription,
  createSubscriptionPayload,
  createSubscriptionSet,
  createForeignSubscription,
  createSubscriptionWithStatus,
  createExpiredSubscription,
  createCancelledSubscription,
  createCancellationScheduledSubscription,
  createTrialSubscription,
  createPastDueSubscription,
  createMassAssignmentPayload,
  createRenewalScenario,
  createEntitlementScenario,
  createIdempotencyScenario,
};