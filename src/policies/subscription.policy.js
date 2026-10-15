'use strict';

const {
  isAdmin, hasRole, hasPermission, isOwner, sameId, safeStatus,
} = require('./policy-utils');

function subscriptionOwnerId(subscription) {
  if (!subscription || typeof subscription !== 'object') return null;
  return subscription.userId ?? subscription.ownerId ?? subscription.customerUserId ?? null;
}

function canCreateSubscription(actor, input = {}) {
  if (!actor) return false;
  if (isAdmin(actor) || hasPermission(actor, 'subscriptions:create:any')) return true;
  const requestedOwner = input.userId ?? input.ownerId ?? input.customerUserId;
  if (requestedOwner && !isOwner(actor, requestedOwner)) return false;
  return hasRole(actor, 'user', 'student', 'candidate', 'employer') &&
    actor.isSuspended !== true;
}

function canViewSubscription(actor, subscription) {
  if (!actor || !subscription) return false;
  if (isAdmin(actor) || hasPermission(actor, 'subscriptions:read:any')) return true;
  if (isOwner(actor, subscriptionOwnerId(subscription))) return true;
  return Boolean(actor.employerId &&
    sameId(actor.employerId, subscription.employerId) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'subscriptions:read:employer'));
}

function canUpdateSubscription(actor, subscription, changes = {}) {
  if (!actor || !subscription) return false;
  if (isAdmin(actor) || hasPermission(actor, 'subscriptions:update:any')) return true;
  if (!isOwner(actor, subscriptionOwnerId(subscription))) return false;
  const forbidden = new Set([
    'id', '_id', 'userId', 'ownerId', 'customerUserId',
    'status', 'paymentStatus', 'planId', 'price', 'amount',
    'currency', 'providerSubscriptionId', 'currentPeriodEnd',
    'cancelledAt', 'createdAt',
  ]);
  return !Object.keys(changes || {}).some((key) => forbidden.has(key));
}

function canCancelSubscription(actor, subscription) {
  if (!actor || !subscription) return false;
  if (isAdmin(actor) || hasPermission(actor, 'subscriptions:cancel:any')) return true;
  return isOwner(actor, subscriptionOwnerId(subscription)) &&
    ['active', 'trialing', 'past_due', 'incomplete'].includes(safeStatus(subscription.status)) &&
    subscription.cancelAtPeriodEnd !== true;
}

function canChangeSubscriptionPlan(actor, subscription) {
  if (!actor || !subscription) return false;
  return isAdmin(actor) ||
    hasPermission(actor, 'subscriptions:plan:change:any') ||
    (isOwner(actor, subscriptionOwnerId(subscription)) &&
     hasPermission(actor, 'subscriptions:plan:change:self') &&
     ['active', 'trialing'].includes(safeStatus(subscription.status)));
}

function canGrantSubscriptionEntitlement(actor) {
  // Entitlements must be changed only by trusted billing reconciliation or explicit admin workflow.
  return Boolean(actor && (isAdmin(actor) || hasPermission(actor, 'subscriptions:entitlements:grant')));
}

function hasActiveEntitlement(subscription, entitlement, now = Date.now()) {
  if (!subscription || !entitlement) return false;
  const status = safeStatus(subscription.status);
  if (!['active', 'trialing'].includes(status)) return false;
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).getTime()
    : NaN;
  if (Number.isFinite(periodEnd) && periodEnd < now) return false;
  const entitlements = Array.isArray(subscription.entitlements)
    ? subscription.entitlements
    : [];
  return entitlements.includes(entitlement);
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
