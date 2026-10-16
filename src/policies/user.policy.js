
'use strict';

const {
  isAdmin,
  hasPermission,
  sameId,
  actorId,
  safeStatus,
} = require('./policy-utils');

const DISABLED_STATUSES = new Set([
  'suspended',
  'disabled',
  'locked',
  'deleted',
  'banned',
]);

const PROTECTED_FIELDS = new Set([
  'id',
  '_id',
  'userId',
  'role',
  'roles',
  'permissions',
  'status',
  'isAdmin',
  'isVerified',
  'isSuspended',
  'isDisabled',
  'isLocked',
  'emailVerified',
  'emailVerifiedAt',
  'verifiedAt',
  'password',
  'passwordHash',
  'passwordResetToken',
  'passwordResetExpiresAt',
  'verificationToken',
  'verificationTokenHash',
  'refreshToken',
  'refreshTokenHash',
  'mfaSecret',
  'recoveryCodes',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

const PRIVATE_PROFILE_FIELDS = new Set([
  'email',
  'phone',
  'dateOfBirth',
  'address',
  'documents',
  'identityDocuments',
]);

function userId(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return user.id ?? user._id ?? user.userId ?? null;
}

function isUserOwner(actor, user) {
  if (!actor || !user) {
    return false;
  }

  const targetId = userId(user);

  return targetId != null &&
    sameId(actorId(actor), targetId);
}

function canViewUser(actor, user) {
  if (!actor || !user || typeof user !== 'object') {
    return false;
  }

  if (safeStatus(user.status) === 'deleted' || user.deletedAt != null) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'users:read:any')
  ) {
    return true;
  }

  return isUserOwner(actor, user);
}

function canViewUserPrivateFields(actor, user) {
  if (!actor || !user || typeof user !== 'object') {
    return false;
  }

  if (safeStatus(user.status) === 'deleted' || user.deletedAt != null) {
    return false;
  }

  return Boolean(
    isUserOwner(actor, user) ||
    isAdmin(actor) ||
    hasPermission(actor, 'users:read:private')
  );
}

function canCreateUser(actor, input = {}) {
  if (
    !actor ||
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'users:create:any')
  );
}

function canRegisterUser(input = {}) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return false;
  }

  // Public registration may create ordinary accounts only.
  // The service must explicitly assign role and initial status.
  const forbiddenFields = [
    'role',
    'roles',
    'permissions',
    'status',
    'isAdmin',
    'isVerified',
    'isSuspended',
    'isDisabled',
  ];

  return !forbiddenFields.some(
    (field) => Object.hasOwn(input, field)
  );
}

function canUpdateUser(actor, user, changes = {}) {
  if (
    !actor ||
    !user ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'users:update:any')
  ) {
    return true;
  }

  if (!isUserOwner(actor, user)) {
    return false;
  }

  if (
    DISABLED_STATUSES.has(safeStatus(user.status)) ||
    user.deletedAt != null
  ) {
    return false;
  }

  return !Object.keys(changes).some(
    (key) => PROTECTED_FIELDS.has(key)
  );
}

function canChangeUserStatus(actor, user, nextStatus) {
  if (
    !actor ||
    !user ||
    typeof nextStatus !== 'string' ||
    !nextStatus.trim()
  ) {
    return false;
  }

  if (isUserOwner(actor, user)) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'users:status:update')
  );
}

function canManageUserRoles(actor, user) {
  if (!actor || !user) {
    return false;
  }

  if (isUserOwner(actor, user)) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'users:roles:manage')
  );
}

function canManageUserPermissions(actor, user) {
  if (!actor || !user) {
    return false;
  }

  if (isUserOwner(actor, user)) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'users:permissions:manage')
  );
}

function canDeleteUser(actor, user) {
  if (!actor || !user) {
    return false;
  }

  if (user.deletedAt != null ||
      safeStatus(user.status) === 'deleted') {
    return false;
  }

  if (isUserOwner(actor, user)) {
    return Boolean(
      hasPermission(actor, 'users:delete:self')
    );
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'users:delete:any')
  );
}

function canExportUsers(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'users:export')
    )
  );
}

function canViewUserActivity(actor, user) {
  if (!actor || !user) {
    return false;
  }

  return Boolean(
    isUserOwner(actor, user) ||
    isAdmin(actor) ||
    hasPermission(actor, 'users:activity:read:any')
  );
}

function canManageUserSessions(actor, targetUserId) {
  if (!actor || targetUserId == null || targetUserId === '') {
    return false;
  }

  if (sameId(actorId(actor), targetUserId)) {
    return true;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'auth:sessions:manage:any')
  );
}

module.exports = {
  userId,
  isUserOwner,
  canViewUser,
  canViewUserPrivateFields,
  canCreateUser,
  canRegisterUser,
  canUpdateUser,
  canChangeUserStatus,
  canManageUserRoles,
  canManageUserPermissions,
  canDeleteUser,
  canExportUsers,
  canViewUserActivity,
  canManageUserSessions,
  PRIVATE_PROFILE_FIELDS,
};
