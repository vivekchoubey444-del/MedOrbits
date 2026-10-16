'use strict';
/**
 * MedOrbits -- Candidate Test Fixtures
 *
 * File: tests/fixtures/candidates.js
 *
 * Purpose:
 *   Reusable synthetic candidate data for unit, integration, API,
 *   recruitment, authorization, and security tests.
 *
 * Security:
 *   - Uses synthetic data only.
 *   - Does not include real candidate records or production credentials.
 *   - Separates client-submittable fields from server-managed fields.
 *   - Does not imply that candidate ownership or permissions are valid.
 *
 * Usage:
 *   const {
 *     CANDIDATE_STATUSES,
 *     CANDIDATE_TYPES,
 *     createCandidate,
 *     createCandidatePayload,
 *     createCandidateSet,
 *     createForeignCandidate,
 *     createMassAssignmentPayload,
 *   } = require('../fixtures/candidates');
 */
const CANDIDATE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  UNDER_REVIEW: 'under_review',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  SELECTED: 'selected',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  HIRED: 'hired',
});
const CANDIDATE_TYPES = Object.freeze({
  STUDENT: 'student',
  GRADUATE: 'graduate',
  PROFESSIONAL: 'professional',
  HEALTHCARE: 'healthcare',
  OTHER: 'other',
});
const CANDIDATE_STATUS_VALUES = Object.freeze(
  Object.values(CANDIDATE_STATUSES)
);
const CANDIDATE_TYPE_VALUES = Object.freeze(
  Object.values(CANDIDATE_TYPES)
);
const DEFAULT_CANDIDATE = Object.freeze({
  id: 'candidate_test_0001',
  candidateNumber: 'MO-CAND-TEST-0001',
  userId: 'user_test_0001',
  status: CANDIDATE_STATUSES.ACTIVE,
  candidateType: CANDIDATE_TYPES.GRADUATE,
  profile: Object.freeze({
    firstName: 'Test',
    lastName: 'Candidate',
    email: 'candidate1@example.test',
    phone: '+910000000001',
    location: Object.freeze({
      city: 'Noida',
      state: 'Uttar Pradesh',
      countryCode: 'IN',
    }),
  }),
  professional: Object.freeze({
    headline: 'Test Candidate',
    summary: 'Synthetic candidate profile for automated testing.',
    skills: Object.freeze(['communication', 'research']),
    experienceYears: 0,
    highestQualification: 'bachelor',
    preferredEmploymentTypes: Object.freeze(['full_time']),
    preferredLocations: Object.freeze(['Noida']),
  }),
  education: Object.freeze([]),
  experience: Object.freeze([]),
  certifications: Object.freeze([]),
  resume: null,
  consent: Object.freeze({
    dataProcessing: true,
    recruitmentContact: true,
    recordedAt: '2026-10-01T09:00:00.000Z',
  }),
  createdAt: '2026-10-01T08:30:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
});
/**
 * Recursively copies plain objects and arrays.
 *
 * The fixtures use JSON-compatible data. This helper prevents nested
 * fixture mutations from leaking into later tests.
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
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Fixture values must contain plain objects only');
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)])
    );
  }
  return value;
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
function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}
/**
 * Creates a fresh candidate record.
 *
 * Overrides are applied at the top level. Nested profile, professional,
 * consent, education, experience, and certification fields are copied
 * independently when supplied.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createCandidate(overrides = {}) {
  assertPlainObject(overrides, 'Candidate overrides');
  const candidate = {
    ...clone(DEFAULT_CANDIDATE),
    ...clone(overrides),
  };
  for (const field of [
    'profile',
    'professional',
    'consent',
  ]) {
    if (overrides[field] !== undefined) {
      assertPlainObject(overrides[field], `${field} overrides`);
      candidate[field] = {
        ...clone(DEFAULT_CANDIDATE[field]),
        ...clone(overrides[field]),
      };
    }
  }
  for (const field of [
    'education',
    'experience',
    'certifications',
  ]) {
    if (overrides[field] !== undefined) {
      if (!Array.isArray(overrides[field])) {
        throw new TypeError(`${field} must be an array`);
      }
      candidate[field] = clone(overrides[field]);
    }
  }
  if (
    overrides.professional &&
    overrides.professional.skills !== undefined &&
    !Array.isArray(overrides.professional.skills)
  ) {
    throw new TypeError('professional.skills must be an array');
  }
  if (
    overrides.professional &&
    overrides.professional.preferredLocations !== undefined &&
    !Array.isArray(overrides.professional.preferredLocations)
  ) {
    throw new TypeError('professional.preferredLocations must be an array');
  }
  if (
    overrides.professional &&
    overrides.professional.preferredEmploymentTypes !== undefined &&
    !Array.isArray(overrides.professional.preferredEmploymentTypes)
  ) {
    throw new TypeError(
      'professional.preferredEmploymentTypes must be an array'
    );
  }
  return candidate;
}
/**
 * Creates a client-submittable candidate profile.
 *
 * Server-managed fields are intentionally excluded:
 *   id, candidateNumber, userId, status, createdAt, updatedAt.
 *
 * The application must derive identity from authenticated context and
 * validate all submitted properties using its own schema.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createCandidatePayload(overrides = {}) {
  assertPlainObject(overrides, 'Candidate payload overrides');
  const payload = {
    candidateType: DEFAULT_CANDIDATE.candidateType,
    profile: clone(DEFAULT_CANDIDATE.profile),
    professional: clone(DEFAULT_CANDIDATE.professional),
    education: [],
    experience: [],
    certifications: [],
    resume: null,
    consent: clone(DEFAULT_CANDIDATE.consent),
    ...clone(overrides),
  };
  for (const field of ['profile', 'professional', 'consent']) {
    if (overrides[field] !== undefined) {
      assertPlainObject(overrides[field], `${field} payload overrides`);
      payload[field] = {
        ...clone(DEFAULT_CANDIDATE[field]),
        ...clone(overrides[field]),
      };
    }
  }
  for (const field of ['education', 'experience', 'certifications']) {
    if (overrides[field] !== undefined && !Array.isArray(overrides[field])) {
      throw new TypeError(`${field} must be an array`);
    }
  }
  return payload;
}
/**
 * Creates a collection of candidates with distinct synthetic identities.
 *
 * @param {number} [count=3]
 * @param {object} [overrides]
 * @returns {object[]}
 */
function createCandidateSet(count = 3, overrides = {}) {
  if (!Number.isInteger(count) || count < 0 || count > 1000) {
    throw new RangeError('Candidate count must be an integer from 0 to 1000');
  }
  assertPlainObject(overrides, 'Candidate set overrides');
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    const candidate = createCandidate({
      id: `candidate_test_${sequence}`,
      candidateNumber: `MO-CAND-TEST-${sequence}`,
      userId: `user_test_${sequence}`,
      profile: {
        firstName: 'Test',
        lastName: `Candidate${index + 1}`,
        email: `candidate${index + 1}@example.test`,
        phone: `+91000000${String(index + 1).padStart(4, '0')}`,
      },
      ...clone(overrides),
    });
    // Preserve unique fixture identities even when common overrides are used.
    candidate.id = `candidate_test_${sequence}`;
    candidate.candidateNumber = `MO-CAND-TEST-${sequence}`;
    candidate.userId = `user_test_${sequence}`;
    if (!overrides.profile || overrides.profile.email === undefined) {
      candidate.profile.email = `candidate${index + 1}@example.test`;
    }
    if (!overrides.profile || overrides.profile.lastName === undefined) {
      candidate.profile.lastName = `Candidate${index + 1}`;
    }
    return candidate;
  });
}
/**
 * Creates a candidate owned by a different synthetic user.
 *
 * Useful for testing ownership enforcement and insecure direct object
 * reference (IDOR) protections.
 *
 * @param {string} [ownerId]
 * @param {object} [overrides]
 * @returns {object}
 */
function createForeignCandidate(
  ownerId = 'user_test_foreign',
  overrides = {}
) {
  assertNonEmptyString(ownerId, 'Foreign candidate owner ID');
  assertPlainObject(overrides, 'Foreign candidate overrides');
  return createCandidate({
    id: 'candidate_test_foreign_0001',
    candidateNumber: 'MO-CAND-TEST-FOREIGN-0001',
    userId: ownerId,
    profile: {
      firstName: 'Foreign',
      lastName: 'Candidate',
      email: 'foreign.candidate@example.test',
      phone: '+910000000099',
    },
    ...clone(overrides),
    userId: ownerId,
  });
}
/**
 * Creates a deliberately hostile client payload for mass-assignment tests.
 *
 * Tests should verify that the server rejects or ignores unauthorized
 * server-managed properties.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createMassAssignmentPayload(overrides = {}) {
  assertPlainObject(overrides, 'Mass-assignment overrides');
  return {
    ...createCandidatePayload(),
    id: 'candidate_test_attacker_controlled',
    candidateNumber: 'MO-CAND-ATTACKER-CONTROLLED',
    userId: 'user_test_attacker',
    status: CANDIDATE_STATUSES.HIRED,
    role: 'admin',
    isAdmin: true,
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z',
    ...clone(overrides),
  };
}
/**
 * Creates synthetic education history.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createEducationRecord(overrides = {}) {
  assertPlainObject(overrides, 'Education overrides');
  return {
    id: 'education_test_0001',
    institutionName: 'Example Test Institute',
    qualification: 'bachelor',
    fieldOfStudy: 'Computer Science',
    startYear: 2020,
    endYear: 2024,
    currentlyStudying: false,
    ...clone(overrides),
  };
}
/**
 * Creates synthetic employment history.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createExperienceRecord(overrides = {}) {
  assertPlainObject(overrides, 'Experience overrides');
  return {
    id: 'experience_test_0001',
    employerName: 'Example Test Employer',
    jobTitle: 'Junior Analyst',
    employmentType: 'full_time',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    currentlyWorking: false,
    description: 'Synthetic employment record for automated testing.',
    ...clone(overrides),
  };
}
/**
 * Creates a synthetic certification record.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createCertificationRecord(overrides = {}) {
  assertPlainObject(overrides, 'Certification overrides');
  return {
    id: 'certification_test_0001',
    name: 'Example Test Certification',
    issuingOrganization: 'Example Test Organization',
    issueDate: '2025-01-01',
    expiryDate: null,
    credentialId: 'TEST-CREDENTIAL-0001',
    credentialUrl: null,
    ...clone(overrides),
  };
}
/**
 * Creates synthetic resume metadata.
 *
 * This does not create a real file or authorize downloads.
 * Tests involving file access must separately validate ownership,
 * storage keys, permissions, and download authorization.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function createResumeMetadata(overrides = {}) {
  assertPlainObject(overrides, 'Resume overrides');
  return {
    id: 'resume_test_0001',
    fileName: 'candidate-resume-test.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    storageKey: 'test-only/candidates/candidate_test_0001/resume.pdf',
    uploadedAt: '2026-10-01T08:45:00.000Z',
    ...clone(overrides),
  };
}
/**
 * Creates a candidate with a selected recruitment status.
 *
 * This helper does not validate whether a workflow transition is permitted.
 * Transition rules belong in the relevant service or domain layer.
 *
 * @param {string} status
 * @param {object} [overrides]
 * @returns {object}
 */
function createCandidateWithStatus(status, overrides = {}) {
  if (!CANDIDATE_STATUS_VALUES.includes(status)) {
    throw new RangeError(`Unsupported candidate status: ${status}`);
  }
  assertPlainObject(overrides, 'Candidate status overrides');
  return createCandidate({
    status,
    ...clone(overrides),
  });
}
module.exports = {
  CANDIDATE_STATUSES,
  CANDIDATE_TYPES,
  CANDIDATE_STATUS_VALUES,
  CANDIDATE_TYPE_VALUES,
  DEFAULT_CANDIDATE,
  createCandidate,
  createCandidatePayload,
  createCandidateSet,
  createForeignCandidate,
  createMassAssignmentPayload,
  createEducationRecord,
  createExperienceRecord,
  createCertificationRecord,
  createResumeMetadata,
  createCandidateWithStatus,
};