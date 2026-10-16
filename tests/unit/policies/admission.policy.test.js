
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('../../../src/policies/admission.policy');

// -----------------------------------------------------------------------------
// Test fixtures
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
      'admissions:read:assigned',
      'admissions:update:assigned',
      'admissions:review:assigned',
    ],
    ...overrides,
  });
}

function makeAdmission(overrides = {}) {
  return {
    id: 'ADM-101',
    applicantId: 'USER-101',
    status: 'draft',
    assignedCounsellorId: null,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// admissionOwnerId
// -----------------------------------------------------------------------------

test('admissionOwnerId resolves applicantId', () => {
  assert.equal(
    admissionOwnerId({ applicantId: 'USER-101' }),
    'USER-101',
  );
});

test('admissionOwnerId resolves candidateId when applicantId is absent', () => {
  assert.equal(
    admissionOwnerId({ candidateId: 'USER-202' }),
    'USER-202',
  );
});

test('admissionOwnerId resolves userId when earlier owner fields are absent', () => {
  assert.equal(
    admissionOwnerId({ userId: 'USER-303' }),
    'USER-303',
  );
});

test('admissionOwnerId resolves ownerId when other owner fields are absent', () => {
  assert.equal(
    admissionOwnerId({ ownerId: 'USER-404' }),
    'USER-404',
  );
});

test('admissionOwnerId returns null for a missing admission', () => {
  assert.equal(admissionOwnerId(null), null);
});

test('admissionOwnerId returns null when no owner field is available', () => {
  assert.equal(admissionOwnerId({ id: 'ADM-101' }), null);
});

test('admissionOwnerId ignores blank owner identifiers', () => {
  assert.equal(
    admissionOwnerId({
      applicantId: ' ',
      candidateId: 'USER-202',
    }),
    'USER-202',
  );
});

test('admissionOwnerId uses the first valid owner field', () => {
  assert.equal(
    admissionOwnerId({
      applicantId: 'USER-101',
      candidateId: 'USER-202',
      userId: 'USER-303',
    }),
    'USER-101',
  );
});

// -----------------------------------------------------------------------------
// canCreateAdmission
// -----------------------------------------------------------------------------

test('canCreateAdmission permits a candidate to create their own admission', () => {
  assert.equal(
    canCreateAdmission(makeApplicant(), {
      courseId: 'COURSE-101',
    }),
    true,
  );
});

test('canCreateAdmission permits an applicant role', () => {
  assert.equal(
    canCreateAdmission(
      makeActor({ role: 'student' }),
      {},
    ),
    true,
  );
});

test('canCreateAdmission permits the user role', () => {
  assert.equal(
    canCreateAdmission(
      makeActor({ role: 'user' }),
      {},
    ),
    true,
  );
});

test('canCreateAdmission permits an administrator', () => {
  assert.equal(
    canCreateAdmission(
      makeAdmin(),
      { applicantId: 'USER-202' },
    ),
    true,
  );
});

test('canCreateAdmission permits create-any permission', () => {
  assert.equal(
    canCreateAdmission(
      makeActor({
        permissions: ['admissions:create:any'],
      }),
      { applicantId: 'USER-202' },
    ),
    true,
  );
});

test('canCreateAdmission permits a matching applicantId', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant(),
      { applicantId: 'USER-101' },
    ),
    true,
  );
});

test('canCreateAdmission rejects a different applicantId', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant(),
      { applicantId: 'USER-202' },
    ),
    false,
  );
});

test('canCreateAdmission rejects a different candidateId', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant(),
      { candidateId: 'USER-202' },
    ),
    false,
  );
});

test('canCreateAdmission rejects a different userId', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant(),
      { userId: 'USER-202' },
    ),
    false,
  );
});

test('canCreateAdmission rejects a different ownerId', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant(),
      { ownerId: 'USER-202' },
    ),
    false,
  );
});

test('canCreateAdmission permits a blank requested owner', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant(),
      { applicantId: '' },
    ),
    true,
  );
});

test('canCreateAdmission rejects a suspended actor', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant({ isSuspended: true }),
      {},
    ),
    false,
  );
});

test('canCreateAdmission rejects a suspended account status', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant({ status: 'suspended' }),
      {},
    ),
    false,
  );
});

test('canCreateAdmission rejects a disabled account status', () => {
  assert.equal(
    canCreateAdmission(
      makeApplicant({ status: 'disabled' }),
      {},
    ),
    false,
  );
});

test('canCreateAdmission rejects unsupported roles', () => {
  assert.equal(
    canCreateAdmission(
      makeActor({ role: 'employer' }),
      {},
    ),
    false,
  );

  assert.equal(
    canCreateAdmission(
      makeActor({ role: 'counsellor' }),
      {},
    ),
    false,
  );
});

test('canCreateAdmission rejects a missing actor', () => {
  assert.equal(canCreateAdmission(null, {}), false);
});

test('canCreateAdmission rejects a missing input', () => {
  assert.equal(canCreateAdmission(makeApplicant(), null), false);
});

test('canCreateAdmission rejects array input', () => {
  assert.equal(canCreateAdmission(makeApplicant(), []), false);
});

test('canCreateAdmission rejects primitive input', () => {
  assert.equal(canCreateAdmission(makeApplicant(), 'invalid'), false);
});

// -----------------------------------------------------------------------------
// canViewAdmission
// -----------------------------------------------------------------------------

test('canViewAdmission permits the admission owner', () => {
  assert.equal(
    canViewAdmission(
      makeApplicant(),
      makeAdmission(),
    ),
    true,
  );
});

test('canViewAdmission permits ownership through candidateId', () => {
  assert.equal(
    canViewAdmission(
      makeApplicant(),
      makeAdmission({
        applicantId: undefined,
        candidateId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewAdmission permits ownership through userId', () => {
  assert.equal(
    canViewAdmission(
      makeApplicant(),
      makeAdmission({
        applicantId: undefined,
        userId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewAdmission permits ownership through ownerId', () => {
  assert.equal(
    canViewAdmission(
      makeApplicant(),
      makeAdmission({
        applicantId: undefined,
        ownerId: 'USER-101',
      }),
    ),
    true,
  );
});

test('canViewAdmission denies an unrelated applicant', () => {
  assert.equal(
    canViewAdmission(
      makeApplicant({ id: 'USER-202' }),
      makeAdmission(),
    ),
    false,
  );
});

test('canViewAdmission permits an administrator', () => {
  assert.equal(
    canViewAdmission(
      makeAdmin(),
      makeAdmission({ applicantId: 'USER-202' }),
    ),
    true,
  );
});

test('canViewAdmission permits read-any permission', () => {
  assert.equal(
    canViewAdmission(
      makeActor({
        permissions: ['admissions:read:any'],
      }),
      makeAdmission({ applicantId: 'USER-202' }),
    ),
    true,
  );
});

test('canViewAdmission permits an assigned counsellor with read permission', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canViewAdmission(
      counsellor,
      makeAdmission({
        applicantId: 'USER-202',
        assignedCounsellorId: counsellor.id,
      }),
    ),
    true,
  );
});

test('canViewAdmission permits an assigned support actor with read permission', () => {
  const support = makeActor({
    id: 'SUPPORT-101',
    role: 'support',
    permissions: ['admissions:read:assigned'],
  });

  assert.equal(
    canViewAdmission(
      support,
      makeAdmission({
        applicantId: 'USER-202',
        assignedCounsellorId: support.id,
      }),
    ),
    true,
  );
});

test('canViewAdmission denies assigned staff without read permission', () => {
  const counsellor = makeCounsellor({
    permissions: [],
  });

  assert.equal(
    canViewAdmission(
      counsellor,
      makeAdmission({
        applicantId: 'USER-202',
        assignedCounsellorId: counsellor.id,
      }),
    ),
    false,
  );
});

test('canViewAdmission denies an unrelated staff member', () => {
  assert.equal(
    canViewAdmission(
      makeCounsellor(),
      makeAdmission({
        applicantId: 'USER-202',
        assignedCounsellorId: 'COUNSELLOR-202',
      }),
    ),
    false,
  );
});

test('canViewAdmission supports assignedTo as the assignment field', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canViewAdmission(
      counsellor,
      makeAdmission({
        applicantId: 'USER-202',
        assignedTo: counsellor.id,
      }),
    ),
    true,
  );
});

test('canViewAdmission rejects a missing actor', () => {
  assert.equal(
    canViewAdmission(null, makeAdmission()),
    false,
  );
});

test('canViewAdmission rejects a missing admission', () => {
  assert.equal(
    canViewAdmission(makeApplicant(), null),
    false,
  );
});

// -----------------------------------------------------------------------------
// canUpdateAdmission
// -----------------------------------------------------------------------------

test('canUpdateAdmission permits an owner to update a draft admission', () => {
  assert.equal(
    canUpdateAdmission(
      makeApplicant(),
      makeAdmission({ status: 'draft' }),
      { coursePreference: 'COURSE-101' },
    ),
    true,
  );
});

test('canUpdateAdmission permits an owner to update an incomplete admission', () => {
  assert.equal(
    canUpdateAdmission(
      makeApplicant(),
      makeAdmission({ status: 'incomplete' }),
      { contactPreference: 'email' },
    ),
    true,
  );
});

test('canUpdateAdmission denies an owner updating a submitted admission', () => {
  assert.equal(
    canUpdateAdmission(
      makeApplicant(),
      makeAdmission({ status: 'submitted' }),
      { coursePreference: 'COURSE-202' },
    ),
    false,
  );
});

test('canUpdateAdmission denies an unrelated applicant', () => {
  assert.equal(
    canUpdateAdmission(
      makeApplicant({ id: 'USER-202' }),
      makeAdmission(),
      { coursePreference: 'COURSE-202' },
    ),
    false,
  );
});

test('canUpdateAdmission permits an administrator', () => {
  assert.equal(
    canUpdateAdmission(
      makeAdmin(),
      makeAdmission(),
      { status: 'approved' },
    ),
    true,
  );
});

test('canUpdateAdmission permits update-any permission', () => {
  assert.equal(
    canUpdateAdmission(
      makeActor({
        permissions: ['admissions:update:any'],
      }),
      makeAdmission(),
      { status: 'approved' },
    ),
    true,
  );
});

test('canUpdateAdmission permits an assigned counsellor to update ordinary fields', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canUpdateAdmission(
      counsellor,
      makeAdmission({
        applicantId: 'USER-202',
        status: 'under_review',
        assignedCounsellorId: counsellor.id,
      }),
      { internalNote: 'Documents reviewed' },
    ),
    true,
  );
});

test('canUpdateAdmission permits assigned support staff with update permission', () => {
  const support = makeActor({
    id: 'SUPPORT-101',
    role: 'support',
    permissions: ['admissions:update:assigned'],
  });

  assert.equal(
    canUpdateAdmission(
      support,
      makeAdmission({
        applicantId: 'USER-202',
        assignedCounsellorId: support.id,
      }),
      { internalNote: 'Contacted applicant' },
    ),
    true,
  );
});

test('canUpdateAdmission denies assigned staff without update permission', () => {
  const counsellor = makeCounsellor({
    permissions: ['admissions:read:assigned'],
  });

  assert.equal(
    canUpdateAdmission(
      counsellor,
      makeAdmission({
        applicantId: 'USER-202',
        assignedCounsellorId: counsellor.id,
      }),
      { internalNote: 'Updated note' },
    ),
    false,
  );
});

test('canUpdateAdmission rejects applicant ownership changes', () => {
  const protectedFields = [
    'id',
    '_id',
    'admissionId',
    'applicationId',
    'applicantId',
    'candidateId',
    'userId',
    'ownerId',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateAdmission(
        makeApplicant(),
        makeAdmission(),
        { [field]: 'USER-202' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateAdmission rejects status and decision changes by ordinary owners', () => {
  const protectedFields = [
    'status',
    'decision',
    'decisionStatus',
    'reviewStatus',
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateAdmission(
        makeApplicant(),
        makeAdmission(),
        { [field]: 'approved' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateAdmission rejects assignment and review metadata changes by ordinary owners', () => {
  const protectedFields = [
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
  ];

  for (const field of protectedFields) {
    assert.equal(
      canUpdateAdmission(
        makeApplicant(),
        makeAdmission(),
        { [field]: 'modified' },
      ),
      false,
      `Expected ${field} changes to be rejected`,
    );
  }
});

test('canUpdateAdmission permits an administrator to update protected fields', () => {
  assert.equal(
    canUpdateAdmission(
      makeAdmin(),
      makeAdmission(),
      { status: 'approved' },
    ),
    true,
  );
});

test('canUpdateAdmission permits update-any permission to update protected fields', () => {
  assert.equal(
    canUpdateAdmission(
      makeActor({
        permissions: ['admissions:update:any'],
      }),
      makeAdmission(),
      { applicantId: 'USER-202' },
    ),
    true,
  );
});

test('canUpdateAdmission rejects a missing actor', () => {
  assert.equal(
    canUpdateAdmission(null, makeAdmission(), {}),
    false,
  );
});

test('canUpdateAdmission rejects a missing admission', () => {
  assert.equal(
    canUpdateAdmission(makeApplicant(), null, {}),
    false,
  );
});

test('canUpdateAdmission rejects missing changes', () => {
  assert.equal(
    canUpdateAdmission(makeApplicant(), makeAdmission(), null),
    false,
  );
});

test('canUpdateAdmission rejects array changes', () => {
  assert.equal(
    canUpdateAdmission(makeApplicant(), makeAdmission(), []),
    false,
  );
});

// -----------------------------------------------------------------------------
// canReviewAdmission
// -----------------------------------------------------------------------------

test('canReviewAdmission permits an administrator', () => {
  assert.equal(
    canReviewAdmission(
      makeAdmin(),
      makeAdmission(),
    ),
    true,
  );
});

test('canReviewAdmission permits review-any permission', () => {
  assert.equal(
    canReviewAdmission(
      makeActor({
        permissions: ['admissions:review:any'],
      }),
      makeAdmission(),
    ),
    true,
  );
});

test('canReviewAdmission permits an assigned counsellor with review permission', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canReviewAdmission(
      counsellor,
      makeAdmission({
        assignedCounsellorId: counsellor.id,
      }),
    ),
    true,
  );
});

test('canReviewAdmission permits assignedTo with a counsellor identity', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canReviewAdmission(
      counsellor,
      makeAdmission({
        assignedTo: counsellor.id,
      }),
    ),
    true,
  );
});

test('canReviewAdmission denies a counsellor without review permission', () => {
  const counsellor = makeCounsellor({
    permissions: ['admissions:read:assigned'],
  });

  assert.equal(
    canReviewAdmission(
      counsellor,
      makeAdmission({
        assignedCounsellorId: counsellor.id,
      }),
    ),
    false,
  );
});

test('canReviewAdmission denies support staff even with assigned-review permission', () => {
  const support = makeActor({
    id: 'SUPPORT-101',
    role: 'support',
    permissions: ['admissions:review:assigned'],
  });

  assert.equal(
    canReviewAdmission(
      support,
      makeAdmission({
        assignedCounsellorId: support.id,
      }),
    ),
    false,
  );
});

test('canReviewAdmission denies an unassigned counsellor', () => {
  assert.equal(
    canReviewAdmission(
      makeCounsellor(),
      makeAdmission(),
    ),
    false,
  );
});

test('canReviewAdmission rejects a missing actor', () => {
  assert.equal(
    canReviewAdmission(null, makeAdmission()),
    false,
  );
});

test('canReviewAdmission rejects a missing admission', () => {
  assert.equal(
    canReviewAdmission(makeCounsellor(), null),
    false,
  );
});

// -----------------------------------------------------------------------------
// canChangeAdmissionStatus
// -----------------------------------------------------------------------------

test('canChangeAdmissionStatus permits an administrator to submit a draft', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: 'draft' }),
      'submitted',
    ),
    true,
  );
});

test('canChangeAdmissionStatus permits an administrator to move submitted to under_review', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: 'submitted' }),
      'under_review',
    ),
    true,
  );
});

test('canChangeAdmissionStatus permits an authorized counsellor to approve a submitted admission', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canChangeAdmissionStatus(
      counsellor,
      makeAdmission({
        status: 'submitted',
        assignedCounsellorId: counsellor.id,
      }),
      'approved',
    ),
    true,
  );
});

test('canChangeAdmissionStatus permits status-update-any permission', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeActor({
        permissions: ['admissions:status:update:any'],
      }),
      makeAdmission({ status: 'submitted' }),
      'approved',
    ),
    true,
  );
});

test('canChangeAdmissionStatus denies an applicant without review permission', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeApplicant(),
      makeAdmission({ status: 'submitted' }),
      'approved',
    ),
    false,
  );
});

test('canChangeAdmissionStatus rejects changing to the same status', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: 'submitted' }),
      'submitted',
    ),
    false,
  );
});

test('canChangeAdmissionStatus normalizes status casing and whitespace', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: ' submitted ' }),
      'under_review',
    ),
    true,
  );
});

test('canChangeAdmissionStatus rejects terminal current statuses', () => {
  const terminalStatuses = [
    'approved',
    'rejected',
    'cancelled',
    'withdrawn',
    'closed',
  ];

  for (const status of terminalStatuses) {
    assert.equal(
      canChangeAdmissionStatus(
        makeAdmin(),
        makeAdmission({ status }),
        'submitted',
      ),
      false,
      `Expected ${status} to be terminal`,
    );
  }
});

test('canChangeAdmissionStatus rejects unsupported transitions', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: 'draft' }),
      'approved',
    ),
    false,
  );

  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: 'under_review' }),
      'submitted',
    ),
    false,
  );
});

test('canChangeAdmissionStatus permits supported draft transitions', () => {
  for (const target of ['submitted', 'incomplete', 'cancelled']) {
    assert.equal(
      canChangeAdmissionStatus(
        makeAdmin(),
        makeAdmission({ status: 'draft' }),
        target,
      ),
      true,
      `Expected draft -> ${target} to be permitted`,
    );
  }
});

test('canChangeAdmissionStatus permits supported incomplete transitions', () => {
  for (const target of ['submitted', 'cancelled']) {
    assert.equal(
      canChangeAdmissionStatus(
        makeAdmin(),
        makeAdmission({ status: 'incomplete' }),
        target,
      ),
      true,
      `Expected incomplete -> ${target} to be permitted`,
    );
  }
});

test('canChangeAdmissionStatus permits supported submitted transitions', () => {
  for (const target of [
    'under_review',
    'pending_review',
    'approved',
    'rejected',
    'waitlisted',
    'withdrawn',
  ]) {
    assert.equal(
      canChangeAdmissionStatus(
        makeAdmin(),
        makeAdmission({ status: 'submitted' }),
        target,
      ),
      true,
      `Expected submitted -> ${target} to be permitted`,
    );
  }
});

test('canChangeAdmissionStatus permits supported pending_review transitions', () => {
  for (const target of [
    'under_review',
    'approved',
    'rejected',
    'waitlisted',
    'withdrawn',
  ]) {
    assert.equal(
      canChangeAdmissionStatus(
        makeAdmin(),
        makeAdmission({ status: 'pending_review' }),
        target,
      ),
      true,
      `Expected pending_review -> ${target} to be permitted`,
    );
  }
});

test('canChangeAdmissionStatus permits supported under_review transitions', () => {
  for (const target of [
    'approved',
    'rejected',
    'waitlisted',
    'withdrawn',
  ]) {
    assert.equal(
      canChangeAdmissionStatus(
        makeAdmin(),
        makeAdmission({ status: 'under_review' }),
        target,
      ),
      true,
      `Expected under_review -> ${target} to be permitted`,
    );
  }
});

test('canChangeAdmissionStatus permits supported waitlisted transitions', () => {
  for (const target of ['approved', 'rejected', 'withdrawn']) {
    assert.equal(
      canChangeAdmissionStatus(
        makeAdmin(),
        makeAdmission({ status: 'waitlisted' }),
        target,
      ),
      true,
      `Expected waitlisted -> ${target} to be permitted`,
    );
  }
});

test('canChangeAdmissionStatus rejects missing inputs', () => {
  assert.equal(
    canChangeAdmissionStatus(null, makeAdmission(), 'submitted'),
    false,
  );

  assert.equal(
    canChangeAdmissionStatus(makeAdmin(), null, 'submitted'),
    false,
  );

  assert.equal(
    canChangeAdmissionStatus(makeAdmin(), makeAdmission(), null),
    false,
  );
});

test('canChangeAdmissionStatus rejects an empty target status', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: 'draft' }),
      '',
    ),
    false,
  );
});

test('canChangeAdmissionStatus rejects an unknown transition', () => {
  assert.equal(
    canChangeAdmissionStatus(
      makeAdmin(),
      makeAdmission({ status: 'unknown' }),
      'submitted',
    ),
    false,
  );
});

// -----------------------------------------------------------------------------
// canAssignAdmission
// -----------------------------------------------------------------------------

test('canAssignAdmission permits an administrator to assign a counsellor', () => {
  assert.equal(
    canAssignAdmission(
      makeAdmin(),
      makeAdmission(),
      'COUNSELLOR-101',
    ),
    true,
  );
});

test('canAssignAdmission permits admissions:assign permission', () => {
  assert.equal(
    canAssignAdmission(
      makeActor({
        permissions: ['admissions:assign'],
      }),
      makeAdmission(),
      'COUNSELLOR-101',
    ),
    true,
  );
});

test('canAssignAdmission rejects unauthorized actors', () => {
  assert.equal(
    canAssignAdmission(
      makeApplicant(),
      makeAdmission(),
      'COUNSELLOR-101',
    ),
    false,
  );
});

test('canAssignAdmission rejects a missing actor', () => {
  assert.equal(
    canAssignAdmission(null, makeAdmission(), 'COUNSELLOR-101'),
    false,
  );
});

test('canAssignAdmission rejects a missing admission', () => {
  assert.equal(
    canAssignAdmission(makeAdmin(), null, 'COUNSELLOR-101'),
    false,
  );
});

test('canAssignAdmission rejects a missing assignee', () => {
  assert.equal(
    canAssignAdmission(makeAdmin(), makeAdmission(), null),
    false,
  );

  assert.equal(
    canAssignAdmission(makeAdmin(), makeAdmission(), ''),
    false,
  );
});

test('canAssignAdmission rejects assigning the current counsellor again', () => {
  assert.equal(
    canAssignAdmission(
      makeAdmin(),
      makeAdmission({
        assignedCounsellorId: 'COUNSELLOR-101',
      }),
      'COUNSELLOR-101',
    ),
    false,
  );
});

test('canAssignAdmission rejects assigning the current assignee again', () => {
  assert.equal(
    canAssignAdmission(
      makeAdmin(),
      makeAdmission({
        assignedTo: 'COUNSELLOR-101',
      }),
      'COUNSELLOR-101',
    ),
    false,
  );
});

test('canAssignAdmission permits changing the assignee', () => {
  assert.equal(
    canAssignAdmission(
      makeAdmin(),
      makeAdmission({
        assignedCounsellorId: 'COUNSELLOR-101',
      }),
      'COUNSELLOR-202',
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// canDeleteAdmission
// -----------------------------------------------------------------------------

test('canDeleteAdmission permits an owner to delete a draft admission', () => {
  assert.equal(
    canDeleteAdmission(
      makeApplicant(),
      makeAdmission({ status: 'draft' }),
    ),
    true,
  );
});

test('canDeleteAdmission permits an owner to delete an incomplete admission', () => {
  assert.equal(
    canDeleteAdmission(
      makeApplicant(),
      makeAdmission({ status: 'incomplete' }),
    ),
    true,
  );
});

test('canDeleteAdmission denies an owner deleting a submitted admission', () => {
  assert.equal(
    canDeleteAdmission(
      makeApplicant(),
      makeAdmission({ status: 'submitted' }),
    ),
    false,
  );
});

test('canDeleteAdmission denies an unrelated applicant', () => {
  assert.equal(
    canDeleteAdmission(
      makeApplicant({ id: 'USER-202' }),
      makeAdmission(),
    ),
    false,
  );
});

test('canDeleteAdmission permits an administrator to delete a submitted admission', () => {
  assert.equal(
    canDeleteAdmission(
      makeAdmin(),
      makeAdmission({ status: 'submitted' }),
    ),
    true,
  );
});

test('canDeleteAdmission permits delete-any permission', () => {
  assert.equal(
    canDeleteAdmission(
      makeActor({
        permissions: ['admissions:delete:any'],
      }),
      makeAdmission({ status: 'submitted' }),
    ),
    true,
  );
});

test('canDeleteAdmission rejects a missing actor', () => {
  assert.equal(
    canDeleteAdmission(null, makeAdmission()),
    false,
  );
});

test('canDeleteAdmission rejects a missing admission', () => {
  assert.equal(
    canDeleteAdmission(makeApplicant(), null),
    false,
  );
});

test('canDeleteAdmission rejects an admission without an owner for an ordinary applicant', () => {
  assert.equal(
    canDeleteAdmission(
      makeApplicant(),
      makeAdmission({
        applicantId: undefined,
        candidateId: undefined,
        userId: undefined,
        ownerId: undefined,
      }),
    ),
    false,
  );
});

// -----------------------------------------------------------------------------
// canSetAdmissionDecision
// -----------------------------------------------------------------------------

test('canSetAdmissionDecision permits an administrator to approve a submitted admission', () => {
  assert.equal(
    canSetAdmissionDecision(
      makeAdmin(),
      makeAdmission({ status: 'submitted' }),
      'approved',
    ),
    true,
  );
});

test('canSetAdmissionDecision permits an authorized counsellor to reject an under-review admission', () => {
  const counsellor = makeCounsellor();

  assert.equal(
    canSetAdmissionDecision(
      counsellor,
      makeAdmission({
        status: 'under_review',
        assignedCounsellorId: counsellor.id,
      }),
      'rejected',
    ),
    true,
  );
});

test('canSetAdmissionDecision permits review-any permission', () => {
  assert.equal(
    canSetAdmissionDecision(
      makeActor({
        permissions: ['admissions:review:any'],
      }),
      makeAdmission({ status: 'submitted' }),
      'waitlisted',
    ),
    true,
  );
});

test('canSetAdmissionDecision accepts approved, rejected, and waitlisted', () => {
  const admin = makeAdmin();
  const admission = makeAdmission({ status: 'submitted' });

  for (const decision of ['approved', 'rejected', 'waitlisted']) {
    assert.equal(
      canSetAdmissionDecision(admin, admission, decision),
      true,
      `Expected decision "${decision}" to be accepted`,
    );
  }
});

test('canSetAdmissionDecision rejects unsupported decisions', () => {
  const admin = makeAdmin();
  const admission = makeAdmission({ status: 'submitted' });

  for (const decision of [
    '',
    'pending',
    'cancelled',
    'withdrawn',
    'unknown',
    null,
    123,
  ]) {
    assert.equal(
      canSetAdmissionDecision(admin, admission, decision),
      false,
    );
  }
});

test('canSetAdmissionDecision normalizes decision casing and whitespace', () => {
  assert.equal(
    canSetAdmissionDecision(
      makeAdmin(),
      makeAdmission({ status: 'submitted' }),
      ' APPROVED ',
    ),
    true,
  );
});

test('canSetAdmissionDecision permits reviewable statuses', () => {
  const admin = makeAdmin();

  for (const status of [
    'submitted',
    'under_review',
    'pending_review',
  ]) {
    assert.equal(
      canSetAdmissionDecision(
        admin,
        makeAdmission({ status }),
        'approved',
      ),
      true,
      `Expected status "${status}" to be reviewable`,
    );
  }
});

test('canSetAdmissionDecision rejects non-reviewable statuses', () => {
  const admin = makeAdmin();

  for (const status of [
    'draft',
    'incomplete',
    'approved',
    'rejected',
    'waitlisted',
    'cancelled',
    'withdrawn',
    'closed',
  ]) {
    assert.equal(
      canSetAdmissionDecision(
        admin,
        makeAdmission({ status }),
        'approved',
      ),
      false,
      `Expected status "${status}" to be non-reviewable`,
    );
  }
});

test('canSetAdmissionDecision rejects an unauthorized applicant', () => {
  assert.equal(
    canSetAdmissionDecision(
      makeApplicant(),
      makeAdmission({ status: 'submitted' }),
      'approved',
    ),
    false,
  );
});

test('canSetAdmissionDecision rejects missing inputs', () => {
  assert.equal(
    canSetAdmissionDecision(null, makeAdmission(), 'approved'),
    false,
  );

  assert.equal(
    canSetAdmissionDecision(makeAdmin(), null, 'approved'),
    false,
  );
});

// -----------------------------------------------------------------------------
// canExportAdmissions
// -----------------------------------------------------------------------------

test('canExportAdmissions permits an administrator', () => {
  assert.equal(
    canExportAdmissions(makeAdmin()),
    true,
  );
});

test('canExportAdmissions permits platform:admin permission', () => {
  assert.equal(
    canExportAdmissions(
      makeActor({
        permissions: ['platform:admin'],
      }),
    ),
    true,
  );
});

test('canExportAdmissions permits admissions:export permission', () => {
  assert.equal(
    canExportAdmissions(
      makeActor({
        permissions: ['admissions:export'],
      }),
    ),
    true,
  );
});

test('canExportAdmissions denies actors without export permission', () => {
  assert.equal(
    canExportAdmissions(makeApplicant()),
    false,
  );
});

test('canExportAdmissions rejects a missing actor', () => {
  assert.equal(canExportAdmissions(null), false);
});

test('canExportAdmissions rejects an empty actor object', () => {
  assert.equal(canExportAdmissions({}), false);
});
