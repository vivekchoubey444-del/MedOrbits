
/**
 * MedOrbits -- Colleges Manager
 * File: assets/js/colleges.js
 *
 * Handles college data, searching, filtering, sorting,
 * comparison, details, and college listing UI.
 */

(() => {
  "use strict";

  const CONSTANTS = window.MedOrbitsConstants || {};
  const CONFIG = window.MedOrbitsConfig || {};

  const API = CONSTANTS.API || {
    PREFIX: "/api",
    ENDPOINTS: { COLLEGES: "/colleges" }
  };

  const DATA_FILES = CONSTANTS.DATA_FILES || {
    COLLEGES: "/assets/data/colleges.json"
  };

  const API_BASE_URL = String(
    CONFIG.API_BASE_URL || API.PREFIX || "/api"
  ).replace(/\/+$/, "");

  const ENDPOINT = API.ENDPOINTS?.COLLEGES || "/colleges";

  const state = {
    colleges: [],
    currentCollege: null,
    comparison: [],
    loading: false,
    error: null,
    filters: {
      search: "",
      country: "all",
      state: "all",
      course: "all",
      type: "all",
      maxFees: null
    }
  };

  const listeners = new Set();

  class CollegeError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "CollegeError";
      this.code = options.code || "COLLEGE_ERROR";
      this.status = options.status || 0;
    }
  }

  // --------------------------------------------------
  // Utilities
  // --------------------------------------------------

  const utils = {
    emit(name, detail = {}) {
      document.dispatchEvent(
        new CustomEvent(`medorbits:${name}`, { detail })
      );
    },

    normalize(college) {
      if (!college || typeof college !== "object") return null;
      return Object.freeze({ ...college });
    },

    extractList(payload) {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.colleges)) return payload.colleges;
      if (Array.isArray(payload?.data?.colleges)) return payload.data.colleges;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    },

    extractItem(payload) {
      return payload?.college || payload?.data?.college ||
        payload?.data || payload;
    },

    getId(college) {
      return college?.id ?? college?.college_id ?? college?.slug ?? null;
    },

    getName(college) {
      return String(
        college?.name ||
        college?.college_name ||
        college?.institution_name ||
        "Unnamed College"
      );
    },

    getFees(college) {
      const value = Number(
        college?.annual_fees ??
        college?.fees ??
        college?.tuition_fee ??
        college?.total_fees
      );

      return Number.isFinite(value) && value >= 0 ? value : null;
    },

    formatCurrency(value, currency = "INR") {
      const amount = Number(value);

      if (!Number.isFinite(amount)) return "Not available";

      try {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency,
          maximumFractionDigits: 0
        }).format(amount);
      } catch {
        return String(amount);
      }
    },

    getCsrfToken() {
      return document.querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") || "";
    }
  };

  // --------------------------------------------------
  // HTTP client
  // --------------------------------------------------

  async function request(path = "", options = {}) {
    const { method = "GET", body, signal } = options;
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
        signal.addEventListener("abort", abortHandler, { once: true });
      }
    }

    const headers = { Accept: "application/json" };

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
        throw new CollegeError(
          payload?.message || "Unable to load college information.",
          {
            code: payload?.code || "REQUEST_FAILED",
            status: response.status
          }
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof CollegeError) throw error;

      throw new CollegeError(
        error?.name === "AbortError"
          ? "The college request timed out."
          : "Unable to connect to the college service.",
        { code: error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR" }
      );
    } finally {
      window.clearTimeout(timeout);

      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }

  // --------------------------------------------------
  // Events and state
  // --------------------------------------------------

  function notify(reason) {
    const detail = Object.freeze({
      reason,
      colleges: [...state.colleges],
      currentCollege: state.currentCollege,
      comparison: [...state.comparison],
      loading: state.loading,
      error: state.error,
      filters: Object.freeze({ ...state.filters })
    });

    utils.emit("colleges-updated", detail);

    listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch (error) {
        console.error("[MedOrbits Colleges] Listener failed.", error);
      }
    });
  }

  function setColleges(colleges, reason = "loaded") {
    state.colleges = colleges.map(utils.normalize).filter(Boolean);
    state.error = null;
    notify(reason);
    return [...state.colleges];
  }

  // --------------------------------------------------
  // Load colleges
  // --------------------------------------------------

  async function getAll(options = {}) {
    const params = new URLSearchParams();

    if (options.page) params.set("page", String(options.page));
    if (options.limit) params.set("limit", String(options.limit));
    if (options.search) params.set("search", String(options.search).trim());
    if (options.country) params.set("country", options.country);
    if (options.state) params.set("state", options.state);
    if (options.course) params.set("course", options.course);
    if (options.type) params.set("type", options.type);

    state.loading = true;
    state.error = null;
    notify("loading");

    try {
      const query = params.toString();
      const payload = await request(
        query ? `?${query}` : "",
        { signal: options.signal }
      );

      return setColleges(utils.extractList(payload));
    } catch (error) {
      state.error = error;
      notify("error");
      throw error;
    } finally {
      state.loading = false;
      notify("loading-complete");
    }
  }

  async function getFromJSON(options = {}) {
    const url = options.url || DATA_FILES.COLLEGES;

    state.loading = true;
    state.error = null;
    notify("loading");

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: options.signal
      });

      if (!response.ok) {
        throw new CollegeError("Unable to load the colleges data file.", {
          status: response.status,
          code: "DATA_FILE_ERROR"
        });
      }

      const payload = await response.json();
      return setColleges(utils.extractList(payload), "json-loaded");
    } catch (error) {
      state.error = error;
      notify("error");
      throw error;
    } finally {
      state.loading = false;
      notify("loading-complete");
    }
  }

  async function load(options = {}) {
    try {
      return await getAll(options);
    } catch (error) {
      if (options.fallbackToJSON === true) {
        return getFromJSON(options);
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // College details
  // --------------------------------------------------

  async function getById(id, options = {}) {
    if (id === null || id === undefined || id === "") {
      throw new CollegeError("A college ID is required.");
    }

    const encodedId = encodeURIComponent(String(id));

    try {
      const payload = await request(`/${encodedId}`, {
        signal: options.signal
      });

      const college = utils.normalize(utils.extractItem(payload));

      if (!college) {
        throw new CollegeError("College details were not returned.");
      }

      state.currentCollege = college;
      notify("details-loaded");

      return college;
    } catch (error) {
      if (options.allowLocal !== false) {
        const local = state.colleges.find(
          (item) => String(utils.getId(item)) === String(id)
        );

        if (local) {
          state.currentCollege = local;
          notify("details-loaded");
          return local;
        }
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // Search and filters
  // --------------------------------------------------

  function search(query, colleges = state.colleges) {
    const term = String(query || "").trim().toLowerCase();

    if (!term) return [...colleges];

    return colleges.filter((college) => {
      const searchable = [
        utils.getName(college),
        college.city,
        college.state,
        college.country,
        college.type,
        college.category,
        college.university,
        college.courses,
        college.approved_by,
        college.accreditation
      ]
        .flat()
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  function setFilters(filters = {}) {
    state.filters = { ...state.filters, ...filters };
    notify("filters-changed");
    return getFiltered();
  }

  function getFiltered() {
    const filters = state.filters;

    let results = search(filters.search);

    if (filters.country !== "all") {
      results = results.filter(
        (college) =>
          String(college.country || "India").toLowerCase() ===
          String(filters.country).toLowerCase()
      );
    }

    if (filters.state !== "all") {
      results = results.filter(
        (college) =>
          String(college.state || "").toLowerCase() ===
          String(filters.state).toLowerCase()
      );
    }

    if (filters.course !== "all") {
      results = results.filter((college) => {
        const courses = Array.isArray(college.courses)
          ? college.courses
          : [college.courses || college.course || ""];

        return courses.some(
          (course) =>
            String(course).toLowerCase() ===
            String(filters.course).toLowerCase()
        );
      });
    }

    if (filters.type !== "all") {
      results = results.filter(
        (college) =>
          String(college.type || college.category || "").toLowerCase() ===
          String(filters.type).toLowerCase()
      );
    }

    if (filters.maxFees !== null && filters.maxFees !== "") {
      const maxFees = Number(filters.maxFees);

      if (Number.isFinite(maxFees)) {
        results = results.filter((college) => {
          const fees = utils.getFees(college);
          return fees !== null && fees <= maxFees;
        });
      }
    }

    return results;
  }

  // --------------------------------------------------
  // Sorting
  // --------------------------------------------------

  function sort(colleges = getFiltered(), field = "name", direction = "asc") {
    const multiplier = direction === "desc" ? -1 : 1;

    return [...colleges].sort((a, b) => {
      let first;
      let second;

      if (field === "fees") {
        first = utils.getFees(a) ?? Infinity;
        second = utils.getFees(b) ?? Infinity;
      } else if (field === "rating") {
        first = Number(a.rating) || 0;
        second = Number(b.rating) || 0;
      } else {
        first = utils.getName(a).toLowerCase();
        second = utils.getName(b).toLowerCase();
      }

      if (first < second) return -1 * multiplier;
      if (first > second) return 1 * multiplier;
      return 0;
    });
  }

  // --------------------------------------------------
  // College comparison
  // --------------------------------------------------

  function addToComparison(college) {
    const item = typeof college === "object"
      ? college
      : state.colleges.find(
          (entry) => String(utils.getId(entry)) === String(college)
        );

    if (!item) {
      throw new CollegeError("College not found.");
    }

    const id = utils.getId(item);

    if (id === null) {
      throw new CollegeError("College has no valid identifier.");
    }

    if (
      state.comparison.some(
        (entry) => String(utils.getId(entry)) === String(id)
      )
    ) {
      return [...state.comparison];
    }

    if (state.comparison.length >= 4) {
      throw new CollegeError("You can compare up to four colleges.");
    }

    state.comparison.push(item);
    notify("comparison-updated");

    return [...state.comparison];
  }

  function removeFromComparison(id) {
    state.comparison = state.comparison.filter(
      (college) => String(utils.getId(college)) !== String(id)
    );

    notify("comparison-updated");
    return [...state.comparison];
  }

  function clearComparison() {
    state.comparison = [];
    notify("comparison-cleared");
  }

  // --------------------------------------------------
  // Render college cards
  // --------------------------------------------------

  function renderList(container, colleges = getFiltered()) {
    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    if (!(container instanceof Element)) {
      throw new TypeError("A valid college container is required.");
    }

    const fragment = document.createDocumentFragment();

    if (!colleges.length) {
      const empty = document.createElement("p");
      empty.className = "college-empty";
      empty.textContent = "No colleges found.";
      container.replaceChildren(empty);
      return;
    }

    colleges.forEach((college) => {
      const card = document.createElement("article");
      card.className = "college-card";

      const heading = document.createElement("h3");
      heading.textContent = utils.getName(college);

      const location = document.createElement("p");
      location.className = "college-card__location";
      location.textContent = [
        college.city,
        college.state,
        college.country
      ].filter(Boolean).join(", ") || "Location not available";

      const fees = document.createElement("p");
      fees.className = "college-card__fees";

      const amount = utils.getFees(college);
      fees.textContent = amount === null
        ? "Fees not available"
        : `Fees: ${utils.formatCurrency(amount)}`;

      const actions = document.createElement("div");
      actions.className = "college-card__actions";

      const details = document.createElement("button");
      details.type = "button";
      details.textContent = "View details";

      details.addEventListener("click", () => {
        utils.emit("college-view-requested", {
          id: utils.getId(college)
        });
      });

      const compare = document.createElement("button");
      compare.type = "button";
      compare.textContent = "Compare";

      compare.addEventListener("click", () => {
        try {
          addToComparison(college);
        } catch (error) {
          if (window.MedOrbits?.toast) {
            window.MedOrbits.toast.warning(error.message);
          }
        }
      });

      actions.append(details, compare);
      card.append(heading, location, fees, actions);
      fragment.appendChild(card);
    });

    container.replaceChildren(fragment);
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
    document.querySelectorAll("[data-college-search]").forEach((input) => {
      input.addEventListener("input", () => {
        setFilters({ search: input.value });

        const container = document.querySelector("[data-college-list]");
        if (container) renderList(container);
      });
    });

    document.querySelectorAll("[data-college-filter]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.collegeFilter;

        if (!key) return;

        setFilters({ [key]: input.value });

        const container = document.querySelector("[data-college-list]");
        if (container) renderList(container);
      });
    });

    document.querySelectorAll("[data-college-list]").forEach((container) => {
      renderList(container);
    });
  }

  // --------------------------------------------------
  // Public interface
  // --------------------------------------------------

  const MedOrbitsColleges = Object.freeze({
    CollegeError,

    getAll,
    getFromJSON,
    load,
    getById,

    search,
    setFilters,
    getFiltered,
    sort,

    addToComparison,
    removeFromComparison,
    clearComparison,

    renderList,
    onChange,
    init,

    get state() {
      return Object.freeze({
        colleges: [...state.colleges],
        currentCollege: state.currentCollege,
        comparison: [...state.comparison],
        loading: state.loading,
        error: state.error,
        filters: Object.freeze({ ...state.filters })
      });
    }
  });

  if (window.MedOrbitsColleges) {
    console.warn("[MedOrbits] Colleges module already loaded.");
    return;
  }

  Object.defineProperty(window, "MedOrbitsColleges", {
    value: MedOrbitsColleges,
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
