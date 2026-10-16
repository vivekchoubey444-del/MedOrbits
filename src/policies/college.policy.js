
'use strict';

const {
  isAdmin,
  hasPermission,
  sameId,
  actorId,
  safeStatus,
} = require('./policy-utils');

const COLLEGE_OWNER_FIELDS = [
  'ownerId',
  'createdBy',
  'managedBy',
];

const PUBLIC_STATUSES = new Set([
  'published',
]);

const EDITABLE_STATUSES = new Set([
  'draft',
  'published',
  'archived',
]);

const TERMINAL_OR_HIDDEN_STATUSES = new Set([
  'deleted',
]);

const PROTECTED_FIELDS = new Set([
  'id',
  '_id',
  'ownerId',
  'createdBy',
  'managedBy',
  'status',
  'verified',
  'verificationStatus',
  'approvedBy',
  'approvedAt',
  'publishedAt',
  'archivedAt',
  'deletedAt',
  'createdAt',
  'updatedAt',
]);

function collegeOwnerId(college) {
  if (!college || typeof college !== 'object') {
    return null;
  }

  for (const field of COLLEGE_OWNER_FIELDS) {
    const value = college[field];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function isCollegeOwner(actor, college) {
  if (!actor || !college) {
    return false;
  }

  const ownerId = collegeOwnerId(college);

  return ownerId != null &&
    sameId(actorId(actor), ownerId);
}

/**
 * Public access is limited to published colleges.
 * Private records require ownership or explicit permission.
 */
function canViewCollege(actor, college) {
  if (!college || typeof college !== 'object') {
    return false;
  }

  const status = safeStatus(college.status);

  if (TERMINAL_OR_HIDDEN_STATUSES.has(status)) {
    return false;
  }

  if (isAdmin(actor) ||
      hasPermission(actor, 'colleges:read:any')) {
    return true;
  }

  if (PUBLIC_STATUSES.has(status)) {
    return true;
  }

  return Boolean(
    actor &&
    (
      isCollegeOwner(actor, college) ||
      hasPermission(actor, 'colleges:read:private')
    )
  );
}

/**
 * Creating a college record.
 * Ownership must be assigned by trusted server-side code.
 */
function canCreateCollege(actor, input = {}) {
  if (!actor || !input ||
      typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'colleges:create')
  );
}

/**
 * Updating ordinary college fields.
 * Status, ownership, and verification fields require separate
 * authorized operations.
 */
function canUpdateCollege(actor, college, changes = {}) {
  if (!actor || !college || !changes ||
      typeof changes !== 'object' || Array.isArray(changes)) {
    return false;
  }

  if (isAdmin(actor) ||
      hasPermission(actor, 'colleges:update:any')) {
    return true;
  }

  if (!isCollegeOwner(actor, college)) {
    return false;
  }

  const status = safeStatus(college.status);

  if (!EDITABLE_STATUSES.has(status)) {
    return false;
  }

  return !Object.keys(changes).some(
    (key) => PROTECTED_FIELDS.has(key)
  );
}

/**
 * Publishing requires an explicit permission.
 * Publication-readiness checks belong in the service layer.
 */
function canPublishCollege(actor, college) {
  if (!actor || !college) {
    return false;
  }

  const status = safeStatus(college.status);

  if (status !== 'draft' && status !== 'archived') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'colleges:publish')
  );
}

/**
 * Archiving a published college.
 */
function canArchiveCollege(actor, college) {
  if (!actor || !college) {
    return false;
  }

  if (safeStatus(college.status) !== 'published') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'colleges:archive')
  );
}

/**
 * Restoring an archived college to draft status.
 * This does not publish the college.
 */
function canRestoreCollege(actor, college) {
  if (!actor || !college) {
    return false;
  }

  if (safeStatus(college.status) !== 'archived') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'colleges:restore')
  );
}

/**
 * Verifying college information.
 * Verification should follow the configured review workflow.
 */
function canVerifyCollege(actor, college) {
  if (!actor || !college) {
    return false;
  }

  if (safeStatus(college.status) === 'deleted') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'colleges:verify')
  );
}

/**
 * Deleting a college record.
 * Prefer soft deletion and retain records needed for audit or
 * admission-history integrity.
 */
function canDeleteCollege(actor, college) {
  if (!actor || !college) {
    return false;
  }

  if (safeStatus(college.status) === 'deleted') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'colleges:delete')
  );
}

/**
 * Exporting college records.
 */
function canExportColleges(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'colleges:export')
    )
  );
}

module.exports = {
  collegeOwnerId,
  isCollegeOwner,
  canViewCollege,
  canCreateCollege,
  canUpdateCollege,
  canPublishCollege,
  canArchiveCollege,
  canRestoreCollege,
  canVerifyCollege,
  canDeleteCollege,
  canExportColleges,
};
