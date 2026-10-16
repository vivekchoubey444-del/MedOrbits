
'use strict';

const {
  isAdmin,
  hasPermission,
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
  'archived',
]);

const HIDDEN_STATUSES = new Set([
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

function universityOwnerId(university) {
  if (!university || typeof university !== 'object') {
    return null;
  }

  return resourceOwnerId(university, OWNER_FIELDS);
}

function isUniversityOwner(actor, university) {
  if (!actor || !university) {
    return false;
  }

  const ownerId = universityOwnerId(university);

  return ownerId != null &&
    sameId(actorId(actor), ownerId);
}

function canViewUniversity(actor, university) {
  if (!university || typeof university !== 'object') {
    return false;
  }

  const status = safeStatus(university.status);

  if (HIDDEN_STATUSES.has(status)) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'universities:read:any')
  ) {
    return true;
  }

  if (status === 'published') {
    return true;
  }

  return Boolean(
    actor &&
    (
      isUniversityOwner(actor, university) ||
      hasPermission(actor, 'universities:read:private')
    )
  );
}

function canCreateUniversity(actor, input = {}) {
  if (
    !actor ||
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'universities:create')
  );
}

function canUpdateUniversity(actor, university, changes = {}) {
  if (
    !actor ||
    !university ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'universities:update:any')
  ) {
    return true;
  }

  if (!isUniversityOwner(actor, university)) {
    return false;
  }

  if (!EDITABLE_STATUSES.has(safeStatus(university.status))) {
    return false;
  }

  return !Object.keys(changes).some(
    (key) => PROTECTED_FIELDS.has(key)
  );
}

function canPublishUniversity(actor, university) {
  if (!actor || !university) {
    return false;
  }

  if (
    !['draft', 'archived'].includes(
      safeStatus(university.status)
    )
  ) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'universities:publish')
  );
}

function canArchiveUniversity(actor, university) {
  if (!actor || !university) {
    return false;
  }

  if (safeStatus(university.status) !== 'published') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'universities:archive')
  );
}

function canRestoreUniversity(actor, university) {
  if (!actor || !university) {
    return false;
  }

  if (safeStatus(university.status) !== 'archived') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'universities:restore')
  );
}

function canVerifyUniversity(actor, university) {
  if (!actor || !university) {
    return false;
  }

  if (HIDDEN_STATUSES.has(safeStatus(university.status))) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'universities:verify')
  );
}

function canDeleteUniversity(actor, university) {
  if (!actor || !university) {
    return false;
  }

  if (HIDDEN_STATUSES.has(safeStatus(university.status))) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'universities:delete')
  );
}

function canExportUniversities(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'universities:export')
    )
  );
}

module.exports = {
  universityOwnerId,
  isUniversityOwner,
  canViewUniversity,
  canCreateUniversity,
  canUpdateUniversity,
  canPublishUniversity,
  canArchiveUniversity,
  canRestoreUniversity,
  canVerifyUniversity,
  canDeleteUniversity,
  canExportUniversities,
};
