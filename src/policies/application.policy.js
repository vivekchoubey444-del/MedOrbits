'use strict';

const {
  isAdmin, hasRole, hasPermission, isOwner, sameId,
  resourceOwnerId, safeStatus,
} = require('./policy-utils');

function applicantId(application) {
  return resourceOwnerId(application, ['applicantId', 'candidateId', 'userId', 'ownerId', 'createdBy']);
}

function counsellorAssigned(actor, application) {
  return Boolean(actor && application &&
    (sameId(application.counsellorId, actor.id ?? actor.userId ?? actor.sub) ||
     sameId(application.assignedCounsellorId, actor.id ?? actor.userId ?? actor.sub)));
}

function canCreateApplication(actor, input = {}) {
  if (!actor) return false;
  if (isAdmin(actor) || hasPermission(actor, 'applications:create:any')) return true;
  const targetApplicant = input.applicantId ?? input.candidateId ?? input.userId;
  // A normal applicant can create only for themselves. The server should set this field from actor identity.
  if (!targetApplicant) return hasRole(actor, 'user', 'student', 'candidate');
  return isOwner(actor, targetApplicant) && hasRole(actor, 'user', 'student', 'candidate');
}

function canViewApplication(actor, application) {
  if (!actor || !application) return false;
  if (isAdmin(actor) || hasPermission(actor, 'applications:read:any')) return true;
  if (isOwner(actor, applicantId(application))) return true;
  if (counsellorAssigned(actor, application) &&
      hasRole(actor, 'counsellor', 'support')) return true;
  return hasPermission(actor, 'applications:read:assigned') &&
    counsellorAssigned(actor, application);
}

function canUpdateApplication(actor, application, changes = {}) {
  if (!actor || !application) return false;
  if (isAdmin(actor) || hasPermission(actor, 'applications:update:any')) return true;

  // Applicants may update their own application only before it enters review.
  if (isOwner(actor, applicantId(application))) {
    const status = safeStatus(application.status);
    const editableStatuses = new Set(['draft', 'incomplete', 'submitted']);
    const protectedFields = [
      'status', 'reviewStatus', 'decision', 'approvedBy', 'rejectedBy',
      'applicantId', 'candidateId', 'userId', 'ownerId', 'createdBy',
    ];
    if (!editableStatuses.has(status)) return false;
    return !Object.keys(changes || {}).some((key) => protectedFields.includes(key));
  }

  return counsellorAssigned(actor, application) &&
    hasRole(actor, 'counsellor') &&
    hasPermission(actor, 'applications:update:assigned');
}

function canReviewApplication(actor, application) {
  if (!actor || !application) return false;
  return isAdmin(actor) ||
    hasPermission(actor, 'applications:review:any') ||
    (counsellorAssigned(actor, application) &&
     hasRole(actor, 'counsellor') &&
     hasPermission(actor, 'applications:review:assigned'));
}

function canDeleteApplication(actor, application) {
  if (!actor || !application) return false;
  if (isAdmin(actor) || hasPermission(actor, 'applications:delete:any')) return true;
  return isOwner(actor, applicantId(application)) &&
    ['draft', 'incomplete'].includes(safeStatus(application.status));
}

function canAssignCounsellor(actor) {
  return Boolean(actor && (isAdmin(actor) || hasPermission(actor, 'applications:assign')));
}

module.exports = {
  canCreateApplication,
  canViewApplication,
  canUpdateApplication,
  canReviewApplication,
  canDeleteApplication,
  canAssignCounsellor,
};
