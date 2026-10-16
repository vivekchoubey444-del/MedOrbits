/**

* MedOrbits -- IDOR Security Tests
* File: tests/security/idor.security.test.js
* Run:
* npx jest –runInBand tests/security/idor.security.test.js
* Tests the existing domain authorization policies directly.
* Important:
* Policy tests do not prove that every HTTP route invokes the policies.
* Route-level IDOR tests should also exercise the real application and
* repository-backed ownership checks.
    */

‘use strict’;

const applicationPolicy = require(’../../src/policies/application.policy’);
const admissionPolicy = require(’../../src/policies/admission.policy’);
const documentPolicy = require(’../../src/policies/document.policy’);

const applicantA = {
id: ‘user-a’,
roles: [‘user’],
permissions: [],
};

const applicantB = {
id: ‘user-b’,
roles: [‘user’],
permissions: [],
};

const admin = {
id: ‘admin-1’,
roles: [‘admin’],
permissions: [],
};

const applicationA = {
id: ‘application-a’,
applicantId: ‘user-a’,
status: ‘draft’,
};

const admissionA = {
id: ‘admission-a’,
applicantId: ‘user-a’,
status: ‘draft’,
};

const documentA = {
id: ‘document-a’,
userId: ‘user-a’,
status: ‘uploaded’,
isDeleted: false,
};

describe(‘IDOR security -- MedOrbits authorization policies’, () => {
describe(‘Application access isolation’, () => {
test(‘allows an applicant to view their own application’, () => {
expect(
applicationPolicy.canViewApplication(applicantA, applicationA),
).toBe(true);
});

test('denies another applicant access to the application', () => {
  expect(
    applicationPolicy.canViewApplication(applicantB, applicationA),
  ).toBe(false);
});
test('does not grant ownership through a forged request identity field', () => {
  const forgedActor = {
    ...applicantB,
    requestedUserId: 'user-a',
    body: { userId: 'user-a' },
  };
  expect(
    applicationPolicy.canViewApplication(forgedActor, applicationA),
  ).toBe(false);
});
test('supports the documented application owner fields', () => {
  const ownerFields = [
    'applicantId',
    'candidateId',
    'userId',
    'ownerId',
    'createdBy',
  ];
  for (const field of ownerFields) {
    const resource = {
      id: `resource-${field}`,
      [field]: 'user-a',
      status: 'draft',
    };
    expect(
      applicationPolicy.canViewApplication(applicantA, resource),
    ).toBe(true);
    expect(
      applicationPolicy.canViewApplication(applicantB, resource),
    ).toBe(false);
  }
});
test('denies access when the application is missing', () => {
  expect(
    applicationPolicy.canViewApplication(applicantA, null),
  ).toBe(false);
});
test('denies access when the actor is missing', () => {
  expect(
    applicationPolicy.canViewApplication(null, applicationA),
  ).toBe(false);
});
test('allows an explicitly authorized administrator to view another application', () => {
  expect(
    applicationPolicy.canViewApplication(admin, applicationA),
  ).toBe(true);
});

});

describe(‘Application modification and ownership escalation’, () => {
test(‘allows an owner to update permitted fields on a draft application’, () => {
expect(
applicationPolicy.canUpdateApplication(
applicantA,
applicationA,
{ personalStatement: ‘Updated statement’ },
),
).toBe(true);
});

test('denies another applicant from modifying the application', () => {
  expect(
    applicationPolicy.canUpdateApplication(
      applicantB,
      applicationA,
      { personalStatement: 'Unauthorized update' },
    ),
  ).toBe(false);
});
test.each([
  'id',
  '_id',
  'applicantId',
  'candidateId',
  'userId',
  'ownerId',
  'createdBy',
  'status',
  'reviewStatus',
  'decision',
  'approvedBy',
  'rejectedBy',
  'reviewedBy',
  'reviewedAt',
  'counsellorId',
  'assignedCounsellorId',
  'createdAt',
  'updatedAt',
])('blocks applicant changes to protected field "%s"', (field) => {
  expect(
    applicationPolicy.canUpdateApplication(
      applicantA,
      applicationA,
      { [field]: 'attacker-controlled-value' },
    ),
  ).toBe(false);
});
test('does not allow an applicant to change ownership and then edit another account record', () => {
  const forgedChanges = {
    applicantId: 'user-b',
    personalStatement: 'Attempted ownership transfer',
  };
  expect(
    applicationPolicy.canUpdateApplication(
      applicantA,
      applicationA,
      forgedChanges,
    ),
  ).toBe(false);
});
test('denies owner updates after the application is submitted', () => {
  const submittedApplication = {
    ...applicationA,
    status: 'submitted',
  };
  expect(
    applicationPolicy.canUpdateApplication(
      applicantA,
      submittedApplication,
      { personalStatement: 'Late modification' },
    ),
  ).toBe(false);
});
test('does not let an applicant delete another users application', () => {
  expect(
    applicationPolicy.canDeleteApplication(
      applicantB,
      applicationA,
    ),
  ).toBe(false);
});
test('denies deletion of a submitted application by its owner', () => {
  expect(
    applicationPolicy.canDeleteApplication(
      applicantA,
      { ...applicationA, status: 'submitted' },
    ),
  ).toBe(false);
});

});

describe(‘Admission access isolation’, () => {
test(‘allows an applicant to view their own admission’, () => {
expect(
admissionPolicy.canViewAdmission(applicantA, admissionA),
).toBe(true);
});

test('denies cross-user admission access', () => {
  expect(
    admissionPolicy.canViewAdmission(applicantB, admissionA),
  ).toBe(false);
});
test('supports admission owner fields without granting access to other users', () => {
  const ownerFields = [
    'applicantId',
    'candidateId',
    'userId',
    'ownerId',
  ];
  for (const field of ownerFields) {
    const admission = {
      id: `admission-${field}`,
      [field]: 'user-a',
      status: 'draft',
    };
    expect(
      admissionPolicy.canViewAdmission(applicantA, admission),
    ).toBe(true);
    expect(
      admissionPolicy.canViewAdmission(applicantB, admission),
    ).toBe(false);
  }
});
test('denies access when the admission record is missing', () => {
  expect(
    admissionPolicy.canViewAdmission(applicantA, null),
  ).toBe(false);
});
test('allows access through an explicit admissions read-any permission', () => {
  const authorizedStaff = {
    id: 'staff-1',
    roles: ['counsellor'],
    permissions: ['admissions:read:any'],
  };
  expect(
    admissionPolicy.canViewAdmission(authorizedStaff, admissionA),
  ).toBe(true);
});
test('does not allow applicants to assign themselves privileged roles through admission input', () => {
  const forgedActor = {
    ...applicantB,
    body: {
      role: 'admin',
      permissions: ['admissions:read:any'],
    },
  };
  expect(
    admissionPolicy.canViewAdmission(forgedActor, admissionA),
  ).toBe(false);
});
test('blocks applicant attempts to modify admission ownership', () => {
  expect(
    admissionPolicy.canUpdateAdmission(
      applicantA,
      admissionA,
      { applicantId: 'user-b' },
    ),
  ).toBe(false);
});
test('blocks applicant attempts to modify admission decisions', () => {
  const protectedFields = [
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
  ];
  for (const field of protectedFields) {
    expect(
      admissionPolicy.canUpdateAdmission(
        applicantA,
        admissionA,
        { [field]: 'attacker-controlled-value' },
      ),
    ).toBe(false);
  }
});
test('denies another applicant from deleting an admission', () => {
  expect(
    admissionPolicy.canDeleteAdmission(
      applicantB,
      admissionA,
    ),
  ).toBe(false);
});

});

describe(‘Document access and download isolation’, () => {
test(‘allows the document owner to view their document’, () => {
expect(
documentPolicy.canViewDocument(applicantA, documentA),
).toBe(true);
});

test('denies another user access to the document', () => {
  expect(
    documentPolicy.canViewDocument(applicantB, documentA),
  ).toBe(false);
});
test('denies unauthorized document downloads', () => {
  expect(
    documentPolicy.canGenerateDocumentDownload(
      applicantB,
      documentA,
    ),
  ).toBe(false);
});
test('allows the owner to pass the document download authorization check', () => {
  expect(
    documentPolicy.canGenerateDocumentDownload(
      applicantA,
      documentA,
    ),
  ).toBe(true);
});
test.each([
  { isDeleted: true },
  { deletedAt: '2026-01-01T00:00:00.000Z' },
])('denies access to a deleted document: %j', (deletionState) => {
  const deletedDocument = {
    ...documentA,
    ...deletionState,
  };
  expect(
    documentPolicy.canViewDocument(applicantA, deletedDocument),
  ).toBe(false);
  expect(
    documentPolicy.canGenerateDocumentDownload(
      applicantA,
      deletedDocument,
    ),
  ).toBe(false);
});
test('does not allow an owner to reassign document ownership', () => {
  expect(
    documentPolicy.canUpdateDocument(
      applicantA,
      documentA,
      { userId: 'user-b' },
    ),
  ).toBe(false);
});
test.each([
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
])('blocks document changes to protected field "%s"', (field) => {
  expect(
    documentPolicy.canUpdateDocument(
      applicantA,
      documentA,
      { [field]: 'attacker-controlled-value' },
    ),
  ).toBe(false);
});
test('does not allow another user to delete the document', () => {
  expect(
    documentPolicy.canDeleteDocument(
      applicantB,
      documentA,
    ),
  ).toBe(false);
});
test('does not allow a user to access a document without an authenticated actor', () => {
  expect(
    documentPolicy.canViewDocument(null, documentA),
  ).toBe(false);
  expect(
    documentPolicy.canGenerateDocumentDownload(null, documentA),
  ).toBe(false);
});
test('allows an explicitly authorized administrator to view a document', () => {
  expect(
    documentPolicy.canViewDocument(admin, documentA),
  ).toBe(true);
});

});

describe(‘Authorization identity normalization’, () => {
test(‘matches numeric and string owner IDs consistently’, () => {
const numericOwnerResource = {
id: ‘application-numeric-owner’,
applicantId: 123,
status: ‘draft’,
};

  const numericActor = {
    id: '123',
    roles: ['user'],
    permissions: [],
  };
  expect(
    applicationPolicy.canViewApplication(
      numericActor,
      numericOwnerResource,
    ),
  ).toBe(true);
});
test('does not treat a missing owner ID as ownership', () => {
  const ownerlessResource = {
    id: 'ownerless-application',
    status: 'draft',
  };
  expect(
    applicationPolicy.canViewApplication(
      applicantA,
      ownerlessResource,
    ),
  ).toBe(false);
});
test('does not grant access when both actor and resource are missing', () => {
  expect(
    applicationPolicy.canViewApplication(null, null),
  ).toBe(false);
  expect(
    admissionPolicy.canViewAdmission(null, null),
  ).toBe(false);
  expect(
    documentPolicy.canViewDocument(null, null),
  ).toBe(false);
});

});
});