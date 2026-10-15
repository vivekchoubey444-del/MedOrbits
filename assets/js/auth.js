
/**
 * MedOrbits -- Authentication & Session Manager
 * File: assets/js/auth.js
 *
 * Responsibilities:
 * - Login and registration
 * - Logout and server-side session management
 * - Session restoration
 * - Email verification
 * - Password reset and change
 * - Authentication state
 * - Role-based UI access helpers
 * - Authentication events and error handling
 *
 * Security:
 * - The server is the source of truth for identity and roles.
 * - Uses secure, same-origin cookie sessions by default.
 * - Never stores passwords or authentication tokens in localStorage.
 * - All protected API endpoints must enforce authorization server-side.
 */

(() => {
  "use strict";

  // --------------------------------------------------
  // Dependencies
  // --------------------------------------------------

  const CONSTANTS = window.MedOrbitsConstants || {};

  const API = CONSTANTS.API || {
    PREFIX: "/api",
    DEFAULT_TIMEOUT_MS: 15000,
    ENDPOINTS: {
      AUTH: "/auth",
      SESSION: "/session",
      VERIFICATION: "/verification",
      PASSWORD: "/password"
    }
  };

  const ROUTES = CONSTANTS.ROUTES || {
    HOME: "/index.html",
    ACCOUNT: {
      LOGIN: "/account/login.html",
      REGISTER: "/account/register.html",
      DASHBOARD: "/account/dashboard.html",
      FORGOT_PASSWORD: "/account/forgot-password.html"
    }
  };

  const AUTH = CONSTANTS.AUTH || {
    ROLES: {
      GUEST: "guest",
      STUDENT: "student",
      CANDIDATE: "candidate",
      EMPLOYER: "employer",
      COUNSELLOR: "counsellor",
      RECRUITER: "recruiter",
      ADMIN: "admin",
      SUPER_ADMIN: "super_admin"
    }
  };

  const EVENTS = CONSTANTS.EVENTS || {
    AUTH_CHANGE: "medorbits:auth-change"
  };

  const CONFIG = window.MedOrbitsConfig || {};

  const API_BASE_URL = String(
    CONFIG.API_BASE_URL || API.PREFIX || "/api"
  ).replace(/\/+$/, "");

  const REQUEST_TIMEOUT_MS = Number(
    CONFIG.AUTH_TIMEOUT_MS ||
    API.DEFAULT_TIMEOUT_MS ||
    15000
  );

  // --------------------------------------------------
  // Private state
  // --------------------------------------------------

  const state = {
    initialized: false,
    authenticated: false,
    loading: false,
    user: null,
    sessionChecked: false,
    lastError: null,
    activeController: null
  };

  const listeners = new Set();

  // --------------------------------------------------
  // Utilities
  // --------------------------------------------------

  const utils = {
    isObject(value) {
      return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      );
    },

    normalizeEmail(email) {
      return String(email || "").trim().toLowerCase();
    },

    safeString(value) {
      return typeof value === "string" ? value.trim() : "";
    },

    getCsrfToken() {
      const meta = document.querySelector(
        'meta[name="csrf-token"]'
      );

      return meta?.getAttribute("content") || "";
    },

    getRole(user) {
      if (!user || typeof user !== "object") return null;

      // Support common API response shapes.
      return (
        user.role ||
        user.role_name ||
        user.account_role ||
        null
      );
    },

    getUserId(user) {
      if (!user || typeof user !== "object") return null;

      return user.id ?? user.userId ?? user.user_id ?? null;
    },

    sanitizeUser(user) {
      if (!utils.isObject(user)) return null;

      // Allowlist fields exposed to application UI code.
      // Never retain passwords, access tokens, refresh tokens,
      // reset tokens, or raw authentication credentials.
      const allowedFields = [
        "id",
        "userId",
        "user_id",
        "name",
        "fullName",
        "full_name",
        "firstName",
        "first_name",
        "lastName",
        "last_name",
        "email",
        "phone",
        "role",
        "role_name",
        "account_role",
        "status",
        "emailVerified",
        "email_verified",
        "avatar",
        "profileImage",
        "profile_image",
        "createdAt",
        "created_at",
        "updatedAt",
        "updated_at"
      ];

      const clean = {};

      for (const key of allowedFields) {
        const value = user[key];

        if (
          value === null ||
          ["string", "number", "boolean"].includes(typeof value)
        ) {
          if (value !== undefined) clean[key] = value;
        }
      }

      return Object.freeze(clean);
    },

    getSafeReturnUrl(candidate) {
      if (!candidate) return null;

      try {
        const url = new URL(candidate, window.location.origin);

        if (url.origin !== window.location.origin) return null;

        if (!["http:", "https:"].includes(url.protocol)) return null;

        // Prevent redirects to authentication loops.
        const pathname = url.pathname;

        if (
          pathname === ROUTES.ACCOUNT?.LOGIN ||
          pathname === ROUTES.ACCOUNT?.LOGOUT
        ) {
          return null;
        }

        return `${url.pathname}${url.search}${url.hash}`;
      } catch {
        return null;
      }
    }
  };

  // --------------------------------------------------
  // Errors
  // --------------------------------------------------

  class AuthError extends Error {
    constructor(message, options = {}) {
      super(message);

      this.name = "AuthError";
      this.code = options.code || "AUTH_ERROR";
      this.status = options.status || 0;
      this.details = options.details || null;
    }
  }

  // --------------------------------------------------
  // Endpoint configuration
  //
  // Adjust these paths to match src/routes/index.js
  // and your actual Express route/controller contracts.
  // --------------------------------------------------

  const DEFAULT_ENDPOINTS = Object.freeze({
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    session: "/session",
    verifyEmail: "/verification/verify-email",
    resendVerification: "/verification/resend",
    forgotPassword: "/password/forgot",
    resetPassword: "/password/reset",
    changePassword: "/password/change"
  });

  const ENDPOINTS = Object.freeze({
    ...DEFAULT_ENDPOINTS,
    ...(CONFIG.AUTH_ENDPOINTS || {})
  });

  function endpointUrl(path) {
    const normalized = String(path || "");

    if (
      !normalized ||
      normalized.startsWith("//") ||
      /^[a-z][a-z\d+.-]*:/i.test(normalized)
    ) {
      throw new AuthError(
        "Invalid authentication endpoint configuration.",
        { code: "INVALID_ENDPOINT" }
      );
    }

    const joined = `${API_BASE_URL}/${normalized.replace(/^\/+/, "")}`;

    return joined;
  }

  // --------------------------------------------------
  // HTTP client
  // --------------------------------------------------

  async function request(path, options = {}) {
    const {
      method = "POST",
      body,
      signal,
      timeoutMs = REQUEST_TIMEOUT_MS,
      includeCsrf = true
    } = options;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    let abortHandler;

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        abortHandler = () => controller.abort();
        signal.addEventListener("abort", abortHandler, {
          once: true
        });
      }
    }

    const headers = {
      Accept: "application/json"
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (includeCsrf) {
      const csrfToken = utils.getCsrfToken();

      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
    }

    try {
      const response = await fetch(endpointUrl(path), {
        method,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });

      const contentType = response.headers.get("content-type") || "";

      let payload = null;

      if (response.status !== 204) {
        if (contentType.includes("application/json")) {
          payload = await response.json().catch(() => null);
        } else {
          await response.text().catch(() => "");
        }
      }

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.error?.message ||
          payload?.error ||
          `Authentication request failed (${response.status}).`;

        throw new AuthError(
          typeof message === "string"
            ? message
            : "Authentication request failed.",
          {
            code: payload?.code || "REQUEST_FAILED",
            status: response.status,
            details: payload?.details || null
          }
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthError) throw error;

      if (error?.name === "AbortError") {
        throw new AuthError("The request timed out or was cancelled.", {
          code: "REQUEST_ABORTED"
        });
      }

      throw new AuthError(
        "Unable to contact the authentication service. Please try again.",
        {
          code: "NETWORK_ERROR"
        }
      );
    } finally {
      window.clearTimeout(timeoutId);

      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }

  // --------------------------------------------------
  // Response normalization
  // --------------------------------------------------

  function extractUser(payload) {
    if (!utils.isObject(payload)) return null;

    const candidates = [
      payload.user,
      payload.data?.user,
      payload.data?.profile,
      payload.profile
    ];

    for (const candidate of candidates) {
      if (utils.isObject(candidate)) {
        return utils.sanitizeUser(candidate);
      }
    }

    // A response containing only {data: {...}} is not assumed
    // to be a user unless the object has recognizable user fields.
    const direct = payload.data || payload;

    if (
      utils.isObject(direct) &&
      (
        direct.id !== undefined ||
        direct.userId !== undefined ||
        direct.user_id !== undefined ||
        direct.email !== undefined
      )
    ) {
      return utils.sanitizeUser(direct);
    }

    return null;
  }

  function extractAuthenticated(payload) {
    if (!utils.isObject(payload)) return false;

    if (payload.authenticated === true) return true;
    if (payload.data?.authenticated === true) return true;

    return Boolean(extractUser(payload));
  }

  // --------------------------------------------------
  // State and events
  // --------------------------------------------------

  function emitAuthChange(reason) {
    const detail = Object.freeze({
      authenticated: state.authenticated,
      user: state.user,
      reason
    });

    document.dispatchEvent(
      new CustomEvent(EVENTS.AUTH_CHANGE, {
        detail
      })
    );

    listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch (error) {
        console.error("[MedOrbits Auth] Listener failed.", error);
      }
    });
  }

  function setAuthenticatedUser(user, reason = "session-updated") {
    state.user = utils.sanitizeUser(user);
    state.authenticated = Boolean(state.user);
    state.sessionChecked = true;
    state.lastError = null;

    emitAuthChange(reason);

    return state.user;
  }

  function clearSession(reason = "session-cleared") {
    state.user = null;
    state.authenticated = false;
    state.sessionChecked = true;
    state.lastError = null;

    emitAuthChange(reason);
  }

  // --------------------------------------------------
  // Login
  // --------------------------------------------------

  async function login(credentials = {}) {
    const email = utils.normalizeEmail(credentials.email);
    const password = credentials.password;

    if (!email || !password) {
      throw new AuthError(
        "Enter your email address and password.",
        { code: "MISSING_CREDENTIALS" }
      );
    }

    if (typeof password !== "string") {
      throw new AuthError(
        "Enter a valid password.",
        { code: "INVALID_PASSWORD" }
      );
    }

    state.loading = true;
    state.lastError = null;

    try {
      const payload = await request(ENDPOINTS.login, {
        body: { email, password }
      });

      const user = extractUser(payload);

      if (!user || !extractAuthenticated(payload)) {
        throw new AuthError(
          "The server did not return a valid authenticated session.",
          { code: "INVALID_AUTH_RESPONSE" }
        );
      }

      setAuthenticatedUser(user, "login");

      return Object.freeze({
        success: true,
        user: state.user,
        message: payload?.message || "Login successful."
      });
    } catch (error) {
      state.lastError = error;
      throw error;
    } finally {
      state.loading = false;
    }
  }

  // --------------------------------------------------
  // Registration
  // --------------------------------------------------

  async function register(details = {}) {
    const email = utils.normalizeEmail(details.email);
    const password = details.password;

    if (!email || !password) {
      throw new AuthError(
        "Email address and password are required.",
        { code: "MISSING_REGISTRATION_FIELDS" }
      );
    }

    const minLength = Number(
      CONSTANTS.VALIDATION?.PASSWORD_MIN_LENGTH || 12
    );

    const maxLength = Number(
      CONSTANTS.VALIDATION?.PASSWORD_MAX_LENGTH || 128
    );

    if (
      typeof password !== "string" ||
      password.length < minLength ||
      password.length > maxLength
    ) {
      throw new AuthError(
        `Password must contain between ${minLength} and ${maxLength} characters.`,
        { code: "PASSWORD_POLICY" }
      );
    }

    const body = {
      ...details,
      email,
      password
    };

    // Never permit the browser to assign privileged roles.
    delete body.role;
    delete body.role_name;
    delete body.account_role;
    delete body.isAdmin;
    delete body.is_admin;
    delete body.permissions;

    state.loading = true;

    try {
      const payload = await request(ENDPOINTS.register, {
        body
      });

      const user = extractUser(payload);

      // Registration does not automatically mean a verified
      // authenticated session exists.
      if (user && extractAuthenticated(payload)) {
        setAuthenticatedUser(user, "register");
      }

      return Object.freeze({
        success: true,
        user,
        authenticated: state.authenticated,
        message:
          payload?.message ||
          "Registration received. Follow the verification instructions."
      });
    } catch (error) {
      state.lastError = error;
      throw error;
    } finally {
      state.loading = false;
    }
  }

  // --------------------------------------------------
  // Restore current server-side session
  // --------------------------------------------------

  async function getSession(options = {}) {
    const { force = false } = options;

    if (state.sessionChecked && !force) {
      return state.user;
    }

    state.loading = true;

    try {
      const payload = await request(ENDPOINTS.session, {
        method: "GET",
        includeCsrf: false
      });

      if (!extractAuthenticated(payload)) {
        clearSession("session-anonymous");
        return null;
      }

      const user = extractUser(payload);

      if (!user) {
        clearSession("session-invalid");
        return null;
      }

      return setAuthenticatedUser(user, "session-restored");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearSession("session-expired");
        return null;
      }

      // Network failures are not proof that the server session
      // has expired. Preserve existing in-memory state.
      state.lastError = error;
      throw error;
    } finally {
      state.loading = false;
    }
  }

  async function restoreSession() {
    try {
      return await getSession({ force: true });
    } catch (error) {
      state.lastError = error;
      return null;
    }
  }

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  async function logout(options = {}) {
    const { redirect = false } = options;

    try {
      // Ask the server to invalidate its session cookie.
      await request(ENDPOINTS.logout, {
        body: {}
      });
    } finally {
      // Clear local in-memory state even when the request fails.
      clearSession("logout");

      if (redirect) {
        window.location.assign(ROUTES.ACCOUNT?.LOGIN || "/account/login.html");
      }
    }

    return { success: true };
  }

  // --------------------------------------------------
  // Email verification
  // --------------------------------------------------

  async function verifyEmail(token) {
    const safeToken = utils.safeString(token);

    if (!safeToken) {
      throw new AuthError(
        "A verification token is required.",
        { code: "MISSING_VERIFICATION_TOKEN" }
      );
    }

    const payload = await request(ENDPOINTS.verifyEmail, {
      body: { token: safeToken }
    });

    return {
      success: true,
      message: payload?.message || "Verification request completed."
    };
  }

  async function resendVerification(email) {
    const normalizedEmail = utils.normalizeEmail(email);

    if (!normalizedEmail) {
      throw new AuthError(
        "Enter your email address.",
        { code: "MISSING_EMAIL" }
      );
    }

    const payload = await request(ENDPOINTS.resendVerification, {
      body: { email: normalizedEmail }
    });

    // The server should use a generic response to avoid exposing
    // whether an email address has an account.
    return {
      success: true,
      message:
        payload?.message ||
        "If the account is eligible, verification instructions will be sent."
    };
  }

  // --------------------------------------------------
  // Password reset
  // --------------------------------------------------

  async function requestPasswordReset(email) {
    const normalizedEmail = utils.normalizeEmail(email);

    if (!normalizedEmail) {
      throw new AuthError(
        "Enter your email address.",
        { code: "MISSING_EMAIL" }
      );
    }

    const payload = await request(ENDPOINTS.forgotPassword, {
      body: { email: normalizedEmail }
    });

    return {
      success: true,
      message:
        payload?.message ||
        "If the account exists, password reset instructions will be sent."
    };
  }

  async function resetPassword(details = {}) {
    const token = utils.safeString(details.token);
    const password = details.password;
    const confirmPassword = details.confirmPassword;

    if (!token) {
      throw new AuthError(
        "A password reset token is required.",
        { code: "MISSING_RESET_TOKEN" }
      );
    }

    if (password !== confirmPassword) {
      throw new AuthError(
        "The passwords do not match.",
        { code: "PASSWORD_MISMATCH" }
      );
    }

    const minLength = Number(
      CONSTANTS.VALIDATION?.PASSWORD_MIN_LENGTH || 12
    );

    const maxLength = Number(
      CONSTANTS.VALIDATION?.PASSWORD_MAX_LENGTH || 128
    );

    if (
      typeof password !== "string" ||
      password.length < minLength ||
      password.length > maxLength
    ) {
      throw new AuthError(
        `Password must contain between ${minLength} and ${maxLength} characters.`,
        { code: "PASSWORD_POLICY" }
      );
    }

    const payload = await request(ENDPOINTS.resetPassword, {
      body: {
        token,
        password,
        confirmPassword
      }
    });

    return {
      success: true,
      message: payload?.message || "Password reset completed."
    };
  }

  // --------------------------------------------------
  // Change password for an authenticated user
  // --------------------------------------------------

  async function changePassword(details = {}) {
    if (!state.authenticated) {
      throw new AuthError(
        "Sign in before changing your password.",
        { code: "AUTHENTICATION_REQUIRED", status: 401 }
      );
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = details;

    if (!currentPassword || !newPassword) {
      throw new AuthError(
        "Enter your current password and new password.",
        { code: "MISSING_PASSWORD_FIELDS" }
      );
    }

    if (newPassword !== confirmPassword) {
      throw new AuthError(
        "The passwords do not match.",
        { code: "PASSWORD_MISMATCH" }
      );
    }

    const minLength = Number(
      CONSTANTS.VALIDATION?.PASSWORD_MIN_LENGTH || 12
    );

    const maxLength = Number(
      CONSTANTS.VALIDATION?.PASSWORD_MAX_LENGTH || 128
    );

    if (
      typeof newPassword !== "string" ||
      newPassword.length < minLength ||
      newPassword.length > maxLength
    ) {
      throw new AuthError(
        `Password must contain between ${minLength} and ${maxLength} characters.`,
        { code: "PASSWORD_POLICY" }
      );
    }

    const payload = await request(ENDPOINTS.changePassword, {
      body: {
        currentPassword,
        newPassword,
        confirmPassword
      }
    });

    return {
      success: true,
      message: payload?.message || "Password change completed."
    };
  }

  // --------------------------------------------------
  // Authorization helpers
  // These helpers control UI flow only.
  // Server routes must independently authorize requests.
  // --------------------------------------------------

  function isAuthenticated() {
    return state.authenticated && Boolean(state.user);
  }

  function currentUser() {
    return state.user;
  }

  function hasRole(role) {
    if (!isAuthenticated()) return false;

    const actualRole = utils.getRole(state.user);

    if (!actualRole || !role) return false;

    return actualRole === role;
  }

  function hasAnyRole(roles = []) {
    if (!Array.isArray(roles)) return false;

    return roles.some((role) => hasRole(role));
  }

  function isAdmin() {
    return hasAnyRole([
      AUTH.ROLES?.ADMIN || "admin",
      AUTH.ROLES?.SUPER_ADMIN || "super_admin"
    ]);
  }

  async function requireAuth(options = {}) {
    const {
      redirect = true,
      returnTo = window.location.pathname +
        window.location.search +
        window.location.hash
    } = options;

    let user = null;

    try {
      user = await getSession();
    } catch {
      // Do not claim a valid session when the server cannot
      // confirm it. The caller can display a retry message.
    }

    if (user) return user;

    if (redirect) {
      const safeReturnTo = utils.getSafeReturnUrl(returnTo);
      const loginUrl = new URL(
        ROUTES.ACCOUNT?.LOGIN || "/account/login.html",
        window.location.origin
      );

      if (safeReturnTo) {
        loginUrl.searchParams.set("returnTo", safeReturnTo);
      }

      window.location.assign(
        `${loginUrl.pathname}${loginUrl.search}`
      );
    }

    return null;
  }

  async function requireRole(roles, options = {}) {
    const user = await requireAuth(options);

    if (!user) return null;

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!hasAnyRole(allowedRoles)) {
      if (options.redirectOnForbidden) {
        window.location.assign(
          ROUTES.PAGES?.NOT_FOUND || "/pages/404.html"
        );
      }

      throw new AuthError(
        "Your account does not have access to this area.",
        { code: "FORBIDDEN", status: 403 }
      );
    }

    return user;
  }

  // --------------------------------------------------
  // Auth change subscriptions
  // --------------------------------------------------

  function onChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("onChange expects a function.");
    }

    listeners.add(callback);

    return () => listeners.delete(callback);
  }

  // --------------------------------------------------
  // Login form integration
  // --------------------------------------------------

  function bindLoginForm(form, options = {}) {
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError("A valid login form is required.");
    }

    const {
      emailSelector = '[name="email"]',
      passwordSelector = '[name="password"]',
      submitSelector = '[type="submit"]',
      onSuccess,
      onError
    } = options;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const emailField = form.querySelector(emailSelector);
      const passwordField = form.querySelector(passwordSelector);
      const submitButton = form.querySelector(submitSelector);

      if (!emailField || !passwordField) {
        throw new AuthError(
          "Login form fields are missing.",
          { code: "INVALID_LOGIN_FORM" }
        );
      }

      const originalText = submitButton?.textContent;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.textContent = "Signing in…";
      }

      try {
        const result = await login({
          email: emailField.value,
          password: passwordField.value
        });

        const returnTo = utils.getSafeReturnUrl(
          new URLSearchParams(window.location.search).get("returnTo")
        );

        if (typeof onSuccess === "function") {
          await onSuccess(result);
        } else {
          window.location.assign(
            returnTo || ROUTES.ACCOUNT?.DASHBOARD ||
            "/account/dashboard.html"
          );
        }
      } catch (error) {
        if (typeof onError === "function") {
          onError(error);
        } else if (window.MedOrbits?.toast) {
          window.MedOrbits.toast.error(
            error.message || "Unable to sign in."
          );
        } else {
          console.error("[MedOrbits Auth]", error.message);
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");

          if (originalText !== undefined) {
            submitButton.textContent = originalText;
          }
        }
      }
    });
  }

  // --------------------------------------------------
  // Logout form integration
  // --------------------------------------------------

  function bindLogoutButtons(selector = "[data-auth-logout]") {
    document.querySelectorAll(selector).forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();

        if (button.disabled) return;

        button.disabled = true;

        try {
          await logout({ redirect: true });
        } catch (error) {
          console.error("[MedOrbits Auth] Logout request failed.", error);

          // The server may still have an active session if the
          // logout request failed. Inform the user instead of
          // claiming that server-side logout was confirmed.
          if (window.MedOrbits?.toast) {
            window.MedOrbits.toast.error(
              "Unable to confirm sign out. Please try again."
            );
          }
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  // --------------------------------------------------
  // Initialization
  // --------------------------------------------------

  function init() {
    if (state.initialized) return;

    state.initialized = true;

    bindLogoutButtons();

    document.querySelectorAll("[data-auth-login-form]").forEach((form) => {
      bindLoginForm(form);
    });

    // Restore session without blocking page rendering.
    void restoreSession();

    document.dispatchEvent(
      new CustomEvent("medorbits:auth-module-ready", {
        detail: { version: "1.0.0" }
      })
    );
  }

  // --------------------------------------------------
  // Public interface
  // --------------------------------------------------

  const MedOrbitsAuth = Object.freeze({
    login,
    register,
    logout,

    getSession,
    restoreSession,

    verifyEmail,
    resendVerification,

    requestPasswordReset,
    resetPassword,
    changePassword,

    isAuthenticated,
    currentUser,
    hasRole,
    hasAnyRole,
    isAdmin,
    requireAuth,
    requireRole,

    onChange,
    bindLoginForm,
    bindLogoutButtons,

    get loading() {
      return state.loading;
    },

    get sessionChecked() {
      return state.sessionChecked;
    },

    get lastError() {
      return state.lastError;
    },

    AuthError
  });

  if (window.MedOrbitsAuth) {
    console.warn(
      "[MedOrbits Auth] Authentication module already exists."
    );
    return;
  }

  Object.defineProperty(window, "MedOrbitsAuth", {
    value: MedOrbitsAuth,
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
