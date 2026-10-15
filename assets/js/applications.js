
/**
 * MedOrbits -- Applications Manager
 * File: assets/js/applications.js
 *
 * Handles education admissions, job applications,
 * application tracking, filtering, and status updates.
 */

(() => {
  "use strict";

  const CONSTANTS = window.MedOrbitsConstants || {};

  const API = CONSTANTS.API || {
    PREFIX: "/api",
    ENDPOINTS: {
      APPLICATIONS: "/applications"
    }
  };

  const CONFIG = window.MedOrbitsConfig || {};

  const API_BASE_URL = String(
    CONFIG.API_BASE_URL || API.PREFIX || "/api"
  ).replace(/\/+$/, "");

  const ENDPOINT = API.ENDPOINTS?.APPLICATIONS || "/applications";

  const STATUS = Object.freeze({
    DRAFT: "draft",
    SUBMITTED: "submitted",
    UNDER_REVIEW: "under_review",
    SHORTLISTED: "shortlisted",
    APPROVED: "approved",
    REJECTED: "rejected",
    INTERVIEW: "interview",
    OFFERED: "offered",
    HIRED: "hired",
    WITHDRAWN: "withdrawn",
    COMPLETED: "completed"
  });

  const state = {
    applications: [],
    currentApplication: null,
    loading: false,
    error: null,
    filters: {
      type: "all",
      status: "all",
      search: ""
    }
  };

  const listeners = new Set();

  class ApplicationError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "ApplicationError";
      this.code = options.code || "APPLICATION_ERROR";
      this.status = options.status || 0;
      this.details = options.details || null;
    }
  }

  // --------------------------------------------------
  // Utilities
  // --------------------------------------------------

  const utils = {
    normalizeId(id) {
      if (id === null || id === undefined || id === "") {
        throw new ApplicationError(
          "A valid application ID is required.",
          { code: "INVALID_APPLICATION_ID" }
        );
      }

      return encodeURIComponent(String(id));
    },

    getCsrfToken() {
      return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") || "";
    },

    emit(name, detail = {}) {
      document.dispatchEvent(
        new CustomEvent(`medorbits:${name}`, { detail })
      );
    },

    normalizeApplication(application) {
      if (!application || typeof application !== "object") {
        return null;
      }

      return Object.freeze({ ...application });
    },

    extractList(payload) {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.applications)) {
        return payload.applications;
      }
      if (Array.isArray(payload?.data?.applications)) {
        return payload.data.applications;
      }
      if (Array.isArray(payload?.data)) return payload.data;

      return [];
    },

    extractItem(payload) {
      return (
        payload?.application ||
        payload?.data?.application ||
        payload?.data ||
        payload
      );
    }
  };

  // --------------------------------------------------
  // HTTP client
  // --------------------------------------------------

  async function request(path = "", options = {}) {
    const {
      method = "GET",
      body,
      signal
    } = options;

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Number(API.DEFAULT_TIMEOUT_MS || 15000)
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

    const csrfToken = utils.getCsrfToken();

    if (csrfToken && method !== "GET" && method !== "HEAD") {
      headers["X-CSRF-Token"] = csrfToken;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}${ENDPOINT}${path}`,
        {
          method,
          headers,
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal
        }
      );

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
        throw new ApplicationError(
          payload?.message ||
          payload?.error?.message ||
          "Unable to process the application request.",
          {
            code: payload?.code || "REQUEST_FAILED",
            status: response.status,
            details: payload?.details || null
          }
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      throw new ApplicationError(
        error?.name === "AbortError"
          ? "The application request timed out."
          : "Unable to connect to the application service.",
        {
          code: error?.name === "AbortError"
            ? "REQUEST_TIMEOUT"
            : "NETWORK_ERROR"
        }
      );
    } finally {
      window.clearTimeout(timeout);

      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }

  // --------------------------------------------------
  // State management
  // --------------------------------------------------

  function notify(reason) {
    const detail = Object.freeze({
      reason,
      applications: [...state.applications],
      currentApplication: state.currentApplication,
      loading: state.loading,
      error: state.error
    });

    utils.emit("applications-updated", detail);

    listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch (error) {
        console.error("[MedOrbits Applications] Listener failed.", error);
      }
    });
  }

  function setApplications(applications, reason = "loaded") {
    state.applications = applications
      .map(utils.normalizeApplication)
      .filter(Boolean);

    state.error = null;
    notify(reason);

    return [...state.applications];
  }

  // --------------------------------------------------
  // List applications
  // --------------------------------------------------

  async function getAll(options = {}) {
    const params = new URLSearchParams();

    const page = Number(options.page || 1);
    const limit = Number(options.limit || 20);

    params.set("page", String(
      Number.isInteger(page) && page > 0 ? page : 1
    ));

    params.set("limit", String(
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 20
    ));

    if (options.type && options.type !== "all") {
      params.set("type", options.type);
    }

    if (options.status && options.status !== "all") {
      params.set("status", options.status);
    }

    if (options.search) {
      params.set("search", String(options.search).trim());
    }

    state.loading = true;
    state.error = null;
    notify("loading");

    try {
      const payload = await request(`?${params.toString()}`, {
        signal: options.signal
      });

      return setApplications(
        utils.extractList(payload),
        "loaded"
      );
    } catch (error) {
      state.error = error;
      notify("error");
      throw error;
    } finally {
      state.loading = false;
      notify("loading-complete");
    }
  }

  async function getMine(options = {}) {
    return getAll(options);
  }

  // --------------------------------------------------
  // Get application details
  // --------------------------------------------------

  async function getById(id, options = {}) {
    const payload = await request(
      `/${utils.normalizeId(id)}`,
      { signal: options.signal }
    );

    const application = utils.normalizeApplication(
      utils.extractItem(payload)
    );

    if (!application) {
      throw new ApplicationError(
        "Application details were not returned.",
        { code: "INVALID_RESPONSE" }
      );
    }

    state.currentApplication = application;
    notify("details-loaded");

    return application;
  }

  // --------------------------------------------------
  // Submit an application
  // --------------------------------------------------

  async function submit(details = {}) {
    if (!details || typeof details !== "object") {
      throw new ApplicationError(
        "Valid application details are required."
      );
    }

    const payload = await request("", {
      method: "POST",
      body: { ...details }
    });

    const application = utils.normalizeApplication(
      utils.extractItem(payload)
    );

    if (application) {
      state.currentApplication = application;

      const id = application.id ?? application.application_id;

      if (id !== undefined && id !== null) {
        const existing = state.applications.findIndex(
          (item) => String(item.id ?? item.application_id) === String(id)
        );

        if (existing >= 0) {
          state.applications[existing] = application;
        } else {
          state.applications.unshift(application);
        }
      }

      notify("submitted");
    }

    utils.emit("application-submitted", { application });

    return {
      success: true,
      application,
      message: payload?.message || "Application submitted."
    };
  }

  // --------------------------------------------------
  // Update an application
  // --------------------------------------------------

  async function update(id, changes = {}) {
    if (!changes || typeof changes !== "object") {
      throw new ApplicationError(
        "Valid application updates are required."
      );
    }

    const payload = await request(
      `/${utils.normalizeId(id)}`,
      {
        method: "PATCH",
        body: { ...changes }
      }
    );

    const application = utils.normalizeApplication(
      utils.extractItem(payload)
    );

    if (application) {
      state.currentApplication = application;

      const updatedId = String(
        application.id ?? application.application_id ?? id
      );

      const index = state.applications.findIndex(
        (item) =>
          String(item.id ?? item.application_id) === updatedId
      );

      if (index >= 0) {
        state.applications[index] = application;
      }

      notify("updated");
    }

    return application;
  }

  // --------------------------------------------------
  // Withdraw an application
  // --------------------------------------------------

  async function withdraw(id, reason = "") {
    const payload = await request(
      `/${utils.normalizeId(id)}/withdraw`,
      {
        method: "POST",
        body: { reason: String(reason).trim() }
      }
    );

    const application = utils.normalizeApplication(
      utils.extractItem(payload)
    );

    if (application) {
      const withdrawnId = String(
        application.id ?? application.application_id ?? id
      );

      const index = state.applications.findIndex(
        (item) =>
          String(item.id ?? item.application_id) === withdrawnId
      );

      if (index >= 0) {
        state.applications[index] = application;
      }

      if (
        String(
          state.currentApplication?.id ??
          state.currentApplication?.application_id
        ) === withdrawnId
      ) {
        state.currentApplication = application;
      }
    }

    notify("withdrawn");

    return {
      success: true,
      application,
      message: payload?.message || "Withdrawal request processed."
    };
  }

  // --------------------------------------------------
  // Delete a draft application
  // --------------------------------------------------

  async function deleteDraft(id) {
    const payload = await request(
      `/${utils.normalizeId(id)}`,
      { method: "DELETE" }
    );

    state.applications = state.applications.filter(
      (item) =>
        String(item.id ?? item.application_id) !== String(id)
    );

    if (
      String(
        state.currentApplication?.id ??
        state.currentApplication?.application_id
      ) === String(id)
    ) {
      state.currentApplication = null;
    }

    notify("deleted");

    return {
      success: true,
      message: payload?.message || "Draft application deleted."
    };
  }

  // --------------------------------------------------
  // Local filtering
  // --------------------------------------------------

  function setFilters(filters = {}) {
    state.filters = {
      ...state.filters,
      ...filters
    };

    notify("filters-changed");

    return getFiltered();
  }

  function getFiltered() {
    const { type, status, search } = state.filters;
    const query = String(search || "").trim().toLowerCase();

    return state.applications.filter((application) => {
      const applicationType = String(
        application.type ||
        application.application_type ||
        "education"
      ).toLowerCase();

      const applicationStatus = String(
        application.status || ""
      ).toLowerCase();

      const searchable = [
        application.id,
        application.application_id,
        application.title,
        application.course,
        application.college,
        application.university,
        application.job_title,
        application.company,
        application.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (type === "all" || applicationType === type.toLowerCase()) &&
        (status === "all" || applicationStatus === status.toLowerCase()) &&
        (!query || searchable.includes(query))
      );
    });
  }

  // --------------------------------------------------
  // Render application list
  // --------------------------------------------------

  function renderList(container, applications = getFiltered()) {
    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    if (!(container instanceof Element)) {
      throw new TypeError("A valid application list container is required.");
    }

    const fragment = document.createDocumentFragment();

    if (!applications.length) {
      const empty = document.createElement("p");
      empty.className = "applications-empty";
      empty.textContent = "No applications found.";
      container.replaceChildren(empty);
      return;
    }

    applications.forEach((application) => {
      const card = document.createElement("article");
      card.className = "application-card";

      const title = document.createElement("h3");
      title.textContent =
        application.title ||
        application.course ||
        application.job_title ||
        "Application";

      const reference = document.createElement("p");
      reference.className = "application-card__reference";
      reference.textContent =
        `Reference: ${application.application_id ?? application.id ?? "Pending"}`;

      const status = document.createElement("span");
      status.className = "application-card__status";
      status.dataset.status = String(application.status || "pending");
      status.textContent = String(application.status || "Pending")
        .replace(/[_-]/g, " ");

      const view = document.createElement("button");
      view.type = "button";
      view.className = "application-card__view";
      view.textContent = "View details";

      view.addEventListener("click", () => {
        const id = application.id ?? application.application_id;

        if (id !== undefined && id !== null) {
          utils.emit("application-view-requested", {
            id: String(id)
          });
        }
      });

      card.append(title, reference, status, view);
      fragment.appendChild(card);
    });

    container.replaceChildren(fragment);
  }

  // --------------------------------------------------
  // Form integration
  // --------------------------------------------------

  function bindForm(form, options = {}) {
    if (typeof form === "string") {
      form = document.querySelector(form);
    }

    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError("A valid application form is required.");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const submitButton = form.querySelector('[type="submit"]');

      if (submitButton?.disabled) return;

      const originalText = submitButton?.textContent;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.textContent = "Submitting…";
      }

      try {
        const details = Object.fromEntries(new FormData(form).entries());
        const result = await submit(details);

        if (typeof options.onSuccess === "function") {
          await options.onSuccess(result);
        } else if (window.MedOrbits?.toast) {
          window.MedOrbits.toast.success(result.message);
        }

        if (options.resetOnSuccess === true) {
          form.reset();
        }
      } catch (error) {
        if (typeof options.onError === "function") {
          options.onError(error);
        } else if (window.MedOrbits?.toast) {
          window.MedOrbits.toast.error(error.message);
        } else {
          console.error("[MedOrbits Applications]", error);
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
  // Change subscriptions
  // --------------------------------------------------

  function onChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("onChange expects a function.");
    }

    listeners.add(callback);

    return () => listeners.delete(callback);
  }

  // --------------------------------------------------
  // Initialization
  // --------------------------------------------------

  function init() {
    document.querySelectorAll("[data-application-form]").forEach((form) => {
      bindForm(form);
    });

    document.querySelectorAll("[data-application-list]").forEach((container) => {
      renderList(container);
    });

    document.querySelectorAll("[data-application-refresh]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;

        try {
          await getMine();
          const container = document.querySelector("[data-application-list]");

          if (container) renderList(container);
        } catch (error) {
          if (window.MedOrbits?.toast) {
            window.MedOrbits.toast.error(error.message);
          }
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  // --------------------------------------------------
  // Public API
  // --------------------------------------------------

  const MedOrbitsApplications = Object.freeze({
    STATUS,
    ApplicationError,

    getAll,
    getMine,
    getById,
    submit,
    update,
    withdraw,
    deleteDraft,

    setFilters,
    getFiltered,
    renderList,
    bindForm,
    onChange,

    get state() {
      return Object.freeze({
        applications: [...state.applications],
        currentApplication: state.currentApplication,
        loading: state.loading,
        error: state.error,
        filters: Object.freeze({ ...state.filters })
      });
    },

    init
  });

  if (window.MedOrbitsApplications) {
    console.warn("[MedOrbits] Applications module already loaded.");
    return;
  }

  Object.defineProperty(window, "MedOrbitsApplications", {
    value: MedOrbitsApplications,
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
