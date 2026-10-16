'use strict';
/**
 * MedOrbits -- Application Test Fixtures
 *
 * File: tests/fixtures/applications.js
 *
 * Purpose:
 *   Provide reusable, deterministic application records and payloads for
 *   unit, integration, authorization, and security tests.
 *
 * Security:
 *   - Uses synthetic test data only.
 *   - Does not contain production credentials or real student information.
 *   - Does not assume that client-supplied ownership or status fields are trusted.
 *
 * Usage:
 *   const {
 *     createApplication,
 *     createApplicationPayload,
 *     createApplicationSet,
 *     APPLICATION_STATUSES,
 *   } = require('../fixtures/applications');
 */
const APPLICATION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  DOCUMENTS_REQUIRED: 'documents_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
});
const APPLICATION_TYPES = Object.freeze({
  MBBS: 'mbbs',
  BDS: 'bds',
  BAMS: 'bams',
  BUMS: 'bums',
  PARAMEDICAL: 'paramedical',
  OTHER: 'other',
});
const APPLICATION_STATUS_VALUES = Object.freeze(
  Object.values(APPLICATION_STATUSES)
);
const APPLICATION_TYPE_VALUES = Object.freeze(
  Object.values(APPLICATION_TYPES)
);
const DEFAULT_APPLICATION = Object.freeze({
  id: 'app_test_0001',
  applicationNumber: 'MO-TEST-0001',
  userId: 'user_test_0001',
  courseId: 'course_test_mbbs',
  institutionId: 'institution_test_0001',
  applicationType: APPLICATION_TYPES.MBBS,
  status: APPLICATION_STATUSES.SUBMITTED,
  academicYear: '2026-2027',
  applicant: Object.freeze({
    firstName: 'Test',
    lastName: 'Applicant',
    email: 'applicant1@example.test',
    phone: '+910000000001',
  }),
  documents: Object.freeze([]),
  notes: null,
  submittedAt: '2026-10-01T09:00:00.000Z',
  reviewedAt: null,
  createdAt: '2026-10-01T08:30:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
});
/**
 * Creates a fresh application record.
 *
 * Overrides are shallowly applied, except applicant and documents, which
 * are independently copied to avoid accidental mutation of shared fixtures.
 *
 * This is a test-data factory, not a production validation or authorization
 * boundary.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createApplication(overrides = {}) {
  assertPlainObject(overrides, 'Application overrides');
  const application = {
    ...DEFAULT_APPLICATION,
    applicant: {
      ...DEFAULT_APPLICATION.applicant,
    },
    documents: [],
    ...overrides,
  };
  if (overrides.applicant !== undefined) {
    assertPlainObject(overrides.applicant, 'Applicant overrides');
    application.applicant = {
      ...DEFAULT_APPLICATION.applicant,
      ...overrides.applicant,
    };
  }
  if (overrides.documents !== undefined) {
    if (!Array.isArray(overrides.documents)) {
      throw new TypeError('Application documents must be an array');
    }
    application.documents = overrides.documents.map((document) => {
      if (document === null || typeof document !== 'object' || Array.isArray(document)) {
        throw new TypeError('Each application document must be an object');
      }
      return { ...document };
    });
  }
  return application;
}
/**
 * Creates a client-submittable application payload.
 *
 * Server-managed fields are intentionally excluded:
 *   id, applicationNumber, userId, status, reviewedAt, createdAt, updatedAt.
 *
 * The authenticated user identity and workflow status should be assigned
 * by the server, not trusted from a request body.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createApplicationPayload(overrides = {}) {
  assertPlainObject(overrides, 'Application payload overrides');
  const payload = {
    courseId: DEFAULT_APPLICATION.courseId,
    institutionId: DEFAULT_APPLICATION.institutionId,
    applicationType: DEFAULT_APPLICATION.applicationType,
    academicYear: DEFAULT_APPLICATION.academicYear,
    applicant: {
      ...DEFAULT_APPLICATION.applicant,
    },
    documents: [],
    ...overrides,
  };
  if (overrides.applicant !== undefined) {
    assertPlainObject(overrides.applicant, 'Applicant payload overrides');
    payload.applicant = {
      ...DEFAULT_APPLICATION.applicant,
      ...overrides.applicant,
    };
  }
  if (overrides.documents !== undefined) {
    if (!Array.isArray(overrides.documents)) {
      throw new TypeError('Application payload documents must be an array');
    }
    payload.documents = overrides.documents.map((document) => {
      if (document === null || typeof document !== 'object' || Array.isArray(document)) {
        throw new TypeError('Each application document must be an object');
      }
      return { ...document };
    });
  }
  return payload;
}
/**
 * Creates several applications with unique IDs, application numbers,
 * user IDs, and email addresses.
 *
 * @param {number} [count=3]
 * @param {object} [overrides]
 * @returns {object[]}
 */
function createApplicationSet(count = 3, overrides = {}) {
  if (!Number.isInteger(count) || count < 0 || count > 1000) {
    throw new RangeError('Application count must be an integer from 0 to 1000');
  }
  assertPlainObject(overrides, 'Application set overrides');
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    return createApplication({
      id: `app_test_${sequence}`,
      applicationNumber: `MO-TEST-${sequence}`,
      userId: `user_test_${sequence}`,
      applicant: {
        firstName: 'Test',
        lastName: `Applicant${index + 1}`,
        email: `applicant${index + 1}@example.test`,
        phone: `+91000000${String(index + 1).padStart(4, '0')}`,
      },
      ...overrides,
      ...(overrides.applicant
        ? {
            applicant: {
              firstName: 'Test',
              lastName: `Applicant${index + 1}`,
              email: `applicant${index + 1}@example.test`,
              phone: `+91000000${String(index + 1).padStart(4, '0')}`,
              ...overrides.applicant,
            },
          }
        : {}),
    });
  });
}
/**
 * Creates an application owned by a different synthetic user.
 * Useful for IDOR and authorization tests.
 *
 * @param {string} [ownerId]
 * @param {object} [overrides]
 * @returns {object}
 */
function createForeignApplication(
  ownerId = 'user_test_other',
  overrides = {}
) {
  if (typeof ownerId !== 'string' || ownerId.trim() === '') {
    throw new TypeError('Foreign application owner ID must be a non-empty string');
  }
  assertPlainObject(overrides, 'Foreign application overrides');
  return createApplication({
    id: 'app_test_foreign_0001',
    applicationNumber: 'MO-TEST-FOREIGN-0001',
    userId: ownerId,
    applicant: {
      firstName: 'Foreign',
      lastName: 'Applicant',
      email: 'foreign.applicant@example.test',
      phone: '+910000000099',
    },
    ...overrides,
  });
}
/**
 * Creates a deliberately hostile client payload for mass-assignment tests.
 *
 * Tests should verify that the server ignores or rejects server-managed
 * fields rather than persisting these values.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createMassAssignmentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Mass-assignment overrides');
  return {
    ...createApplicationPayload(),
    id: 'app_test_attacker_controlled',
    applicationNumber: 'MO-ATTACKER-CONTROLLED',
    userId: 'user_test_attacker',
    status: APPLICATION_STATUSES.APPROVED,
    reviewedAt: '2026-10-01T09:30:00.000Z',
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z',
    isAdmin: true,
    role: 'admin',
    ...overrides,
  };
}
/**
 * Creates a minimal synthetic document reference.
 *
 * This fixture represents metadata only. It does not create a file,
 * establish ownership, or authorize access to a download endpoint.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createApplicationDocument(overrides = {}) {
  assertPlainObject(overrides, 'Document overrides');
  return {
    id: 'document_test_0001',
    applicationId: DEFAULT_APPLICATION.id,
    ownerId: DEFAULT_APPLICATION.userId,
    documentType: 'identity_proof',
    fileName: 'identity-proof-test.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storageKey: 'test-only/applications/app_test_0001/identity-proof-test.pdf',
    status: 'uploaded',
    uploadedAt: '2026-10-01T08:45:00.000Z',
    ...overrides,
  };
}
/**
 * Creates a copy of an application with a selected workflow status.
 *
 * This helper does not validate whether the transition is permitted.
 * Transition rules belong in the application service or domain layer.
 *
 * @param {string} status
 * @param {object} [overrides]
 * @returns {object}
 */
function createApplicationWithStatus(status, overrides = {}) {
  if (!APPLICATION_STATUS_VALUES.includes(status)) {
    throw new RangeError(`Unsupported application status: ${status}`);
  }
  assertPlainObject(overrides, 'Status overrides');
  return createApplication({
    status,
    ...overrides,
  });
}
function assertPlainObject(value, label) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
}
module.exports = {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  APPLICATION_STATUS_VALUES,
  APPLICATION_TYPE_VALUES,
  DEFAULT_APPLICATION,
  createApplication,
  createApplicationPayload,
  createApplicationSet,
  createForeignApplication,
  createMassAssignmentPayload,
  createApplicationDocument,
  createApplicationWithStatus,
};