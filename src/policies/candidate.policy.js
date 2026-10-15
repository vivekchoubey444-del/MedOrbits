'use strict';

const {
  isAdmin, hasRole, hasPermission, isOwner, sameId,
  resourceOwnerId,
} = require('./policy-utils');

function candidateOwnerId(candidate) {
  return resourceOwnerId(candidate, ['userId', 'ownerId', 'accountId', 'id', '_id']);
}

function canCreateCandidateProfile(actor, input = {}) {
  if (!actor) return false;
  if (isAdmin(actor) || hasPermission(actor, 'candidates:create:any')) return true;
  const target = input.userId ?? input.ownerId ?? input.accountId;
  if (!target) return hasRole(actor, 'user', 'student', 'candidate');
  return isOwner(actor, target) && hasRole(actor, 'user', 'student', 'candidate');
}

function canViewCandidate(actor, candidate) {
  if (!actor || !candidate) return false;
  if (isAdmin(actor) || hasPermission(actor, 'candidates:read:any')) return true;
  if (isOwner(actor, candidateOwnerId(candidate))) return true;
  if (candidate.profileVisibility === 'public' &&
      candidate.allowRecruiterDiscovery === true &&
      hasRole(actor, 'employer', 'recruiter')) {
    return hasPermission(actor, 'candidates:discover');
  }
  return false;
}

function canUpdateCandidate(actor, candidate, changes = {}) {
  if (!actor || !candidate) return false;
  if (isAdmin(actor) || hasPermission(actor, 'candidates:update:any')) return true;
  if (!isOwner(actor, candidateOwnerId(candidate))) return false;

  const protectedFields = new Set([
    'userId', 'ownerId', 'accountId', 'role', 'isAdmin',
    'verified', 'verificationStatus', 'moderationStatus',
    'createdAt', 'updatedAt', 'deletedAt',
  ]);
  return !Object.keys(changes || {}).some((key) => protectedFields.has(key));
}

function canDeleteCandidate(actor, candidate) {
  if (!actor || !candidate) return false;
  if (isAdmin(actor) || hasPermission(actor, 'candidates:delete:any')) return true;
  return isOwner(actor, candidateOwnerId(candidate)) &&
    candidate.hasActiveApplications !== true &&
    candidate.hasOutstandingPayments !== true;
}

function canEmployerViewCandidateApplication(actor, candidate, application) {
  if (!actor || !candidate || !application) return false;
  if (isAdmin(actor) || hasPermission(actor, 'applications:read:any')) return true;
  const employerId = actor.employerId;
  const applicationEmployerId = application.employerId ?? application.jobEmployerId;
  const hasApplied = sameId(application.candidateId ?? application.applicantId, candidate.id ?? candidate._id ?? candidate.userId);
  const employerMatches = sameId(employerId, applicationEmployerId);
  return hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'applications:read:employer') &&
    employerMatches && hasApplied;
}

function canExportCandidateData(actor, candidate) {
  if (!actor || !candidate) return false;
  return isAdmin(actor) ||
    (isOwner(actor, candidateOwnerId(candidate)) &&
     hasPermission(actor, 'candidates:export:self')) ||
    hasPermission(actor, 'candidates:export:any');
}

module.exports = {
  canCreateCandidateProfile,
  canViewCandidate,
  canUpdateCandidate,
  canDeleteCandidate,
  canEmployerViewCandidateApplication,
  canExportCandidateData,
};
