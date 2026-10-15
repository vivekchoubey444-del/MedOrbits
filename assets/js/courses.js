/* =========================================================
   MedOrbits -- assets/js/courses.js
   Course listing, search, filtering, sorting, and details
   ========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};
  const CONSTANTS = window.MedOrbitsConstants || {};

  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";

  const DATA_URL = "/assets/data/courses.json";
  const API_URL =
    CONSTANTS.API?.COURSES ||
    `${API_BASE}/courses`;

  const state = {
    courses: [],
    filtered: [],
    filters: {
      search: "",
      category: "",
      level: "",
      mode: "",
      minFee: "",
      maxFee: "",
      sort: "name-asc"
    },
    loading: false,
    error: null
  };

  const listeners = new Set();

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function getCourseId(course) {
    return String(course.id ?? course.courseId ?? course.slug ?? "");
  }

  function getCourseName(course) {
    return course.name || course.title || course.courseName || "Untitled Course";
  }

  function getCourseCategory(course) {
    return course.category || course.stream || course.field || "";
  }

  function getCourseLevel(course) {
    return course.level || course.degreeLevel || "";
  }

  function getCourseMode(course) {
    return course.mode || course.studyMode || "";
  }

  function getCourseFee(course) {
    const fee = Number(
      course.fee ??
      course.fees ??
      course.annualFee ??
      course.totalFee ??
      0
    );

    return Number.isFinite(fee) ? fee : 0;
  }

  function formatCurrency(amount, currency = "INR") {
    const value = Number(amount);

    if (!Number.isFinite(value)) return "Contact for fees";

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `₹${value.toLocaleString("en-IN")}`;
    }
  }

  function formatDuration(course) {
    if (course.duration) return String(course.duration);

    const years = course.durationYears;
    const months = course.durationMonths;

    if (years && months) return `${years} years ${months} months`;
    if (years) return `${years} years`;
    if (months) return `${months} months`;

    return "Duration varies";
  }

  async function requestJSON(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    return response.json();
  }

  function extractList(data) {
    if (Array.isArray(data)) return data;

    return (
      data?.courses ||
      data?.data?.courses ||
      data?.data ||
      data?.results ||
      []
    );
  }

  async function load(options = {}) {
    state.loading = true;
    state.error = null;
    notify();

    try {
      let courses = [];

      if (options.localOnly) {
        const data = await requestJSON(DATA_URL);
        courses = extractList(data);
      } else {
        try {
          const data = await requestJSON(API_URL);
          courses = extractList(data);
        } catch {
          const data = await requestJSON(DATA_URL);
          courses = extractList(data);
        }
      }

      state.courses = courses.filter(
        course => course && typeof course === "object"
      );

      applyFilters();
      return getCourses();
    } catch (error) {
      state.error = error.message || "Unable to load courses.";
      state.courses = [];
      state.filtered = [];
      notify();
      return [];
    } finally {
      state.loading = false;
      notify();
    }
  }

  function applyFilters() {
    const filters = state.filters;

    let results = [...state.courses];

    if (filters.search) {
      const query = normalize(filters.search);

      results = results.filter(course => {
        const searchable = [
          getCourseName(course),
          getCourseCategory(course),
          getCourseLevel(course),
          getCourseMode(course),
          course.description,
          course.eligibility,
          course.degree
        ].map(normalize).join(" ");

        return searchable.includes(query);
      });
    }

    if (filters.category) {
      results = results.filter(
        course => normalize(getCourseCategory(course)) === normalize(filters.category)
      );
    }

    if (filters.level) {
      results = results.filter(
        course => normalize(getCourseLevel(course)) === normalize(filters.level)
      );
    }

    if (filters.mode) {
      results = results.filter(
        course => normalize(getCourseMode(course)) === normalize(filters.mode)
      );
    }

    if (filters.minFee !== "" && Number.isFinite(Number(filters.minFee))) {
      results = results.filter(
        course => getCourseFee(course) >= Number(filters.minFee)
      );
    }

    if (filters.maxFee !== "" && Number.isFinite(Number(filters.maxFee))) {
      results = results.filter(
        course => getCourseFee(course) <= Number(filters.maxFee)
      );
    }

    results.sort((a, b) => {
      switch (filters.sort) {
        case "name-desc":
          return getCourseName(b).localeCompare(getCourseName(a));

        case "fee-asc":
          return getCourseFee(a) - getCourseFee(b);

        case "fee-desc":
          return getCourseFee(b) - getCourseFee(a);

        case "duration-asc":
          return Number(a.durationYears || 0) - Number(b.durationYears || 0);

        case "name-asc":
        default:
          return getCourseName(a).localeCompare(getCourseName(b));
      }
    });

    state.filtered = results;
    notify();

    return getCourses();
  }

  function setFilters(updates = {}) {
    Object.keys(updates).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(state.filters, key)) {
        state.filters[key] = updates[key] ?? "";
      }
    });

    return applyFilters();
  }

  function resetFilters() {
    state.filters = {
      search: "",
      category: "",
      level: "",
      mode: "",
      minFee: "",
      maxFee: "",
      sort: "name-asc"
    };

    return applyFilters();
  }

  function getCourses() {
    return [...state.filtered];
  }

  function getAllCourses() {
    return [...state.courses];
  }

  function getCourse(id) {
    const target = String(id);

    return (
      state.courses.find(course => getCourseId(course) === target) ||
      state.courses.find(course => normalize(getCourseName(course)) === normalize(target)) ||
      null
    );
  }

  function getCategories() {
    return [...new Set(
      state.courses.map(getCourseCategory).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }

  function getLevels() {
    return [...new Set(
      state.courses.map(getCourseLevel).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }

  function getModes() {
    return [...new Set(
      state.courses.map(getCourseMode).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }

  function renderCard(course) {
    const id = escapeHTML(getCourseId(course));
    const name = escapeHTML(getCourseName(course));
    const category = escapeHTML(getCourseCategory(course) || "General");
    const level = escapeHTML(getCourseLevel(course) || "All levels");
    const duration = escapeHTML(formatDuration(course));
    const fee = escapeHTML(
      course.fee || course.fees || course.annualFee || course.totalFee
        ? formatCurrency(getCourseFee(course), course.currency || "INR")
        : "Contact for fees"
    );
    const description = escapeHTML(
      course.description || "Explore course details and admission requirements."
    );

    return `
      <article class="course-card" data-course-id="${id}">
        <div class="course-card__content">
          <span class="course-card__category">${category}</span>
          <h3 class="course-card__title">${name}</h3>
          <p class="course-card__description">${description}</p>

          <dl class="course-card__details">
            <div>
              <dt>Level</dt>
              <dd>${level}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>${duration}</dd>
            </div>
            <div>
              <dt>Fees</dt>
              <dd>${fee}</dd>
            </div>
          </dl>

          <a
            class="course-card__link"
            href="/courses.html?id=${encodeURIComponent(getCourseId(course))}"
            data-course-details="${id}"
          >
            View Course Details
          </a>
        </div>
      </article>
    `;
  }

  function render(container, courses = state.filtered) {
    const target = typeof container === "string"
      ? document.querySelector(container)
      : container;

    if (!target) return false;

    if (state.loading && !courses.length) {
      target.innerHTML = '<p class="courses-status">Loading courses...</p>';
      return true;
    }

    if (state.error && !courses.length) {
      target.innerHTML = `
        <p class="courses-status courses-status--error">
          ${escapeHTML(state.error)}
        </p>
      `;
      return true;
    }

    if (!courses.length) {
      target.innerHTML = '<p class="courses-status">No courses found.</p>';
      return true;
    }

    target.innerHTML = courses.map(renderCard).join("");
    return true;
  }

  function renderFilters(container) {
    const target = typeof container === "string"
      ? document.querySelector(container)
      : container;

    if (!target) return false;

    const categories = getCategories();
    const levels = getLevels();
    const modes = getModes();

    target.innerHTML = `
      <form class="courses-filters" data-courses-filter-form>
        <input
          type="search"
          name="search"
          placeholder="Search courses..."
          value="${escapeHTML(state.filters.search)}"
          aria-label="Search courses"
        />

        <select name="category" aria-label="Course category">
          <option value="">All categories</option>
          ${categories.map(item => `
            <option value="${escapeHTML(item)}"
              ${normalize(item) === normalize(state.filters.category) ? "selected" : ""}>
              ${escapeHTML(item)}
            </option>
          `).join("")}
        </select>

        <select name="level" aria-label="Course level">
          <option value="">All levels</option>
          ${levels.map(item => `
            <option value="${escapeHTML(item)}"
              ${normalize(item) === normalize(state.filters.level) ? "selected" : ""}>
              ${escapeHTML(item)}
            </option>
          `).join("")}
        </select>

        <select name="mode" aria-label="Study mode">
          <option value="">All study modes</option>
          ${modes.map(item => `
            <option value="${escapeHTML(item)}"
              ${normalize(item) === normalize(state.filters.mode) ? "selected" : ""}>
              ${escapeHTML(item)}
            </option>
          `).join("")}
        </select>

        <input
          type="number"
          name="minFee"
          min="0"
          placeholder="Minimum fee"
          value="${escapeHTML(state.filters.minFee)}"
          aria-label="Minimum fee"
        />

        <input
          type="number"
          name="maxFee"
          min="0"
          placeholder="Maximum fee"
          value="${escapeHTML(state.filters.maxFee)}"
          aria-label="Maximum fee"
        />

        <select name="sort" aria-label="Sort courses">
          <option value="name-asc">Name: A–Z</option>
          <option value="name-desc">Name: Z–A</option>
          <option value="fee-asc">Fee: Low to high</option>
          <option value="fee-desc">Fee: High to low</option>
          <option value="duration-asc">Duration: Shortest first</option>
        </select>

        <button type="submit">Apply Filters</button>
        <button type="reset" data-courses-reset>Reset</button>
      </form>
    `;

    const form = target.querySelector("[data-courses-filter-form]");

    form?.addEventListener("submit", event => {
      event.preventDefault();
      const values = new FormData(form);

      setFilters({
        search: values.get("search"),
        category: values.get("category"),
        level: values.get("level"),
        mode: values.get("mode"),
        minFee: values.get("minFee"),
        maxFee: values.get("maxFee"),
        sort: values.get("sort")
      });
    });

    form?.addEventListener("reset", event => {
      event.preventDefault();
      resetFilters();
      renderFilters(target);
    });

    return true;
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return () => {};
    listeners.add(callback);

    return () => listeners.delete(callback);
  }

  function notify() {
    const snapshot = {
      courses: getCourses(),
      allCourses: getAllCourses(),
      filters: { ...state.filters },
      loading: state.loading,
      error: state.error
    };

    listeners.forEach(callback => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error("[MedOrbits Courses] Listener error:", error);
      }
    });

    document.dispatchEvent(
      new CustomEvent("medorbits:courses-updated", { detail: snapshot })
    );
  }

  function getState() {
    return {
      courses: getCourses(),
      allCourses: getAllCourses(),
      filters: { ...state.filters },
      loading: state.loading,
      error: state.error
    };
  }

  function init(options = {}) {
    const filtersSelector = options.filters || "[data-courses-filters]";
    const listSelector = options.list || "[data-courses-list]";

    const filtersContainer = document.querySelector(filtersSelector);
    const listContainer = document.querySelector(listSelector);

    if (filtersContainer) renderFilters(filtersContainer);

    subscribe(() => {
      if (listContainer) render(listContainer);
    });

    return load(options).then(courses => {
      if (filtersContainer) renderFilters(filtersContainer);
      if (listContainer) render(listContainer, courses);
      return courses;
    });
  }

  window.MedOrbitsCourses = {
    load,
    init,
    getCourses,
    getAllCourses,
    getCourse,
    getCategories,
    getLevels,
    getModes,
    getState,
    setFilters,
    resetFilters,
    applyFilters,
    formatCurrency,
    formatDuration,
    render,
    renderCard,
    renderFilters,
    subscribe
  };

})(window, document);