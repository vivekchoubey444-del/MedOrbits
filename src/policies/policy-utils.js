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
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'object') {
    if (value.id !== undefined) return normalizeId(value.id);
    if (value._id !== undefined) return normalizeId(value._id);
    if (typeof value.toString === 'function') {
      const rendered = value.toString();
      if (rendered && rendered !== '[object Object]') return rendered;
    }
  }
  return null;
}

function actorId(actor) {
  if (!actor || typeof actor !== 'object') return null;
  return normalizeId(actor.id ?? actor.userId ?? actor.sub ?? actor._id);
}

function actorRoles(actor) {
  if (!actor || typeof actor !== 'object') return [];
  const raw = [
    ...(Array.isArray(actor.roles) ? actor.roles : []),
    ...(actor.role ? [actor.role] : []),
  ];
  return [...new Set(raw
    .filter((role) => typeof role === 'string')
    .map((role) => role.trim().toLowerCase())
    .map((role) => ROLE_ALIASES[role] || role)
    .filter(Boolean))];
}

function hasRole(actor, ...roles) {
  const current = actorRoles(actor);
  return current.some((role) => roles.includes(role));
}

function hasPermission(actor, permission) {
  if (!actor || !permission) return false;
  if (hasRole(actor, 'superadmin')) return true;
  const permissions = Array.isArray(actor.permissions) ? actor.permissions : [];
  return permissions.some((item) => item === permission);
}

function isAdmin(actor) {
  return hasRole(actor, 'admin', 'superadmin') ||
    hasPermission(actor, 'platform:admin');
}

function sameId(left, right) {
  const a = normalizeId(left);
  const b = normalizeId(right);
  return Boolean(a && b && a === b);
}

function isOwner(actor, ownerId) {
  return sameId(actorId(actor), ownerId);
}

function resourceOwnerId(resource, keys = ['userId', 'ownerId', 'createdBy', 'candidateId']) {
  if (!resource || typeof resource !== 'object') return null;
  for (const key of keys) {
    const id = normalizeId(resource[key]);
    if (id) return id;
  }
  return null;
}

function hasAnyPermission(actor, permissions) {
  return permissions.some((permission) => hasPermission(actor, permission));
}

function safeStatus(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
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
