
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canCreateApplication,
  canViewApplication,
  canUpdateApplication,
  canReviewApplication,
  canDeleteApplication,
  canAssignCounsellor,
} = require('../../../src/policies/application.policy');

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

function makeApplicant(overrides = {}) {
  return makeActor({
    id: 'USER-101',
    role: 'candidate',
    ...overrides,
  });
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'ADMIN-101',
    role: 'admin',
    ...overrides,
  });
}

function makeCounsellor(overrides = {}) {
  return makeActor({
    id: 'COUNSELLOR-101',
    role: 'counsellor',
    permissions: [
      'applications:read:assigned',
      'applications:update:assigned',
      'applications:review:assigned',
    ],
    ...overrides,
  });
}

function makeSupport(overrides = {}) {
  return makeActor({
    id: 'SUPPORT-101',
    role: 'support',
    permissions: ['applications:read:assigned'],
    ...overrides,
  });
}

function makeApplication(overrides = {}) {
  return {
    id: 'APP-101',
    applicantId: 'USER-101',
    status: 'draft',
    counsellorId: null,
    assignedCounsellorId: null,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// canCreateApplication
// -----------------------------------------------------------------------------

test('canCreateApplication permits a candidate to create an application', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      courseId: 'COURSE-101',
    }),
    true,
  );
});

test('canCreateApplication permits a student to create an application', () => {
  assert.equal(
    canCreateApplication(
      makeActor({ role: 'student' }),
      { courseId: 'COURSE-101' },
    ),
    true,
  );
});

test('canCreateApplication permits a user to create an application', () => {
  assert.equal(
    canCreateApplication(
      makeActor({ role: 'user' }),
      { courseId: 'COURSE-101' },
    ),
    true,
  );
});

test('canCreateApplication permits an administrator', () => {
  assert.equal(
    canCreateApplication(
      makeAdmin(),
      { applicantId: 'USER-202' },
    ),
    true,
  );
});

test('canCreateApplication permits applications:create:any permission', () => {
  assert.equal(
    canCreateApplication(
      makeActor({
        permissions: ['applications:create:any'],
      }),
      { applicantId: 'USER-202' },
    ),
    true,
  );
});

test('canCreateApplication permits a missing target applicant ID', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      courseId: 'COURSE-101',
    }),
    true,
  );
});

test('canCreateApplication permits an empty target applicant ID', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      applicantId: '',
    }),
    true,
  );
});

test('canCreateApplication permits an actor creating for their own ID', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      applicantId: 'USER-101',
    }),
    true,
  );
});

test('canCreateApplication rejects an actor creating for another applicant', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      applicantId: 'USER-202',
    }),
    false,
  );
});

test('canCreateApplication rejects another candidate ID', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      candidateId: 'USER-202',
    }),
    false,
  );
});

test('canCreateApplication rejects another user ID', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      userId: 'USER-202',
    }),
    false,
  );
});

test('canCreateApplication prioritizes applicantId over candidateId', () => {
  assert.equal(
    canCreateApplication(makeApplicant(), {
      applicantId: 'USER-202',
      candidateId: 'USER-101',
    }),
    false,
  );
});

test('canCreateApplication permits a valid target applicant for an administrator', () => {
  assert.equal(
    canCreateApplication(
      makeAdmin(),
      { applicantId: 'USER-202' },
    ),
    true,
  );
});

test('canCreateApplication rejects an employer without create-any permission', () => {
  assert.equal(
    canCreateApplication(
      makeActor({ role: 'employer' }),
      { applicantId: 'USER-101' },
    ),
    false,
  );
});

test('canCreateApplication rejects a counsellor without create-any permission', () => {
  assert.equal(
    canCreateApplication(
      makeCounsellor(),
      { applicantId: 'USER-101' },
    ),
    false,
  );
});

test('canCreateApplication rejects a missing actor', () => {
  assert.equal(
    canCreateApplication(null, {}),
    false,
  );
});

test('canCreateApplication rejects an undefined actor', () => {
  assert.equal(
    canCreateApplication(undefined, {}),
    false,
  );
});

test('canCreateApplication rejects a roleless actor', () => {
  assert.equal(
    canCreateApplication(
      makeActor({ role: undefined, roles: undefined }),
      {},
    ),
    false,
  );
});

// -----------------------------------------------------------------------------
// canViewApplication
// -----------------------------------------------------------------------------

test('canViewApplication permits the applicant who owns the application', () => {
  assert.equal(
    canViewApplication(
      makeApplicant(),
      makeApplication(),
    ),
    true,
  );
});

test('canViewApplication permits ownership through applicantId', () => {
  assert.equal(
    canViewApplication(
      makeApplicant(),
      makeApplication({ applicantId: 'USER-101' }),
    ),
    true,
  );
});

test('canViewApplication permits ownership through candidateId', () => {
  assert.equal(
    canViewApplication(
      makeApplicant(),
      makeApplication({
        applicantId: undefined,
        candidateId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewApplication permits ownership through userId', () => {
  assert.equal(
    canViewApplication(
      makeApplicant(),
      makeApplication({
        applicantId: undefined,
        userId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewApplication permits ownership through ownerId', () => {
  assert.equal(
    canViewApplication(
      makeApplicant(),
      makeApplication({
        applicantId: undefined,
        ownerId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewApplication permits ownership through createdBy', () => {
  assert.equal(
    canViewApplication(
      makeApplicant(),
      makeApplication({
        applicantId: undefined,
        createdBy: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewApplication denies an unrelated applicant', () => {
  assert.equal(
    canViewApplication(
      makeApplicant({ id: 'USER-202' }),
      makeApplication(),
    ),
    false,
  );
});

test('canViewApplication permits an administrator', () => {
  assert.equal(
    canViewApplication(
      makeAdmin(),
      makeApplication({ applicantId: 'USER-202' }),
    ),
    true,
  );
});

test('canViewApplication permits platform:admin permission', () => {
  assert.equal(
    canViewApplication(
      makeActor({
        permissions: ['platform:admin'],
      }),
      makeApplication({ applicantId: 'USER-202' }),
    ),
    true,
  );
});

test('canViewApplication permits applications:read:any permission', () => {
  assert.equal(
    canViewApplication(
      makeActor({
        permissions: ['applications:read:any'],
      }),
      makeApplication({ applicantId: 'USER-202' }),
    ),
    true,
  );
});

test('canViewApplication permits an assigned counsellor with read permission', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canViewApplication(
      counsellor,
      makeApplication({
        applicantId: 'USER-202',
        counsellorId: counsellor.id,
      }),
    ),
    true,
  );
});

test('canViewApplication permits an assigned counsellor using assignedCounsellorId', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canViewApplication(
      counsellor,
      makeApplication({
        applicantId: 'USER-202',
        assignedCounsellorId: counsellor.id,
      }),
    ),
    true,
  );
});

test('canViewApplication permits assigned support with read permission', () => {
  const support = makeSupport();

  assert.equal(
    canViewApplication(
      support,
      makeApplication({
        applicantId: 'USER-202',
        assignedCounsellorId: support.id,
      }),
    ),
    true,
  );
});

test('canViewApplication permits assigned actors with read permission regardless of role', () => {
  const actor = makeActor({
    id: 'STAFF-101',
    role: 'staff',
    permissions: ['applications:read:assigned'],
  });

  assert.equal(
    canViewApplication(
      actor,
      makeApplication({
        applicantId: 'USER-202',
        counsellorId: actor.id,
      }),
    ),
    true,
  );
});

test('canViewApplication denies assigned counsellors without read permission', () => {
  const counsellor = makeCounsellor({
    permissions: [],
  });

  assert.equal(
    canViewApplication(
      counsellor,
      makeApplication({
        applicantId: 'USER-202',
        counsellorId: counsellor.id,
      }),
    ),
    false,
  );
});

test('canViewApplication denies an unassigned counsellor', () => {
  assert.equal(
    canViewApplication(
      makeCounsellor(),
      makeApplication({
        applicantId: 'USER-202',
        counsellorId: 'COUNSELLOR-202',
      }),
    ),
    false,
  );
});

test('canViewApplication rejects a missing actor', () => {
  assert.equal(
    canViewApplication(null, makeApplication()),
    false,
  );
});

test('canViewApplication rejects a missing application', () => {
  assert.equal(
    canViewApplication(makeApplicant(), null),
    false,
  );
});

// -----------------------------------------------------------------------------
// canUpdateApplication
// -----------------------------------------------------------------------------

test('canUpdateApplication permits an owner to update a draft application', () => {
  assert.equal(
    canUpdateApplication(
      makeApplicant(),
      makeApplication({ status: 'draft' }),
      { coursePreference: 'COURSE-101' },
    ),
    true,
  );
});

test('canUpdateApplication permits an owner to update an incomplete application', () => {
  assert.equal(
    canUpdateApplication(
      makeApplicant(),
      makeApplication({ status: 'incomplete' }),
      { contactPreference: 'email' },
    ),
    true,
  );
});

test('canUpdateApplication permits an owner to update a submitted application', () => {
  assert.equal(
    canUpdateApplication(
      makeApplicant(),
      makeApplication({ status: 'submitted' }),
      { additionalInformation: 'Updated information' },
    ),
    true,
  );
});

test('canUpdateApplication denies an owner updating an under-review application', () => {
  assert.equal(
    canUpdateApplication(
      makeApplicant(),
      makeApplication({ status: 'under_review' }),
      { coursePreference: 'COURSE-202' },
    ),
    false,
  );
});

test('canUpdateApplication denies an owner updating an approved application', () => {
  assert.equal(
    canUpdateApplication(
      makeApplicant(),
      makeApplication({ status: 'approved' }),
      { coursePreference: 'COURSE-202' },
    ),
    false,
  );
});

test('canUpdateApplication denies an unrelated applicant', () => {
  assert.equal(
    canUpdateApplication(
      makeApplicant({ id: 'USER-202' }),
      makeApplication(),
      { coursePreference: 'COURSE-202' },
    ),
    false,
  );
});

test('canUpdateApplication permits an administrator', () => {
  assert.equal(
    canUpdateApplication(
      makeAdmin(),
      makeApplication(),
      { status: 'approved' },
    ),
    true,
  );
});

test('canUpdateApplication permits applications:update:any permission', () => {
  assert.equal(
    canUpdateApplication(
      makeActor({
        permissions: ['applications:update:any'],
      }),
      makeApplication(),
      { applicantId: 'USER-202' },
    ),
    true,
  );
});

test('canUpdateApplication permits an assigned counsellor with update permission', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canUpdateApplication(
      counsellor,
      makeApplication({
        applicantId: 'USER-202',
        status: 'under_review',
        counsellorId: counsellor.id,
      }),
      { internalNote: 'Documents reviewed' },
    ),
    true,
  );
});

test('canUpdateApplication permits assignedCounsellorId for an authorized counsellor', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canUpdateApplication(
      counsellor,
      makeApplication({
        applicantId: 'USER-202',
        assignedCounsellorId: counsellor.id,
      }),
      { internalNote: 'Contacted applicant' },
    ),
    true,
  );
});

test('canUpdateApplication denies assigned counsellors without update permission', () => {
  const counsellor = makeCounsellor({
    permissions: ['applications:read:assigned'],
  });

  assert.equal(
    canUpdateApplication(
      counsellor,
      makeApplication({
        applicantId: 'USER-202',
        counsellorId: counsellor.id,
      }),
      { internalNote: 'Updated note' },
    ),
    false,
  );
});

test('canUpdateApplication denies support staff from updating assigned applications', () => {
  const support = makeSupport({
    permissions: [
      'applications:read:assigned',
      'applications:update:assigned',
    ],
  });

  assert.equal(
    canUpdateApplication(
      support,
      makeApplication({
        applicantId: 'USER-202',
        counsellorId: support.id,
      }),
      { internalNote: 'Updated note' },
    ),
    false,
  );
});

test('canUpdateApplication rejects applicant identity changes', () => {
  const protectedFields = [
    'applicantId',
    'candidateId',
    'userId',
    'ownerId',
    'createdBy',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateApplication(
        makeApplicant(),
        makeApplication(),
        { [field]: 'USER-202' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateApplication rejects status and decision changes', () => {
  const protectedFields = [
    'status',
    'reviewStatus',
    'decision',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateApplication(
        makeApplicant(),
        makeApplication(),
        { [field]: 'approved' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateApplication rejects reviewer metadata changes', () => {
  const protectedFields = [
    'approvedBy',
    'rejectedBy',
    'reviewedBy',
    'reviewedAt',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateApplication(
        makeApplicant(),
        makeApplication(),
        { [field]: 'modified' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateApplication rejects counsellor assignment changes', () => {
  const protectedFields = [
    'counsellorId',
    'assignedCounsellorId',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateApplication(
        makeApplicant(),
        makeApplication(),
        { [field]: 'COUNSELLOR-202' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateApplication rejects ID and timestamp changes', () => {
  const protectedFields = [
    'id',
    '_id',
    'createdAt',
    'updatedAt',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateApplication(
        makeApplicant(),
        makeApplication(),
        { [field]: 'modified' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateApplication permits an administrator to update protected fields', () => {
  assert.equal(
    canUpdateApplication(
      makeAdmin(),
      makeApplication(),
      { applicantId: 'USER-202', status: 'approved' },
    ),
    true,
  );
});

test('canUpdateApplication permits update-any permission to update protected fields', () => {
  assert.equal(
    canUpdateApplication(
      makeActor({
        permissions: ['applications:update:any'],
      }),
      makeApplication(),
      { applicantId: 'USER-202', status: 'approved' },
    ),
    true,
  );
});

test('canUpdateApplication rejects a missing actor', () => {
  assert.equal(
    canUpdateApplication(null, makeApplication(), {}),
    false,
  );
});

test('canUpdateApplication rejects a missing application', () => {
  assert.equal(
    canUpdateApplication(makeApplicant(), null, {}),
    false,
  );
});

test('canUpdateApplication rejects missing changes for an ordinary owner', () => {
  assert.equal(
    canUpdateApplication(makeApplicant(), makeApplication(), null),
    false,
  );
});

test('canUpdateApplication rejects array changes for an ordinary owner', () => {
  assert.equal(
    canUpdateApplication(makeApplicant(), makeApplication(), []),
    false,
  );
});

test('canUpdateApplication rejects primitive changes for an ordinary owner', () => {
  assert.equal(
    canUpdateApplication(
      makeApplicant(),
      makeApplication(),
      'invalid',
    ),
    false,
  );
});

// -----------------------------------------------------------------------------
// canReviewApplication
// -----------------------------------------------------------------------------

test('canReviewApplication permits an administrator', () => {
  assert.equal(
    canReviewApplication(
      makeAdmin(),
      makeApplication(),
    ),
    true,
  );
});

test('canReviewApplication permits applications:review:any permission', () => {
  assert.equal(
    canReviewApplication(
      makeActor({
        permissions: ['applications:review:any'],
      }),
      makeApplication(),
    ),
    true,
  );
});

test('canReviewApplication permits an assigned counsellor with review permission', () => {
  const counsellor = makeCounsellor({
    permissions: ['applications:review:assigned'],
  });

  assert.equal(
    canReviewApplication(
      counsellor,
      makeApplication({
        counsellorId: counsellor.id,
      }),
    ),
    true,
  );
});

test('canReviewApplication permits assignedCounsellorId for an authorized counsellor', () => {
  const counsellor = makeCounsellor({
    permissions: ['applications:review:assigned'],
  });

  assert.equal(
    canReviewApplication(
      counsellor,
      makeApplication({
        assignedCounsellorId: counsellor.id,
      }),
    ),
    true,
  );
});

test('canReviewApplication denies an assigned counsellor without review permission', () => {
  const counsellor = makeCounsellor({
    permissions: ['applications:read:assigned'],
  });

  assert.equal(
    canReviewApplication(
      counsellor,
      makeApplication({
        counsellorId: counsellor.id,
      }),
    ),
    false,
  );
});

test('canReviewApplication denies assigned support staff', () => {
  const support = makeSupport({
    permissions: ['applications:review:assigned'],
  });

  assert.equal(
    canReviewApplication(
      support,
      makeApplication({
        counsellorId: support.id,
      }),
    ),
    false,
  );
});

test('canReviewApplication denies an unassigned counsellor', () => {
  assert.equal(
    canReviewApplication(
      makeCounsellor({
        permissions: ['applications:review:assigned'],
      }),
      makeApplication({
        counsellorId: 'COUNSELLOR-202',
      }),
    ),
    false,
  );
});

test('canReviewApplication rejects a missing actor', () => {
  assert.equal(
    canReviewApplication(null, makeApplication()),
    false,
  );
});

test('canReviewApplication rejects a missing application', () => {
  assert.equal(
    canReviewApplication(makeAdmin(), null),
    false,
  );
});

// -----------------------------------------------------------------------------
// canDeleteApplication
// -----------------------------------------------------------------------------

test('canDeleteApplication permits an owner to delete a draft application', () => {
  assert.equal(
    canDeleteApplication(
      makeApplicant(),
      makeApplication({ status: 'draft' }),
    ),
    true,
  );
});

test('canDeleteApplication permits an owner to delete an incomplete application', () => {
  assert.equal(
    canDeleteApplication(
      makeApplicant(),
      makeApplication({ status: 'incomplete' }),
    ),
    true,
  );
});

test('canDeleteApplication denies an owner deleting a submitted application', () => {
  assert.equal(
    canDeleteApplication(
      makeApplicant(),
      makeApplication({ status: 'submitted' }),
    ),
    false,
  );
});

test('canDeleteApplication denies an owner deleting an under-review application', () => {
  assert.equal(
    canDeleteApplication(
      makeApplicant(),
      makeApplication({ status: 'under_review' }),
    ),
    false,
  );
});

test('canDeleteApplication denies an unrelated applicant', () => {
  assert.equal(
    canDeleteApplication(
      makeApplicant({ id: 'USER-202' }),
      makeApplication(),
    ),
    false,
  );
});

test('canDeleteApplication permits an administrator', () => {
  assert.equal(
    canDeleteApplication(
      makeAdmin(),
      makeApplication({ status: 'submitted' }),
    ),
    true,
  );
});

test('canDeleteApplication permits applications:delete:any permission', () => {
  assert.equal(
    canDeleteApplication(
      makeActor({
        permissions: ['applications:delete:any'],
      }),
      makeApplication({ status: 'submitted' }),
    ),
    true,
  );
});

test('canDeleteApplication rejects a missing actor', () => {
  assert.equal(
    canDeleteApplication(null, makeApplication()),
    false,
  );
});

test('canDeleteApplication rejects a missing application', () => {
  assert.equal(
    canDeleteApplication(makeApplicant(), null),
    false,
  );
});

test('canDeleteApplication denies an owner when no owner ID is available', () => {
  assert.equal(
    canDeleteApplication(
      makeApplicant(),
      makeApplication({
        applicantId: undefined,
        candidateId: undefined,
        userId: undefined,
        ownerId: undefined,
        createdBy: undefined,
      }),
    ),
    false,
  );
});

// -----------------------------------------------------------------------------
// canAssignCounsellor
// -----------------------------------------------------------------------------

test('canAssignCounsellor permits an administrator', () => {
  assert.equal(
    canAssignCounsellor(makeAdmin()),
    true,
  );
});

test('canAssignCounsellor permits platform:admin permission', () => {
  assert.equal(
    canAssignCounsellor(
      makeActor({
        permissions: ['platform:admin'],
      }),
    ),
    true,
  );
});

test('canAssignCounsellor permits applications:assign permission', () => {
  assert.equal(
    canAssignCounsellor(
      makeActor({
        permissions: ['applications:assign'],
      }),
    ),
    true,
  );
});

test('canAssignCounsellor denies an ordinary applicant', () => {
  assert.equal(
    canAssignCounsellor(makeApplicant()),
    false,
  );
});

test('canAssignCounsellor denies a counsellor without assignment permission', () => {
  assert.equal(
    canAssignCounsellor(makeCounsellor()),
    false,
  );
});

test('canAssignCounsellor rejects a missing actor', () => {
  assert.equal(
    canAssignCounsellor(null),
    false,
  );
});

test('canAssignCounsellor rejects an empty actor', () => {
  assert.equal(
    canAssignCounsellor({}),
    false,
  );
});

// -----------------------------------------------------------------------------
// Identifier and role normalization behavior inherited from policy-utils
// -----------------------------------------------------------------------------

test('application ownership supports numeric actor and resource IDs', () => {
  assert.equal(
    canViewApplication(
      makeApplicant({ id: 101 }),
      makeApplication({ applicantId: 101 }),
    ),
    true,
  );
});

test('application ownership supports whitespace-normalized string IDs', () => {
  assert.equal(
    canViewApplication(
      makeApplicant({ id: ' USER-101 ' }),
      makeApplication({ applicantId: 'USER-101' }),
    ),
    true,
  );
});

test('application ownership supports the actor userId field', () => {
  assert.equal(
    canViewApplication(
      makeActor({
        id: undefined,
        userId: 'USER-101',
        role: 'candidate',
      }),
      makeApplication(),
    ),
    true,
  );
});

test('application ownership supports the actor sub field', () => {
  assert.equal(
    canViewApplication(
      makeActor({
        id: undefined,
        sub: 'USER-101',
        role: 'candidate',
      }),
      makeApplication(),
    ),
    true,
  );
});

test('application ownership supports role aliases', () => {
  assert.equal(
    canCreateApplication(
      makeActor({ role: 'applicant' }),
      {},
    ),
    true,
  );
});

test('application ownership rejects a blank actor ID', () => {
  assert.equal(
    canViewApplication(
      makeApplicant({ id: ' ' }),
      makeApplication(),
    ),
    false,
  );
});
