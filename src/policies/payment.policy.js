
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  isOwner,
  sameId,
  safeStatus,
} = require('./policy-utils');

const CREATABLE_ROLES = [
  'user',
  'student',
  'candidate',
  'employer',
];

const CANCELLABLE_STATUSES = new Set([
  'created',
  'pending',
  'requires_action',
]);

function actorId(actor) {
  return actor?.id ?? actor?.userId ?? actor?.sub ?? null;
}

function paymentPayerId(payment) {
  if (!payment || typeof payment !== 'object') {
    return null;
  }

  return (
    payment.userId ??
    payment.payerId ??
    payment.customerUserId ??
    payment.ownerId ??
    null
  );
}

function canCreatePayment(actor, input = {}) {
  if (!actor) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'payments:create:any')
  ) {
    return true;
  }

  if (
    !hasRole(actor, ...CREATABLE_ROLES) ||
    actor.isSuspended === true
  ) {
    return false;
  }

  const requestedPayer =
    input.userId ??
    input.payerId ??
    input.customerUserId;

  if (
    requestedPayer != null &&
    requestedPayer !== '' &&
    !isOwner(actor, requestedPayer)
  ) {
    return false;
  }

  // The service must derive the amount, currency, and product
  // from trusted server-side records.
  return true;
}

function canViewPayment(actor, payment) {
  if (!actor || !payment) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'payments:read:any')
  ) {
    return true;
  }

  if (isOwner(actor, paymentPayerId(payment))) {
    return true;
  }

  return (
    actor.employerId != null &&
    payment.employerId != null &&
    sameId(actor.employerId, payment.employerId) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'payments:read:employer')
  );
}

function canRefundPayment(actor, payment) {
  if (!actor || !payment) return false;

  if (
    !isAdmin(actor) &&
    !hasPermission(actor, 'payments:refund')
  ) {
    return false;
  }

  return (
    safeStatus(payment.status) === 'succeeded' &&
    payment.refundedAt == null &&
    payment.disputed !== true &&
    payment.refundPending !== true
  );
}

function canCancelPayment(actor, payment) {
  if (!actor || !payment) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'payments:cancel:any')
  ) {
    return CANCELLABLE_STATUSES.has(
      safeStatus(payment.status)
    );
  }

  return (
    isOwner(actor, paymentPayerId(payment)) &&
    CANCELLABLE_STATUSES.has(
      safeStatus(payment.status)
    )
  );
}

function canUpdatePaymentStatus(actor) {
  // This permission authorizes an internal workflow only.
  // It does not establish that a provider event is authentic.
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'payments:status:update')
    )
  );
}

function canProcessPaymentWebhook(context = {}) {
  // Defense-in-depth guard. The payment controller/provider
  // adapter must independently verify the provider signature
  // against the exact raw request body.
  return (
    context.source === 'verified-payment-provider' &&
    context.signatureVerified === true &&
    typeof Buffer !== 'undefined' &&
    Buffer.isBuffer(context.rawBody) &&
    context.rawBody.length > 0
  );
}

function canViewPaymentDetails(actor, payment) {
  if (!canViewPayment(actor, payment)) {
    return false;
  }

  // Authorization does not sanitize the response. The
  // serializer must allowlist safe fields and omit secrets.
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
