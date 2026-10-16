  
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  sameId,
  actorId,
} = require('./policy-utils');

const DISABLED_STATUSES = new Set([
  'disabled',
  'suspended',
  'locked',
  'deleted',
  'banned',
]);

const PRIVILEGED_ACCOUNT_STATUSES = new Set([
  'active',
  'verified',
]);

const SESSION_OWNER_FIELDS = [
  'userId',
  'ownerId',
  'accountId',
];

/**
 * Normalize a status without changing the source object.
 */
function normalizeStatus(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
}

/**
 * Determine whether an account is allowed to authenticate.
 * Verification requirements should be configured for the actual
 * MedOrbits registration and verification workflow.
 */
function canAuthenticate(account) {
  if (!account || typeof account !== 'object') {
    return false;
  }

  if (
    account.isDisabled === true ||
    account.isSuspended === true ||
    account.isLocked === true ||
    account.deletedAt != null
  ) {
    return false;
  }

  const status = normalizeStatus(account.status);

  if (DISABLED_STATUSES.has(status)) {
    return false;
  }

  // Explicitly pending accounts must verify before login.
  if (
    status === 'pending_verification' ||
    status === 'unverified'
  ) {
    return false;
  }

  return true;
}

/**
 * Determine whether an account is allowed to access protected
 * authenticated routes.
 *
 * Token verification and session validation must happen before
 * this policy is called.
 */
function canAccessAuthenticatedResources(actor) {
  if (!actor || typeof actor !== 'object') {
    return false;
  }

  if (
    actor.isDisabled === true ||
    actor.isSuspended === true ||
    actor.isLocked === true ||
    actor.deletedAt != null
  ) {
    return false;
  }

  return !DISABLED_STATUSES.has(normalizeStatus(actor.status));
}

/**
 * A user may access their own account-management operations.
 * Administrators require the explicit permission for other users.
 */
function canManageAccount(actor, targetUserId) {
  if (!actor || targetUserId == null || targetUserId === '') {
    return false;
  }

  if (sameId(actorId(actor), targetUserId)) {
    return true;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'users:manage:any')
  );
}

/**
 * Controls viewing authentication-related account information.
 * Sensitive secrets must never be returned, even to administrators.
 */
function canViewAuthAccount(actor, targetUserId) {
  if (!actor || targetUserId == null || targetUserId === '') {
    return false;
  }

  if (sameId(actorId(actor), targetUserId)) {
    return true;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'auth:accounts:read:any')
  );
}

/**
 * Controls changing another account's authentication status.
 */
function canChangeAccountStatus(actor, targetUserId) {
  if (!actor || targetUserId == null || targetUserId === '') {
    return false;
  }

  // Users cannot elevate or disable accounts through self-service.
  if (sameId(actorId(actor), targetUserId)) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'auth:accounts:status:update')
  );
}

/**
 * Resolve a session's owner from trusted stored session data.
 */
function sessionOwnerId(session) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  for (const field of SESSION_OWNER_FIELDS) {
    if (
      session[field] !== undefined &&
      session[field] !== null &&
      session[field] !== ''
    ) {
      return session[field];
    }
  }

  return null;
}

/**
 * Controls whether an actor may view or revoke a session.
 */
function canManageSession(actor, session) {
  if (!actor || !session || typeof session !== 'object') {
    return false;
  }

  if (
    session.revokedAt != null ||
    session.revoked === true
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'auth:sessions:manage:any')
  ) {
    return true;
  }

  return sameId(actorId(actor), sessionOwnerId(session));
}

/**
 * Controls revocation of sessions.
 * Revoking an already revoked session should be handled
 * idempotently by the session service.
 */
function canRevokeSession(actor, session) {
  if (!actor || !session || typeof session !== 'object') {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'auth:sessions:revoke:any')
  ) {
    return true;
  }

  return sameId(actorId(actor), sessionOwnerId(session));
}

/**
 * Controls revoking all sessions for a target account.
 */
function canRevokeAllSessions(actor, targetUserId) {
  if (!actor || targetUserId == null || targetUserId === '') {
    return false;
  }

  if (sameId(actorId(actor), targetUserId)) {
    return true;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'auth:sessions:revoke:any')
  );
}

/**
 * Controls password changes for the authenticated user.
 * The service must still verify the current password.
 */
function canChangeOwnPassword(actor, targetUserId) {
  return Boolean(
    actor &&
    targetUserId != null &&
    targetUserId !== '' &&
    sameId(actorId(actor), targetUserId) &&
    canAccessAuthenticatedResources(actor)
  );
}

/**
 * Controls password-reset initiation.
 * Public reset requests should normally be accepted without
 * revealing whether the account exists.
 */
function canRequestPasswordReset(input) {
  return Boolean(
    input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    typeof input.email === 'string' &&
    input.email.trim().length > 0
  );
}

/**
 * Controls administrative password resets.
 * This does not authorize bypassing verification or audit controls.
 */
function canResetAnotherUserPassword(actor, targetUserId) {
  if (!actor || targetUserId == null || targetUserId === '') {
    return false;
  }

  if (sameId(actorId(actor), targetUserId)) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'auth:password:reset:any')
  );
}

/**
 * Controls access to privileged authentication configuration.
 */
function canManageAuthConfiguration(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'auth:configuration:manage')
    )
  );
}

/**
 * Controls whether an account may use privileged operations.
 * Account status is checked independently of role.
 */
function canUsePrivilegedAuthOperations(actor) {
  if (!actor || !canAccessAuthenticatedResources(actor)) {
    return false;
  }

  const status = normalizeStatus(actor.status);

  if (
    status &&
    !PRIVILEGED_ACCOUNT_STATUSES.has(status) &&
    status !== 'active'
  ) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasRole(actor, 'support', 'counsellor') ||
    Array.isArray(actor.permissions) &&
      actor.permissions.length > 0
  );
}

module.exports = {
  canAuthenticate,
  canAccessAuthenticatedResources,
  canManageAccount,
  canViewAuthAccount,
  canChangeAccountStatus,
  sessionOwnerId,
  canManageSession,
  canRevokeSession,
  canRevokeAllSessions,
  canChangeOwnPassword,
  canRequestPasswordReset,
  canResetAnotherUserPassword,
  canManageAuthConfiguration,
  canUsePrivilegedAuthOperations,
};
