
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canCreateEmployerAccount,
  canViewEmployer,
  canUpdateEmployer,
  canManageEmployerJobs,
  canViewApplicants,
  canManageRecruitment,
  employerMatchesActor,
} = require('../../../src/policies/employer.policy');

function makeActor(overrides = {}) {
  return {
    id: 'user-001',
    role: 'employer',
    employerId: 'employer-001',
    isVerified: true,
    permissions: [],
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'admin-001',
    role: 'admin',
    employerId: null,
    ...overrides,
  });
}

function withPermission(permission, overrides = {}) {
  return makeActor({
    permissions: [permission],
    ...overrides,
  });
}

function makeEmployer(overrides = {}) {
  return {
    id: 'employer-001',
    userId: 'user-001',
    name: 'MedOrbits Healthcare',
    publicProfile: false,
    verified: false,
    status: 'active',
    ...overrides,
  };
}

function makeJob(overrides = {}) {
  return {
    id: 'job-001',
    employerId: 'employer-001',
    title: 'Healthcare Consultant',
    ...overrides,
  };
}

function makeApplication(overrides = {}) {
  return {
    id: 'application-001',
    jobId: 'job-001',
    employerId: 'employer-001',
    ...overrides,
  };
}

function makeRecruitment(overrides = {}) {
  return {
    id: 'recruitment-001',
    employerId: 'employer-001',
    ...overrides,
  };
}

// --------------------------------------------------
// Employer identity and ownership
// --------------------------------------------------

test('employerMatchesActor recognizes the employer account ID', () => {
  assert.equal(
    employerMatchesActor(
      makeActor(),
      makeEmployer()
    ),
    true
  );
});

test('employerMatchesActor recognizes matching employer IDs', () => {
  assert.equal(
    employerMatchesActor(
      makeActor({ employerId: 123 }),
      makeEmployer({ id: '123', userId: 'another-user' })
    ),
    true
  );
});

test('employerMatchesActor supports _id and employerId account identifiers', () => {
  assert.equal(
    employerMatchesActor(
      makeActor({ employerId: 'employer-002' }),
      makeEmployer({
        id: null,
        _id: 'employer-002',
        userId: 'another-user',
      })
    ),
    true
  );

  assert.equal(
    employerMatchesActor(
      makeActor({ employerId: 'employer-003' }),
      makeEmployer({
        id: null,
        _id: null,
        employerId: 'employer-003',
        userId: 'another-user',
      })
    ),
    true
  );
});

test('employerMatchesActor recognizes the employer owner', () => {
  assert.equal(
    employerMatchesActor(
      makeActor({
        id: 'user-001',
        employerId: null,
      }),
      makeEmployer({
        userId: 'user-001',
      })
    ),
    true
  );
});

test('employerMatchesActor supports ownerId and createdBy fallbacks', () => {
  assert.equal(
    employerMatchesActor(
      makeActor({
        id: 'user-002',
        employerId: null,
      }),
      makeEmployer({
        userId: null,
        ownerId: 'user-002',
      })
    ),
    true
  );

  assert.equal(
    employerMatchesActor(
      makeActor({
        id: 'user-003',
        employerId: null,
      }),
      makeEmployer({
        userId: null,
        ownerId: null,
        createdBy: 'user-003',
      })
    ),
    true
  );
});

test('employerMatchesActor requires the employer role for owner matching', () => {
  assert.equal(
    employerMatchesActor(
      makeActor({
        id: 'user-001',
        employerId: null,
        role: 'user',
      }),
      makeEmployer()
    ),
    false
  );
});

test('employerMatchesActor denies mismatched identities', () => {
  assert.equal(
    employerMatchesActor(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeEmployer()
    ),
    false
  );
});

test('employerMatchesActor denies missing actors and employers', () => {
  assert.equal(employerMatchesActor(null, makeEmployer()), false);
  assert.equal(employerMatchesActor(makeActor(), null), false);
  assert.equal(employerMatchesActor(undefined, makeEmployer()), false);
  assert.equal(employerMatchesActor(makeActor(), undefined), false);
});

// --------------------------------------------------
// Employer account creation
// --------------------------------------------------

test('canCreateEmployerAccount allows verified users', () => {
  assert.equal(
    canCreateEmployerAccount(
      makeActor({ role: 'user' }),
      {}
    ),
    true
  );
});

test('canCreateEmployerAccount allows verified employers', () => {
  assert.equal(
    canCreateEmployerAccount(
      makeActor({ role: 'employer' }),
      {}
    ),
    true
  );
});

test('canCreateEmployerAccount allows administrators', () => {
  assert.equal(
    canCreateEmployerAccount(makeAdmin(), {}),
    true
  );
});

test('canCreateEmployerAccount allows create-any permission', () => {
  assert.equal(
    canCreateEmployerAccount(
      withPermission('employers:create:any', {
        role: 'guest',
        isVerified: false,
      }),
      {}
    ),
    true
  );
});

test('canCreateEmployerAccount denies unverified users', () => {
  assert.equal(
    canCreateEmployerAccount(
      makeActor({ role: 'user', isVerified: false }),
      {}
    ),
    false
  );
});

test('canCreateEmployerAccount denies unsupported roles', () => {
  for (const role of ['guest', 'recruiter', 'student', 'unknown']) {
    assert.equal(
      canCreateEmployerAccount(
        makeActor({ role }),
        {}
      ),
      false,
      `Expected ${role} to be denied`
    );
  }
});

test('canCreateEmployerAccount denies attempts to assign another owner', () => {
  assert.equal(
    canCreateEmployerAccount(
      makeActor({ id: 'user-001', role: 'user' }),
      { userId: 'user-002' }
    ),
    false
  );

  assert.equal(
    canCreateEmployerAccount(
      makeActor({ id: 'user-001', role: 'employer' }),
      { ownerId: 'user-002' }
    ),
    false
  );
});

test('canCreateEmployerAccount allows assigning the actor as owner', () => {
  assert.equal(
    canCreateEmployerAccount(
      makeActor({ id: 'user-001', role: 'user' }),
      { userId: 'user-001' }
    ),
    true
  );

  assert.equal(
    canCreateEmployerAccount(
      makeActor({ id: 'user-001', role: 'employer' }),
      { ownerId: 'user-001' }
    ),
    true
  );
});

test('canCreateEmployerAccount denies anonymous actors', () => {
  assert.equal(canCreateEmployerAccount(null, {}), false);
  assert.equal(canCreateEmployerAccount(undefined, {}), false);
});

// --------------------------------------------------
// Employer visibility
// --------------------------------------------------

test('canViewEmployer allows the employer account owner', () => {
  assert.equal(
    canViewEmployer(makeActor(), makeEmployer()),
    true
  );
});

test('canViewEmployer allows administrators', () => {
  assert.equal(
    canViewEmployer(makeAdmin(), makeEmployer()),
    true
  );
});

test('canViewEmployer allows read-any permission', () => {
  assert.equal(
    canViewEmployer(
      withPermission('employers:read:any', {
        id: 'reviewer-001',
        employerId: null,
      }),
      makeEmployer()
    ),
    true
  );
});

test('canViewEmployer allows public-profile permission for public profiles', () => {
  assert.equal(
    canViewEmployer(
      withPermission('employers:read:public', {
        id: 'visitor-001',
        employerId: null,
      }),
      makeEmployer({ publicProfile: true })
    ),
    true
  );
});

test('canViewEmployer denies public access to private profiles', () => {
  assert.equal(
    canViewEmployer(
      withPermission('employers:read:public', {
        id: 'visitor-001',
        employerId: null,
      }),
      makeEmployer({ publicProfile: false })
    ),
    false
  );
});

test('canViewEmployer denies unrelated users without permission', () => {
  assert.equal(
    canViewEmployer(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeEmployer()
    ),
    false
  );
});

test('canViewEmployer denies missing actors and employers', () => {
  assert.equal(canViewEmployer(null, makeEmployer()), false);
  assert.equal(canViewEmployer(makeActor(), null), false);
});

// --------------------------------------------------
// Employer profile updates
// --------------------------------------------------

test('canUpdateEmployer allows owners to update ordinary fields', () => {
  assert.equal(
    canUpdateEmployer(
      makeActor(),
      makeEmployer(),
      {
        name: 'Updated Healthcare Company',
        description: 'Updated description',
        website: 'https://example.com',
      }
    ),
    true
  );
});

test('canUpdateEmployer allows administrators to update protected fields', () => {
  assert.equal(
    canUpdateEmployer(
      makeAdmin(),
      makeEmployer(),
      {
        verified: true,
        status: 'active',
        billingStatus: 'paid',
      }
    ),
    true
  );
});

test('canUpdateEmployer allows update-any permission', () => {
  assert.equal(
    canUpdateEmployer(
      withPermission('employers:update:any', {
        id: 'user-002',
        employerId: null,
      }),
      makeEmployer(),
      { name: 'Updated Company' }
    ),
    true
  );
});

test('canUpdateEmployer denies unrelated users', () => {
  assert.equal(
    canUpdateEmployer(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeEmployer(),
      { name: 'Unauthorized Change' }
    ),
    false
  );
});

const protectedEmployerFields = [
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
];

for (const field of protectedEmployerFields) {
  test(`canUpdateEmployer protects ${field} from owner changes`, () => {
    assert.equal(
      canUpdateEmployer(
        makeActor(),
        makeEmployer(),
        { [field]: 'unauthorized-value' }
      ),
      false
    );
  });
}

test('canUpdateEmployer rejects invalid changes objects', () => {
  assert.equal(
    canUpdateEmployer(makeActor(), makeEmployer(), null),
    false
  );

  assert.equal(
    canUpdateEmployer(makeActor(), makeEmployer(), undefined),
    false
  );

  assert.equal(
    canUpdateEmployer(makeActor(), makeEmployer(), []),
    false
  );

  assert.equal(
    canUpdateEmployer(makeActor(), makeEmployer(), 'name'),
    false
  );
});

test('canUpdateEmployer denies missing actors and employers', () => {
  assert.equal(canUpdateEmployer(null, makeEmployer(), {}), false);
  assert.equal(canUpdateEmployer(makeActor(), null, {}), false);
});

// --------------------------------------------------
// Employer job management
// --------------------------------------------------

test('canManageEmployerJobs allows administrators', () => {
  assert.equal(
    canManageEmployerJobs(makeAdmin(), makeEmployer()),
    true
  );
});

test('canManageEmployerJobs allows jobs:manage:any permission', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:any', {
        id: 'user-002',
        employerId: null,
      }),
      makeEmployer()
    ),
    true
  );
});

test('canManageEmployerJobs allows authorized employer owners', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:own-employer'),
      makeEmployer()
    ),
    true
  );
});

test('canManageEmployerJobs allows managing jobs belonging to the employer', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:own-employer'),
      makeEmployer(),
      makeJob()
    ),
    true
  );
});

test('canManageEmployerJobs supports ownerEmployerId on jobs', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:own-employer'),
      makeEmployer(),
      makeJob({
        employerId: null,
        ownerEmployerId: 'employer-001',
      })
    ),
    true
  );
});

test('canManageEmployerJobs denies jobs belonging to another employer', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:own-employer'),
      makeEmployer(),
      makeJob({ employerId: 'employer-002' })
    ),
    false
  );
});

test('canManageEmployerJobs denies jobs without employer ownership metadata', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:own-employer'),
      makeEmployer(),
      makeJob({
        employerId: null,
        ownerEmployerId: null,
      })
    ),
    false
  );
});

test('canManageEmployerJobs requires employer role for ordinary access', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:own-employer', {
        role: 'user',
      }),
      makeEmployer()
    ),
    false
  );
});

test('canManageEmployerJobs denies owners without permission', () => {
  assert.equal(
    canManageEmployerJobs(
      makeActor({ permissions: [] }),
      makeEmployer()
    ),
    false
  );
});

test('canManageEmployerJobs denies unrelated users', () => {
  assert.equal(
    canManageEmployerJobs(
      withPermission('jobs:manage:own-employer', {
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeEmployer()
    ),
    false
  );
});

test('canManageEmployerJobs denies missing actors and employers', () => {
  assert.equal(canManageEmployerJobs(null, makeEmployer()), false);
  assert.equal(canManageEmployerJobs(makeActor(), null), false);
});

// --------------------------------------------------
// Applicant access
// --------------------------------------------------

test('canViewApplicants allows administrators', () => {
  assert.equal(
    canViewApplicants(
      makeAdmin(),
      makeEmployer(),
      makeJob()
    ),
    true
  );
});

test('canViewApplicants allows applications:read:any permission', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:any', {
        id: 'reviewer-001',
        employerId: null,
      }),
      makeEmployer(),
      makeJob()
    ),
    true
  );
});

test('canViewApplicants allows authorized employer owners', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob()
    ),
    true
  );
});

test('canViewApplicants allows authorized recruiters', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer', {
        role: 'recruiter',
      }),
      makeEmployer(),
      makeJob()
    ),
    true
  );
});

test('canViewApplicants validates job ownership', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob({ employerId: 'employer-002' })
    ),
    false
  );

  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob({
        employerId: null,
        ownerEmployerId: null,
      })
    ),
    false
  );
});

test('canViewApplicants validates application job association', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob(),
      makeApplication()
    ),
    true
  );

  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob(),
      makeApplication({ jobId: 'job-002' })
    ),
    false
  );

  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob(),
      makeApplication({ jobId: null })
    ),
    false
  );
});

test('canViewApplicants rejects applications belonging to another employer', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob(),
      makeApplication({ employerId: 'employer-002' })
    ),
    false
  );
});

test('canViewApplicants supports jobEmployerId on applications', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer'),
      makeEmployer(),
      makeJob(),
      makeApplication({
        employerId: null,
        jobEmployerId: 'employer-001',
      })
    ),
    true
  );
});

test('canViewApplicants denies non-employers without global permission', () => {
  assert.equal(
    canViewApplicants(
      withPermission('applications:read:employer', {
        role: 'user',
      }),
      makeEmployer(),
      makeJob()
    ),
    false
  );
});

test('canViewApplicants denies owners without applicant-read permission', () => {
  assert.equal(
    canViewApplicants(
      makeActor({ permissions: [] }),
      makeEmployer(),
      makeJob()
    ),
    false
  );
});

test('canViewApplicants denies missing actors, employers and jobs', () => {
  assert.equal(
    canViewApplicants(null, makeEmployer(), makeJob()),
    false
  );

  assert.equal(
    canViewApplicants(makeActor(), null, makeJob()),
    false
  );

  assert.equal(
    canViewApplicants(makeActor(), makeEmployer(), null),
    false
  );
});

// --------------------------------------------------
// Recruitment management
// --------------------------------------------------

test('canManageRecruitment allows administrators', () => {
  assert.equal(
    canManageRecruitment(
      makeAdmin(),
      makeEmployer()
    ),
    true
  );
});

test('canManageRecruitment allows recruitment:manage:any permission', () => {
  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:any', {
        id: 'user-002',
        employerId: null,
      }),
      makeEmployer()
    ),
    true
  );
});

test('canManageRecruitment allows authorized employer owners', () => {
  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:own-employer'),
      makeEmployer()
    ),
    true
  );
});

test('canManageRecruitment allows authorized recruiters', () => {
  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:own-employer', {
        role: 'recruiter',
      }),
      makeEmployer()
    ),
    true
  );
});

test('canManageRecruitment validates recruitment ownership', () => {
  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:own-employer'),
      makeEmployer(),
      makeRecruitment()
    ),
    true
  );

  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:own-employer'),
      makeEmployer(),
      makeRecruitment({ employerId: 'employer-002' })
    ),
    false
  );

  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:own-employer'),
      makeEmployer(),
      makeRecruitment({ employerId: null })
    ),
    false
  );
});

test('canManageRecruitment denies users without required role', () => {
  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:own-employer', {
        role: 'user',
      }),
      makeEmployer()
    ),
    false
  );
});

test('canManageRecruitment denies owners without permission', () => {
  assert.equal(
    canManageRecruitment(
      makeActor({ permissions: [] }),
      makeEmployer()
    ),
    false
  );
});

test('canManageRecruitment denies unrelated users', () => {
  assert.equal(
    canManageRecruitment(
      withPermission('recruitment:manage:own-employer', {
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeEmployer()
    ),
    false
  );
});

test('canManageRecruitment denies missing actors and employers', () => {
  assert.equal(canManageRecruitment(null, makeEmployer()), false);
  assert.equal(canManageRecruitment(makeActor(), null), false);
});

// --------------------------------------------------
// Authorization boundaries
// --------------------------------------------------

test('an isAdmin flag alone does not grant administrative access', () => {
  const forgedAdmin = makeActor({
    id: 'forged-admin',
    role: 'user',
    employerId: null,
    isAdmin: true,
    permissions: [],
  });

  assert.equal(
    canViewEmployer(forgedAdmin, makeEmployer()),
    false
  );

  assert.equal(
    canManageEmployerJobs(forgedAdmin, makeEmployer()),
    false
  );

  assert.equal(
    canViewApplicants(
      forgedAdmin,
      makeEmployer(),
      makeJob()
    ),
    false
  );

  assert.equal(
    canManageRecruitment(forgedAdmin, makeEmployer()),
    false
  );
});

test('unknown roles do not receive employer management privileges', () => {
  const unknown = makeActor({
    id: 'unknown-001',
    role: 'company_manager',
    employerId: null,
    permissions: [],
  });

  assert.equal(
    canCreateEmployerAccount(unknown, {}),
    false
  );

  assert.equal(
    canViewEmployer(unknown, makeEmployer()),
    false
  );

  assert.equal(
    canUpdateEmployer(unknown, makeEmployer(), {}),
    false
  );

  assert.equal(
    canManageEmployerJobs(unknown, makeEmployer()),
    false
  );

  assert.equal(
    canViewApplicants(unknown, makeEmployer(), makeJob()),
    false
  );

  assert.equal(
    canManageRecruitment(unknown, makeEmployer()),
    false
  );
});
