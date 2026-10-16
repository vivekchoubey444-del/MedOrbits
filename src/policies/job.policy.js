
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

const JOB_OWNER_FIELDS = [
  'employerId',
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

function jobOwnerId(job) {
  if (!job || typeof job !== 'object') {
    return null;
  }

  return resourceOwnerId(job, JOB_OWNER_FIELDS);
}

function jobEmployerId(job) {
  if (!job || typeof job !== 'object') {
    return null;
  }

  return job.employerId ?? null;
}

function isJobOwner(actor, job) {
  if (!actor || !job) {
    return false;
  }

  const employerId = jobEmployerId(job);

  // Employer-owned jobs require a trusted employer membership
  // association, not merely a matching client-supplied ID.
  if (
    employerId != null &&
    sameId(actor.employerId, employerId) &&
    hasRole(actor, 'employer')
  ) {
    return true;
  }

  const ownerId = resourceOwnerId(job, [
    'ownerId',
    'createdBy',
    'managedBy',
  ]);

  return ownerId != null &&
    sameId(actorId(actor), ownerId);
}

function canViewJob(actor, job) {
  if (!job || typeof job !== 'object') {
    return false;
  }

  const status = safeStatus(job.status);

  if (TERMINAL_STATUSES.has(status)) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:read:any')
  ) {
    return true;
  }

  if (status === 'published') {
    return true;
  }

  return Boolean(
    actor &&
    (
      isJobOwner(actor, job) ||
      hasPermission(actor, 'jobs:read:private')
    )
  );
}

function canCreateJob(actor, input = {}) {
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
    hasPermission(actor, 'jobs:create:any')
  ) {
    return true;
  }

  return Boolean(
    hasRole(actor, 'employer') &&
    actor.isSuspended !== true &&
    actor.status !== 'suspended' &&
    actor.status !== 'disabled' &&
    actor.employerId != null &&
    hasPermission(actor, 'jobs:create:own-employer')
  );
}

function canUpdateJob(actor, job, changes = {}) {
  if (
    !actor ||
    !job ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:update:any')
  ) {
    return true;
  }

  if (!isJobOwner(actor, job)) {
    return false;
  }

  if (!EDITABLE_STATUSES.has(safeStatus(job.status))) {
    return false;
  }

  return !Object.keys(changes).some(
    (key) => PROTECTED_FIELDS.has(key)
  );
}

function canPublishJob(actor, job) {
  if (!actor || !job) {
    return false;
  }

  if (!['draft', 'paused'].includes(safeStatus(job.status))) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:publish:any')
  ) {
    return true;
  }

  return Boolean(
    isJobOwner(actor, job) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'jobs:publish:own-employer')
  );
}

function canPauseJob(actor, job) {
  if (!actor || !job) {
    return false;
  }

  if (safeStatus(job.status) !== 'published') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:pause:any')
  ) {
    return true;
  }

  return Boolean(
    isJobOwner(actor, job) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'jobs:pause:own-employer')
  );
}

function canCloseJob(actor, job) {
  if (!actor || !job) {
    return false;
  }

  if (
    TERMINAL_STATUSES.has(safeStatus(job.status)) ||
    !['published', 'paused', 'draft'].includes(
      safeStatus(job.status)
    )
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:close:any')
  ) {
    return true;
  }

  return Boolean(
    isJobOwner(actor, job) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'jobs:close:own-employer')
  );
}

function canMarkJobFilled(actor, job) {
  if (!actor || !job) {
    return false;
  }

  if (safeStatus(job.status) !== 'published') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:mark-filled:any')
  ) {
    return true;
  }

  return Boolean(
    isJobOwner(actor, job) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'jobs:mark-filled:own-employer')
  );
}

function canDeleteJob(actor, job) {
  if (!actor || !job) {
    return false;
  }

  if (safeStatus(job.status) === 'deleted') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:delete:any')
  ) {
    return true;
  }

  return Boolean(
    isJobOwner(actor, job) &&
    safeStatus(job.status) === 'draft' &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'jobs:delete:own-employer')
  );
}

function canViewJobApplicants(actor, job) {
  if (!actor || !job) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:read:any')
  ) {
    return true;
  }

  return Boolean(
    isJobOwner(actor, job) &&
    hasRole(actor, 'employer') &&
    hasPermission(actor, 'applications:read:employer')
  );
}

function canExportJobs(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'jobs:export')
    )
  );
}

module.exports = {
  jobOwnerId,
  jobEmployerId,
  isJobOwner,
  canViewJob,
  canCreateJob,
  canUpdateJob,
  canPublishJob,
  canPauseJob,
  canCloseJob,
  canMarkJobFilled,
  canDeleteJob,
  canViewJobApplicants,
  canExportJobs,
};
