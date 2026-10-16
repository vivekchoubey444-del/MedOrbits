
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  isOwner,
  sameId,
  safeStatus,
} = require('./policy-utils');

const SUBSCRIPTION_OWNER_FIELDS = [
  'userId',
  'ownerId',
  'customerUserId',
];

const CREATABLE_ROLES = [
  'user',
  'student',
  'candidate',
  'employer',
];

const CANCELLABLE_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'incomplete',
]);

function subscriptionOwnerId(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    return null;
  }

  for (const field of SUBSCRIPTION_OWNER_FIELDS) {
    const value = subscription[field];

    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return null;
}

function canCreateSubscription(actor, input = {}) {
  if (!actor) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'subscriptions:create:any')
  ) {
    return true;
  }

  if (
    !hasRole(actor, ...CREATABLE_ROLES) ||
    actor.isSuspended === true
  ) {
    return false;
  }

  const requestedOwner =
    input.userId ??
    input.ownerId ??
    input.customerUserId;

  if (
    requestedOwner != null &&
    requestedOwner !== '' &&
    !isOwner(actor, requestedOwner)
  ) {
    return false;
  }

  // Plan, amount, currency, discounts and billing interval
  // must be derived from trusted server-side plan records.
  return true;
}

function canViewSubscription(actor, subscription) {
  if (!actor || !subscription) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'subscriptions:read:any')
  ) {
    return true;
  }

  if (isOwner(actor, subscriptionOwnerId(subscription))) {
    return true;
  }

  return (
    actor.employerId != null &&
    subscription.employerId != null &&
    sameId(actor.employerId, subscription.employerId) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'subscriptions:read:employer')
  );
}

function canUpdateSubscription(actor, subscription, changes = {}) {
  if (!actor || !subscription) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'subscriptions:update:any')
  ) {
    return true;
  }

  if (!isOwner(actor, subscriptionOwnerId(subscription))) {
    return false;
  }

  if (
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  const forbidden = new Set([
    'id',
    '_id',
    'userId',
    'ownerId',
    'customerUserId',
    'employerId',
    'status',
    'paymentStatus',
    'planId',
    'price',
    'amount',
    'currency',
    'providerSubscriptionId',
    'currentPeriodStart',
    'currentPeriodEnd',
    'cancelAtPeriodEnd',
    'cancelledAt',
    'entitlements',
    'createdAt',
    'updatedAt',
  ]);

  return !Object.keys(changes).some((key) =>
    forbidden.has(key)
  );
}

function canCancelSubscription(actor, subscription) {
  if (!actor || !subscription) return false;

  const status = safeStatus(subscription.status);

  if (
    !CANCELLABLE_STATUSES.has(status) ||
    subscription.cancelAtPeriodEnd === true ||
    subscription.cancelledAt != null
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'subscriptions:cancel:any')
  ) {
    return true;
  }

  return isOwner(actor, subscriptionOwnerId(subscription));
}

function canChangeSubscriptionPlan(actor, subscription) {
  if (!actor || !subscription) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'subscriptions:plan:change:any')
  ) {
    return true;
  }

  return (
    isOwner(actor, subscriptionOwnerId(subscription)) &&
    hasPermission(actor, 'subscriptions:plan:change:self') &&
    ['active', 'trialing'].includes(
      safeStatus(subscription.status)
    )
  );
}

function canGrantSubscriptionEntitlement(actor) {
  // This permission only authorizes the workflow. Billing
  // provider verification and entitlement reconciliation
  // must be performed separately.
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(
        actor,
        'subscriptions:entitlements:grant'
      )
    )
  );
}

function hasActiveEntitlement(
  subscription,
  entitlement,
  now = Date.now()
) {
  if (
    !subscription ||
    typeof subscription !== 'object' ||
    typeof entitlement !== 'string' ||
    !entitlement.trim()
  ) {
    return false;
  }

  const status = safeStatus(subscription.status);

  if (!['active', 'trialing'].includes(status)) {
    return false;
  }

  const currentTime = now instanceof Date
    ? now.getTime()
    : Number(now);

  if (!Number.isFinite(currentTime)) {
    return false;
  }

  if (subscription.currentPeriodEnd != null) {
    const periodEnd = new Date(
      subscription.currentPeriodEnd
    ).getTime();

    // An invalid expiry must not grant access.
    if (
      !Number.isFinite(periodEnd) ||
      periodEnd <= currentTime
    ) {
      return false;
    }
  }

  const entitlements = Array.isArray(
    subscription.entitlements
  )
    ? subscription.entitlements
    : [];

  return entitlements.includes(entitlement.trim());
}

module.exports = {
  canCreateSubscription,
  canViewSubscription,
  canUpdateSubscription,
  canCancelSubscription,
  canChangeSubscriptionPlan,
  canGrantSubscriptionEntitlement,
  hasActiveEntitlement,
};
