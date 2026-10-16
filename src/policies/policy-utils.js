
'use strict';

const ROLE_ALIASES = Object.freeze({
  super_admin: 'superadmin',
  superadmin: 'superadmin',
  administrator: 'admin',
  admin: 'admin',
  student: 'student',
  applicant: 'candidate',
  candidate: 'candidate',
  employer: 'employer',
  counsellor: 'counsellor',
  counselor: 'counsellor',
  recruiter: 'recruiter',
  support: 'support',
  user: 'user',
});

function normalizeId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || null;
  }

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return String(value);
  }

  if (typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'object') {
    if (value.id !== undefined && value.id !== value) {
      return normalizeId(value.id);
    }

    if (value._id !== undefined && value._id !== value) {
      return normalizeId(value._id);
    }

    // Supports database identifier objects such as ObjectId.
    // Avoid invoking arbitrary custom coercion methods.
    const rendered = Object.prototype.toString.call(value);

    if (rendered === '[object Object]') {
      if (
        typeof value.toHexString === 'function' &&
        value._bsontype === 'ObjectId'
      ) {
        const hex = value.toHexString();

        return (
          typeof hex === 'string' &&
          /^[a-f\d]{24}$/i.test(hex)
        )
          ? hex.toLowerCase()
          : null;
      }

      return null;
    }
  }

  return null;
}

function actorId(actor) {
  if (!actor || typeof actor !== 'object') {
    return null;
  }

  return normalizeId(
    actor.id ??
    actor.userId ??
    actor.sub ??
    actor._id
  );
}

function normalizeRole(role) {
  if (typeof role !== 'string') {
    return null;
  }

  const normalized = role.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return ROLE_ALIASES[normalized] || normalized;
}

function actorRoles(actor) {
  if (!actor || typeof actor !== 'object') {
    return [];
  }

  const rawRoles = [
    ...(Array.isArray(actor.roles) ? actor.roles : []),
    ...(actor.role != null ? [actor.role] : []),
  ];

  return [
    ...new Set(
      rawRoles
        .map(normalizeRole)
        .filter(Boolean)
    ),
  ];
}

function hasRole(actor, ...roles) {
  if (!actor || roles.length === 0) {
    return false;
  }

  const currentRoles = actorRoles(actor);

  const expectedRoles = roles
    .map(normalizeRole)
    .filter(Boolean);

  return expectedRoles.some((role) =>
    currentRoles.includes(role)
  );
}

function hasPermission(actor, permission) {
  if (
    !actor ||
    typeof permission !== 'string' ||
    !permission.trim()
  ) {
    return false;
  }

  // This role must only be assigned by trusted server-side
  // authorization and identity-management code.
  if (hasRole(actor, 'superadmin')) {
    return true;
  }

  const permissions = Array.isArray(actor.permissions)
    ? actor.permissions
    : [];

  return permissions.some(
    (item) =>
      typeof item === 'string' &&
      item === permission
  );
}

function isAdmin(actor) {
  return (
    hasRole(actor, 'admin', 'superadmin') ||
    hasPermission(actor, 'platform:admin')
  );
}

function sameId(left, right) {
  const a = normalizeId(left);
  const b = normalizeId(right);

  return a !== null && b !== null && a === b;
}

function isOwner(actor, ownerId) {
  const currentActorId = actorId(actor);

  return (
    currentActorId !== null &&
    sameId(currentActorId, ownerId)
  );
}

function resourceOwnerId(
  resource,
  keys = [
    'userId',
    'ownerId',
    'createdBy',
    'candidateId',
  ]
) {
  if (
    !resource ||
    typeof resource !== 'object' ||
    Array.isArray(resource) ||
    !Array.isArray(keys)
  ) {
    return null;
  }

  for (const key of keys) {
    if (typeof key !== 'string' || !key) {
      continue;
    }

    const id = normalizeId(resource[key]);

    if (id !== null) {
      return id;
    }
  }

  return null;
}

function hasAnyPermission(actor, permissions) {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.some((permission) =>
    hasPermission(actor, permission)
  );
}

function safeStatus(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
}

function denyUnless(condition) {
  return condition === true;
}

module.exports = {
  actorId,
  actorRoles,
  hasRole,
  hasPermission,
  isAdmin,
  sameId,
  isOwner,
  resourceOwnerId,
  hasAnyPermission,
  safeStatus,
  denyUnless,
};
