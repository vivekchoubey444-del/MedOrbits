/* =========================================================
   MedOrbits -- Notifications Manager
   File: /assets/js/notifications.js
   Purpose: In-app notifications, unread counts, preferences,
            polling, mark-as-read, deletion and rendering
   ========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};
  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";

  const STORAGE_KEY = "medorbits_notifications_cache";
  const DEFAULT_PAGE_SIZE = 20;
  const DEFAULT_POLL_INTERVAL = 60000;
  const MAX_TITLE_LENGTH = 200;
  const MAX_MESSAGE_LENGTH = 5000;

  const state = {
    items: [],
    unreadCount: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    loading: false,
    pollingTimer: null,
    initialized: false,
    preferences: {
      email: true,
      push: true,
      inApp: true,
      categories: {}
    }
  };

  const listeners = new Map();

  const utils = {
    escapeHTML(value) {
      return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[char];
      });
    },

    dispatch(name, detail) {
      document.dispatchEvent(
        new CustomEvent("medorbits:notifications:" + name, {
          detail: detail || {}
        })
      );
    },

    notify(message, type) {
      if (window.MedOrbitsErrorHandler?.notify) {
        window.MedOrbitsErrorHandler.notify(message, type || "info");
        return;
      }

      if (window.MedOrbitsApp?.notify) {
        window.MedOrbitsApp.notify(message, type || "info");
      }
    },

    formatDate(value) {
      if (!value) return "";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "";

      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    },

    relativeTime(value) {
      if (!value) return "";

      const date = new Date(value);
      const timestamp = date.getTime();

      if (Number.isNaN(timestamp)) return "";

      const seconds = Math.round((timestamp - Date.now()) / 1000);
      const absolute = Math.abs(seconds);

      const units = [
        ["year", 31536000],
        ["month", 2592000],
        ["week", 604800],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
        ["second", 1]
      ];

      const formatter = new Intl.RelativeTimeFormat(undefined, {
        numeric: "auto"
      });

      for (const [unit, size] of units) {
        if (absolute >= size || unit === "second") {
          return formatter.format(Math.round(seconds / size), unit);
        }
      }

      return "";
    },

    getCache() {
      try {
        return JSON.parse(
          sessionStorage.getItem(STORAGE_KEY) || "{}"
        );
      } catch (_) {
        return {};
      }
    },

    setCache(data) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_) {
        // Storage may be unavailable.
      }
    },

    getElement(target) {
      if (!target) return null;
      if (target instanceof Element) return target;

      if (typeof target === "string") {
        try {
          return document.querySelector(target);
        } catch (_) {
          return null;
        }
      }

      return null;
    }
  };

  async function request(path, options) {
    const settings = options || {};
    const headers = new Headers(settings.headers || {});

    if (!(settings.body instanceof FormData) && settings.body != null) {
      headers.set("Content-Type", "application/json");
    }

    const token =
      window.MedOrbitsAuth?.getToken?.() ||
      window.MedOrbitsAuth?.getAccessToken?.();

    if (token) {
      headers.set("Authorization", "Bearer " + token);
    }

    const response = await fetch(API_BASE + path, {
      ...settings,
      headers,
      credentials: "same-origin"
    });

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => "");
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
        data?.error ||
        "Notification request failed (" + response.status + ")."
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }

  function normalizeNotification(item) {
    const notification = item || {};

    return {
      id: String(
        notification.id ||
        notification._id ||
        notification.notificationId ||
        ""
      ),
      title: String(
        notification.title ||
        notification.subject ||
        "Notification"
      ).slice(0, MAX_TITLE_LENGTH),
      message: String(
        notification.message ||
        notification.body ||
        notification.description ||
        ""
      ).slice(0, MAX_MESSAGE_LENGTH),
      type: String(notification.type || notification.category || "general"),
      category: String(notification.category || notification.type || "general"),
      priority: String(notification.priority || "normal"),
      read: Boolean(
        notification.read ??
        notification.isRead ??
        notification.is_read ??
        false
      ),
      readAt: notification.readAt || notification.read_at || null,
      createdAt:
        notification.createdAt ||
        notification.created_at ||
        notification.timestamp ||
        null,
      updatedAt: notification.updatedAt || notification.updated_at || null,
      link: safeLink(notification.link || notification.url || ""),
      actionLabel: String(notification.actionLabel || notification.action_label || ""),
      metadata: notification.metadata || {},
      archived: Boolean(notification.archived || notification.isArchived)
    };
  }

  function safeLink(value) {
    if (!value) return "";

    try {
      const url = new URL(String(value), window.location.origin);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
      }

      return url.href;
    } catch (_) {
      return "";
    }
  }

  function normalizeList(response) {
    if (Array.isArray(response)) return response;

    return (
      response?.data?.items ||
      response?.data?.notifications ||
      response?.items ||
      response?.notifications ||
      response?.data ||
      []
    );
  }

  function updateUnreadCount(serverCount) {
    if (Number.isFinite(Number(serverCount))) {
      state.unreadCount = Math.max(0, Number(serverCount));
    } else {
      state.unreadCount = state.items.filter((item) => !item.read && !item.archived).length;
    }

    document.querySelectorAll("[data-notification-count]").forEach((element) => {
      element.textContent = state.unreadCount > 99
        ? "99+"
        : String(state.unreadCount);

      element.hidden = state.unreadCount <= 0;
      element.setAttribute("aria-label", state.unreadCount + " unread notifications");
    });

    document.querySelectorAll("[data-notification-unread-count]").forEach((element) => {
      element.textContent = String(state.unreadCount);
      element.hidden = state.unreadCount <= 0;
    });

    document.querySelectorAll("[data-notification-badge]").forEach((element) => {
      element.textContent = state.unreadCount > 99
        ? "99+"
        : String(state.unreadCount);

      element.hidden = state.unreadCount <= 0;
    });

    utils.dispatch("unread-count-updated", {
      unreadCount: state.unreadCount
    });
  }

  function extractUnreadCount(response) {
    const candidates = [
      response?.unreadCount,
      response?.unread_count,
      response?.data?.unreadCount,
      response?.data?.unread_count,
      response?.meta?.unreadCount
    ];

    for (const value of candidates) {
      if (value !== undefined && value !== null && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return null;
  }

  async function load(options) {
    const settings = options || {};

    state.loading = true;
    utils.dispatch("loading", { loading: true });

    try {
      const params = new URLSearchParams();

      params.set("page", String(settings.page || state.page));
      params.set("limit", String(settings.limit || state.pageSize));

      if (settings.unreadOnly) params.set("unreadOnly", "true");
      if (settings.category) params.set("category", settings.category);
      if (settings.type) params.set("type", settings.type);
      if (settings.search) params.set("search", settings.search);
      if (settings.archived !== undefined) {
        params.set("archived", String(Boolean(settings.archived)));
      }

      const response = await request(
        "/notifications?" + params.toString()
      );

      state.items = normalizeList(response)
        .map(normalizeNotification)
        .filter((item) => item.id);

      state.page = Number(settings.page) || state.page;
      state.pageSize = Number(settings.limit) || state.pageSize;

      state.total = Number(
        response?.total ??
        response?.data?.total ??
        response?.meta?.total ??
        state.items.length
      );

      updateUnreadCount(extractUnreadCount(response));

      utils.setCache({
        items: state.items,
        unreadCount: state.unreadCount,
        savedAt: Date.now()
      });

      render(settings.container);

      utils.dispatch("loaded", {
        items: state.items,
        unreadCount: state.unreadCount,
        total: state.total
      });

      return state.items;
    } catch (error) {
      utils.dispatch("error", {
        error,
        action: "load"
      });

      utils.notify(error.message || "Unable to load notifications.", "error");

      throw error;
    } finally {
      state.loading = false;
      utils.dispatch("loading", { loading: false });
    }
  }

  async function loadUnreadCount() {
    try {
      const response = await request("/notifications/unread-count");
      const count = extractUnreadCount(response);

      if (count !== null) {
        updateUnreadCount(count);
        return count;
      }

      const fallback = Number(
        response?.count ??
        response?.data?.count ??
        0
      );

      updateUnreadCount(fallback);

      return state.unreadCount;
    } catch (error) {
      utils.dispatch("error", {
        error,
        action: "load-unread-count"
      });

      throw error;
    }
  }

  async function markRead(notificationId) {
    const id = String(notificationId || "");

    if (!id) {
      throw new Error("A notification ID is required.");
    }

    const notification = state.items.find((item) => item.id === id);

    if (notification?.read) return notification;

    await request(
      "/notifications/" + encodeURIComponent(id) + "/read",
      {
        method: "PATCH",
        body: JSON.stringify({})
      }
    );

    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
    }

    updateUnreadCount();
    render();

    utils.dispatch("read", { notificationId: id });

    return notification || { id, read: true };
  }

  async function markUnread(notificationId) {
    const id = String(notificationId || "");

    if (!id) {
      throw new Error("A notification ID is required.");
    }

    await request(
      "/notifications/" + encodeURIComponent(id) + "/unread",
      {
        method: "PATCH",
        body: JSON.stringify({})
      }
    );

    const notification = state.items.find((item) => item.id === id);

    if (notification) {
      notification.read = false;
      notification.readAt = null;
    }

    updateUnreadCount();
    render();

    utils.dispatch("unread", { notificationId: id });

    return notification || { id, read: false };
  }

  async function markAllRead() {
    await request("/notifications/read-all", {
      method: "PATCH",
      body: JSON.stringify({})
    });

    state.items = state.items.map((item) => ({
      ...item,
      read: true,
      readAt: item.readAt || new Date().toISOString()
    }));

    updateUnreadCount(0);
    render();

    utils.dispatch("all-read", {
      count: state.items.length
    });

    return true;
  }

  async function remove(notificationId) {
    const id = String(notificationId || "");

    if (!id) {
      throw new Error("A notification ID is required.");
    }

    await request("/notifications/" + encodeURIComponent(id), {
      method: "DELETE"
    });

    state.items = state.items.filter((item) => item.id !== id);

    updateUnreadCount();
    render();

    utils.dispatch("deleted", { notificationId: id });

    return true;
  }

  async function clearRead() {
    await request("/notifications/read", {
      method: "DELETE"
    });

    state.items = state.items.filter((item) => !item.read);

    updateUnreadCount();
    render();

    utils.dispatch("read-cleared");

    return true;
  }

  async function archive(notificationId) {
    const id = String(notificationId || "");

    if (!id) {
      throw new Error("A notification ID is required.");
    }

    await request(
      "/notifications/" + encodeURIComponent(id) + "/archive",
      {
        method: "POST",
        body: JSON.stringify({})
      }
    );

    const notification = state.items.find((item) => item.id === id);

    if (notification) notification.archived = true;

    updateUnreadCount();
    render();

    utils.dispatch("archived", { notificationId: id });

    return notification || { id, archived: true };
  }

  async function create(payload) {
    const data = payload || {};
    const title = String(data.title || "").trim();
    const message = String(data.message || "").trim();

    if (!title) {
      throw new Error("A notification title is required.");
    }

    if (title.length > MAX_TITLE_LENGTH) {
      throw new Error("The notification title is too long.");
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new Error("The notification message is too long.");
    }

    const response = await request("/notifications", {
      method: "POST",
      body: JSON.stringify({
        title,
        message,
        type: data.type || "general",
        category: data.category || data.type || "general",
        priority: data.priority || "normal",
        link: safeLink(data.link || ""),
        metadata: data.metadata || {}
      })
    });

    const raw = response?.data?.notification ||
      response?.notification ||
      response?.data ||
      response;

    const notification = normalizeNotification(raw);

    if (notification.id) {
      state.items.unshift(notification);
      updateUnreadCount();
      render();
    }

    utils.dispatch("created", { notification });

    return notification;
  }

  async function getPreferences() {
    try {
      const response = await request("/notifications/preferences");

      const preferences =
        response?.data?.preferences ||
        response?.preferences ||
        response?.data ||
        response;

      state.preferences = {
        ...state.preferences,
        ...(preferences || {}),
        categories: {
          ...state.preferences.categories,
          ...(preferences?.categories || {})
        }
      };

      renderPreferences();

      utils.dispatch("preferences-loaded", {
        preferences: state.preferences
      });

      return state.preferences;
    } catch (error) {
      utils.dispatch("error", {
        error,
        action: "get-preferences"
      });

      throw error;
    }
  }

  async function savePreferences(preferences) {
    const updates = preferences || {};

    const payload = {
      ...state.preferences,
      ...updates,
      categories: {
        ...state.preferences.categories,
        ...(updates.categories || {})
      }
    };

    const response = await request("/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    const saved =
      response?.data?.preferences ||
      response?.preferences ||
      payload;

    state.preferences = {
      ...state.preferences,
      ...saved,
      categories: {
        ...state.preferences.categories,
        ...(saved.categories || {})
      }
    };

    renderPreferences();

    utils.dispatch("preferences-saved", {
      preferences: state.preferences
    });

    return state.preferences;
  }

  function renderPreferences(target) {
    const container = utils.getElement(
      target || "[data-notification-preferences]"
    );

    if (!container) return;

    const preferences = state.preferences;

    container.querySelectorAll("[data-notification-preference]").forEach((input) => {
      const key = input.dataset.notificationPreference;

      if (key in preferences && typeof preferences[key] === "boolean") {
        input.checked = preferences[key];
      }
    });

    container.querySelectorAll("[data-notification-category]").forEach((input) => {
      const category = input.dataset.notificationCategory;

      if (category) {
        input.checked = preferences.categories[category] !== false;
      }
    });
  }

  function getIcon(type) {
    const icons = {
      success: "✓",
      application: "▣",
      admission: "🎓",
      payment: "₹",
      document: "▤",
      security: "🔒",
      warning: "!",
      error: "×",
      message: "✉",
      reminder: "◷",
      general: "●"
    };

    return icons[String(type || "general").toLowerCase()] || icons.general;
  }

  function render(target) {
    const containers = target
      ? [utils.getElement(target)]
      : Array.from(
          document.querySelectorAll("[data-notifications-list]")
        );

    containers.filter(Boolean).forEach((container) => {
      const visibleItems = state.items.filter((item) => {
        if (container.dataset.filter === "unread") return !item.read;
        if (container.dataset.filter === "read") return item.read;
        if (container.dataset.filter === "archived") return item.archived;

        return !item.archived;
      });

      if (!visibleItems.length) {
        container.innerHTML = `
          <div class="mo-notifications-empty" role="status">
            <span class="mo-notifications-empty-icon" aria-hidden="true">♧</span>
            <p>No notifications to display.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = visibleItems.map((item) => {
        const safeTitle = utils.escapeHTML(item.title);
        const safeMessage = utils.escapeHTML(item.message);
        const safeDate = utils.escapeHTML(utils.formatDate(item.createdAt));
        const relativeDate = utils.escapeHTML(utils.relativeTime(item.createdAt));
        const safeType = utils.escapeHTML(item.type);
        const safeId = utils.escapeHTML(item.id);

        return `
          <article
            class="mo-notification-item${item.read ? " is-read" : " is-unread"}"
            data-notification-id="${safeId}"
            data-notification-type="${safeType}"
          >
            <span class="mo-notification-icon" aria-hidden="true">
              ${utils.escapeHTML(getIcon(item.type))}
            </span>

            <div class="mo-notification-content">
              <div class="mo-notification-heading">
                <h3>${safeTitle}</h3>
                ${!item.read ? '<span class="mo-notification-dot" aria-label="Unread"></span>' : ""}
              </div>

              <p>${safeMessage}</p>

              <time datetime="${utils.escapeHTML(item.createdAt || "")}"
                    title="${safeDate}">
                ${relativeDate}
              </time>

              ${
                item.link
                  ? `<a class="mo-notification-action" href="${utils.escapeHTML(item.link)}">
                       ${utils.escapeHTML(item.actionLabel || "View details")}
                     </a>`
                  : ""
              }
            </div>

            <div class="mo-notification-actions">
              ${
                item.read
                  ? `<button type="button" data-notification-mark-unread="${safeId}" aria-label="Mark ${safeTitle} as unread">Mark unread</button>`
                  : `<button type="button" data-notification-mark-read="${safeId}" aria-label="Mark ${safeTitle} as read">Mark read</button>`
              }
              <button
                type="button"
                data-notification-archive="${safeId}"
                aria-label="Archive ${safeTitle}"
              >Archive</button>
              <button
                type="button"
                data-notification-delete="${safeId}"
                aria-label="Delete ${safeTitle}"
              >Delete</button>
            </div>
          </article>
        `;
      }).join("");
    });

    updateUnreadCount();
  }

  function bindActions() {
    document.addEventListener("click", async function (event) {
      const markReadButton = event.target.closest(
        "[data-notification-mark-read]"
      );

      if (markReadButton) {
        event.preventDefault();

        try {
          await markRead(markReadButton.dataset.notificationMarkRead);
        } catch (error) {
          utils.notify(error.message || "Unable to update notification.", "error");
        }

        return;
      }

      const markUnreadButton = event.target.closest(
        "[data-notification-mark-unread]"
      );

      if (markUnreadButton) {
        event.preventDefault();

        try {
          await markUnread(markUnreadButton.dataset.notificationMarkUnread);
        } catch (error) {
          utils.notify(error.message || "Unable to update notification.", "error");
        }

        return;
      }

      const archiveButton = event.target.closest(
        "[data-notification-archive]"
      );

      if (archiveButton) {
        event.preventDefault();

        try {
          await archive(archiveButton.dataset.notificationArchive);
        } catch (error) {
          utils.notify(error.message || "Unable to archive notification.", "error");
        }

        return;
      }

      const deleteButton = event.target.closest(
        "[data-notification-delete]"
      );

      if (deleteButton) {
        event.preventDefault();

        if (!window.confirm("Delete this notification?")) return;

        try {
          await remove(deleteButton.dataset.notificationDelete);
          utils.notify("Notification deleted.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to delete notification.", "error");
        }

        return;
      }

      const markAllButton = event.target.closest(
        "[data-notifications-mark-all-read]"
      );

      if (markAllButton) {
        event.preventDefault();

        try {
          await markAllRead();
          utils.notify("All notifications marked as read.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to update notifications.", "error");
        }

        return;
      }

      const clearReadButton = event.target.closest(
        "[data-notifications-clear-read]"
      );

      if (clearReadButton) {
        event.preventDefault();

        if (!window.confirm("Delete all read notifications?")) return;

        try {
          await clearRead();
          utils.notify("Read notifications cleared.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to clear notifications.", "error");
        }
      }
    });
  }

  function bindPreferences() {
    document.querySelectorAll("[data-notification-preferences]").forEach((form) => {
      if (form.dataset.notificationsBound === "true") return;

      form.dataset.notificationsBound = "true";

      form.addEventListener("change", async function (event) {
        const input = event.target;

        if (
          !input.matches(
            "[data-notification-preference], [data-notification-category]"
          )
        ) {
          return;
        }

        const preference = input.dataset.notificationPreference;
        const category = input.dataset.notificationCategory;

        try {
          if (preference) {
            await savePreferences({
              [preference]: Boolean(input.checked)
            });
          } else if (category) {
            await savePreferences({
              categories: {
                [category]: Boolean(input.checked)
              }
            });
          }
        } catch (error) {
          utils.notify(error.message || "Unable to save preferences.", "error");
        }
      });

      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const preferences = {};
        const categories = {};

        form.querySelectorAll("[data-notification-preference]").forEach((input) => {
          preferences[input.dataset.notificationPreference] = Boolean(input.checked);
        });

        form.querySelectorAll("[data-notification-category]").forEach((input) => {
          categories[input.dataset.notificationCategory] = Boolean(input.checked);
        });

        preferences.categories = categories;

        try {
          await savePreferences(preferences);
          utils.notify("Notification preferences saved.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to save preferences.", "error");
        }
      });
    });
  }

  function bindFilters() {
    document.querySelectorAll("[data-notifications-filter]").forEach((control) => {
      if (control.dataset.notificationsBound === "true") return;

      control.dataset.notificationsBound = "true";

      control.addEventListener("change", function () {
        const filter = control.value || "all";
        const containerSelector =
          control.dataset.target || "[data-notifications-list]";

        const container = utils.getElement(containerSelector);

        if (container) {
          container.dataset.filter = filter;
          render(container);
        }
      });
    });
  }

  function startPolling(interval) {
    stopPolling();

    const delay = Math.max(
      30000,
      Number(interval) || DEFAULT_POLL_INTERVAL
    );

    state.pollingTimer = window.setInterval(async function () {
      if (document.hidden || state.loading) return;

      try {
        await loadUnreadCount();
      } catch (_) {
        // Keep polling failures silent.
      }
    }, delay);
  }

  function stopPolling() {
    if (state.pollingTimer) {
      window.clearInterval(state.pollingTimer);
      state.pollingTimer = null;
    }
  }

  function on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("A callback function is required.");
    }

    const event = "medorbits:notifications:" + eventName;

    document.addEventListener(event, callback);

    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }

    listeners.get(event).add(callback);

    return function unsubscribe() {
      document.removeEventListener(event, callback);
      listeners.get(event)?.delete(callback);
    };
  }

  function off(eventName, callback) {
    const event = "medorbits:notifications:" + eventName;

    if (callback) {
      document.removeEventListener(event, callback);
      listeners.get(event)?.delete(callback);
      return;
    }

    listeners.get(event)?.forEach((listener) => {
      document.removeEventListener(event, listener);
    });

    listeners.delete(event);
  }

  async function init(options) {
    const settings = options || {};

    if (state.initialized && !settings.force) {
      return api;
    }

    bindActions();
    bindPreferences();
    bindFilters();

    const cache = utils.getCache();

    if (Array.isArray(cache.items)) {
      state.items = cache.items.map(normalizeNotification);
      updateUnreadCount(cache.unreadCount);
      render();
    }

    try {
      await Promise.allSettled([
        load(settings),
        getPreferences()
      ]);
    } catch (_) {
      // Keep the module available when the API is unreachable.
    }

    if (settings.polling !== false) {
      startPolling(settings.pollingInterval);
    }

    state.initialized = true;

    utils.dispatch("initialized", {
      unreadCount: state.unreadCount
    });

    return api;
  }

  function destroy() {
    stopPolling();

    listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        document.removeEventListener(event, callback);
      });
    });

    listeners.clear();
    state.initialized = false;
  }

  const api = {
    init,
    destroy,
    on,
    off,

    load,
    loadUnreadCount,

    create,
    markRead,
    markUnread,
    markAllRead,
    remove,
    clearRead,
    archive,

    getPreferences,
    savePreferences,
    render,
    renderPreferences,

    startPolling,
    stopPolling,

    getAll: () => state.items.slice(),
    getUnread: () => state.items.filter((item) => !item.read && !item.archived),
    getUnreadCount: () => state.unreadCount,
    getPreferencesState: () => ({ ...state.preferences }),

    getState: () => ({
      items: state.items.slice(),
      unreadCount: state.unreadCount,
      page: state.page,
      pageSize: state.pageSize,
      total: state.total,
      loading: state.loading,
      preferences: { ...state.preferences }
    }),

    constants: {
      DEFAULT_PAGE_SIZE,
      DEFAULT_POLL_INTERVAL,
      MAX_TITLE_LENGTH,
      MAX_MESSAGE_LENGTH
    }
  };

  window.MedOrbitsNotifications = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Notifications = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (
        document.querySelector(
          "[data-notifications-list], [data-notification-count], " +
          "[data-notification-preferences]"
        )
      ) {
        init();
      }
    }, { once: true });
  } else if (
    document.querySelector(
      "[data-notifications-list], [data-notification-count], " +
      "[data-notification-preferences]"
    )
  ) {
    init();
  }

})(window, document);