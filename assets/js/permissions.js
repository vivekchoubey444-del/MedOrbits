
/**
 * MedOrbits -- Permissions & Access Control
 * File: assets/js/permissions.js
 *
 * Frontend permission helpers.
 * All permissions must also be enforced by the backend.
 */

(() => {
  "use strict";

  const CONSTANTS = window.MedOrbitsConstants || {};

  const ROLES = Object.freeze({
    GUEST: "guest",
    STUDENT: "student",
    CANDIDATE: "candidate",
    EMPLOYER: "employer",
    COUNSELLOR: "counsellor",
    RECRUITER: "recruiter",
    ADMIN: "admin",
    SUPER_ADMIN: "super_admin",
    ...(CONSTANTS.AUTH?.ROLES || {})
  });

  const PERMISSIONS = Object.freeze({
    PROFILE_READ: "profile:read",
    PROFILE_UPDATE: "profile:update",
    ACCOUNT_DELETE: "account:delete",

    APPLICATION_READ: "application:read",
    APPLICATION_CREATE: "application:create",
    APPLICATION_UPDATE: "application:update",
    APPLICATION_DELETE: "application:delete",
    APPLICATION_REVIEW: "application:review",

    COUNSELLING_READ: "counselling:read",
    COUNSELLING_MANAGE: "counselling:manage",

    DOCUMENT_READ: "document:read",
    DOCUMENT_UPLOAD: "document:upload",
    DOCUMENT_DELETE: "document:delete",
    DOCUMENT_VERIFY: "document:verify",

    COURSE_READ: "course:read",
    COURSE_CREATE: "course:create",
    COURSE_UPDATE: "course:update",
    COURSE_DELETE: "course:delete",

    COLLEGE_READ: "college:read",
    COLLEGE_MANAGE: "college:manage",

    JOB_READ: "job:read",
    JOB_CREATE: "job:create",
    JOB_UPDATE: "job:update",
    JOB_DELETE: "job:delete",
    JOB_PUBLISH: "job:publish",

    CANDIDATE_READ: "candidate:read",
    CANDIDATE_MANAGE: "candidate:manage",

    EMPLOYER_READ: "employer:read",
    EMPLOYER_MANAGE: "employer:manage",

    RECRUITMENT_MANAGE: "recruitment:manage",

    PAYMENT_READ: "payment:read",
    PAYMENT_MANAGE: "payment:manage",
    REFUND_MANAGE: "refund:manage",

    SUBSCRIPTION_READ: "subscription:read",
    SUBSCRIPTION_MANAGE: "subscription:manage",

    SUPPORT_READ: "support:read",
    SUPPORT_MANAGE: "support:manage",

    USER_READ: "user:read",
    USER_MANAGE: "user:manage",
    ROLE_MANAGE: "role:manage",
    SETTINGS_MANAGE: "settings:manage",
    AUDIT_READ: "audit:read"
  });

  const ROLE_PERMISSIONS = Object.freeze({
    [ROLES.GUEST]: Object.freeze([
      PERMISSIONS.COURSE_READ,
      PERMISSIONS.COLLEGE_READ,
      PERMISSIONS.JOB_READ
    ]),

    [ROLES.STUDENT]: Object.freeze([
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.PROFILE_UPDATE,
      PERMISSIONS.ACCOUNT_DELETE,
      PERMISSIONS.APPLICATION_READ,
      PERMISSIONS.APPLICATION_CREATE,
      PERMISSIONS.APPLICATION_UPDATE,
      PERMISSIONS.COUNSELLING_READ,
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.COURSE_READ,
      PERMISSIONS.COLLEGE_READ,
      PERMISSIONS.PAYMENT_READ,
      PERMISSIONS.SUBSCRIPTION_READ
    ]),

    [ROLES.CANDIDATE]: Object.freeze([
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.PROFILE_UPDATE,
      PERMISSIONS.ACCOUNT_DELETE,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.APPLICATION_READ,
      PERMISSIONS.APPLICATION_CREATE,
      PERMISSIONS.APPLICATION_UPDATE,
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.DOCUMENT_UPLOAD,
      PERMISSIONS.SUBSCRIPTION_READ
    ]),

    [ROLES.EMPLOYER]: Object.freeze([
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.PROFILE_UPDATE,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.JOB_CREATE,
      PERMISSIONS.JOB_UPDATE,
      PERMISSIONS.APPLICATION_READ,
      PERMISSIONS.CANDIDATE_READ,
      PERMISSIONS.SUBSCRIPTION_READ,
      PERMISSIONS.PAYMENT_READ
    ]),

    [ROLES.COUNSELLOR]: Object.freeze([
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.COURSE_READ,
      PERMISSIONS.COLLEGE_READ,
      PERMISSIONS.APPLICATION_READ,
      PERMISSIONS.APPLICATION_REVIEW,
      PERMISSIONS.COUNSELLING_READ,
      PERMISSIONS.COUNSELLING_MANAGE,
      PERMISSIONS.DOCUMENT_READ
    ]),

    [ROLES.RECRUITER]: Object.freeze([
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.JOB_CREATE,
      PERMISSIONS.JOB_UPDATE,
      PERMISSIONS.APPLICATION_READ,
      PERMISSIONS.CANDIDATE_READ,
      PERMISSIONS.CANDIDATE_MANAGE,
      PERMISSIONS.RECRUITMENT_MANAGE
    ]),

    [ROLES.ADMIN]: Object.freeze([
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.PROFILE_UPDATE,
      PERMISSIONS.APPLICATION_READ,
      PERMISSIONS.APPLICATION_REVIEW,
      PERMISSIONS.APPLICATION_UPDATE,
      PERMISSIONS.COUNSELLING_READ,
      PERMISSIONS.COUNSELLING_MANAGE,
      PERMISSIONS.DOCUMENT_READ,
      PERMISSIONS.DOCUMENT_VERIFY,
      PERMISSIONS.COURSE_READ,
      PERMISSIONS.COURSE_CREATE,
      PERMISSIONS.COURSE_UPDATE,
      PERMISSIONS.COLLEGE_READ,
      PERMISSIONS.COLLEGE_MANAGE,
      PERMISSIONS.JOB_READ,
      PERMISSIONS.JOB_CREATE,
      PERMISSIONS.JOB_UPDATE,
      PERMISSIONS.JOB_PUBLISH,
      PERMISSIONS.CANDIDATE_READ,
      PERMISSIONS.CANDIDATE_MANAGE,
      PERMISSIONS.EMPLOYER_READ,
      PERMISSIONS.EMPLOYER_MANAGE,
      PERMISSIONS.RECRUITMENT_MANAGE,
      PERMISSIONS.PAYMENT_READ,
      PERMISSIONS.SUBSCRIPTION_READ,
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_MANAGE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.AUDIT_READ
    ]),

    [ROLES.SUPER_ADMIN]: Object.freeze(
      Object.values(PERMISSIONS)
    )
  });

  const ROLE_HIERARCHY = Object.freeze({
    [ROLES.GUEST]: 0,
    [ROLES.STUDENT]: 1,
    [ROLES.CANDIDATE]: 1,
    [ROLES.EMPLOYER]: 1,
    [ROLES.COUNSELLOR]: 2,
    [ROLES.RECRUITER]: 2,
    [ROLES.ADMIN]: 3,
    [ROLES.SUPER_ADMIN]: 4
  });

  function getAuth() {
    return window.MedOrbitsAuth || null;
  }

  function getCurrentUser() {
    return getAuth()?.currentUser?.() || null;
  }

  function isAuthenticated() {
    return getAuth()?.isAuthenticated?.() === true;
  }

  function getRole() {
    const user = getCurrentUser();

    if (!user) return ROLES.GUEST;

    return (
      user.role ||
      user.role_name ||
      user.account_role ||
      ROLES.GUEST
    );
  }

  function hasRole(role) {
    if (!isAuthenticated()) {
      return role === ROLES.GUEST;
    }

    return getRole() === role;
  }

  function hasAnyRole(roles = []) {
    if (!Array.isArray(roles)) return false;

    return roles.some(hasRole);
  }

  function getPermissions(role = getRole()) {
    return ROLE_PERMISSIONS[role] || [];
  }

  function can(permission) {
    if (!permission || !isAuthenticated()) return false;

    const role = getRole();

    return getPermissions(role).includes(permission);
  }

  function canAny(permissions = []) {
    if (!Array.isArray(permissions)) return false;

    return permissions.some(can);
  }

  function canAll(permissions = []) {
    if (!Array.isArray(permissions)) return false;

    return permissions.every(can);
  }

  function hasMinimumRole(requiredRole) {
    if (!isAuthenticated()) return false;

    const currentLevel = ROLE_HIERARCHY[getRole()];
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    if (
      currentLevel === undefined ||
      requiredLevel === undefined
    ) {
      return false;
    }

    return currentLevel >= requiredLevel;
  }

  function canAccessResource(resource, action = "read") {
    const permission = `${resource}:${action}`;

    return can(permission);
  }

  function filterByPermission(items, permission) {
    if (!Array.isArray(items) || !can(permission)) return [];

    return items;
  }

  function protectElement(element, options = {}) {
    if (!element) return false;

    const {
      roles = [],
      permissions = [],
      requireAll = false,
      hide = true
    } = options;

    const roleAllowed =
      roles.length === 0 || hasAnyRole(roles);

    const permissionAllowed =
      permissions.length === 0 ||
      (requireAll
        ? canAll(permissions)
        : canAny(permissions));

    const allowed = roleAllowed && permissionAllowed;

    element.hidden = !allowed && hide;
    element.setAttribute("aria-hidden", String(!allowed));

    if (!allowed && !hide) {
      element.setAttribute("inert", "");
    } else {
      element.removeAttribute("inert");
    }

    return allowed;
  }

  function applyPagePermissions() {
    document.querySelectorAll("[data-permission]").forEach((element) => {
      const permissions = element.dataset.permission
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      protectElement(element, {
        permissions,
        requireAll: element.dataset.permissionMode === "all"
      });
    });

    document.querySelectorAll("[data-role]").forEach((element) => {
      const roles = element.dataset.role
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      protectElement(element, { roles });
    });
  }

  function requirePermission(permission) {
    if (can(permission)) return true;

    const error = new Error("Permission denied.");
    error.name = "PermissionError";
    error.code = "PERMISSION_DENIED";

    throw error;
  }

  function requireAnyPermission(permissions = []) {
    if (canAny(permissions)) return true;

    const error = new Error("Permission denied.");
    error.name = "PermissionError";
    error.code = "PERMISSION_DENIED";

    throw error;
  }

  function init() {
    applyPagePermissions();

    document.addEventListener(
      "medorbits:auth-change",
      applyPagePermissions
    );
  }

  const MedOrbitsPermissions = Object.freeze({
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    ROLE_HIERARCHY,

    getCurrentUser,
    getRole,
    getPermissions,
    isAuthenticated,

    hasRole,
    hasAnyRole,
    hasMinimumRole,

    can,
    canAny,
    canAll,
    canAccessResource,

    filterByPermission,
    protectElement,
    applyPagePermissions,

    requirePermission,
    requireAnyPermission,
    init
  });

  if (window.MedOrbitsPermissions) {
    console.warn("[MedOrbits] Permissions module already exists.");
    return;
  }

  Object.defineProperty(window, "MedOrbitsPermissions", {
    value: MedOrbitsPermissions,
    writable: false,
    configurable: false,
    enumerable: true
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
