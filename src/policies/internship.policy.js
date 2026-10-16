
'use strict';

const {
  isAdmin,
  hasPermission,
  hasRole,
  sameId,
  actorId,
  resourceOwnerId,
  safeStatus,
} = require('./policy-utils');

const OWNER_FIELDS = [
  'ownerId',
  'createdBy',
  'managedBy',
];

const EDITABLE_STATUSES = new Set([
  'draft',
  'published',
  'paused',
]);

const TERMINAL_STATUSES = new Set([
  'closed',
  'filled',
  'deleted',
]);

const PROTECTED_FIELDS = new Set([
  'id',
  '_id',
  'employerId',
  'ownerId',
  'createdBy',
  'managedBy',
  'status',
  'verified',
  'verificationStatus',
  'approvedBy',
  'approvedAt',
  'publishedAt',
  'closedAt',
  'filledAt',
  'deletedAt',
  'applicationCount',
  'createdAt',
  'updatedAt',
]);

function internshipOwnerId(internship) {
  if (!internship || typeof internship !== 'object') {
    return null;
  }

  return resourceOwnerId(internship, [
    'employerId',
    ...OWNER_FIELDS,
  ]);
}

function internshipEmployerId(internship) {
  if (!internship || typeof internship !== 'object') {
    return null;
  }

  return internship.employerId ?? null;
}

function isInternshipOwner(actor, internship) {
  if (!actor || !internship) {
    return false;
  }

  const employerId = internshipEmployerId(internship);

  if (
    employerId != null &&
    sameId(actor.employerId, employerId) &&
    hasRole(actor, 'employer')
  ) {
    return true;
  }

  const ownerId = resourceOwnerId(internship, OWNER_FIELDS);

  return ownerId != null &&
    sameId(actorId(actor), ownerId);
}

function canViewInternship(actor, internship) {
  if (!internship || typeof internship !== 'object') {
    return false;
  }

  const status = safeStatus(internship.status);

  if (TERMINAL_STATUSES.has(status)) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internships:read:any')
  ) {
    return true;
  }

  if (status === 'published') {
    return true;
  }

  return Boolean(
    actor &&
    (
      isInternshipOwner(actor, internship) ||
      hasPermission(actor, 'internships:read:private')
    )
  );
}

function canCreateInternship(actor, input = {}) {
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
    hasPermission(actor, 'internships:create:any')
  ) {
    return true;
  }

  return Boolean(
    hasRole(actor, 'employer') &&
    actor.isSuspended !== true &&
    actor.status !== 'suspended' &&
    actor.status !== 'disabled' &&
    actor.employerId != null &&
    hasPermission(actor, 'internships:create:own-employer')
  );
}

function canUpdateInternship(actor, internship, changes = {}) {
  if (
    !actor ||
    !internship ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internships:update:any')
  ) {
    return true;
  }

  if (!isInternshipOwner(actor, internship)) {
    return false;
  }

  if (!EDITABLE_STATUSES.has(safeStatus(internship.status))) {
    return false;
  }

  return !Object.keys(changes).some(
    (key) => PROTECTED_FIELDS.has(key)
  );
}

function canPublishInternship(actor, internship) {
  if (!actor || !internship) {
    return false;
  }

  if (
    !['draft', 'paused'].includes(
      safeStatus(internship.status)
    )
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internships:publish:any')
  ) {
    return true;
  }

  return Boolean(
    isInternshipOwner(actor, internship) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'internships:publish:own-employer')
  );
}

function canPauseInternship(actor, internship) {
  if (!actor || !internship) {
    return false;
  }

  if (safeStatus(internship.status) !== 'published') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internships:pause:any')
  ) {
    return true;
  }

  return Boolean(
    isInternshipOwner(actor, internship) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'internships:pause:own-employer')
  );
}

function canCloseInternship(actor, internship) {
  if (!actor || !internship) {
    return false;
  }

  if (
    TERMINAL_STATUSES.has(safeStatus(internship.status)) ||
    !['draft', 'published', 'paused'].includes(
      safeStatus(internship.status)
    )
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internships:close:any')
  ) {
    return true;
  }

  return Boolean(
    isInternshipOwner(actor, internship) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'internships:close:own-employer')
  );
}

function canMarkInternshipFilled(actor, internship) {
  if (!actor || !internship) {
    return false;
  }

  if (safeStatus(internship.status) !== 'published') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internships:mark-filled:any')
  ) {
    return true;
  }

  return Boolean(
    isInternshipOwner(actor, internship) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'internships:mark-filled:own-employer')
  );
}

function canDeleteInternship(actor, internship) {
  if (!actor || !internship) {
    return false;
  }

  if (safeStatus(internship.status) === 'deleted') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internships:delete:any')
  ) {
    return true;
  }

  return Boolean(
    isInternshipOwner(actor, internship) &&
    safeStatus(internship.status) === 'draft' &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'internships:delete:own-employer')
  );
}

function canViewInternshipApplicants(actor, internship) {
  if (!actor || !internship) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'internship-applications:read:any')
  ) {
    return true;
  }

  return Boolean(
    isInternshipOwner(actor, internship) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'internship-applications:read:employer')
  );
}

function canExportInternships(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'internships:export')
    )
  );
}

module.exports = {
  internshipOwnerId,
  internshipEmployerId,
  isInternshipOwner,
  canViewInternship,
  canCreateInternship,
  canUpdateInternship,
  canPublishInternship,
  canPauseInternship,
  canCloseInternship,
  canMarkInternshipFilled,
  canDeleteInternship,
  canViewInternshipApplicants,
  canExportInternships,
};
