'use strict';
/**
 * MedOrbits -- Employer Test Fixtures
 *
 * File: tests/fixtures/employers.js
 *
 * Purpose:
 *   Provide reusable synthetic employer records for unit, integration,
 *   recruitment, API, authentication, authorization, and security tests.
 *
 * Security:
 *   - Uses synthetic organization data only.
 *   - Does not represent verified real-world employers.
 *   - Separates client-submittable fields from server-managed properties.
 *   - Does not imply that a user is authorized to act for an employer.
 *   - Verification, membership, and role assignments must be validated
 *     by the application's trusted server-side logic.
 *
 * Usage:
 *   const {
 *     EMPLOYER_STATUSES,
 *     EMPLOYER_TYPES,
 *     createEmployer,
 *     createEmployerPayload,
 *     createEmployerSet,
 *     createForeignEmployer,
 *     createMassAssignmentPayload,
 *     createEmployerWithStatus,
 *   } = require('../fixtures/employers');
 */
const EMPLOYER_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
  INACTIVE: 'inactive',
});
const EMPLOYER_TYPES = Object.freeze({
  HOSPITAL: 'hospital',
  CLINIC: 'clinic',
  HEALTHCARE_PROVIDER: 'healthcare_provider',
  EDUCATIONAL_INSTITUTION: 'educational_institution',
  RECRUITMENT_AGENCY: 'recruitment_agency',
  COMPANY: 'company',
  NON_PROFIT: 'non_profit',
  GOVERNMENT: 'government',
  OTHER: 'other',
});
const EMPLOYER_STATUS_VALUES = Object.freeze(
  Object.values(EMPLOYER_STATUSES)
);
const EMPLOYER_TYPE_VALUES = Object.freeze(
  Object.values(EMPLOYER_TYPES)
);
const DEFAULT_EMPLOYER = Object.freeze({
  id: 'employer_test_0001',
  employerNumber: 'MO-EMP-TEST-0001',
  ownerUserId: 'user_test_employer_0001',
  organization: Object.freeze({
    name: 'Example Test Healthcare Organization',
    slug: 'example-test-healthcare-organization',
    legalName: 'Example Test Healthcare Organization Private Limited',
    employerType: EMPLOYER_TYPES.HEALTHCARE_PROVIDER,
    description: 'Synthetic employer profile for automated testing.',
    website: null,
    industry: 'healthcare',
    companySize: '11-50',
    yearEstablished: null,
  }),
  contact: Object.freeze({
    contactName: 'Test Employer Contact',
    email: 'employer1@example.test',
    phone: '+910000000101',
    jobTitle: 'Recruitment Manager',
  }),
  address: Object.freeze({
    addressLine1: '100 Example Test Road',
    addressLine2: null,
    city: 'Noida',
    state: 'Uttar Pradesh',
    postalCode: '000000',
    countryCode: 'IN',
  }),
  verification: Object.freeze({
    status: 'pending',
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    documents: Object.freeze([]),
  }),
  status: EMPLOYER_STATUSES.PENDING_VERIFICATION,
  isPublished: false,
  createdAt: '2026-10-01T08:30:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
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
 * Creates a fresh synthetic employer record.
 *
 * Nested organization, contact, address, and verification objects are
 * merged with defaults when overridden.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createEmployer(overrides = {}) {
  assertPlainObject(overrides, 'Employer overrides');
  const employer = {
    ...clone(DEFAULT_EMPLOYER),
    ...clone(overrides),
  };
  for (const field of [
    'organization',
    'contact',
    'address',
    'verification',
  ]) {
    if (overrides[field] !== undefined) {
      assertPlainObject(
        overrides[field],
        `${field} overrides`
      );
      employer[field] = {
        ...clone(DEFAULT_EMPLOYER[field]),
        ...clone(overrides[field]),
      };
    }
  }
  if (
    overrides.verification &&
    overrides.verification.documents !== undefined
  ) {
    if (!Array.isArray(overrides.verification.documents)) {
      throw new TypeError(
        'verification.documents must be an array'
      );
    }
    employer.verification.documents = clone(
      overrides.verification.documents
    );
  }
  return employer;
}
/**
 * Creates a client-submittable employer registration payload.
 *
 * Server-managed fields are intentionally excluded:
 *   id, employerNumber, ownerUserId, status, verification,
 *   isPublished, createdAt, updatedAt.
 *
 * The server should derive ownerUserId from authenticated context.
 * Verification and publication decisions must be made by trusted
 * server-side workflows.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createEmployerPayload(overrides = {}) {
  assertPlainObject(overrides, 'Employer payload overrides');
  const payload = {
    organization: {
      ...clone(DEFAULT_EMPLOYER.organization),
    },
    contact: {
      ...clone(DEFAULT_EMPLOYER.contact),
    },
    address: {
      ...clone(DEFAULT_EMPLOYER.address),
    },
    ...clone(overrides),
  };
  for (const field of [
    'organization',
    'contact',
    'address',
  ]) {
    if (overrides[field] !== undefined) {
      assertPlainObject(
        overrides[field],
        `${field} payload overrides`
      );
      payload[field] = {
        ...clone(DEFAULT_EMPLOYER[field]),
        ...clone(overrides[field]),
      };
    }
  }
  return payload;
}
/**
 * Creates several employer records with distinct synthetic identities.
 *
 * @param {number} [count=3]
 * @param {object} [overrides]
 * @returns {object[]}
 */
function createEmployerSet(count = 3, overrides = {}) {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > 1000
  ) {
    throw new RangeError(
      'Employer count must be an integer from 0 to 1000'
    );
  }
  assertPlainObject(overrides, 'Employer set overrides');
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    const employer = createEmployer({
      ...clone(overrides),
      id: `employer_test_${sequence}`,
      employerNumber: `MO-EMP-TEST-${sequence}`,
      ownerUserId: `user_test_employer_${sequence}`,
      organization: {
        name: `Example Test Employer ${index + 1}`,
        slug: `example-test-employer-${sequence}`,
        legalName: `Example Test Employer ${index + 1} Limited`,
        ...clone(overrides.organization || {}),
      },
      contact: {
        contactName: `Test Employer Contact ${index + 1}`,
        email: `employer${index + 1}@example.test`,
        phone: `+91000000${String(index + 101).padStart(4, '0')}`,
        jobTitle: 'Recruitment Manager',
        ...clone(overrides.contact || {}),
      },
    });
    // Keep generated identities unique when common overrides are supplied.
    employer.id = `employer_test_${sequence}`;
    employer.employerNumber = `MO-EMP-TEST-${sequence}`;
    employer.ownerUserId = `user_test_employer_${sequence}`;
    if (!overrides.organization || overrides.organization.name === undefined) {
      employer.organization.name = `Example Test Employer ${index + 1}`;
    }
    if (!overrides.organization || overrides.organization.slug === undefined) {
      employer.organization.slug = `example-test-employer-${sequence}`;
    }
    if (!overrides.contact || overrides.contact.email === undefined) {
      employer.contact.email = `employer${index + 1}@example.test`;
    }
    return employer;
  });
}
/**
 * Creates an employer owned by a different synthetic user.
 *
 * Useful for testing cross-tenant access restrictions and IDOR protections.
 *
 * @param {string} [ownerUserId]
 * @param {object} [overrides]
 * @returns {object}
 */
function createForeignEmployer(
  ownerUserId = 'user_test_foreign_employer',
  overrides = {}
) {
  assertNonEmptyString(ownerUserId, 'Foreign employer owner ID');
  assertPlainObject(overrides, 'Foreign employer overrides');
  return createEmployer({
    id: 'employer_test_foreign_0001',
    employerNumber: 'MO-EMP-TEST-FOREIGN-0001',
    ownerUserId,
    organization: {
      name: 'Example Foreign Test Employer',
      slug: 'example-foreign-test-employer',
      legalName: 'Example Foreign Test Employer Limited',
      employerType: EMPLOYER_TYPES.COMPANY,
      description: 'Synthetic foreign employer for security tests.',
      website: null,
      industry: 'healthcare',
      companySize: '1-10',
      yearEstablished: null,
    },
    contact: {
      contactName: 'Foreign Test Contact',
      email: 'foreign.employer@example.test',
      phone: '+910000000199',
      jobTitle: 'Recruitment Manager',
    },
    ...clone(overrides),
    ownerUserId,
  });
}
/**
 * Creates a deliberately hostile payload for mass-assignment tests.
 *
 * Tests should assert that unauthorized fields are rejected or ignored.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createMassAssignmentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Mass-assignment overrides');
  return {
    ...createEmployerPayload(),
    id: 'employer_test_attacker_controlled',
    employerNumber: 'MO-EMP-ATTACKER-CONTROLLED',
    ownerUserId: 'user_test_attacker',
    status: EMPLOYER_STATUSES.ACTIVE,
    isPublished: true,
    isAdmin: true,
    role: 'admin',
    verification: {
      status: 'verified',
      verifiedBy: 'user_test_attacker',
      verifiedAt: '2026-10-01T09:00:00.000Z',
      rejectionReason: null,
      documents: [],
    },
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z',
    ...clone(overrides),
  };
}
/**
 * Creates an employer with a selected account status.
 *
 * This factory does not validate permitted status transitions.
 *
 * @param {string} status
 * @param {object} [overrides]
 * @returns {object}
 */
function createEmployerWithStatus(status, overrides = {}) {
  if (!EMPLOYER_STATUS_VALUES.includes(status)) {
    throw new RangeError(`Unsupported employer status: ${status}`);
  }
  assertPlainObject(overrides, 'Employer status overrides');
  return createEmployer({
    status,
    ...clone(overrides),
  });
}
/**
 * Creates a synthetic employer with active status and verified metadata.
 *
 * This fixture represents a test state only; it is not evidence of real
 * employer verification.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createVerifiedEmployer(overrides = {}) {
  assertPlainObject(overrides, 'Verified employer overrides');
  return createEmployer({
    status: EMPLOYER_STATUSES.ACTIVE,
    isPublished: true,
    verification: {
      status: 'verified',
      verifiedBy: 'user_test_reviewer',
      verifiedAt: '2026-10-02T10:00:00.000Z',
      rejectionReason: null,
      documents: [],
    },
    ...clone(overrides),
    verification: {
      status: 'verified',
      verifiedBy: 'user_test_reviewer',
      verifiedAt: '2026-10-02T10:00:00.000Z',
      rejectionReason: null,
      documents: [],
      ...(overrides.verification || {}),
    },
  });
}
/**
 * Creates a synthetic suspended employer.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createSuspendedEmployer(overrides = {}) {
  assertPlainObject(overrides, 'Suspended employer overrides');
  return createEmployer({
    id: 'employer_test_suspended_0001',
    employerNumber: 'MO-EMP-TEST-SUSPENDED-0001',
    status: EMPLOYER_STATUSES.SUSPENDED,
    isPublished: false,
    ...clone(overrides),
  });
}
/**
 * Creates synthetic employer membership metadata.
 *
 * This is test data only. The application must enforce membership and
 * role assignments using trusted server-side records.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createEmployerMembership(overrides = {}) {
  assertPlainObject(overrides, 'Employer membership overrides');
  return {
    id: 'membership_test_0001',
    employerId: DEFAULT_EMPLOYER.id,
    userId: DEFAULT_EMPLOYER.ownerUserId,
    role: 'recruiter',
    status: 'active',
    invitedBy: null,
    joinedAt: '2026-10-01T09:00:00.000Z',
    ...clone(overrides),
  };
}
/**
 * Creates synthetic employer verification metadata.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createEmployerVerification(overrides = {}) {
  assertPlainObject(overrides, 'Employer verification overrides');
  return {
    status: 'pending',
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    documents: [],
    ...clone(overrides),
  };
}
module.exports = {
  EMPLOYER_STATUSES,
  EMPLOYER_TYPES,
  EMPLOYER_STATUS_VALUES,
  EMPLOYER_TYPE_VALUES,
  DEFAULT_EMPLOYER,
  createEmployer,
  createEmployerPayload,
  createEmployerSet,
  createForeignEmployer,
  createMassAssignmentPayload,
  createEmployerWithStatus,
  createVerifiedEmployer,
  createSuspendedEmployer,
  createEmployerMembership,
  createEmployerVerification,
};