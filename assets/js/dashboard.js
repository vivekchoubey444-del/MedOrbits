/* =========================================================
   MedOrbits -- assets/js/dashboard.js
   User dashboard, statistics, recent activity, and widgets
   ========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const CONSTANTS = window.MedOrbitsConstants || {};
  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";
  const ENDPOINTS = {
    dashboard:
      CONSTANTS.API?.DASHBOARD ||
      `${API_BASE}/dashboard`,
    applications:
      CONSTANTS.API?.APPLICATIONS ||
      `${API_BASE}/applications`,
    notifications:
      CONSTANTS.API?.NOTIFICATIONS ||
      `${API_BASE}/notifications`,
    profile:
      CONSTANTS.API?.PROFILE ||
      `${API_BASE}/users/profile`,
    activity:
      `${API_BASE}/users/activity`
  };
  const state = {
    data: null,
    applications: [],
    notifications: [],
    activity: [],
    profile: null,
    loading: false,
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
  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
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
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      throw new Error(
        result?.message ||
        result?.error ||
        `Request failed (${response.status})`
      );
    }
    return result;
  }
  function extractObject(result) {
    if (!result || typeof result !== "object") return {};
    return result.data || result.dashboard || result;
  }
  function extractList(result, keys = []) {
    if (Array.isArray(result)) return result;
    for (const key of keys) {
      if (Array.isArray(result?.[key])) return result[key];
      if (Array.isArray(result?.data?.[key])) return result.data[key];
    }
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.results)) return result.results;
    return [];
  }
  function formatDate(value, options = {}) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat(
      options.locale || "en-IN",
      options
    ).format(date);
  }
  function formatRelativeDate(value) {
    if (!value) return "Recently";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const units = [
      ["year", 31536000],
      ["month", 2592000],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60]
    ];
    for (const [unit, amount] of units) {
      const interval = Math.round(seconds / amount);
      if (Math.abs(interval) >= 1) {
        return new Intl.RelativeTimeFormat("en", {
          numeric: "auto"
        }).format(interval, unit);
      }
    }
    return "Just now";
  }
  function formatCurrency(amount, currency = "INR") {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "--";
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
  function getApplicationStatus(application) {
    return (
      application.status ||
      application.applicationStatus ||
      "Pending"
    );
  }
  function getStatusClass(status) {
    const value = normalize(status).replace(/[^a-z0-9]+/g, "-");
    const allowed = [
      "pending",
      "approved",
      "rejected",
      "submitted",
      "under-review",
      "in-review",
      "in-progress",
      "completed",
      "cancelled",
      "draft",
      "accepted",
      "waitlisted"
    ];
    return allowed.includes(value) ? value : "default";
  }
  function getApplicationTitle(application) {
    return (
      application.courseName ||
      application.course ||
      application.collegeName ||
      application.institutionName ||
      application.title ||
      "Application"
    );
  }
  function getApplicationId(application) {
    return String(
      application.id ||
      application.applicationId ||
      application.referenceId ||
      ""
    );
  }
  function calculateStats() {
    const applications = state.applications;
    const notifications = state.notifications;
    const countStatus = statuses =>
      applications.filter(application =>
        statuses.includes(normalize(getApplicationStatus(application)))
      ).length;
    return {
      totalApplications: applications.length,
      pendingApplications: countStatus([
        "pending",
        "submitted",
        "under review",
        "under-review",
        "in review",
        "in-review",
        "in progress",
        "in-progress",
        "draft"
      ]),
      approvedApplications: countStatus([
        "approved",
        "accepted",
        "completed"
      ]),
      rejectedApplications: countStatus(["rejected"]),
      unreadNotifications: notifications.filter(
        notification =>
          notification.isRead === false ||
          notification.read === false ||
          notification.readAt === null && notification.read !== true
      ).length,
      profileCompletion: getProfileCompletion(state.profile)
    };
  }
  function getProfileCompletion(profile) {
    if (!profile) return 0;
    if (Number.isFinite(Number(profile.profileCompletion))) {
      return Math.max(
        0,
        Math.min(100, Number(profile.profileCompletion))
      );
    }
    const fields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "address",
      "education",
      "profileImage"
    ];
    const completed = fields.filter(field => {
      const value = profile[field];
      return value !== undefined && value !== null && value !== "";
    }).length;
    return Math.round((completed / fields.length) * 100);
  }
  async function load(options = {}) {
    state.loading = true;
    state.error = null;
    notify();
    const jobs = [
      requestJSON(ENDPOINTS.dashboard).then(result => {
        state.data = extractObject(result);
      }),
      requestJSON(ENDPOINTS.applications).then(result => {
        state.applications = extractList(result, ["applications"]);
      }),
      requestJSON(ENDPOINTS.notifications).then(result => {
        state.notifications = extractList(result, ["notifications"]);
      }),
      requestJSON(ENDPOINTS.profile).then(result => {
        state.profile = extractObject(result);
      })
    ];
    const results = await Promise.allSettled(jobs);
    const failures = results.filter(result => result.status === "rejected");
    if (failures.length === jobs.length) {
      state.error = failures[0].reason?.message || "Unable to load dashboard.";
    } else if (failures.length) {
      state.error = "Some dashboard information could not be loaded.";
    }
    if (options.loadActivity) {
      try {
        const result = await requestJSON(ENDPOINTS.activity);
        state.activity = extractList(result, ["activity", "activities", "logs"]);
      } catch {
        state.activity = [];
      }
    }
    state.loading = false;
    state.lastUpdated = new Date().toISOString();
    notify();
    return getState();
  }
  async function refresh() {
    return load({ loadActivity: state.activity.length > 0 });
  }
  function getState() {
    return {
      data: state.data,
      applications: [...state.applications],
      notifications: [...state.notifications],
      activity: [...state.activity],
      profile: state.profile,
      stats: calculateStats(),
      loading: state.loading,
      error: state.error,
      lastUpdated: state.lastUpdated
    };
  }
  function getRecentApplications(limit = 5) {
    return [...state.applications]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, Math.max(0, Number(limit) || 5));
  }
  function getRecentNotifications(limit = 5) {
    return [...state.notifications]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, Math.max(0, Number(limit) || 5));
  }
  function renderStats(container) {
    const target = resolveElement(container);
    if (!target) return false;
    const stats = calculateStats();
    const cards = [
      {
        label: "Total Applications",
        value: stats.totalApplications,
        icon: "📄",
        key: "applications"
      },
      {
        label: "Pending Applications",
        value: stats.pendingApplications,
        icon: "⏳",
        key: "pending"
      },
      {
        label: "Approved Applications",
        value: stats.approvedApplications,
        icon: "✓",
        key: "approved"
      },
      {
        label: "Unread Notifications",
        value: stats.unreadNotifications,
        icon: "🔔",
        key: "notifications"
      }
    ];
    target.innerHTML = cards.map(card => `
      <article class="dashboard-stat-card dashboard-stat-card--${card.key}">
        <span class="dashboard-stat-card__icon" aria-hidden="true">
          ${card.icon}
        </span>
        <div class="dashboard-stat-card__content">
          <p class="dashboard-stat-card__label">${card.label}</p>
          <strong class="dashboard-stat-card__value">${card.value}</strong>
        </div>
      </article>
    `).join("");
    return true;
  }
  function renderApplications(container, limit = 5) {
    const target = resolveElement(container);
    if (!target) return false;
    const applications = getRecentApplications(limit);
    if (!applications.length) {
      target.innerHTML = `
        <div class="dashboard-empty-state">
          <p>No applications yet.</p>
          <a href="/courses.html">Explore courses</a>
        </div>
      `;
      return true;
    }
    target.innerHTML = applications.map(application => {
      const id = getApplicationId(application);
      const status = getApplicationStatus(application);
      const title = getApplicationTitle(application);
      const date = application.updatedAt || application.createdAt;
      return `
        <article class="dashboard-application">
          <div class="dashboard-application__main">
            <h3>${escapeHTML(title)}</h3>
            <p>
              ${id ? `Reference: ${escapeHTML(id)}` : "Application"}
              ${date ? ` · ${escapeHTML(formatDate(date, {
                day: "numeric",
                month: "short",
                year: "numeric"
              }))}` : ""}
            </p>
          </div>
          <span class="status-badge status-badge--${getStatusClass(status)}">
            ${escapeHTML(status)}
          </span>
          ${id ? `
            <a href="/account/applications.html?id=${encodeURIComponent(id)}"
               aria-label="View application ${escapeHTML(id)}">
              View
            </a>
          ` : ""}
        </article>
      `;
    }).join("");
    return true;
  }
  function renderNotifications(container, limit = 5) {
    const target = resolveElement(container);
    if (!target) return false;
    const notifications = getRecentNotifications(limit);
    if (!notifications.length) {
      target.innerHTML = `
        <div class="dashboard-empty-state">
          <p>You have no notifications.</p>
        </div>
      `;
      return true;
    }
    target.innerHTML = notifications.map(notification => {
      const title = notification.title || "Notification";
      const message = notification.message || notification.body || "";
      const date = notification.createdAt || notification.date;
      const unread =
        notification.isRead === false ||
        notification.read === false;
      return `
        <article class="dashboard-notification ${unread ? "is-unread" : ""}">
          <div class="dashboard-notification__indicator" aria-hidden="true"></div>
          <div class="dashboard-notification__content">
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(message)}</p>
            <time>${escapeHTML(formatRelativeDate(date))}</time>
          </div>
        </article>
      `;
    }).join("");
    return true;
  }
  function renderProfileCompletion(container) {
    const target = resolveElement(container);
    if (!target) return false;
    const completion = getProfileCompletion(state.profile);
    target.innerHTML = `
      <section class="dashboard-profile-completion">
        <div class="dashboard-profile-completion__header">
          <h3>Profile Completion</h3>
          <strong>${completion}%</strong>
        </div>
        <div
          class="dashboard-progress"
          role="progressbar"
          aria-label="Profile completion"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${completion}"
        >
          <span class="dashboard-progress__bar"
                style="width: ${completion}%"></span>
        </div>
        <p>
          ${completion === 100
            ? "Your profile is complete."
            : "Complete your profile to improve your counselling experience."}
        </p>
        ${completion < 100
          ? '<a href="/account/profile.html">Complete Profile</a>'
          : ""}
      </section>
    `;
    return true;
  }
  function renderActivity(container, limit = 8) {
    const target = resolveElement(container);
    if (!target) return false;
    const activities = [...state.activity]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
    if (!activities.length) {
      target.innerHTML = `
        <div class="dashboard-empty-state">
          <p>No recent activity available.</p>
        </div>
      `;
      return true;
    }
    target.innerHTML = activities.map(activity => `
      <article class="dashboard-activity-item">
        <div class="dashboard-activity-item__content">
          <h3>${escapeHTML(
            activity.title ||
            activity.action ||
            activity.event ||
            "Account activity"
          )}</h3>
          <p>${escapeHTML(
            activity.description ||
            activity.message ||
            activity.details ||
            ""
          )}</p>
        </div>
        <time>${escapeHTML(
          formatRelativeDate(activity.createdAt || activity.timestamp)
        )}</time>
      </article>
    `).join("");
    return true;
  }
  function renderAll() {
    renderStats("[data-dashboard-stats]");
    renderApplications("[data-dashboard-applications]");
    renderNotifications("[data-dashboard-notifications]");
    renderProfileCompletion("[data-dashboard-profile-completion]");
    renderActivity("[data-dashboard-activity]");
  }
  function resolveElement(element) {
    if (!element) return null;
    return typeof element === "string"
      ? document.querySelector(element)
      : element;
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
        console.error("[MedOrbits Dashboard] Listener error:", error);
      }
    });
    document.dispatchEvent(
      new CustomEvent("medorbits:dashboard-updated", {
        detail: snapshot
      })
    );
    renderAll();
  }
  async function init(options = {}) {
    const dashboard = document.querySelector("[data-dashboard]");
    if (!dashboard && !options.force) return null;
    await load({
      loadActivity: options.loadActivity !== false
    });
    return getState();
  }
  document.addEventListener("click", event => {
    const refreshButton = event.target.closest("[data-dashboard-refresh]");
    if (refreshButton) {
      event.preventDefault();
      refreshButton.disabled = true;
      refresh().finally(() => {
        refreshButton.disabled = false;
      });
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("[data-dashboard]")) {
      init().catch(error => {
        console.error("[MedOrbits Dashboard] Initialization failed:", error);
      });
    }
  });
  window.MedOrbitsDashboard = {
    init,
    load,
    refresh,
    getState,
    getRecentApplications,
    getRecentNotifications,
    calculateStats,
    getProfileCompletion,
    formatCurrency,
    formatDate,
    formatRelativeDate,
    renderStats,
    renderApplications,
    renderNotifications,
    renderProfileCompletion,
    renderActivity,
    renderAll,
    subscribe
  };
})(window, document);