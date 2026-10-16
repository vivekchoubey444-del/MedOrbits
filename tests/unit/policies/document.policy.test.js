
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canUploadDocument,
  canViewDocument,
  canUpdateDocument,
  canReviewDocument,
  canDeleteDocument,
  canGenerateDocumentDownload,
} = require('../../../src/policies/document.policy');

function makeDocument(overrides = {}) {
  return {
    id: 'document-001',
    userId: 'user-001',
    filename: 'identity-document.pdf',
    status: 'pending',
    isDeleted: false,
    requiredForActiveApplication: false,
    ...overrides,
  };
}

function makeActor(overrides = {}) {
  return {
    id: 'user-001',
    role: 'user',
    permissions: [],
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'admin-001',
    role: 'admin',
    ...overrides,
  });
}

function makeAuthorizedActor(permission, overrides = {}) {
  return makeActor({
    permissions: [permission],
    ...overrides,
  });
}

function makeReviewer(overrides = {}) {
  return makeActor({
    id: 'reviewer-001',
    role: 'counsellor',
    permissions: ['documents:review:assigned'],
    ...overrides,
  });
}

function makeDeletedDocument(overrides = {}) {
  return makeDocument({
    isDeleted: true,
    ...overrides,
  });
}

// --------------------------------------------------
// Document uploads
// --------------------------------------------------

test('canUploadDocument allows supported user roles', () => {
  for (const role of [
    'user',
    'student',
    'candidate',
    'employer',
  ]) {
    assert.equal(
      canUploadDocument(
        makeActor({ role }),
        {}
      ),
      true,
      `Expected ${role} to upload a document`
    );
  }
});

test('canUploadDocument allows administrators', () => {
  assert.equal(canUploadDocument(makeAdmin(), {}), true);
});

test('canUploadDocument allows documents:upload:any permission', () => {
  assert.equal(
    canUploadDocument(
      makeAuthorizedActor('documents:upload:any'),
      { userId: 'user-002' }
    ),
    true
  );
});

test('canUploadDocument allows an authorized actor to upload for themselves', () => {
  assert.equal(
    canUploadDocument(
      makeActor({ id: 'user-001', role: 'candidate' }),
      { userId: 'user-001' }
    ),
    true
  );

  assert.equal(
    canUploadDocument(
      makeActor({ id: 'user-001', role: 'student' }),
      { ownerId: 'user-001' }
    ),
    true
  );

  assert.equal(
    canUploadDocument(
      makeActor({ id: 'user-001', role: 'candidate' }),
      { candidateId: 'user-001' }
    ),
    true
  );
});

test('canUploadDocument permits omitted owner metadata for supported roles', () => {
  assert.equal(
    canUploadDocument(
      makeActor({ role: 'candidate' }),
      {}
    ),
    true
  );

  assert.equal(
    canUploadDocument(
      makeActor({ role: 'student' }),
      { userId: null, ownerId: null, candidateId: null }
    ),
    true
  );
});

test('canUploadDocument denies uploads for another owner', () => {
  assert.equal(
    canUploadDocument(
      makeActor({ id: 'user-001', role: 'candidate' }),
      { userId: 'user-002' }
    ),
    false
  );

  assert.equal(
    canUploadDocument(
      makeActor({ id: 'user-001', role: 'student' }),
      { ownerId: 'user-002' }
    ),
    false
  );
});

test('canUploadDocument denies unsupported roles', () => {
  for (const role of [
    'guest',
    'recruiter',
    'support',
    'counsellor',
    'unknown',
  ]) {
    assert.equal(
      canUploadDocument(makeActor({ role }), {}),
      false,
      `Expected ${role} to be denied`
    );
  }
});

test('canUploadDocument denies anonymous actors', () => {
  assert.equal(canUploadDocument(null, {}), false);
  assert.equal(canUploadDocument(undefined, {}), false);
});

// --------------------------------------------------
// Document visibility
// --------------------------------------------------

test('canViewDocument allows the document owner', () => {
  assert.equal(
    canViewDocument(
      makeActor(),
      makeDocument()
    ),
    true
  );
});

test('canViewDocument supports configured owner fields', () => {
  for (const field of [
    'userId',
    'ownerId',
    'candidateId',
    'applicantId',
    'uploadedBy',
  ]) {
    assert.equal(
      canViewDocument(
        makeActor({ id: 'user-001' }),
        makeDocument({
          userId: null,
          ownerId: null,
          candidateId: null,
          applicantId: null,
          uploadedBy: null,
          [field]: 'user-001',
        })
      ),
      true,
      `Expected ownership through ${field}`
    );
  }
});

test('canViewDocument allows administrators', () => {
  assert.equal(
    canViewDocument(makeAdmin(), makeDocument()),
    true
  );
});

test('canViewDocument allows documents:read:any permission', () => {
  assert.equal(
    canViewDocument(
      makeAuthorizedActor('documents:read:any', {
        id: 'reviewer-002',
      }),
      makeDocument()
    ),
    true
  );
});

test('canViewDocument denies non-owners without permission', () => {
  assert.equal(
    canViewDocument(
      makeActor({ id: 'user-002' }),
      makeDocument()
    ),
    false
  );
});

test('canViewDocument allows assigned application applicants with permission', () => {
  const document = makeDocument({
    userId: 'different-user',
    applicationId: 'application-001',
    applicationApplicantId: 'user-001',
  });

  assert.equal(
    canViewDocument(
      makeAuthorizedActor('applications:read:assigned'),
      document
    ),
    true
  );
});

test('canViewDocument supports applicantId for related applications', () => {
  const document = makeDocument({
    userId: 'different-user',
    applicationId: 'application-001',
    applicationApplicantId: null,
    applicantId: 'user-001',
  });

  assert.equal(
    canViewDocument(
      makeAuthorizedActor('applications:read:assigned'),
      document
    ),
    true
  );
});

test('canViewDocument denies related applicants without permission', () => {
  assert.equal(
    canViewDocument(
      makeActor(),
      makeDocument({
        userId: 'different-user',
        applicationId: 'application-001',
        applicationApplicantId: 'user-001',
      })
    ),
    false
  );
});

test('canViewDocument denies application access without an application ID', () => {
  assert.equal(
    canViewDocument(
      makeAuthorizedActor('applications:read:assigned'),
      makeDocument({
        userId: 'different-user',
        applicationApplicantId: 'user-001',
      })
    ),
    false
  );
});

test('canViewDocument allows assigned counsellors with review permission', () => {
  assert.equal(
    canViewDocument(
      makeReviewer(),
      makeDocument({
        userId: 'different-user',
        assignedTo: 'reviewer-001',
      })
    ),
    true
  );
});

test('canViewDocument supports reviewerId assignments', () => {
  assert.equal(
    canViewDocument(
      makeReviewer(),
      makeDocument({
        userId: 'different-user',
        reviewerId: 'reviewer-001',
      })
    ),
    true
  );
});

test('canViewDocument denies assigned reviewers without required role', () => {
  assert.equal(
    canViewDocument(
      makeActor({
        id: 'reviewer-001',
        role: 'user',
        permissions: ['documents:review:assigned'],
      }),
      makeDocument({
        userId: 'different-user',
        assignedTo: 'reviewer-001',
      })
    ),
    false
  );
});

test('canViewDocument denies assigned reviewers without review permission', () => {
  assert.equal(
    canViewDocument(
      makeActor({
        id: 'reviewer-001',
        role: 'counsellor',
        permissions: [],
      }),
      makeDocument({
        userId: 'different-user',
        assignedTo: 'reviewer-001',
      })
    ),
    false
  );
});

test('canViewDocument denies deleted documents to all actors', () => {
  for (const actor of [
    null,
    makeActor(),
    makeAdmin(),
    makeAuthorizedActor('documents:read:any'),
  ]) {
    assert.equal(
      canViewDocument(actor, makeDeletedDocument()),
      false
    );
  }
});

test('canViewDocument denies documents with deletedAt set', () => {
  assert.equal(
    canViewDocument(
      makeAdmin(),
      makeDocument({ deletedAt: '2026-01-01T00:00:00.000Z' })
    ),
    false
  );
});

test('canViewDocument denies missing actors and documents', () => {
  assert.equal(canViewDocument(null, makeDocument()), false);
  assert.equal(canViewDocument(makeActor(), null), false);
  assert.equal(canViewDocument(makeActor(), undefined), false);
});

// --------------------------------------------------
// Document updates
// --------------------------------------------------

test('canUpdateDocument allows owners to update ordinary metadata', () => {
  assert.equal(
    canUpdateDocument(
      makeActor(),
      makeDocument(),
      {
        filename: 'updated-document.pdf',
        description: 'Updated description',
        category: 'identity',
      }
    ),
    true
  );
});

test('canUpdateDocument allows administrators to update documents', () => {
  assert.equal(
    canUpdateDocument(
      makeAdmin(),
      makeDocument(),
      { status: 'verified' }
    ),
    true
  );
});

test('canUpdateDocument allows documents:update:any permission', () => {
  assert.equal(
    canUpdateDocument(
      makeAuthorizedActor('documents:update:any', {
        id: 'user-002',
      }),
      makeDocument(),
      { status: 'verified' }
    ),
    true
  );
});

test('canUpdateDocument denies non-owner updates without permission', () => {
  assert.equal(
    canUpdateDocument(
      makeActor({ id: 'user-002' }),
      makeDocument(),
      { filename: 'unauthorized.pdf' }
    ),
    false
  );
});

const protectedFields = [
  'id',
  '_id',
  'userId',
  'ownerId',
  'candidateId',
  'applicantId',
  'uploadedBy',
  'status',
  'verificationStatus',
  'reviewStatus',
  'reviewerId',
  'assignedTo',
  'storageKey',
  'bucket',
  'url',
  'downloadUrl',
  'checksum',
  'malwareScanStatus',
  'isDeleted',
  'deletedAt',
  'createdAt',
  'updatedAt',
];

for (const field of protectedFields) {
  test(`canUpdateDocument protects ${field} from owner changes`, () => {
    assert.equal(
      canUpdateDocument(
        makeActor(),
        makeDocument(),
        { [field]: 'unauthorized-value' }
      ),
      false
    );
  });
}

test('canUpdateDocument allows administrators to change protected fields', () => {
  assert.equal(
    canUpdateDocument(
      makeAdmin(),
      makeDocument(),
      {
        status: 'verified',
        reviewerId: 'reviewer-001',
        storageKey: 'updated-storage-key',
      }
    ),
    true
  );
});

test('canUpdateDocument denies updates to deleted documents', () => {
  assert.equal(
    canUpdateDocument(
      makeAdmin(),
      makeDeletedDocument(),
      { filename: 'updated.pdf' }
    ),
    false
  );

  assert.equal(
    canUpdateDocument(
      makeAuthorizedActor('documents:update:any'),
      makeDeletedDocument(),
      { filename: 'updated.pdf' }
    ),
    false
  );
});

test('canUpdateDocument denies invalid changes objects', () => {
  assert.equal(
    canUpdateDocument(makeActor(), makeDocument(), null),
    false
  );

  assert.equal(
    canUpdateDocument(makeActor(), makeDocument(), undefined),
    false
  );

  assert.equal(
    canUpdateDocument(makeActor(), makeDocument(), []),
    false
  );

  assert.equal(
    canUpdateDocument(makeActor(), makeDocument(), 'filename'),
    false
  );
});

test('canUpdateDocument denies missing actors and documents', () => {
  assert.equal(
    canUpdateDocument(null, makeDocument(), {}),
    false
  );

  assert.equal(
    canUpdateDocument(makeActor(), null, {}),
    false
  );
});

// --------------------------------------------------
// Document review
// --------------------------------------------------

test('canReviewDocument allows administrators', () => {
  assert.equal(
    canReviewDocument(makeAdmin(), makeDocument()),
    true
  );
});

test('canReviewDocument allows documents:review:any permission', () => {
  assert.equal(
    canReviewDocument(
      makeAuthorizedActor('documents:review:any'),
      makeDocument()
    ),
    true
  );
});

test('canReviewDocument allows assigned counsellors', () => {
  assert.equal(
    canReviewDocument(
      makeReviewer(),
      makeDocument({ assignedTo: 'reviewer-001' })
    ),
    true
  );
});

test('canReviewDocument allows assigned support staff', () => {
  assert.equal(
    canReviewDocument(
      makeActor({
        id: 'support-001',
        role: 'support',
        permissions: ['documents:review:assigned'],
      }),
      makeDocument({ reviewerId: 'support-001' })
    ),
    true
  );
});

test('canReviewDocument accepts counselor spelling alias', () => {
  assert.equal(
    canReviewDocument(
      makeActor({
        id: 'reviewer-001',
        role: 'counselor',
        permissions: ['documents:review:assigned'],
      }),
      makeDocument({ assignedTo: 'reviewer-001' })
    ),
    true
  );
});

test('canReviewDocument denies unassigned reviewers', () => {
  assert.equal(
    canReviewDocument(
      makeReviewer(),
      makeDocument({
        assignedTo: 'another-reviewer',
        reviewerId: 'another-reviewer',
      })
    ),
    false
  );
});

test('canReviewDocument denies assigned users without reviewer roles', () => {
  assert.equal(
    canReviewDocument(
      makeActor({
        id: 'reviewer-001',
        role: 'user',
        permissions: ['documents:review:assigned'],
      }),
      makeDocument({ assignedTo: 'reviewer-001' })
    ),
    false
  );
});

test('canReviewDocument denies assigned reviewers without permission', () => {
  assert.equal(
    canReviewDocument(
      makeActor({
        id: 'reviewer-001',
        role: 'counsellor',
        permissions: [],
      }),
      makeDocument({ assignedTo: 'reviewer-001' })
    ),
    false
  );
});

test('canReviewDocument denies deleted documents', () => {
  assert.equal(
    canReviewDocument(makeAdmin(), makeDeletedDocument()),
    false
  );

  assert.equal(
    canReviewDocument(
      makeAuthorizedActor('documents:review:any'),
      makeDocument({ deletedAt: '2026-01-01T00:00:00.000Z' })
    ),
    false
  );
});

test('canReviewDocument denies missing actors and documents', () => {
  assert.equal(canReviewDocument(null, makeDocument()), false);
  assert.equal(canReviewDocument(makeAdmin(), null), false);
});

// --------------------------------------------------
// Document deletion
// --------------------------------------------------

test('canDeleteDocument allows administrators to delete active documents', () => {
  assert.equal(
    canDeleteDocument(makeAdmin(), makeDocument()),
    true
  );
});

test('canDeleteDocument allows documents:delete:any permission', () => {
  assert.equal(
    canDeleteDocument(
      makeAuthorizedActor('documents:delete:any'),
      makeDocument()
    ),
    true
  );
});

test('canDeleteDocument allows owners to delete ordinary documents', () => {
  assert.equal(
    canDeleteDocument(makeActor(), makeDocument()),
    true
  );
});

test('canDeleteDocument denies non-owner deletion', () => {
  assert.equal(
    canDeleteDocument(
      makeActor({ id: 'user-002' }),
      makeDocument()
    ),
    false
  );
});

test('canDeleteDocument denies deletion of required application documents', () => {
  assert.equal(
    canDeleteDocument(
      makeActor(),
      makeDocument({ requiredForActiveApplication: true })
    ),
    false
  );
});

for (const status of ['verified', 'locked', 'submitted']) {
  test(`canDeleteDocument denies owner deletion when status is ${status}`, () => {
    assert.equal(
      canDeleteDocument(
        makeActor(),
        makeDocument({ status })
      ),
      false
    );
  });
}

test('canDeleteDocument normalizes status before checking restrictions', () => {
  for (const status of ['VERIFIED', 'Locked', ' SUBMITTED ']) {
    assert.equal(
      canDeleteDocument(
        makeActor(),
        makeDocument({ status })
      ),
      false
    );
  }
});

test('canDeleteDocument allows deletion for other statuses', () => {
  for (const status of ['pending', 'rejected', 'draft', '']) {
    assert.equal(
      canDeleteDocument(
        makeActor(),
        makeDocument({ status })
      ),
      true
    );
  }
});

test('canDeleteDocument denies deletion of already deleted documents', () => {
  assert.equal(
    canDeleteDocument(makeAdmin(), makeDeletedDocument()),
    false
  );

  assert.equal(
    canDeleteDocument(
      makeAuthorizedActor('documents:delete:any'),
      makeDeletedDocument()
    ),
    false
  );
});

test('canDeleteDocument denies missing actors and documents', () => {
  assert.equal(canDeleteDocument(null, makeDocument()), false);
  assert.equal(canDeleteDocument(makeAdmin(), null), false);
});

// --------------------------------------------------
// Document downloads
// --------------------------------------------------

test('canGenerateDocumentDownload allows document owners', () => {
  assert.equal(
    canGenerateDocumentDownload(
      makeActor(),
      makeDocument()
    ),
    true
  );
});

test('canGenerateDocumentDownload allows administrators', () => {
  assert.equal(
    canGenerateDocumentDownload(
      makeAdmin(),
      makeDocument()
    ),
    true
  );
});

test('canGenerateDocumentDownload allows documents:read:any permission', () => {
  assert.equal(
    canGenerateDocumentDownload(
      makeAuthorizedActor('documents:read:any'),
      makeDocument()
    ),
    true
  );
});

test('canGenerateDocumentDownload allows authorized assigned reviewers', () => {
  assert.equal(
    canGenerateDocumentDownload(
      makeReviewer(),
      makeDocument({
        userId: 'different-user',
        assignedTo: 'reviewer-001',
      })
    ),
    true
  );
});

test('canGenerateDocumentDownload denies unauthorized users', () => {
  assert.equal(
    canGenerateDocumentDownload(
      makeActor({ id: 'user-002' }),
      makeDocument()
    ),
    false
  );
});

test('canGenerateDocumentDownload denies deleted documents', () => {
  assert.equal(
    canGenerateDocumentDownload(
      makeAdmin(),
      makeDeletedDocument()
    ),
    false
  );

  assert.equal(
    canGenerateDocumentDownload(
      makeActor(),
      makeDocument({ deletedAt: '2026-01-01T00:00:00.000Z' })
    ),
    false
  );
});

test('canGenerateDocumentDownload denies missing actors and documents', () => {
  assert.equal(
    canGenerateDocumentDownload(null, makeDocument()),
    false
  );

  assert.equal(
    canGenerateDocumentDownload(makeAdmin(), null),
    false
  );
});

// --------------------------------------------------
// Shared authorization boundaries
// --------------------------------------------------

test('superadmin can perform administrative document operations', () => {
  const superadmin = makeActor({ role: 'super_admin' });
  const document = makeDocument();

  assert.equal(canUploadDocument(superadmin, {}), true);
  assert.equal(canViewDocument(superadmin, document), true);
  assert.equal(canUpdateDocument(superadmin, document, {}), true);
  assert.equal(canReviewDocument(superadmin, document), true);
  assert.equal(canDeleteDocument(superadmin, document), true);
  assert.equal(
    canGenerateDocumentDownload(superadmin, document),
    true
  );
});

test('platform:admin permission grants administrative access', () => {
  const platformAdmin = makeAuthorizedActor('platform:admin', {
    id: 'admin-002',
  });

  assert.equal(
    canViewDocument(platformAdmin, makeDocument()),
    true
  );

  assert.equal(
    canUpdateDocument(platformAdmin, makeDocument(), {
      status: 'verified',
    }),
    true
  );

  assert.equal(
    canDeleteDocument(platformAdmin, makeDocument()),
    true
  );
});

test('an unknown role alone grants no document privileges', () => {
  const unknown = makeActor({
    id: 'unknown-001',
    role: 'document_manager',
    permissions: [],
  });

  const document = makeDocument({ userId: 'another-user' });

  assert.equal(canUploadDocument(unknown, {}), false);
  assert.equal(canViewDocument(unknown, document), false);
  assert.equal(canUpdateDocument(unknown, document, {}), false);
  assert.equal(canReviewDocument(unknown, document), false);
  assert.equal(canDeleteDocument(unknown, document), false);
  assert.equal(
    canGenerateDocumentDownload(unknown, document),
    false
  );
});

test('an isAdmin flag alone grants no administrative privileges', () => {
  const forgedAdmin = makeActor({
    id: 'forged-admin',
    isAdmin: true,
    permissions: [],
  });

  const document = makeDocument({ userId: 'another-user' });

  assert.equal(canViewDocument(forgedAdmin, document), false);
  assert.equal(canUpdateDocument(forgedAdmin, document, {}), false);
  assert.equal(canReviewDocument(forgedAdmin, document), false);
  assert.equal(canDeleteDocument(forgedAdmin, document), false);
});
