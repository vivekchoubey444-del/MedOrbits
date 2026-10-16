
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canCreateCandidateProfile,
  canViewCandidate,
  canUpdateCandidate,
  canDeleteCandidate,
  canEmployerViewCandidateApplication,
  canExportCandidateData,
} = require('../../../src/policies/candidate.policy');

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function makeActor(overrides = {}) {
  return {
    id: 'USER-101',
    role: 'user',
    permissions: [],
    ...overrides,
  };
}

function makeCandidate(overrides = {}) {
  return {
    id: 'USER-101',
    userId: 'USER-101',
    ownerId: 'USER-101',
    accountId: 'USER-101',
    profileVisibility: 'private',
    allowRecruiterDiscovery: false,
    hasActiveApplications: false,
    hasOutstandingPayments: false,
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'ADMIN-101',
    role: 'admin',
    ...overrides,
  });
}

function makeEmployer(overrides = {}) {
  return makeActor({
    id: 'EMP-USER-101',
    role: 'employer',
    employerId: 'EMP-101',
    permissions: ['applications:read:employer'],
    ...overrides,
  });
}

function makeRecruiter(overrides = {}) {
  return makeActor({
    id: 'RECRUITER-101',
    role: 'recruiter',
    employerId: 'EMP-101',
    permissions: ['applications:read:employer'],
    ...overrides,
  });
}

function makeApplication(overrides = {}) {
  return {
    id: 'APP-101',
    employerId: 'EMP-101',
    candidateId: 'USER-101',
    applicantId: 'USER-101',
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// canCreateCandidateProfile
// -----------------------------------------------------------------------------

test('canCreateCandidateProfile permits a user to create their profile', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {}),
    true,
  );
});

test('canCreateCandidateProfile permits a student to create their profile', () => {
  assert.equal(
    canCreateCandidateProfile(
      makeActor({ role: 'student' }),
      {},
    ),
    true,
  );
});

test('canCreateCandidateProfile permits a candidate role', () => {
  assert.equal(
    canCreateCandidateProfile(
      makeActor({ role: 'candidate' }),
      {},
    ),
    true,
  );
});

test('canCreateCandidateProfile permits an administrator', () => {
  assert.equal(
    canCreateCandidateProfile(
      makeAdmin(),
      { userId: 'USER-202' },
    ),
    true,
  );
});

test('canCreateCandidateProfile permits candidates:create:any permission', () => {
  assert.equal(
    canCreateCandidateProfile(
      makeActor({
        permissions: ['candidates:create:any'],
      }),
      { userId: 'USER-202' },
    ),
    true,
  );
});

test('canCreateCandidateProfile permits creation without an owner identifier', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      fullName: 'Test Candidate',
    }),
    true,
  );
});

test('canCreateCandidateProfile permits an empty owner identifier', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      userId: '',
    }),
    true,
  );
});

test('canCreateCandidateProfile permits creation for the authenticated user', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      userId: 'USER-101',
    }),
    true,
  );
});

test('canCreateCandidateProfile rejects creation for another user', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      userId: 'USER-202',
    }),
    false,
  );
});

test('canCreateCandidateProfile rejects another ownerId', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      ownerId: 'USER-202',
    }),
    false,
  );
});

test('canCreateCandidateProfile rejects another accountId', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      accountId: 'USER-202',
    }),
    false,
  );
});

test('canCreateCandidateProfile prioritizes userId when multiple identifiers exist', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      userId: 'USER-202',
      ownerId: 'USER-101',
      accountId: 'USER-101',
    }),
    false,
  );
});

test('canCreateCandidateProfile falls back to ownerId', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      userId: null,
      ownerId: 'USER-101',
    }),
    true,
  );
});

test('canCreateCandidateProfile falls back to accountId', () => {
  assert.equal(
    canCreateCandidateProfile(makeActor(), {
      userId: null,
      ownerId: null,
      accountId: 'USER-101',
    }),
    true,
  );
});

test('canCreateCandidateProfile rejects unsupported roles', () => {
  assert.equal(
    canCreateCandidateProfile(
      makeActor({ role: 'employer' }),
      {},
    ),
    false,
  );

  assert.equal(
    canCreateCandidateProfile(
      makeActor({ role: 'counsellor' }),
      {},
    ),
    false,
  );
});

test('canCreateCandidateProfile rejects a missing actor', () => {
  assert.equal(
    canCreateCandidateProfile(null, {}),
    false,
  );
});

test('canCreateCandidateProfile rejects an undefined actor', () => {
  assert.equal(
    canCreateCandidateProfile(undefined, {}),
    false,
  );
});

// -----------------------------------------------------------------------------
// canViewCandidate
// -----------------------------------------------------------------------------

test('canViewCandidate permits the candidate to view their own profile', () => {
  assert.equal(
    canViewCandidate(
      makeActor(),
      makeCandidate(),
    ),
    true,
  );
});

test('canViewCandidate permits ownership through userId', () => {
  assert.equal(
    canViewCandidate(
      makeActor(),
      makeCandidate({
        id: undefined,
        ownerId: undefined,
        accountId: undefined,
        userId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewCandidate permits ownership through ownerId', () => {
  assert.equal(
    canViewCandidate(
      makeActor(),
      makeCandidate({
        id: undefined,
        userId: undefined,
        accountId: undefined,
        ownerId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewCandidate permits ownership through accountId', () => {
  assert.equal(
    canViewCandidate(
      makeActor(),
      makeCandidate({
        id: undefined,
        userId: undefined,
        ownerId: undefined,
        accountId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewCandidate permits ownership through candidate id', () => {
  assert.equal(
    canViewCandidate(
      makeActor(),
      makeCandidate({
        userId: undefined,
        ownerId: undefined,
        accountId: undefined,
        id: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewCandidate permits ownership through _id', () => {
  assert.equal(
    canViewCandidate(
      makeActor(),
      makeCandidate({
        id: undefined,
        userId: undefined,
        ownerId: undefined,
        accountId: undefined,
        _id: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewCandidate denies another user from viewing a private profile', () => {
  assert.equal(
    canViewCandidate(
      makeActor({ id: 'USER-202' }),
      makeCandidate(),
    ),
    false,
  );
});

test('canViewCandidate permits an administrator to view a private profile', () => {
  assert.equal(
    canViewCandidate(
      makeAdmin(),
      makeCandidate({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canViewCandidate permits candidates:read:any permission', () => {
  assert.equal(
    canViewCandidate(
      makeActor({
        permissions: ['candidates:read:any'],
      }),
      makeCandidate({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canViewCandidate permits recruiter discovery of a public discoverable profile', () => {
  assert.equal(
    canViewCandidate(
      makeEmployer(),
      makeCandidate({
        userId: 'USER-202',
        profileVisibility: 'public',
        allowRecruiterDiscovery: true,
      }),
    ),
    true,
  );
});

test('canViewCandidate permits a recruiter to discover a public profile', () => {
  assert.equal(
    canViewCandidate(
      makeRecruiter(),
      makeCandidate({
        userId: 'USER-202',
        profileVisibility: 'public',
        allowRecruiterDiscovery: true,
      }),
    ),
    true,
  );
});

test('canViewCandidate denies an employer without candidates:discover permission', () => {
  assert.equal(
    canViewCandidate(
      makeEmployer({
        permissions: [],
      }),
      makeCandidate({
        userId: 'USER-202',
        profileVisibility: 'public',
        allowRecruiterDiscovery: true,
      }),
    ),
    false,
  );
});

test('canViewCandidate denies a public profile when recruiter discovery is disabled', () => {
  assert.equal(
    canViewCandidate(
      makeEmployer({
        permissions: ['candidates:discover'],
      }),
      makeCandidate({
        userId: 'USER-202',
        profileVisibility: 'public',
        allowRecruiterDiscovery: false,
      }),
    ),
    false,
  );
});

test('canViewCandidate denies a private profile to an unrelated employer', () => {
  assert.equal(
    canViewCandidate(
      makeEmployer({
        permissions: ['candidates:discover'],
      }),
      makeCandidate({
        userId: 'USER-202',
        profileVisibility: 'private',
        allowRecruiterDiscovery: true,
      }),
    ),
    false,
  );
});

test('canViewCandidate denies a discoverable profile with non-public visibility', () => {
  assert.equal(
    canViewCandidate(
      makeEmployer({
        permissions: ['candidates:discover'],
      }),
      makeCandidate({
        userId: 'USER-202',
        profileVisibility: 'restricted',
        allowRecruiterDiscovery: true,
      }),
    ),
    false,
  );
});

test('canViewCandidate requires allowRecruiterDiscovery to be exactly true', () => {
  assert.equal(
    canViewCandidate(
      makeEmployer({
        permissions: ['candidates:discover'],
      }),
      makeCandidate({
        userId: 'USER-202',
        profileVisibility: 'public',
        allowRecruiterDiscovery: 1,
      }),
    ),
    false,
  );
});

test('canViewCandidate rejects a missing actor', () => {
  assert.equal(
    canViewCandidate(null, makeCandidate()),
    false,
  );
});

test('canViewCandidate rejects a missing candidate', () => {
  assert.equal(
    canViewCandidate(makeActor(), null),
    false,
  );
});

// -----------------------------------------------------------------------------
// canUpdateCandidate
// -----------------------------------------------------------------------------

test('canUpdateCandidate permits the owner to update ordinary profile fields', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { skills: ['JavaScript', 'SQL'] },
    ),
    true,
  );
});

test('canUpdateCandidate permits the owner to update education details', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { education: [{ qualification: 'Bachelor degree' }] },
    ),
    true,
  );
});

test('canUpdateCandidate permits the owner to update contact preferences', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { contactPreference: 'email' },
    ),
    true,
  );
});

test('canUpdateCandidate denies an unrelated user', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor({ id: 'USER-202' }),
      makeCandidate(),
      { skills: ['JavaScript'] },
    ),
    false,
  );
});

test('canUpdateCandidate permits an administrator to update another profile', () => {
  assert.equal(
    canUpdateCandidate(
      makeAdmin(),
      makeCandidate({ userId: 'USER-202' }),
      { skills: ['JavaScript'] },
    ),
    true,
  );
});

test('canUpdateCandidate permits candidates:update:any permission', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor({
        permissions: ['candidates:update:any'],
      }),
      makeCandidate({ userId: 'USER-202' }),
      { userId: 'USER-303' },
    ),
    true,
  );
});

test('canUpdateCandidate rejects a missing actor', () => {
  assert.equal(
    canUpdateCandidate(null, makeCandidate(), {}),
    false,
  );
});

test('canUpdateCandidate rejects a missing candidate', () => {
  assert.equal(
    canUpdateCandidate(makeActor(), null, {}),
    false,
  );
});

test('canUpdateCandidate rejects null changes for an ordinary owner', () => {
  assert.equal(
    canUpdateCandidate(makeActor(), makeCandidate(), null),
    false,
  );
});

test('canUpdateCandidate rejects array changes for an ordinary owner', () => {
  assert.equal(
    canUpdateCandidate(makeActor(), makeCandidate(), []),
    false,
  );
});

test('canUpdateCandidate rejects primitive changes for an ordinary owner', () => {
  assert.equal(
    canUpdateCandidate(makeActor(), makeCandidate(), 'invalid'),
    false,
  );
});

test('canUpdateCandidate rejects changes to id', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { id: 'USER-202' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to _id', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { _id: 'USER-202' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to userId', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { userId: 'USER-202' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to ownerId', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { ownerId: 'USER-202' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to accountId', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { accountId: 'USER-202' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to role', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { role: 'admin' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to roles', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { roles: ['admin'] },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to isAdmin', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { isAdmin: true },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to permissions', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { permissions: ['candidates:update:any'] },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to verification fields', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { verified: true },
    ),
    false,
  );

  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { verificationStatus: 'verified' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to moderationStatus', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { moderationStatus: 'approved' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to status', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      { status: 'approved' },
    ),
    false,
  );
});

test('canUpdateCandidate rejects changes to timestamps', () => {
  const protectedFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateCandidate(
        makeActor(),
        makeCandidate(),
        { [field]: '2026-01-01T00:00:00.000Z' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateCandidate permits administrators to change protected fields', () => {
  assert.equal(
    canUpdateCandidate(
      makeAdmin(),
      makeCandidate(),
      {
        status: 'verified',
        verified: true,
        permissions: ['candidates:read:any'],
      },
    ),
    true,
  );
});

test('canUpdateCandidate permits candidates:update:any to change protected fields', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor({
        permissions: ['candidates:update:any'],
      }),
      makeCandidate(),
      {
        status: 'verified',
        verified: true,
        ownerId: 'USER-202',
      },
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// canDeleteCandidate
// -----------------------------------------------------------------------------

test('canDeleteCandidate permits the owner to delete their candidate profile', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate(),
    ),
    true,
  );
});

test('canDeleteCandidate denies an unrelated user', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor({ id: 'USER-202' }),
      makeCandidate(),
    ),
    false,
  );
});

test('canDeleteCandidate permits an administrator', () => {
  assert.equal(
    canDeleteCandidate(
      makeAdmin(),
      makeCandidate({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canDeleteCandidate permits candidates:delete:any permission', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor({
        permissions: ['candidates:delete:any'],
      }),
      makeCandidate({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canDeleteCandidate denies an owner with active applications', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate({
        hasActiveApplications: true,
      }),
    ),
    false,
  );
});

test('canDeleteCandidate denies an owner with outstanding payments', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate({
        hasOutstandingPayments: true,
      }),
    ),
    false,
  );
});

test('canDeleteCandidate denies an owner with both active applications and outstanding payments', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate({
        hasActiveApplications: true,
        hasOutstandingPayments: true,
      }),
    ),
    false,
  );
});

test('canDeleteCandidate permits deletion when application and payment flags are false', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate({
        hasActiveApplications: false,
        hasOutstandingPayments: false,
      }),
    ),
    true,
  );
});

test('canDeleteCandidate permits deletion when application and payment flags are absent', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate({
        hasActiveApplications: undefined,
        hasOutstandingPayments: undefined,
      }),
    ),
    true,
  );
});

test('canDeleteCandidate permits administrators even when applications are active', () => {
  assert.equal(
    canDeleteCandidate(
      makeAdmin(),
      makeCandidate({
        hasActiveApplications: true,
      }),
    ),
    true,
  );
});

test('canDeleteCandidate permits delete-any permission despite outstanding payments', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor({
        permissions: ['candidates:delete:any'],
      }),
      makeCandidate({
        hasOutstandingPayments: true,
      }),
    ),
    true,
  );
});

test('canDeleteCandidate rejects a missing actor', () => {
  assert.equal(
    canDeleteCandidate(null, makeCandidate()),
    false,
  );
});

test('canDeleteCandidate rejects a missing candidate', () => {
  assert.equal(
    canDeleteCandidate(makeActor(), null),
    false,
  );
});

// -----------------------------------------------------------------------------
// canEmployerViewCandidateApplication
// -----------------------------------------------------------------------------

test('canEmployerViewCandidateApplication permits an employer to view an application for its candidate', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate(),
      makeApplication(),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication permits a recruiter with the required permission', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeRecruiter(),
      makeCandidate(),
      makeApplication(),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication permits an administrator', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeAdmin(),
      makeCandidate(),
      makeApplication({
        employerId: 'EMP-202',
        candidateId: 'USER-202',
      }),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication permits applications:read:any permission', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeActor({
        permissions: ['applications:read:any'],
      }),
      makeCandidate(),
      makeApplication({
        employerId: 'EMP-202',
        candidateId: 'USER-202',
      }),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication denies an employer without applications:read:employer permission', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer({
        permissions: [],
      }),
      makeCandidate(),
      makeApplication(),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication denies an ordinary user', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeActor(),
      makeCandidate(),
      makeApplication(),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication denies a different employer', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer({
        employerId: 'EMP-202',
      }),
      makeCandidate(),
      makeApplication({
        employerId: 'EMP-101',
      }),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication denies an application for another candidate', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate(),
      makeApplication({
        candidateId: 'USER-202',
        applicantId: 'USER-202',
      }),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication supports jobEmployerId', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate(),
      makeApplication({
        employerId: undefined,
        jobEmployerId: 'EMP-101',
      }),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication supports applicantId', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate(),
      makeApplication({
        candidateId: undefined,
        applicantId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication supports candidate id matching', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate({
        id: 'USER-101',
        userId: undefined,
        _id: undefined,
      }),
      makeApplication({
        candidateId: 'USER-101',
        applicantId: undefined,
      }),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication supports candidate _id matching', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate({
        id: undefined,
        userId: undefined,
        _id: 'USER-101',
      }),
      makeApplication({
        candidateId: 'USER-101',
        applicantId: undefined,
      }),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication supports candidate userId matching', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate({
        id: undefined,
        _id: undefined,
        userId: 'USER-101',
      }),
      makeApplication({
        candidateId: 'USER-101',
        applicantId: undefined,
      }),
    ),
    true,
  );
});

test('canEmployerViewCandidateApplication rejects missing actor', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      null,
      makeCandidate(),
      makeApplication(),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication rejects missing candidate', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      null,
      makeApplication(),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication rejects missing application', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate(),
      null,
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication rejects an employer without employerId', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer({
        employerId: undefined,
      }),
      makeCandidate(),
      makeApplication(),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication rejects an application without employer identifiers', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate(),
      makeApplication({
        employerId: undefined,
        jobEmployerId: undefined,
      }),
    ),
    false,
  );
});

test('canEmployerViewCandidateApplication rejects an application without candidate identifiers', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer(),
      makeCandidate({
        id: undefined,
        _id: undefined,
        userId: undefined,
      }),
      makeApplication({
        candidateId: undefined,
        applicantId: undefined,
      }),
    ),
    false,
  );
});

// -----------------------------------------------------------------------------
// canExportCandidateData
// -----------------------------------------------------------------------------

test('canExportCandidateData permits an administrator', () => {
  assert.equal(
    canExportCandidateData(
      makeAdmin(),
      makeCandidate({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canExportCandidateData permits candidates:export:any permission', () => {
  assert.equal(
    canExportCandidateData(
      makeActor({
        permissions: ['candidates:export:any'],
      }),
      makeCandidate({ userId: 'USER-202' }),
    ),
    true,
  );
});

test('canExportCandidateData permits an owner with candidates:export:self permission', () => {
  assert.equal(
    canExportCandidateData(
      makeActor({
        permissions: ['candidates:export:self'],
      }),
      makeCandidate(),
    ),
    true,
  );
});

test('canExportCandidateData denies an owner without export permission', () => {
  assert.equal(
    canExportCandidateData(
      makeActor(),
      makeCandidate(),
    ),
    false,
  );
});

test('canExportCandidateData denies an unrelated user without export-any permission', () => {
  assert.equal(
    canExportCandidateData(
      makeActor({
        id: 'USER-202',
        permissions: ['candidates:export:self'],
      }),
      makeCandidate(),
    ),
    false,
  );
});

test('canExportCandidateData denies an owner with unrelated permissions', () => {
  assert.equal(
    canExportCandidateData(
      makeActor({
        permissions: ['candidates:read:any'],
      }),
      makeCandidate(),
    ),
    false,
  );
});

test('canExportCandidateData permits an administrator without ownership', () => {
  assert.equal(
    canExportCandidateData(
      makeAdmin(),
      makeCandidate({
        id: 'USER-202',
        userId: 'USER-202',
        ownerId: 'USER-202',
        accountId: 'USER-202',
      }),
    ),
    true,
  );
});

test('canExportCandidateData rejects a missing actor', () => {
  assert.equal(
    canExportCandidateData(null, makeCandidate()),
    false,
  );
});

test('canExportCandidateData rejects a missing candidate', () => {
  assert.equal(
    canExportCandidateData(makeActor(), null),
    false,
  );
});

// -----------------------------------------------------------------------------
// Security boundary regression tests
// -----------------------------------------------------------------------------

test('candidate profile creation does not allow another owner without privilege', () => {
  assert.equal(
    canCreateCandidateProfile(
      makeActor(),
      { userId: 'USER-999' },
    ),
    false,
  );
});

test('private candidate profiles are not discoverable by unrelated recruiters', () => {
  assert.equal(
    canViewCandidate(
      makeRecruiter({
        permissions: ['candidates:discover'],
      }),
      makeCandidate({
        userId: 'USER-999',
        profileVisibility: 'private',
        allowRecruiterDiscovery: true,
      }),
    ),
    false,
  );
});

test('recruiter discovery requires both public visibility and explicit consent', () => {
  const recruiter = makeRecruiter({
    permissions: ['candidates:discover'],
  });

  assert.equal(
    canViewCandidate(
      recruiter,
      makeCandidate({
        userId: 'USER-999',
        profileVisibility: 'private',
        allowRecruiterDiscovery: true,
      }),
    ),
    false,
  );

  assert.equal(
    canViewCandidate(
      recruiter,
      makeCandidate({
        userId: 'USER-999',
        profileVisibility: 'public',
        allowRecruiterDiscovery: false,
      }),
    ),
    false,
  );
});

test('candidate update does not permit self-assignment of administrator privileges', () => {
  assert.equal(
    canUpdateCandidate(
      makeActor(),
      makeCandidate(),
      {
        role: 'admin',
        isAdmin: true,
        permissions: ['candidates:update:any'],
      },
    ),
    false,
  );
});

test('candidate deletion is blocked while active applications exist', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate({
        hasActiveApplications: true,
      }),
    ),
    false,
  );
});

test('candidate deletion is blocked while outstanding payments exist', () => {
  assert.equal(
    canDeleteCandidate(
      makeActor(),
      makeCandidate({
        hasOutstandingPayments: true,
      }),
    ),
    false,
  );
});

test('employers cannot view another employers candidate application', () => {
  assert.equal(
    canEmployerViewCandidateApplication(
      makeEmployer({
        employerId: 'EMP-101',
      }),
      makeCandidate(),
      makeApplication({
        employerId: 'EMP-202',
      }),
    ),
    false,
  );
});

test('candidate export requires self-export permission for ordinary owners', () => {
  assert.equal(
    canExportCandidateData(
      makeActor({
        permissions: [],
      }),
      makeCandidate(),
    ),
    false,
  );
});
