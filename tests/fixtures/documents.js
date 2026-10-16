'use strict';
/**
 * MedOrbits -- Document Test Fixtures
 *
 * File: tests/fixtures/documents.js
 *
 * Purpose:
 *   Reusable synthetic document records for unit, integration, API,
 *   application, authorization, upload, and download security tests.
 *
 * Security:
 *   - Uses synthetic metadata only; no real personal documents.
 *   - Does not create files or upload content to storage.
 *   - Storage keys are test identifiers, not proof of file existence.
 *   - Ownership and permissions must be verified by the application.
 *   - Never trust client-supplied owner IDs, verification states, or paths.
 *
 * Usage:
 *   const {
 *     DOCUMENT_STATUSES,
 *     DOCUMENT_TYPES,
 *     createDocument,
 *     createDocumentPayload,
 *     createDocumentSet,
 *     createForeignDocument,
 *     createMassAssignmentPayload,
 *     createDocumentWithStatus,
 *   } = require('../fixtures/documents');
 */
const DOCUMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  DELETED: 'deleted',
});
const DOCUMENT_TYPES = Object.freeze({
  IDENTITY_PROOF: 'identity_proof',
  ADDRESS_PROOF: 'address_proof',
  EDUCATION_CERTIFICATE: 'education_certificate',
  MARKSHEET: 'marksheet',
  TRANSCRIPT: 'transcript',
  ENTRANCE_EXAM_SCORECARD: 'entrance_exam_scorecard',
  PHOTO: 'photo',
  SIGNATURE: 'signature',
  RESUME: 'resume',
  EXPERIENCE_CERTIFICATE: 'experience_certificate',
  INCOME_PROOF: 'income_proof',
  CATEGORY_CERTIFICATE: 'category_certificate',
  MIGRATION_CERTIFICATE: 'migration_certificate',
  TRANSFER_CERTIFICATE: 'transfer_certificate',
  OTHER: 'other',
});
const DOCUMENT_STATUS_VALUES = Object.freeze(
  Object.values(DOCUMENT_STATUSES)
);
const DOCUMENT_TYPE_VALUES = Object.freeze(
  Object.values(DOCUMENT_TYPES)
);
const DEFAULT_DOCUMENT = Object.freeze({
  id: 'document_test_0001',
  documentNumber: 'MO-DOC-TEST-0001',
  ownerId: 'user_test_0001',
  applicationId: 'app_test_0001',
  documentType: DOCUMENT_TYPES.IDENTITY_PROOF,
  status: DOCUMENT_STATUSES.UPLOADED,
  file: Object.freeze({
    fileName: 'identity-proof-test.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    checksum: null,
    storageKey:
      'test-only/documents/document_test_0001/identity-proof-test.pdf',
  }),
  verification: Object.freeze({
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    expiresAt: null,
  }),
  visibility: 'private',
  uploadedAt: '2026-10-01T08:45:00.000Z',
  createdAt: '2026-10-01T08:45:00.000Z',
  updatedAt: '2026-10-01T08:45:00.000Z',
});
/**
 * Recursively clones arrays and plain objects.
 *
 * @param {*} value
 * @returns {*}
 */
function clone(value) {
  if (Array.isArray(value)) {
    return value.map(clone);
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new TypeError(
        'Fixture values must contain plain objects only'
      );
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        clone(item),
      ])
    );
  }
  return value;
}
function assertPlainObject(value, label) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
}
function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}
/**
 * Creates a fresh synthetic document record.
 *
 * Nested file and verification metadata are merged with defaults.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createDocument(overrides = {}) {
  assertPlainObject(overrides, 'Document overrides');
  const document = {
    ...clone(DEFAULT_DOCUMENT),
    ...clone(overrides),
  };
  for (const field of ['file', 'verification']) {
    if (overrides[field] !== undefined) {
      assertPlainObject(
        overrides[field],
        `${field} overrides`
      );
      document[field] = {
        ...clone(DEFAULT_DOCUMENT[field]),
        ...clone(overrides[field]),
      };
    }
  }
  return document;
}
/**
 * Creates a client-submittable document metadata payload.
 *
 * Server-managed properties are deliberately excluded:
 *   id, documentNumber, ownerId, status, verification, storageKey,
 *   uploadedAt, createdAt, updatedAt.
 *
 * The server must derive ownership from authenticated context and generate
 * storage keys itself. The actual upload endpoint should validate file
 * contents, size, MIME type, and authorization independently.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createDocumentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Document payload overrides');
  const payload = {
    applicationId: DEFAULT_DOCUMENT.applicationId,
    documentType: DEFAULT_DOCUMENT.documentType,
    fileName: DEFAULT_DOCUMENT.file.fileName,
    mimeType: DEFAULT_DOCUMENT.file.mimeType,
    sizeBytes: DEFAULT_DOCUMENT.file.sizeBytes,
    ...clone(overrides),
  };
  return payload;
}
/**
 * Creates a collection of documents with unique identifiers and owners.
 *
 * @param {number} [count=3]
 * @param {object} [overrides]
 * @returns {object[]}
 */
function createDocumentSet(count = 3, overrides = {}) {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > 1000
  ) {
    throw new RangeError(
      'Document count must be an integer from 0 to 1000'
    );
  }
  assertPlainObject(overrides, 'Document set overrides');
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    const document = createDocument({
      ...clone(overrides),
      id: `document_test_${sequence}`,
      documentNumber: `MO-DOC-TEST-${sequence}`,
      ownerId: `user_test_${sequence}`,
      applicationId: `app_test_${sequence}`,
      file: {
        fileName: `test-document-${sequence}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1024 + index,
        storageKey:
          `test-only/documents/document_test_${sequence}/test-document-${sequence}.pdf`,
        ...(overrides.file || {}),
      },
    });
    // Preserve unique identity and storage keys even when common overrides
    // are supplied, unless the caller explicitly tests a collision.
    document.id = `document_test_${sequence}`;
    document.documentNumber = `MO-DOC-TEST-${sequence}`;
    document.ownerId = `user_test_${sequence}`;
    document.applicationId = `app_test_${sequence}`;
    if (!overrides.file || overrides.file.storageKey === undefined) {
      document.file.storageKey =
        `test-only/documents/document_test_${sequence}/test-document-${sequence}.pdf`;
    }
    return document;
  });
}
/**
 * Creates a document owned by another synthetic user.
 *
 * Useful for IDOR, cross-user access, and unauthorized-download tests.
 *
 * @param {string} [ownerId]
 * @param {object} [overrides]
 * @returns {object}
 */
function createForeignDocument(
  ownerId = 'user_test_foreign',
  overrides = {}
) {
  assertNonEmptyString(ownerId, 'Foreign document owner ID');
  assertPlainObject(overrides, 'Foreign document overrides');
  const document = createDocument({
    id: 'document_test_foreign_0001',
    documentNumber: 'MO-DOC-TEST-FOREIGN-0001',
    ownerId,
    applicationId: 'app_test_foreign_0001',
    documentType: DOCUMENT_TYPES.IDENTITY_PROOF,
    visibility: 'private',
    file: {
      fileName: 'foreign-document-test.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      checksum: null,
      storageKey:
        'test-only/documents/document_test_foreign_0001/foreign-document-test.pdf',
    },
    ...clone(overrides),
    ownerId,
  });
  return document;
}
/**
 * Creates a deliberately hostile payload for mass-assignment tests.
 *
 * The test should assert that the application rejects or ignores
 * unauthorized server-managed fields.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createMassAssignmentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Mass-assignment overrides');
  return {
    ...createDocumentPayload(),
    id: 'document_test_attacker_controlled',
    documentNumber: 'MO-DOC-ATTACKER-CONTROLLED',
    ownerId: 'user_test_attacker',
    status: DOCUMENT_STATUSES.VERIFIED,
    verifiedBy: 'user_test_attacker',
    verification: {
      verifiedBy: 'user_test_attacker',
      verifiedAt: '2026-10-01T09:00:00.000Z',
      rejectionReason: null,
      expiresAt: null,
    },
    storageKey: '../../private/other-user/document.pdf',
    uploadedAt: '2000-01-01T00:00:00.000Z',
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z',
    isAdmin: true,
    role: 'admin',
    ...clone(overrides),
  };
}
/**
 * Creates a document with a selected workflow status.
 *
 * This factory does not validate whether a status transition is allowed.
 * Transition rules belong in the application service or domain layer.
 *
 * @param {string} status
 * @param {object} [overrides]
 * @returns {object}
 */
function createDocumentWithStatus(status, overrides = {}) {
  if (!DOCUMENT_STATUS_VALUES.includes(status)) {
    throw new RangeError(`Unsupported document status: ${status}`);
  }
  assertPlainObject(overrides, 'Document status overrides');
  return createDocument({
    status,
    ...clone(overrides),
  });
}
/**
 * Creates synthetic verified-document metadata.
 *
 * This fixture does not represent a real verification event.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createVerifiedDocument(overrides = {}) {
  assertPlainObject(overrides, 'Verified document overrides');
  return createDocument({
    status: DOCUMENT_STATUSES.VERIFIED,
    verification: {
      verifiedBy: 'user_test_reviewer',
      verifiedAt: '2026-10-02T10:00:00.000Z',
      rejectionReason: null,
      expiresAt: null,
    },
    ...clone(overrides),
    verification: {
      verifiedBy: 'user_test_reviewer',
      verifiedAt: '2026-10-02T10:00:00.000Z',
      rejectionReason: null,
      expiresAt: null,
      ...(overrides.verification || {}),
    },
  });
}
/**
 * Creates synthetic rejected-document metadata.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createRejectedDocument(overrides = {}) {
  assertPlainObject(overrides, 'Rejected document overrides');
  return createDocument({
    status: DOCUMENT_STATUSES.REJECTED,
    verification: {
      verifiedBy: 'user_test_reviewer',
      verifiedAt: '2026-10-02T10:00:00.000Z',
      rejectionReason: 'Test rejection reason',
      expiresAt: null,
    },
    ...clone(overrides),
    verification: {
      verifiedBy: 'user_test_reviewer',
      verifiedAt: '2026-10-02T10:00:00.000Z',
      rejectionReason: 'Test rejection reason',
      expiresAt: null,
      ...(overrides.verification || {}),
    },
  });
}
/**
 * Creates a synthetic upload request descriptor.
 *
 * This is metadata only; it does not create a multipart request or a file.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createUploadDescriptor(overrides = {}) {
  assertPlainObject(overrides, 'Upload descriptor overrides');
  return {
    originalName: 'test-upload.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    documentType: DOCUMENT_TYPES.IDENTITY_PROOF,
    applicationId: 'app_test_0001',
    ...clone(overrides),
  };
}
/**
 * Creates a synthetic download authorization scenario.
 *
 * Use this as test input for a real download route. It does not authorize
 * the download or prove that the referenced object exists.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createDownloadScenario(overrides = {}) {
  assertPlainObject(overrides, 'Download scenario overrides');
  return {
    requesterId: 'user_test_0001',
    document: createDocument(),
    expectedAllowed: true,
    ...clone(overrides),
  };
}
module.exports = {
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  DOCUMENT_STATUS_VALUES,
  DOCUMENT_TYPE_VALUES,
  DEFAULT_DOCUMENT,
  createDocument,
  createDocumentPayload,
  createDocumentSet,
  createForeignDocument,
  createMassAssignmentPayload,
  createDocumentWithStatus,
  createVerifiedDocument,
  createRejectedDocument,
  createUploadDescriptor,
  createDownloadScenario,
};