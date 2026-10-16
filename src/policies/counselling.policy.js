
'use strict';

const {
  isAdmin,
  hasPermission,
  hasRole,
  sameId,
  actorId,
  isOwner,
  safeStatus,
  resourceOwnerId,
} = require('./policy-utils');

const OWNER_FIELDS = [
  'userId',
  'candidateId',
  'applicantId',
  'ownerId',
];

const STAFF_ROLES = [
  'counsellor',
  'support',
];

const EDITABLE_STATUSES = new Set([
  'requested',
  'scheduled',
]);

const TERMINAL_STATUSES = new Set([
  'completed',
  'cancelled',
]);

const PROTECTED_FIELDS = new Set([
  'id',
  '_id',
  'userId',
  'candidateId',
  'applicantId',
  'ownerId',
  'counsellorId',
  'assignedCounsellorId',
  'assignedTo',
  'status',
  'completedAt',
  'cancelledAt',
  'createdAt',
  'updatedAt',
]);

function counsellingOwnerId(session) {
  return resourceOwnerId(session, OWNER_FIELDS);
}

function assignedCounsellorId(session) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  return session.assignedCounsellorId ??
    session.counsellorId ??
    session.assignedTo ??
    null;
}

function isAssignedCounsellor(actor, session) {
  if (!actor || !session) {
    return false;
  }

  const assignedId = assignedCounsellorId(session);

  return assignedId != null &&
    sameId(actorId(actor), assignedId) &&
    hasRole(actor, 'counsellor');
}

function canViewCounselling(actor, session) {
  if (!actor || !session) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:read:any')
  ) {
    return true;
  }

  if (isOwner(actor, counsellingOwnerId(session))) {
    return true;
  }

  return Boolean(
    isAssignedCounsellor(actor, session) &&
    hasPermission(actor, 'counselling:read:assigned')
  );
}

function canRequestCounselling(actor, input = {}) {
  if (
    !actor ||
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:create:any')
  ) {
    return true;
  }

  if (
    !hasRole(actor, 'user', 'student', 'candidate') ||
    actor.isSuspended === true ||
    actor.status === 'suspended' ||
    actor.status === 'disabled'
  ) {
    return false;
  }

  const requestedOwner =
    input.userId ??
    input.candidateId ??
    input.applicantId ??
    input.ownerId;

  return requestedOwner == null ||
    requestedOwner === '' ||
    isOwner(actor, requestedOwner);
}

function canUpdateCounselling(actor, session, changes = {}) {
  if (
    !actor ||
    !session ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:update:any')
  ) {
    return true;
  }

  const status = safeStatus(session.status);

  if (!EDITABLE_STATUSES.has(status)) {
    return false;
  }

  if (
    Object.keys(changes).some(
      (key) => PROTECTED_FIELDS.has(key)
    )
  ) {
    return false;
  }

  if (isOwner(actor, counsellingOwnerId(session))) {
    return true;
  }

  return Boolean(
    isAssignedCounsellor(actor, session) &&
    hasPermission(actor, 'counselling:update:assigned')
  );
}

function canAssignCounsellor(actor, session, targetCounsellorId) {
  if (
    !actor ||
    !session ||
    targetCounsellorId == null ||
    targetCounsellorId === ''
  ) {
    return false;
  }

  if (
    TERMINAL_STATUSES.has(safeStatus(session.status))
  ) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:assign')
  );
}

function canCancelCounselling(actor, session) {
  if (!actor || !session) {
    return false;
  }

  const status = safeStatus(session.status);

  if (
    TERMINAL_STATUSES.has(status) ||
    !EDITABLE_STATUSES.has(status)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:cancel:any')
  ) {
    return true;
  }

  return isOwner(actor, counsellingOwnerId(session)) ||
    Boolean(
      isAssignedCounsellor(actor, session) &&
      hasPermission(actor, 'counselling:cancel:assigned')
    );
}

function canCompleteCounselling(actor, session) {
  if (!actor || !session) {
    return false;
  }

  if (safeStatus(session.status) !== 'scheduled') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:complete:any')
  ) {
    return true;
  }

  return Boolean(
    isAssignedCounsellor(actor, session) &&
    hasPermission(actor, 'counselling:complete:assigned')
  );
}

function canDeleteCounselling(actor, session) {
  if (!actor || !session) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:delete:any')
  ) {
    return true;
  }

  return isOwner(actor, counsellingOwnerId(session)) &&
    safeStatus(session.status) === 'requested';
}

function canViewCounsellingSchedule(actor, targetUserId) {
  if (!actor || targetUserId == null || targetUserId === '') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'counselling:schedule:read:any')
  ) {
    return true;
  }

  return sameId(actorId(actor), targetUserId);
}

function canExportCounsellingRecords(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'counselling:export')
    )
  );
}

module.exports = {
  counsellingOwnerId,
  assignedCounsellorId,
  isAssignedCounsellor,
  canViewCounselling,
  canRequestCounselling,
  canUpdateCounselling,
  canAssignCounsellor,
  canCancelCounselling,
  canCompleteCounselling,
  canDeleteCounselling,
  canViewCounsellingSchedule,
  canExportCounsellingRecords,
};
