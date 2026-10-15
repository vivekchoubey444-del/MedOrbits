/* =========================================================
   MedOrbits -- assets/js/verification.js
   Email, phone, identity, and document verification
   ========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};
  const CONSTANTS = window.MedOrbitsConstants || {};

  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";

  const API = CONSTANTS.API || {};

  const ENDPOINTS = {
    status: API.VERIFICATION_STATUS || `${API_BASE}/verification/status`,
    emailSend: API.EMAIL_VERIFICATION_SEND || `${API_BASE}/verification/email/send`,
    emailConfirm: API.EMAIL_VERIFICATION_CONFIRM || `${API_BASE}/verification/email/confirm`,
    phoneSend: API.PHONE_VERIFICATION_SEND || `${API_BASE}/verification/phone/send`,
    phoneConfirm: API.PHONE_VERIFICATION_CONFIRM || `${API_BASE}/verification/phone/confirm`,
    identity: API.IDENTITY_VERIFICATION || `${API_BASE}/verification/identity`,
    documents: API.DOCUMENT_VERIFICATION || `${API_BASE}/verification/documents`
  };

  const STATUS = Object.freeze({
    UNVERIFIED: "unverified",
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected",
    EXPIRED: "expired"
  });

  const state = {
    status: {
      email: STATUS.UNVERIFIED,
      phone: STATUS.UNVERIFIED,
      identity: STATUS.UNVERIFIED,
      documents: STATUS.UNVERIFIED
    },
    loading: false,
    sending: false,
    confirming: false,
    error: null,
    lastUpdated: null
  };

  const listeners = new Set();

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function normalizeStatus(value) {
    const status = String(value || "").trim().toLowerCase();

    const aliases = {
      complete: STATUS.VERIFIED,
      completed: STATUS.VERIFIED,
      success: STATUS.VERIFIED,
      approved: STATUS.VERIFIED,
      in_review: STATUS.PENDING,
      "in-review": STATUS.PENDING,
      processing: STATUS.PENDING,
      declined: STATUS.REJECTED,
      failed: STATUS.REJECTED,
      not_verified: STATUS.UNVERIFIED,
      "not-verified": STATUS.UNVERIFIED
    };

    const normalized = aliases[status] || status;

    return Object.values(STATUS).includes(normalized)
      ? normalized
      : STATUS.UNVERIFIED;
  }

  async function requestJSON(url, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers
    });

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(
        result?.message ||
        result?.error ||
        `Request failed (${response.status})`
      );

      error.status = response.status;
      error.code = result?.code;
      throw error;
    }

    return result;
  }

  function extractData(result) {
    if (!result || typeof result !== "object") return {};
    return result.data || result.verification || result;
  }

  function normalizeVerificationStatus(data = {}) {
    const source = extractData(data);

    const verification = source.verification || source.statuses || source;

    return {
      email: normalizeStatus(
        verification.email?.status ||
        verification.emailVerificationStatus ||
        verification.emailStatus ||
        verification.email
      ),
      phone: normalizeStatus(
        verification.phone?.status ||
        verification.phoneVerificationStatus ||
        verification.phoneStatus ||
        verification.phone
      ),
      identity: normalizeStatus(
        verification.identity?.status ||
        verification.identityVerificationStatus ||
        verification.identityStatus ||
        verification.identity
      ),
      documents: normalizeStatus(
        verification.documents?.status ||
        verification.documentVerificationStatus ||
        verification.documentsStatus ||
        verification.documents
      )
    };
  }

  async function loadStatus() {
    state.loading = true;
    state.error = null;
    notify();

    try {
      const result = await requestJSON(ENDPOINTS.status);
      state.status = normalizeVerificationStatus(result);
      state.lastUpdated = new Date().toISOString();

      return getStatus();
    } catch (error) {
      state.error = error.message || "Unable to load verification status.";
      throw error;
    } finally {
      state.loading = false;
      notify();
    }
  }

  async function sendEmailVerification(email) {
    const value = String(email || "").trim().toLowerCase();

    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error("Enter a valid email address.");
    }

    state.sending = true;
    state.error = null;
    notify();

    try {
      const result = await requestJSON(ENDPOINTS.emailSend, {
        method: "POST",
        body: JSON.stringify({ email: value })
      });

      state.status.email = STATUS.PENDING;
      notify();

      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      state.sending = false;
      notify();
    }
  }

  async function confirmEmailVerification(token) {
    const value = String(token || "").trim();

    if (!value) {
      throw new Error("Verification token is required.");
    }

    state.confirming = true;
    state.error = null;
    notify();

    try {
      const result = await requestJSON(ENDPOINTS.emailConfirm, {
        method: "POST",
        body: JSON.stringify({ token: value })
      });

      state.status.email = STATUS.VERIFIED;
      state.lastUpdated = new Date().toISOString();

      notify();
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      state.confirming = false;
      notify();
    }
  }

  async function sendPhoneVerification(phone, countryCode = "") {
    const value = String(phone || "").trim();
    const digits = value.replace(/\D/g, "");

    if (digits.length < 7 || digits.length > 15) {
      throw new Error("Enter a valid phone number.");
    }

    state.sending = true;
    state.error = null;
    notify();

    try {
      const result = await requestJSON(ENDPOINTS.phoneSend, {
        method: "POST",
        body: JSON.stringify({
          phone: value,
          countryCode: String(countryCode || "").trim()
        })
      });

      state.status.phone = STATUS.PENDING;
      notify();

      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      state.sending = false;
      notify();
    }
  }

  async function confirmPhoneVerification(phone, code) {
    const phoneValue = String(phone || "").trim();
    const codeValue = String(code || "").trim();

    if (!phoneValue) {
      throw new Error("Phone number is required.");
    }

    if (!/^\d{4,8}$/.test(codeValue)) {
      throw new Error("Enter a valid verification code.");
    }

    state.confirming = true;
    state.error = null;
    notify();

    try {
      const result = await requestJSON(ENDPOINTS.phoneConfirm, {
        method: "POST",
        body: JSON.stringify({
          phone: phoneValue,
          code: codeValue
        })
      });

      state.status.phone = STATUS.VERIFIED;
      state.lastUpdated = new Date().toISOString();

      notify();
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      state.confirming = false;
      notify();
    }
  }

  async function submitIdentityVerification(payload = {}) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Identity verification details are required.");
    }

    state.loading = true;
    state.error = null;
    notify();

    try {
      const result = await requestJSON(ENDPOINTS.identity, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      state.status.identity = STATUS.PENDING;
      notify();

      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      state.loading = false;
      notify();
    }
  }

  async function submitDocumentVerification(payload = {}) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Document verification details are required.");
    }

    state.loading = true;
    state.error = null;
    notify();

    try {
      const result = await requestJSON(ENDPOINTS.documents, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      state.status.documents = STATUS.PENDING;
      notify();

      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      state.loading = false;
      notify();
    }
  }

  function setError(error) {
    state.error = error?.message || "Verification failed.";

    if (window.MedOrbitsErrorHandler?.handle) {
      window.MedOrbitsErrorHandler.handle(
        error,
        { source: "verification" },
        { silent: true }
      );
    }
  }

  function getStatus() {
    return { ...state.status };
  }

  function isVerified(type) {
    const key = String(type || "").toLowerCase();

    return Object.prototype.hasOwnProperty.call(state.status, key) &&
      state.status[key] === STATUS.VERIFIED;
  }

  function isFullyVerified(types = ["email", "phone"]) {
    return types.every(type => isVerified(type));
  }

  function getProgress(types = ["email", "phone", "identity", "documents"]) {
    if (!types.length) return 100;

    const completed = types.filter(type => isVerified(type)).length;

    return Math.round((completed / types.length) * 100);
  }

  function getState() {
    return {
      status: getStatus(),
      loading: state.loading,
      sending: state.sending,
      confirming: state.confirming,
      error: state.error,
      lastUpdated: state.lastUpdated,
      progress: getProgress()
    };
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return () => {};

    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function notify() {
    const snapshot = getState();

    listeners.forEach(callback => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error("[MedOrbits Verification] Listener error:", error);
      }
    });

    document.dispatchEvent(
      new CustomEvent("medorbits:verification-updated", {
        detail: snapshot
      })
    );

    renderAll();
  }

  function resolveElement(element) {
    if (!element) return null;

    return typeof element === "string"
      ? document.querySelector(element)
      : element;
  }

  function renderStatus(container) {
    const target = resolveElement(container);
    if (!target) return false;

    const labels = {
      email: "Email Verification",
      phone: "Phone Verification",
      identity: "Identity Verification",
      documents: "Document Verification"
    };

    target.innerHTML = Object.entries(state.status).map(([key, value]) => `
      <div class="verification-item verification-item--${escapeHTML(value)}"
           data-verification-type="${escapeHTML(key)}">
        <div class="verification-item__content">
          <h3>${escapeHTML(labels[key] || key)}</h3>
          <span class="verification-status verification-status--${escapeHTML(value)}">
            ${escapeHTML(value.charAt(0).toUpperCase() + value.slice(1))}
          </span>
        </div>
      </div>
    `).join("");

    return true;
  }

  function renderProgress(container) {
    const target = resolveElement(container);
    if (!target) return false;

    const progress = getProgress();

    target.innerHTML = `
      <div class="verification-progress">
        <div class="verification-progress__header">
          <span>Verification Progress</span>
          <strong>${progress}%</strong>
        </div>
        <div class="verification-progress__track"
             role="progressbar"
             aria-valuemin="0"
             aria-valuemax="100"
             aria-valuenow="${progress}"
             aria-label="Verification progress">
          <span class="verification-progress__bar"
                style="width:${progress}%"></span>
        </div>
      </div>
    `;

    return true;
  }

  function renderAll() {
    renderStatus("[data-verification-status]");
    renderProgress("[data-verification-progress]");
  }

  function showMessage(message, type = "info") {
    if (window.MedOrbitsToast?.show) {
      window.MedOrbitsToast.show(message, type);
      return;
    }

    document.dispatchEvent(
      new CustomEvent("medorbits:toast", {
        detail: { message, type }
      })
    );
  }

  document.addEventListener("submit", async event => {
    const emailForm = event.target.closest("[data-email-verification-form]");
    const phoneForm = event.target.closest("[data-phone-verification-form]");
    const emailConfirmForm = event.target.closest("[data-email-confirm-form]");
    const phoneConfirmForm = event.target.closest("[data-phone-confirm-form]");

    const form = emailForm || phoneForm || emailConfirmForm || phoneConfirmForm;
    if (!form) return;

    event.preventDefault();

    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = true;

    try {
      const data = new FormData(form);

      if (emailForm) {
        await sendEmailVerification(data.get("email"));
        showMessage("Verification email requested.", "success");
      } else if (phoneForm) {
        await sendPhoneVerification(
          data.get("phone"),
          data.get("countryCode")
        );
        showMessage("Phone verification code requested.", "success");
      } else if (emailConfirmForm) {
        await confirmEmailVerification(data.get("token"));
        showMessage("Email verified successfully.", "success");
      } else if (phoneConfirmForm) {
        await confirmPhoneVerification(
          data.get("phone"),
          data.get("code")
        );
        showMessage("Phone verified successfully.", "success");
      }

      await loadStatus().catch(() => {});
    } catch (error) {
      showMessage(error.message || "Verification failed.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const hasVerificationUI =
      document.querySelector("[data-verification-status]") ||
      document.querySelector("[data-verification-progress]");

    if (!hasVerificationUI) return;

    loadStatus().catch(() => {
      renderAll();
    });
  });

  window.MedOrbitsVerification = {
    STATUS,
    loadStatus,
    sendEmailVerification,
    confirmEmailVerification,
    sendPhoneVerification,
    confirmPhoneVerification,
    submitIdentityVerification,
    submitDocumentVerification,
    getStatus,
    getState,
    isVerified,
    isFullyVerified,
    getProgress,
    renderStatus,
    renderProgress,
    renderAll,
    subscribe
  };

})(window, document);