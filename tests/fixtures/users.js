'use strict';
/**
 * MedOrbits -- User Test Fixtures
 *
 * File: tests/fixtures/users.js
 *
 * Purpose:
 * - Provide deterministic synthetic users for automated tests.
 * - Support authentication and authorization test scenarios.
 * - Support role-based access control (RBAC) and IDOR tests.
 * - Support mass-assignment and privilege-escalation tests.
 * - Support account-status, verification, and ownership scenarios.
 *
 * Security notes:
 * - All identities and email addresses are synthetic.
 * - Passwords are test-only values and must never be used in production.
 * - Passwords are not hashed by this fixture.
 * - These fixtures do not authenticate users or persist records.
 * - Adapt role and status values to the application's actual enums.
 */
const USER_ROLES = Object.freeze({
  GUEST: 'guest',
  STUDENT: 'student',
  CANDIDATE: 'candidate',
  COUNSELLOR: 'counsellor',
  EMPLOYER: 'employer',
  RECRUITER: 'recruiter',
  SUPPORT: 'support',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
});
const USER_STATUSES = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  LOCKED: 'locked',
  DELETED: 'deleted',
});
const VERIFICATION_STATUSES = Object.freeze({
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
});
const AUTH_PROVIDERS = Object.freeze({
  LOCAL: 'local',
  GOOGLE: 'google',
});
const DEFAULT_PASSWORD = 'TestOnly!Password123';
const DEFAULT_USER = Object.freeze({
  id: 'usr_test_001',
  firstName: 'Test',
  lastName: 'Student',
  email: 'student001@example.test',
  password: DEFAULT_PASSWORD,
  role: USER_ROLES.STUDENT,
  status: USER_STATUSES.ACTIVE,
  emailVerified: true,
  emailVerificationStatus: VERIFICATION_STATUSES.VERIFIED,
  phone: null,
  phoneVerified: false,
  authProvider: AUTH_PROVIDERS.LOCAL,
  failedLoginAttempts: 0,
  mfaEnabled: false,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
});
/**
 * Create a synthetic user.
 *
 * Overrides are applied last. Use this only with trusted test data.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createUser(overrides = {}) {
  return {
    ...DEFAULT_USER,
    ...overrides,
  };
}
/**
 * Create a user registration payload.
 *
 * Deliberately excludes privileged properties such as:
 * - id
 * - role
 * - status
 * - emailVerified
 * - emailVerificationStatus
 * - failedLoginAttempts
 * - mfaEnabled
 *
 * @param {object} overrides
 * @returns {object}
 */
function createUserRegistrationPayload(overrides = {}) {
  return {
    firstName: 'Test',
    lastName: 'Student',
    email: 'new.student@example.test',
    password: DEFAULT_PASSWORD,
    confirmPassword: DEFAULT_PASSWORD,
    ...overrides,
  };
}
/**
 * Create a login payload.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createLoginPayload(overrides = {}) {
  return {
    email: 'student001@example.test',
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}
/**
 * Create a password-change payload.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createPasswordChangePayload(overrides = {}) {
  return {
    currentPassword: DEFAULT_PASSWORD,
    newPassword: 'NewTestOnly!Password456',
    confirmPassword: 'NewTestOnly!Password456',
    ...overrides,
  };
}
/**
 * Create a user profile update payload.
 *
 * This represents fields that a normal user may be allowed to update.
 * The actual allowlist must be enforced by the application.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createUserProfilePayload(overrides = {}) {
  return {
    firstName: 'Updated',
    lastName: 'Student',
    phone: '+910000000001',
    ...overrides,
  };
}
/**
 * Create a set of synthetic users with stable IDs and emails.
 *
 * @param {number} count
 * @param {object} overrides
 * @returns {object[]}
 */
function createUserSet(count = 3, overrides = {}) {
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError('count must be a non-negative integer');
  }
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');
    return createUser({
      id: `usr_test_${number}`,
      email: `student${number}@example.test`,
      firstName: `Student${number}`,
      ...overrides,
    });
  });
}
/**
 * Create a user belonging to another test principal.
 *
 * Useful for testing object ownership and IDOR protections.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createForeignUser(overrides = {}) {
  return createUser({
    id: 'usr_foreign_001',
    firstName: 'Foreign',
    lastName: 'User',
    email: 'foreign.user@example.test',
    ...overrides,
  });
}
/**
 * Create a user with a specific role.
 *
 * @param {string} role
 * @param {object} overrides
 * @returns {object}
 */
function createUserWithRole(role, overrides = {}) {
  if (!Object.values(USER_ROLES).includes(role)) {
    throw new TypeError(`Unsupported fixture role: ${String(role)}`);
  }
  return createUser({
    id: `usr_${role}_001`,
    email: `${role.replace(/[^a-z0-9]+/gi, '.')}.001@example.test`,
    role,
    ...overrides,
  });
}
/**
 * Create a user with a specific account status.
 *
 * @param {string} status
 * @param {object} overrides
 * @returns {object}
 */
function createUserWithStatus(status, overrides = {}) {
  if (!Object.values(USER_STATUSES).includes(status)) {
    throw new TypeError(`Unsupported fixture status: ${String(status)}`);
  }
  return createUser({
    status,
    ...overrides,
  });
}
/**
 * Create a mass-assignment attack payload.
 *
 * Use this only in negative security tests to verify that the application
 * ignores or rejects client-controlled privileged fields.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createMassAssignmentPayload(overrides = {}) {
  return {
    firstName: 'Modified',
    lastName: 'Account',
    role: USER_ROLES.SUPER_ADMIN,
    status: USER_STATUSES.ACTIVE,
    emailVerified: true,
    emailVerificationStatus: VERIFICATION_STATUSES.VERIFIED,
    phoneVerified: true,
    failedLoginAttempts: 0,
    mfaEnabled: false,
    isAdmin: true,
    permissions: ['*'],
    ...overrides,
  };
}
/**
 * Create a synthetic administrator.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createAdminUser(overrides = {}) {
  return createUser({
    id: 'usr_admin_001',
    firstName: 'Test',
    lastName: 'Administrator',
    email: 'admin001@example.test',
    role: USER_ROLES.ADMIN,
    ...overrides,
  });
}
/**
 * Create a synthetic super-administrator.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createSuperAdminUser(overrides = {}) {
  return createUser({
    id: 'usr_super_admin_001',
    firstName: 'Test',
    lastName: 'SuperAdmin',
    email: 'superadmin001@example.test',
    role: USER_ROLES.SUPER_ADMIN,
    ...overrides,
  });
}
/**
 * Create an inactive account.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createInactiveUser(overrides = {}) {
  return createUserWithStatus(USER_STATUSES.INACTIVE, {
    id: 'usr_inactive_001',
    email: 'inactive001@example.test',
    ...overrides,
  });
}
/**
 * Create a suspended account.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createSuspendedUser(overrides = {}) {
  return createUserWithStatus(USER_STATUSES.SUSPENDED, {
    id: 'usr_suspended_001',
    email: 'suspended001@example.test',
    ...overrides,
  });
}
/**
 * Create a locked account.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createLockedUser(overrides = {}) {
  return createUserWithStatus(USER_STATUSES.LOCKED, {
    id: 'usr_locked_001',
    email: 'locked001@example.test',
    failedLoginAttempts: 5,
    ...overrides,
  });
}
/**
 * Create an unverified user.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createUnverifiedUser(overrides = {}) {
  return createUser({
    id: 'usr_unverified_001',
    email: 'unverified001@example.test',
    emailVerified: false,
    emailVerificationStatus: VERIFICATION_STATUSES.UNVERIFIED,
    ...overrides,
  });
}
/**
 * Create a user with MFA enabled.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createMfaEnabledUser(overrides = {}) {
  return createUser({
    id: 'usr_mfa_001',
    email: 'mfa001@example.test',
    mfaEnabled: true,
    ...overrides,
  });
}
/**
 * Create a user with multiple failed login attempts.
 *
 * @param {number} attempts
 * @param {object} overrides
 * @returns {object}
 */
function createUserWithFailedLogins(attempts = 3, overrides = {}) {
  if (!Number.isInteger(attempts) || attempts < 0) {
    throw new TypeError('attempts must be a non-negative integer');
  }
  return createUser({
    id: 'usr_failed_login_001',
    email: 'failed.login001@example.test',
    failedLoginAttempts: attempts,
    ...overrides,
  });
}
/**
 * Create a user with a deliberately untrusted privileged input object.
 *
 * Unlike createUser(), this helper does not create a complete user record.
 * Use it to test server-side field filtering and validation.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createUntrustedUserInput(overrides = {}) {
  return {
    firstName: 'Untrusted',
    lastName: 'Input',
    email: 'untrusted.input@example.test',
    password: DEFAULT_PASSWORD,
    id: 'usr_attacker_controlled',
    role: USER_ROLES.SUPER_ADMIN,
    status: USER_STATUSES.ACTIVE,
    emailVerified: true,
    isAdmin: true,
    permissions: ['*'],
    ...overrides,
  };
}
/**
 * Create a minimal authenticated-principal representation.
 *
 * Do not treat this object as a verified token or session. Tests must
 * establish authentication through the application's real middleware
 * when testing authentication behavior.
 *
 * @param {object} overrides
 * @returns {object}
 */
function createAuthenticatedPrincipal(overrides = {}) {
  return {
    id: 'usr_test_001',
    role: USER_ROLES.STUDENT,
    status: USER_STATUSES.ACTIVE,
    ...overrides,
  };
}
/**
 * Create an ownership scenario with two distinct users.
 *
 * @returns {{ owner: object, foreignUser: object }}
 */
function createUserOwnershipScenario() {
  return {
    owner: createUser({
      id: 'usr_owner_001',
      email: 'owner001@example.test',
    }),
    foreignUser: createForeignUser(),
  };
}
/**
 * Create a set of users covering common authorization scenarios.
 *
 * @returns {object}
 */
function createAuthorizationUsers() {
  return {
    student: createUserWithRole(USER_ROLES.STUDENT, {
      id: 'usr_auth_student_001',
      email: 'auth.student001@example.test',
    }),
    candidate: createUserWithRole(USER_ROLES.CANDIDATE, {
      id: 'usr_auth_candidate_001',
      email: 'auth.candidate001@example.test',
    }),
    counsellor: createUserWithRole(USER_ROLES.COUNSELLOR, {
      id: 'usr_auth_counsellor_001',
      email: 'auth.counsellor001@example.test',
    }),
    employer: createUserWithRole(USER_ROLES.EMPLOYER, {
      id: 'usr_auth_employer_001',
      email: 'auth.employer001@example.test',
    }),
    support: createUserWithRole(USER_ROLES.SUPPORT, {
      id: 'usr_auth_support_001',
      email: 'auth.support001@example.test',
    }),
    admin: createAdminUser({
      id: 'usr_auth_admin_001',
      email: 'auth.admin001@example.test',
    }),
    superAdmin: createSuperAdminUser({
      id: 'usr_auth_super_admin_001',
      email: 'auth.superadmin001@example.test',
    }),
  };
}
module.exports = {
  USER_ROLES,
  USER_STATUSES,
  VERIFICATION_STATUSES,
  AUTH_PROVIDERS,
  DEFAULT_PASSWORD,
  DEFAULT_USER,
  createUser,
  createUserRegistrationPayload,
  createLoginPayload,
  createPasswordChangePayload,
  createUserProfilePayload,
  createUserSet,
  createForeignUser,
  createUserWithRole,
  createUserWithStatus,
  createMassAssignmentPayload,
  createAdminUser,
  createSuperAdminUser,
  createInactiveUser,
  createSuspendedUser,
  createLockedUser,
  createUnverifiedUser,
  createMfaEnabledUser,
  createUserWithFailedLogins,
  createUntrustedUserInput,
  createAuthenticatedPrincipal,
  createUserOwnershipScenario,
  createAuthorizationUsers,
};