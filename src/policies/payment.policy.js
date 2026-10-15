'use strict';

const {
  isAdmin, hasRole, hasPermission, isOwner, sameId, safeStatus,
} = require('./policy-utils');

function paymentPayerId(payment) {
  if (!payment || typeof payment !== 'object') return null;
  return payment.userId ?? payment.payerId ?? payment.customerUserId ?? payment.ownerId ?? null;
}

function canCreatePayment(actor, input = {}) {
  if (!actor) return false;
  if (isAdmin(actor) || hasPermission(actor, 'payments:create:any')) return true;
  const requestedPayer = input.userId ?? input.payerId ?? input.customerUserId;
  if (requestedPayer && !isOwner(actor, requestedPayer)) return false;
  // The service must calculate amount/currency from trusted product/plan records.
  return hasRole(actor, 'user', 'student', 'candidate', 'employer') &&
    actor.isSuspended !== true;
}

function canViewPayment(actor, payment) {
  if (!actor || !payment) return false;
  if (isAdmin(actor) || hasPermission(actor, 'payments:read:any')) return true;
  return isOwner(actor, paymentPayerId(payment)) ||
    (actor.employerId && sameId(actor.employerId, payment.employerId) &&
     hasRole(actor, 'employer') && hasPermission(actor, 'payments:read:employer'));
}

function canRefundPayment(actor, payment) {
  if (!actor || !payment) return false;
  if (!(isAdmin(actor) || hasPermission(actor, 'payments:refund'))) return false;
  return safeStatus(payment.status) === 'succeeded' &&
    payment.refundedAt == null &&
    payment.disputed !== true;
}

function canCancelPayment(actor, payment) {
  if (!actor || !payment) return false;
  if (isAdmin(actor) || hasPermission(actor, 'payments:cancel:any')) return true;
  return isOwner(actor, paymentPayerId(payment)) &&
    ['created', 'pending', 'requires_action'].includes(safeStatus(payment.status));
}

function canUpdatePaymentStatus(actor) {
  // Status transitions must come from verified provider events or privileged server-side workflows.
  return Boolean(actor && (isAdmin(actor) || hasPermission(actor, 'payments:status:update')));
}

function canProcessPaymentWebhook(context = {}) {
  // This is a guard for internal call sites only, not signature verification.
  return context.source === 'verified-payment-provider' &&
    context.signatureVerified === true &&
    context.rawBody instanceof Buffer;
}

function canViewPaymentDetails(actor, payment) {
  if (!canViewPayment(actor, payment)) return false;
  // Never return full card numbers, CVV, bank credentials, or provider secrets.
  return true;
}

module.exports = {
  canCreatePayment,
  canViewPayment,
  canRefundPayment,
  canCancelPayment,
  canUpdatePaymentStatus,
  canProcessPaymentWebhook,
  canViewPaymentDetails,
};
