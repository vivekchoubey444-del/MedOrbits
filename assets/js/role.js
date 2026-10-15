medorbits/assets/js/role.js
/**
 * MedOrbits -- Role Management
 * File: assets/js/role.js
 *
 * Handles role definitions, role checks, UI visibility,
 * and role-based navigation helpers.
 *
 * Backend authorization remains mandatory.
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
    SUPER_ADMIN: "super_admin"
  });
  const ROLE_GROUPS = Object.freeze({
    USERS: Object.freeze([
      ROLES.STUDENT,
      ROLES.CANDIDATE
    ]),
    EMPLOYERS: Object.freeze([
      ROLES.EMPLOYER,
      ROLES.RECRUITER
    ]),
    STAFF: Object.freeze([
      ROLES.COUNSELLOR,
      ROLES.RECRUITER,
      ROLES.ADMIN,
      ROLES.SUPER_ADMIN
    ]),
    ADMINISTRATORS: Object.freeze([
      ROLES.ADMIN,
      ROLES.SUPER_ADMIN
    ])
  });
  const ROLE_LABELS = Object.freeze({
    [ROLES.GUEST]: "Guest",
    [ROLES.STUDENT]: "Student",
    [ROLES.CANDIDATE]: "Job Candidate",
    [ROLES.EMPLOYER]: "Employer",
    [ROLES.COUNSELLOR]: "Counsellor",
    [ROLES.RECRUITER]: "Recruiter",
    [ROLES.ADMIN]: "Administrator",
    [ROLES.SUPER_ADMIN]: "Super Administrator"
  });
  const ROLE_HOME = Object.freeze({
    [ROLES.GUEST]: CONSTANTS.ROUTES?.HOME || "/index.html",
    [ROLES.STUDENT]: CONSTANTS.ROUTES?.ACCOUNT?.DASHBOARD || "/account/dashboard.html",
    [ROLES.CANDIDATE]: CONSTANTS.ROUTES?.ACCOUNT?.DASHBOARD || "/account/dashboard.html",
    [ROLES.EMPLOYER]: CONSTANTS.ROUTES?.CAREER?.EMPLOYER_DASHBOARD || "/career/employer-dashboard.html",
    [ROLES.RECRUITER]: CONSTANTS.ROUTES?.CAREER?.EMPLOYER_DASHBOARD || "/career/employer-dashboard.html",
    [ROLES.COUNSELLOR]: CONSTANTS.ROUTES?.ACCOUNT?.COUNSELLING || "/account/counselling.html",
    [ROLES.ADMIN]: CONSTANTS.ROUTES?.ADMIN?.DASHBOARD || "/admin/dashboard.html",
    [ROLES.SUPER_ADMIN]: CONSTANTS.ROUTES?.ADMIN?.DASHBOARD || "/admin/dashboard.html"
  });
  function normalizeRole(role) {
    return typeof role === "string"
      ? role.trim().toLowerCase()
      : null;
  }
  function getCurrentUser() {
    return window.MedOrbitsAuth?.currentUser?.() || null;
  }
  function getCurrentRole() {
    const user = getCurrentUser();
    return normalizeRole(
      user?.role ||
      user?.role_name ||
      user?.account_role
    );
  }
  function isValidRole(role) {
    return Object.values(ROLES).includes(normalizeRole(role));
  }
  function hasRole(role) {
    const expected = normalizeRole(role);
    if (!expected || !getCurrentUser()) return false;
    return getCurrentRole() === expected;
  }
  function hasAnyRole(roles = []) {
    if (!Array.isArray(roles)) return false;
    return roles.some((role) => hasRole(role));
  }
  function hasAllRoles(roles = []) {
    if (!Array.isArray(roles) || !roles.length) return false;
    return roles.every((role) => hasRole(role));
  }
  function isInGroup(group) {
    const roles = ROLE_GROUPS[group];
    return Array.isArray(roles) && hasAnyRole(roles);
  }
  function isAdmin() {
    return isInGroup("ADMINISTRATORS");
  }
  function getRoleLabel(role = getCurrentRole()) {
    const normalized = normalizeRole(role);
    return ROLE_LABELS[normalized] || "Unknown Role";
  }
  function getHomeRoute(role = getCurrentRole()) {
    const normalized = normalizeRole(role);
    return ROLE_HOME[normalized] || ROLE_HOME[ROLES.GUEST];
  }
  function canAccessElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    const requiredRoles = (element.dataset.roles || "")
      .split(",")
      .map(normalizeRole)
      .filter(Boolean);
    const excludedRoles = (element.dataset.excludeRoles || "")
      .split(",")
      .map(normalizeRole)
      .filter(Boolean);
    if (
      requiredRoles.length &&
      !hasAnyRole(requiredRoles)
    ) {
      return false;
    }
    if (excludedRoles.some((role) => hasRole(role))) {
      return false;
    }
    if (
      element.hasAttribute("data-auth-required") &&
      !getCurrentUser()
    ) {
      return false;
    }
    return true;
  }
  function applyRoleVisibility(root = document) {
    root.querySelectorAll(
      "[data-roles], [data-exclude-roles], [data-auth-required]"
    ).forEach((element) => {
      const allowed = canAccessElement(element);
      element.hidden = !allowed;
      element.setAttribute("aria-hidden", String(!allowed));
    });
  }
  function redirectToRoleHome(role = getCurrentRole()) {
    window.location.assign(getHomeRoute(role));
  }
  function requireRole(roles, options = {}) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!getCurrentUser()) {
      if (options.redirect !== false) {
        window.location.assign(
          CONSTANTS.ROUTES?.ACCOUNT?.LOGIN || "/account/login.html"
        );
      }
      return false;
    }
    if (hasAnyRole(allowedRoles)) return true;
    if (options.redirectOnDenied === true) {
      redirectToRoleHome();
    }
    return false;
  }
  function init() {
    applyRoleVisibility();
    document.addEventListener(
      "medorbits:auth-change",
      () => applyRoleVisibility()
    );
  }
  const MedOrbitsRole = Object.freeze({
    ROLES,
    ROLE_GROUPS,
    ROLE_LABELS,
    ROLE_HOME,
    normalizeRole,
    isValidRole,
    getCurrentUser,
    getCurrentRole,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isInGroup,
    isAdmin,
    getRoleLabel,
    getHomeRoute,
    canAccessElement,
    applyRoleVisibility,
    redirectToRoleHome,
    requireRole,
    init
  });
  if (window.MedOrbitsRole) {
    console.warn("[MedOrbits] Role module already initialized.");
    return;
  }
  Object.defineProperty(window, "MedOrbitsRole", {
    value: MedOrbitsRole,
    writable: false,
    configurable: false,
    enumerable: true
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();