'use strict';

const {
  isAdmin, hasRole, hasPermission, isOwner, sameId,
} = require('./policy-utils');

function employerAccountId(employer) {
  if (!employer || typeof employer !== 'object') return null;
  return employer.id ?? employer._id ?? employer.employerId ?? null;
}

function employerMatchesActor(actor, employer) {
  if (!actor || !employer) return false;
  const actorEmployerId = actor.employerId;
  const actorUserId = actor.id ?? actor.userId ?? actor.sub;
  const accountId = employerAccountId(employer);
  const ownerUserId = employer.userId ?? employer.ownerId ?? employer.createdBy;
  return sameId(actorEmployerId, accountId) ||
    (sameId(actorUserId, ownerUserId) && hasRole(actor, 'employer'));
}

function canCreateEmployerAccount(actor, input = {}) {
  if (!actor) return false;
  if (isAdmin(actor) || hasPermission(actor, 'employers:create:any')) return true;
  const requestedOwner = input.userId ?? input.ownerId;
  if (requestedOwner && !isOwner(actor, requestedOwner)) return false;
  return hasRole(actor, 'user', 'employer') &&
    actor.isVerified === true;
}

function canViewEmployer(actor, employer) {
  if (!actor || !employer) return false;
  if (isAdmin(actor) || hasPermission(actor, 'employers:read:any')) return true;
  if (employerMatchesActor(actor, employer)) return true;
  return employer.publicProfile === true &&
    hasPermission(actor, 'employers:read:public');
}

function canUpdateEmployer(actor, employer, changes = {}) {
  if (!actor || !employer) return false;
  if (isAdmin(actor) || hasPermission(actor, 'employers:update:any')) return true;
  if (!employerMatchesActor(actor, employer)) return false;
  const protectedFields = new Set([
    'id', '_id', 'employerId', 'userId', 'ownerId', 'createdBy',
    'verified', 'verificationStatus', 'status', 'subscriptionStatus',
    'planId', 'billingStatus', 'createdAt', 'deletedAt',
  ]);
  return !Object.keys(changes || {}).some((key) => protectedFields.has(key));
}

function canManageEmployerJobs(actor, employer, job = null) {
  if (!actor || !employer) return false;
  if (isAdmin(actor) || hasPermission(actor, 'jobs:manage:any')) return true;
  if (!employerMatchesActor(actor, employer)) return false;
  if (job && !sameId(job.employerId ?? job.ownerEmployerId, employerAccountId(employer))) return false;
  return hasRole(actor, 'employer') &&
    hasPermission(actor, 'jobs:manage:own-employer');
}

function canViewApplicants(actor, employer, job, application = null) {
  if (!actor || !employer || !job) return false;
  if (isAdmin(actor) || hasPermission(actor, 'applications:read:any')) return true;
  if (!employerMatchesActor(actor, employer)) return false;
  if (!sameId(job.employerId ?? job.ownerEmployerId, employerAccountId(employer))) return false;
  if (application && !sameId(application.jobId, job.id ?? job._id)) return false;
  return hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'applications:read:employer');
}

function canManageRecruitment(actor, employer, recruitment = null) {
  if (!actor || !employer) return false;
  if (isAdmin(actor) || hasPermission(actor, 'recruitment:manage:any')) return true;
  if (!employerMatchesActor(actor, employer)) return false;
  if (recruitment && !sameId(recruitment.employerId, employerAccountId(employer))) return false;
  return hasRole(actor, 'employer', 'recruiter') &&
    hasPermission(actor, 'recruitment:manage:own-employer');
}

module.exports = {
  canCreateEmployerAccount,
  canViewEmployer,
  canUpdateEmployer,
  canManageEmployerJobs,
  canViewApplicants,
  canManageRecruitment,
  employerMatchesActor,
};
