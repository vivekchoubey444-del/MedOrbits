
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  isOwner,
  sameId,
  resourceOwnerId,
} = require('./policy-utils');

const CANDIDATE_OWNER_FIELDS = [
  'userId',
  'ownerId',
  'accountId',
  'id',
  '_id',
];

const PROTECTED_CANDIDATE_FIELDS = new Set([
  'id',
  '_id',
  'userId',
  'ownerId',
  'accountId',
  'role',
  'roles',
  'isAdmin',
  'permissions',
  'verified',
  'verificationStatus',
  'moderationStatus',
  'status',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

function actorId(actor) {
  return actor?.id ?? actor?.userId ?? actor?.sub ?? null;
}

function candidateOwnerId(candidate) {
  return resourceOwnerId(candidate, CANDIDATE_OWNER_FIELDS);
}

function canCreateCandidateProfile(actor, input = {}) {
  if (!actor) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'candidates:create:any')
  ) {
    return true;
  }

  if (!hasRole(actor, 'user', 'student', 'candidate')) {
    return false;
  }

  const target =
    input.userId ??
    input.ownerId ??
    input.accountId;

  // The service/controller should assign the authenticated
  // user's identity when the client omits an owner identifier.
  if (target == null || target === '') {
    return true;
  }

  return isOwner(actor, target);
}

function canViewCandidate(actor, candidate) {
  if (!actor || !candidate) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'candidates:read:any')
  ) {
    return true;
  }

  if (isOwner(actor, candidateOwnerId(candidate))) {
    return true;
  }

  const discoverable =
    candidate.profileVisibility === 'public' &&
    candidate.allowRecruiterDiscovery === true;

  return (
    discoverable &&
    hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'candidates:discover')
  );
}

function canUpdateCandidate(actor, candidate, changes = {}) {
  if (!actor || !candidate) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'candidates:update:any')
  ) {
    return true;
  }

  if (!isOwner(actor, candidateOwnerId(candidate))) {
    return false;
  }

  if (
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  return !Object.keys(changes).some((key) =>
    PROTECTED_CANDIDATE_FIELDS.has(key)
  );
}

function canDeleteCandidate(actor, candidate) {
  if (!actor || !candidate) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'candidates:delete:any')
  ) {
    return true;
  }

  return (
    isOwner(actor, candidateOwnerId(candidate)) &&
    candidate.hasActiveApplications !== true &&
    candidate.hasOutstandingPayments !== true
  );
}

function canEmployerViewCandidateApplication(
  actor,
  candidate,
  application
) {
  if (!actor || !candidate || !application) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:read:any')
  ) {
    return true;
  }

  if (
    !hasRole(actor, 'employer', 'recruiter') ||
    !hasPermission(actor, 'applications:read:employer')
  ) {
    return false;
  }

  const employerId = actor.employerId;

  const applicationEmployerId =
    application.employerId ??
    application.jobEmployerId;

  const candidateIdentifiers = [
    candidate.id,
    candidate._id,
    candidate.userId,
  ].filter((value) => value != null);

  const applicationCandidateId =
    application.candidateId ??
    application.applicantId;

  const hasApplied = candidateIdentifiers.some(
    (id) => sameId(applicationCandidateId, id)
  );

  return (
    employerId != null &&
    applicationEmployerId != null &&
    sameId(employerId, applicationEmployerId) &&
    hasApplied
  );
}

function canExportCandidateData(actor, candidate) {
  if (!actor || !candidate) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'candidates:export:any')
  ) {
    return true;
  }

  return (
    isOwner(actor, candidateOwnerId(candidate)) &&
    hasPermission(actor, 'candidates:export:self')
  );
}

module.exports = {
  canCreateCandidateProfile,
  canViewCandidate,
  canUpdateCandidate,
  canDeleteCandidate,
  canEmployerViewCandidateApplication,
  canExportCandidateData,
};
