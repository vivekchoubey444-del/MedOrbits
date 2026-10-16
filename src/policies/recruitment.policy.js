
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

const TERMINAL_STATUSES = new Set([
  'completed',
  'cancelled',
  'closed',
  'deleted',
]);

const EDITABLE_STATUSES = new Set([
  'draft',
  'active',
  'paused',
]);

const PROTECTED_FIELDS = new Set([
  'id',
  '_id',
  'employerId',
  'ownerId',
  'createdBy',
  'managedBy',
  'status',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'closedAt',
  'completedAt',
  'cancelledAt',
  'deletedAt',
  'approvedBy',
  'approvedAt',
  'candidateCount',
  'applicationCount',
]);

function recruitmentOwnerId(recruitment) {
  if (!recruitment || typeof recruitment !== 'object') {
    return null;
  }

  return resourceOwnerId(recruitment, [
    'employerId',
    ...OWNER_FIELDS,
  ]);
}

function recruitmentEmployerId(recruitment) {
  if (!recruitment || typeof recruitment !== 'object') {
    return null;
  }

  return recruitment.employerId ?? null;
}

function isRecruitmentOwner(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  const employerId = recruitmentEmployerId(recruitment);

  if (
    employerId != null &&
    sameId(actor.employerId, employerId) &&
    hasRole(actor, 'employer')
  ) {
    return true;
  }

  const ownerId = resourceOwnerId(recruitment, OWNER_FIELDS);

  return ownerId != null &&
    sameId(actorId(actor), ownerId);
}

function canViewRecruitment(actor, recruitment) {
  if (!recruitment || typeof recruitment !== 'object') {
    return false;
  }

  const status = safeStatus(recruitment.status);

  if (status === 'deleted') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:read:any')
  ) {
    return true;
  }

  if (
    recruitment.isPublic === true &&
    ['active', 'published'].includes(status)
  ) {
    return true;
  }

  return Boolean(
    actor &&
    (
      isRecruitmentOwner(actor, recruitment) ||
      hasPermission(actor, 'recruitment:read:private')
    )
  );
}

function canCreateRecruitment(actor, input = {}) {
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
    hasPermission(actor, 'recruitment:create:any')
  ) {
    return true;
  }

  return Boolean(
    hasRole(actor, 'employer', 'recruiter') &&
    actor.isSuspended !== true &&
    actor.status !== 'suspended' &&
    actor.status !== 'disabled' &&
    actor.employerId != null &&
    hasPermission(actor, 'recruitment:create:own-employer')
  );
}

function canUpdateRecruitment(actor, recruitment, changes = {}) {
  if (
    !actor ||
    !recruitment ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:update:any')
  ) {
    return true;
  }

  if (!isRecruitmentOwner(actor, recruitment)) {
    return false;
  }

  if (!EDITABLE_STATUSES.has(safeStatus(recruitment.status))) {
    return false;
  }

  return !Object.keys(changes).some(
    (key) => PROTECTED_FIELDS.has(key)
  );
}

function canPublishRecruitment(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  if (
    !['draft', 'paused'].includes(
      safeStatus(recruitment.status)
    )
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:publish:any')
  ) {
    return true;
  }

  return Boolean(
    isRecruitmentOwner(actor, recruitment) &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:publish:own-employer')
  );
}

function canPauseRecruitment(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  if (
    !['active', 'published'].includes(
      safeStatus(recruitment.status)
    )
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:pause:any')
  ) {
    return true;
  }

  return Boolean(
    isRecruitmentOwner(actor, recruitment) &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:pause:own-employer')
  );
}

function canCloseRecruitment(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  const status = safeStatus(recruitment.status);

  if (
    TERMINAL_STATUSES.has(status) ||
    !['draft', 'active', 'published', 'paused'].includes(status)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:close:any')
  ) {
    return true;
  }

  return Boolean(
    isRecruitmentOwner(actor, recruitment) &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:close:own-employer')
  );
}

function canCompleteRecruitment(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  if (
    !['active', 'published', 'paused'].includes(
      safeStatus(recruitment.status)
    )
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:complete:any')
  ) {
    return true;
  }

  return Boolean(
    isRecruitmentOwner(actor, recruitment) &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:complete:own-employer')
  );
}

function canDeleteRecruitment(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  if (safeStatus(recruitment.status) === 'deleted') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:delete:any')
  ) {
    return true;
  }

  return Boolean(
    isRecruitmentOwner(actor, recruitment) &&
    safeStatus(recruitment.status) === 'draft' &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:delete:own-employer')
  );
}

function canViewRecruitmentCandidates(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:candidates:read:any')
  ) {
    return true;
  }

  return Boolean(
    isRecruitmentOwner(actor, recruitment) &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:candidates:read:own-employer')
  );
}

function canManageRecruitmentPipeline(actor, recruitment) {
  if (!actor || !recruitment) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:pipeline:manage:any')
  ) {
    return true;
  }

  return Boolean(
    isRecruitmentOwner(actor, recruitment) &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:pipeline:manage:own-employer')
  );
}

function canExportRecruitment(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'recruitment:export')
    )
  );
}

module.exports = {
  recruitmentOwnerId,
  recruitmentEmployerId,
  isRecruitmentOwner,
  canViewRecruitment,
  canCreateRecruitment,
  canUpdateRecruitment,
  canPublishRecruitment,
  canPauseRecruitment,
  canCloseRecruitment,
  canCompleteRecruitment,
  canDeleteRecruitment,
  canViewRecruitmentCandidates,
  canManageRecruitmentPipeline,
  canExportRecruitment,
};
