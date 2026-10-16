
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  isOwner,
  sameId,
  resourceOwnerId,
  safeStatus,
} = require('./policy-utils');

const APPLICANT_ROLES = ['user', 'student', 'candidate'];
const EDITABLE_STATUSES = new Set([
  'draft',
  'incomplete',
  'submitted',
]);

const PROTECTED_APPLICATION_FIELDS = new Set([
  'id',
  '_id',
  'status',
  'reviewStatus',
  'decision',
  'approvedBy',
  'rejectedBy',
  'reviewedBy',
  'reviewedAt',
  'applicantId',
  'candidateId',
  'userId',
  'ownerId',
  'createdBy',
  'counsellorId',
  'assignedCounsellorId',
  'createdAt',
  'updatedAt',
]);

function actorId(actor) {
  return actor?.id ?? actor?.userId ?? actor?.sub ?? null;
}

function applicantId(application) {
  return resourceOwnerId(application, [
    'applicantId',
    'candidateId',
    'userId',
    'ownerId',
    'createdBy',
  ]);
}

function counsellorAssigned(actor, application) {
  const id = actorId(actor);

  if (id == null || !application) {
    return false;
  }

  return (
    sameId(application.counsellorId, id) ||
    sameId(application.assignedCounsellorId, id)
  );
}

function hasApplicantRole(actor) {
  return hasRole(actor, ...APPLICANT_ROLES);
}

function hasProtectedChanges(changes) {
  if (
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return true;
  }

  return Object.keys(changes).some((key) =>
    PROTECTED_APPLICATION_FIELDS.has(key)
  );
}

function canCreateApplication(actor, input = {}) {
  if (!actor) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:create:any')
  ) {
    return true;
  }

  if (!hasApplicantRole(actor)) {
    return false;
  }

  const targetApplicant =
    input.applicantId ??
    input.candidateId ??
    input.userId;

  // Controllers should set applicant identity from the
  // authenticated actor, not trust client-supplied identity.
  if (targetApplicant == null || targetApplicant === '') {
    return true;
  }

  return isOwner(actor, targetApplicant);
}

function canViewApplication(actor, application) {
  if (!actor || !application) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:read:any')
  ) {
    return true;
  }

  if (isOwner(actor, applicantId(application))) {
    return true;
  }

  if (!counsellorAssigned(actor, application)) {
    return false;
  }

  return (
    (
      hasRole(actor, 'counsellor', 'support') &&
      hasPermission(actor, 'applications:read:assigned')
    ) ||
    hasPermission(actor, 'applications:read:assigned')
  );
}

function canUpdateApplication(actor, application, changes = {}) {
  if (!actor || !application) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:update:any')
  ) {
    return true;
  }

  if (isOwner(actor, applicantId(application))) {
    if (!EDITABLE_STATUSES.has(safeStatus(application.status))) {
      return false;
    }

    return !hasProtectedChanges(changes);
  }

  return (
    counsellorAssigned(actor, application) &&
    hasRole(actor, 'counsellor') &&
    hasPermission(actor, 'applications:update:assigned') &&
    !hasProtectedChanges(changes)
  );
}

function canReviewApplication(actor, application) {
  if (!actor || !application) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:review:any')
  ) {
    return true;
  }

  return (
    counsellorAssigned(actor, application) &&
    hasRole(actor, 'counsellor') &&
    hasPermission(actor, 'applications:review:assigned')
  );
}

function canDeleteApplication(actor, application) {
  if (!actor || !application) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:delete:any')
  ) {
    return true;
  }

  return (
    isOwner(actor, applicantId(application)) &&
    ['draft', 'incomplete'].includes(
      safeStatus(application.status)
    )
  );
}

function canAssignCounsellor(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'applications:assign')
    )
  );
}

module.exports = {
  canCreateApplication,
  canViewApplication,
  canUpdateApplication,
  canReviewApplication,
  canDeleteApplication,
  canAssignCounsellor,
};
