
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  isOwner,
  sameId,
  safeStatus,
  resourceOwnerId,
} = require('./policy-utils');

const APPLICANT_ROLES = ['user', 'student', 'candidate'];

const STAFF_ROLES = [
  'counsellor',
  'support',
];

const ADMISSION_OWNER_FIELDS = [
  'applicantId',
  'candidateId',
  'userId',
  'ownerId',
];

const PROTECTED_FIELDS = new Set([
  'id',
  '_id',
  'admissionId',
  'applicationId',
  'applicantId',
  'candidateId',
  'userId',
  'ownerId',
  'status',
  'decision',
  'decisionStatus',
  'reviewStatus',
  'assignedCounsellorId',
  'assignedTo',
  'reviewedBy',
  'approvedBy',
  'rejectedBy',
  'approvedAt',
  'rejectedAt',
  'reviewedAt',
  'submittedAt',
  'createdAt',
  'updatedAt',
]);

const EDITABLE_STATUSES = new Set([
  'draft',
  'incomplete',
]);

const REVIEWABLE_STATUSES = new Set([
  'submitted',
  'under_review',
  'pending_review',
]);

const TERMINAL_STATUSES = new Set([
  'approved',
  'rejected',
  'cancelled',
  'withdrawn',
  'closed',
]);

const VALID_DECISIONS = new Set([
  'approved',
  'rejected',
  'waitlisted',
]);

function admissionOwnerId(admission) {
  return resourceOwnerId(admission, ADMISSION_OWNER_FIELDS);
}

function hasAdmissionAccess(actor, admission) {
  if (!actor || !admission) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'admissions:read:any')
  ) {
    return true;
  }

  if (isOwner(actor, admissionOwnerId(admission))) {
    return true;
  }

  const assignedTo =
    admission.assignedCounsellorId ??
    admission.assignedTo;

  return Boolean(
    assignedTo != null &&
    sameId(
      assignedTo,
      actor.id ?? actor.userId ?? actor.sub ?? actor._id,
    ) &&
    hasRole(actor, ...STAFF_ROLES) &&
    hasPermission(actor, 'admissions:read:assigned'),
  );
}

/**
 * Controls creation of an admission record.
 *
 * The service must derive the authenticated applicant ID
 * from trusted server-side identity.
 */
function canCreateAdmission(actor, input = {}) {
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
    hasPermission(actor, 'admissions:create:any')
  ) {
    return true;
  }

  if (
    !hasRole(actor, ...APPLICANT_ROLES) ||
    actor.isSuspended === true ||
    actor.status === 'suspended' ||
    actor.status === 'disabled'
  ) {
    return false;
  }

  const requestedOwner =
    input.applicantId ??
    input.candidateId ??
    input.userId ??
    input.ownerId;

  return (
    requestedOwner == null ||
    requestedOwner === '' ||
    isOwner(actor, requestedOwner)
  );
}

/**
 * Controls viewing an admission.
 */
function canViewAdmission(actor, admission) {
  return hasAdmissionAccess(actor, admission);
}

/**
 * Controls editing applicant-provided admission fields.
 *
 * Ownership does not permit changing review or decision fields.
 */
function canUpdateAdmission(actor, admission, changes = {}) {
  if (
    !actor ||
    !admission ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'admissions:update:any')
  ) {
    return true;
  }

  const owner = isOwner(actor, admissionOwnerId(admission));

  const assignedTo =
    admission.assignedCounsellorId ??
    admission.assignedTo;

  const assignedStaff = Boolean(
    assignedTo != null &&
    sameId(
      assignedTo,
      actor.id ?? actor.userId ?? actor.sub ?? actor._id,
    ) &&
    hasRole(actor, ...STAFF_ROLES) &&
    hasPermission(actor, 'admissions:update:assigned'),
  );

  const keys = Object.keys(changes);

  if (keys.some((key) => PROTECTED_FIELDS.has(key))) {
    return false;
  }

  if (assignedStaff) {
    return true;
  }

  return (
    owner &&
    EDITABLE_STATUSES.has(safeStatus(admission.status))
  );
}

/**
 * Controls access to review an admission.
 */
function canReviewAdmission(actor, admission) {
  if (!actor || !admission) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'admissions:review:any')
  ) {
    return true;
  }

  const assignedTo =
    admission.assignedCounsellorId ??
    admission.assignedTo;

  return Boolean(
    assignedTo != null &&
    sameId(
      assignedTo,
      actor.id ?? actor.userId ?? actor.sub ?? actor._id,
    ) &&
    hasRole(actor, 'counsellor') &&
    hasPermission(actor, 'admissions:review:assigned'),
  );
}

/**
 * Checks whether an admission can transition to a new status.
 *
 * Call only after authorization and server-side validation.
 */
function canChangeAdmissionStatus(actor, admission, nextStatus) {
  if (
    !actor ||
    !admission ||
    typeof nextStatus !== 'string'
  ) {
    return false;
  }

  const targetStatus = safeStatus(nextStatus);
  const currentStatus = safeStatus(admission.status);

  if (!targetStatus || targetStatus === currentStatus) {
    return false;
  }

  if (TERMINAL_STATUSES.has(currentStatus)) {
    return false;
  }

  if (
    !isAdmin(actor) &&
    !hasPermission(actor, 'admissions:status:update:any') &&
    !canReviewAdmission(actor, admission)
  ) {
    return false;
  }

  const transitions = {
    draft: ['submitted', 'incomplete', 'cancelled'],
    incomplete: ['submitted', 'cancelled'],
    submitted: [
      'under_review',
      'pending_review',
      'approved',
      'rejected',
      'waitlisted',
      'withdrawn',
    ],
    pending_review: [
      'under_review',
      'approved',
      'rejected',
      'waitlisted',
      'withdrawn',
    ],
    under_review: [
      'approved',
      'rejected',
      'waitlisted',
      'withdrawn',
    ],
    waitlisted: [
      'approved',
      'rejected',
      'withdrawn',
    ],
  };

  return (transitions[currentStatus] || []).includes(targetStatus);
}

/**
 * Controls assigning an admission to a counsellor.
 */
function canAssignAdmission(actor, admission, assigneeId) {
  if (
    !actor ||
    !admission ||
    assigneeId == null ||
    assigneeId === ''
  ) {
    return false;
  }

  if (
    !isAdmin(actor) &&
    !hasPermission(actor, 'admissions:assign')
  ) {
    return false;
  }

  const currentAssignee =
    admission.assignedCounsellorId ??
    admission.assignedTo;

  return !sameId(currentAssignee, assigneeId);
}

/**
 * Controls deletion of an admission.
 *
 * Prefer soft deletion and retain submitted records for audit.
 */
function canDeleteAdmission(actor, admission) {
  if (!actor || !admission) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'admissions:delete:any')
  ) {
    return true;
  }

  return (
    isOwner(actor, admissionOwnerId(admission)) &&
    EDITABLE_STATUSES.has(safeStatus(admission.status))
  );
}

/**
 * Controls setting an admission decision.
 */
function canSetAdmissionDecision(actor, admission, decision) {
  if (
    !actor ||
    !admission ||
    typeof decision !== 'string' ||
    !VALID_DECISIONS.has(safeStatus(decision))
  ) {
    return false;
  }

  if (!canReviewAdmission(actor, admission)) {
    return false;
  }

  return REVIEWABLE_STATUSES.has(safeStatus(admission.status));
}

/**
 * Controls access to admission exports.
 */
function canExportAdmissions(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'admissions:export')
    ),
  );
}

module.exports = {
  admissionOwnerId,
  canCreateAdmission,
  canViewAdmission,
  canUpdateAdmission,
  canReviewAdmission,
  canChangeAdmissionStatus,
  canAssignAdmission,
  canDeleteAdmission,
  canSetAdmissionDecision,
  canExportAdmissions,
};
