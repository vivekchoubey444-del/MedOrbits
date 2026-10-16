
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  isOwner,
  sameId,
} = require('./policy-utils');

const PROTECTED_EMPLOYER_FIELDS = new Set([
  'id',
  '_id',
  'employerId',
  'userId',
  'ownerId',
  'createdBy',
  'verified',
  'isVerified',
  'verificationStatus',
  'verifiedAt',
  'verifiedBy',
  'status',
  'subscriptionStatus',
  'planId',
  'billingStatus',
  'billingCustomerId',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

function actorId(actor) {
  return actor?.id ?? actor?.userId ?? actor?.sub ?? null;
}

function employerAccountId(employer) {
  if (!employer || typeof employer !== 'object') {
    return null;
  }

  return employer.id ?? employer._id ?? employer.employerId ?? null;
}

function employerMatchesActor(actor, employer) {
  if (!actor || !employer) return false;

  const userId = actorId(actor);
  const actorEmployerId = actor.employerId;
  const accountId = employerAccountId(employer);
  const ownerUserId =
    employer.userId ??
    employer.ownerId ??
    employer.createdBy;

  const accountMatch =
    actorEmployerId != null &&
    accountId != null &&
    sameId(actorEmployerId, accountId);

  const ownerMatch =
    userId != null &&
    ownerUserId != null &&
    sameId(userId, ownerUserId) &&
    hasRole(actor, 'employer');

  return accountMatch || ownerMatch;
}

function canCreateEmployerAccount(actor, input = {}) {
  if (!actor) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'employers:create:any')
  ) {
    return true;
  }

  if (!hasRole(actor, 'user', 'employer')) {
    return false;
  }

  if (actor.isVerified !== true) {
    return false;
  }

  const requestedOwner = input.userId ?? input.ownerId;

  if (
    requestedOwner != null &&
    requestedOwner !== '' &&
    !isOwner(actor, requestedOwner)
  ) {
    return false;
  }

  return true;
}

function canViewEmployer(actor, employer) {
  if (!actor || !employer) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'employers:read:any')
  ) {
    return true;
  }

  if (employerMatchesActor(actor, employer)) {
    return true;
  }

  return (
    employer.publicProfile === true &&
    hasPermission(actor, 'employers:read:public')
  );
}

function canUpdateEmployer(actor, employer, changes = {}) {
  if (!actor || !employer) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'employers:update:any')
  ) {
    return true;
  }

  if (!employerMatchesActor(actor, employer)) {
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
    PROTECTED_EMPLOYER_FIELDS.has(key)
  );
}

function canManageEmployerJobs(actor, employer, job = null) {
  if (!actor || !employer) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'jobs:manage:any')
  ) {
    return true;
  }

  if (
    !employerMatchesActor(actor, employer) ||
    !hasRole(actor, 'employer') ||
    !hasPermission(actor, 'jobs:manage:own-employer')
  ) {
    return false;
  }

  if (job != null) {
    const jobEmployerId =
      job.employerId ??
      job.ownerEmployerId;

    if (
      jobEmployerId == null ||
      !sameId(jobEmployerId, employerAccountId(employer))
    ) {
      return false;
    }
  }

  return true;
}

function canViewApplicants(actor, employer, job, application = null) {
  if (!actor || !employer || !job) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'applications:read:any')
  ) {
    return true;
  }

  if (
    !employerMatchesActor(actor, employer) ||
    !hasRole(actor, 'employer', 'recruiter') ||
    !hasPermission(actor, 'applications:read:employer')
  ) {
    return false;
  }

  const jobEmployerId =
    job.employerId ??
    job.ownerEmployerId;

  if (
    jobEmployerId == null ||
    !sameId(jobEmployerId, employerAccountId(employer))
  ) {
    return false;
  }

  if (application != null) {
    const jobId = job.id ?? job._id;
    const applicationJobId = application.jobId;

    if (
      jobId == null ||
      applicationJobId == null ||
      !sameId(applicationJobId, jobId)
    ) {
      return false;
    }

    const applicationEmployerId =
      application.employerId ??
      application.jobEmployerId;

    if (
      applicationEmployerId != null &&
      !sameId(
        applicationEmployerId,
        employerAccountId(employer)
      )
    ) {
      return false;
    }
  }

  return true;
}

function canManageRecruitment(
  actor,
  employer,
  recruitment = null
) {
  if (!actor || !employer) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'recruitment:manage:any')
  ) {
    return true;
  }

  if (
    !employerMatchesActor(actor, employer) ||
    !hasRole(actor, 'employer', 'recruiter') ||
    !hasPermission(actor, 'recruitment:manage:own-employer')
  ) {
    return false;
  }

  if (recruitment != null) {
    const recruitmentEmployerId = recruitment.employerId;

    if (
      recruitmentEmployerId == null ||
      !sameId(
        recruitmentEmployerId,
        employerAccountId(employer)
      )
    ) {
      return false;
    }
  }

  return true;
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
