
/**
 * MedOrbits -- Core Runtime
 * File: assets/js/core.js
 * Version: 1.0.0
 *
 * Responsibilities:
 * - Application constants and environment detection
 * - Safe DOM utilities
 * - Shared event bus
 * - Storage abstraction
 * - Formatting and validation helpers
 * - Debounce, throttle and ID generation
 * - Safe JSON handling
 * - URL and query-string utilities
 * - Shared runtime diagnostics
 *
 * Dependencies: None
 *
 * This file must not implement authentication, API requests,
 * payments, permissions, or page-specific UI behavior.
 */

(() => {
  "use strict";

  if (window.MedOrbitsCore) {
    return;
  }

  // --------------------------------------------------
  // Application configuration
  // --------------------------------------------------

  const DEFAULTS = Object.freeze({
    name: "MedOrbits",
    version: "1.0.0",
    locale: document.documentElement.lang || "en-IN",
    currency: "INR",
    currencySymbol: "₹",
    timeZone: "Asia/Kolkata",
    dateFormat: "DD MMM YYYY",
    pageSize: 12,
    maxPageSize: 100,
    requestTimeout: 15000,
    debounceDelay: 300,
    throttleDelay: 200,
    storagePrefix: "medorbits:",
    debug: false
  });

  const ENVIRONMENTS = Object.freeze({
    DEVELOPMENT: "development",
    TEST: "test",
    PRODUCTION: "production"
  });

  const STORAGE_TYPES = Object.freeze({
    LOCAL: "local",
    SESSION: "session"
  });

  const STORAGE_KEYS = Object.freeze({
    THEME: "theme",
    LOCALE: "locale",
    COOKIE_CONSENT: "cookie-consent",
    LAST_VISITED: "last-visited"
  });

  const HTTP_STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  });

  // --------------------------------------------------
  // Environment detection
  // --------------------------------------------------

  function detectEnvironment() {
    const explicit = window.MEDORBITS_ENV;

    if (
      Object.values(ENVIRONMENTS).includes(explicit)
    ) {
      return explicit;
    }

    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]"
    ) {
      return ENVIRONMENTS.DEVELOPMENT;
    }

    if (
      window.location.hostname.endsWith(".test") ||
      window.location.hostname.endsWith(".localhost")
    ) {
      return ENVIRONMENTS.TEST;
    }

    return ENVIRONMENTS.PRODUCTION;
  }

  const environment = detectEnvironment();

  const config = Object.freeze({
    ...DEFAULTS,
    environment,
    debug:
      DEFAULTS.debug ||
      window.MEDORBITS_DEBUG === true ||
      environment === ENVIRONMENTS.DEVELOPMENT
  });

  // --------------------------------------------------
  // Logging
  // --------------------------------------------------

  const logger = {
    info(message, details) {
      if (!config.debug) return;

      console.info(
        `[${config.name}:core] ${message}`,
        details ?? ""
      );
    },

    warn(message, details) {
      console.warn(
        `[${config.name}:core] ${message}`,
        details ?? ""
      );
    },

    error(message, details) {
      console.error(
        `[${config.name}:core] ${message}`,
        details ?? ""
      );
    },

    debug(message, details) {
      if (!config.debug) return;

      console.debug(
        `[${config.name}:core] ${message}`,
        details ?? ""
      );
    }
  };

  // --------------------------------------------------
  // Type and value helpers
  // --------------------------------------------------

  const types = {
    isString(value) {
      return typeof value === "string";
    },

    isNonEmptyString(value) {
      return (
        typeof value === "string" &&
        value.trim().length > 0
      );
    },

    isNumber(value) {
      return (
        typeof value === "number" &&
        Number.isFinite(value)
      );
    },

    isInteger(value) {
      return Number.isSafeInteger(value);
    },

    isBoolean(value) {
      return typeof value === "boolean";
    },

    isArray(value) {
      return Array.isArray(value);
    },

    isObject(value) {
      return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      );
    },

    isPlainObject(value) {
      if (!this.isObject(value)) return false;

      const prototype = Object.getPrototypeOf(value);

      return (
        prototype === Object.prototype ||
        prototype === null
      );
    },

    isFunction(value) {
      return typeof value === "function";
    },

    isNullish(value) {
      return value === null || value === undefined;
    },

    isEmpty(value) {
      if (this.isNullish(value)) return true;
      if (this.isString(value)) return value.trim() === "";
      if (this.isArray(value)) return value.length === 0;

      if (this.isPlainObject(value)) {
        return Object.keys(value).length === 0;
      }

      return false;
    }
  };

  // --------------------------------------------------
  // DOM utilities
  // --------------------------------------------------

  const dom = {
    query(selector, root = document) {
      if (!types.isString(selector)) return null;

      try {
        return root.querySelector(selector);
      } catch (error) {
        logger.warn("Invalid selector", {
          selector,
          error
        });

        return null;
      }
    },

    queryAll(selector, root = document) {
      if (!types.isString(selector)) return [];

      try {
        return Array.from(root.querySelectorAll(selector));
      } catch (error) {
        logger.warn("Invalid selector", {
          selector,
          error
        });

        return [];
      }
    },

    byId(id, root = document) {
      if (!types.isNonEmptyString(id)) return null;

      if (root === document) {
        return document.getElementById(id);
      }

      return this.query(`#${CSS.escape(id)}`, root);
    },

    create(tagName, options = {}) {
      if (!types.isNonEmptyString(tagName)) {
        throw new TypeError("A valid element tag is required.");
      }

      const element = document.createElement(tagName);

      if (options.className) {
        element.className = options.className;
      }

      if (options.id) {
        element.id = options.id;
      }

      if (options.text !== undefined) {
        element.textContent = String(options.text);
      }

      if (options.attributes && types.isPlainObject(options.attributes)) {
        for (const [name, value] of Object.entries(options.attributes)) {
          if (
            value === null ||
            value === undefined ||
            typeof value === "object"
          ) {
            continue;
          }

          element.setAttribute(name, String(value));
        }
      }

      return element;
    },

    setText(element, value) {
      if (!element || !("textContent" in element)) return false;

      element.textContent = value == null ? "" : String(value);

      return true;
    },

    toggleClass(element, className, force) {
      if (!element?.classList) return false;

      return element.classList.toggle(className, force);
    },

    isVisible(element) {
      if (!(element instanceof Element)) return false;

      const style = window.getComputedStyle(element);

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        element.getClientRects().length > 0
      );
    },

    ready(callback) {
      if (!types.isFunction(callback)) {
        throw new TypeError("DOM ready callback must be a function.");
      }

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          callback,
          { once: true }
        );
      } else {
        callback();
      }
    }
  };

  // --------------------------------------------------
  // Safe storage abstraction
  // --------------------------------------------------

  function resolveStorage(type) {
    if (type === STORAGE_TYPES.SESSION) {
      return window.sessionStorage;
    }

    return window.localStorage;
  }

  function storageKey(key) {
    return `${config.storagePrefix}${key}`;
  }

  const storage = {
    get(key, type = STORAGE_TYPES.LOCAL) {
      if (!types.isNonEmptyString(key)) return null;

      try {
        return resolveStorage(type).getItem(storageKey(key));
      } catch (error) {
        logger.warn("Storage read failed", {
          key,
          type,
          error
        });

        return null;
      }
    },

    set(key, value, type = STORAGE_TYPES.LOCAL) {
      if (!types.isNonEmptyString(key)) return false;
      if (value === undefined || value === null) return false;

      try {
        resolveStorage(type).setItem(
          storageKey(key),
          String(value)
        );

        return true;
      } catch (error) {
        logger.warn("Storage write failed", {
          key,
          type,
          error
        });

        return false;
      }
    },

    getJSON(key, type = STORAGE_TYPES.LOCAL) {
      const value = this.get(key, type);

      if (value === null) return null;

      try {
        return JSON.parse(value);
      } catch (error) {
        logger.warn("Stored JSON is invalid", { key, error });
        return null;
      }
    },

    setJSON(key, value, type = STORAGE_TYPES.LOCAL) {
      try {
        const serialized = JSON.stringify(value);

        if (serialized === undefined) return false;

        return this.set(key, serialized, type);
      } catch (error) {
        logger.warn("JSON serialization failed", {
          key,
          error
        });

        return false;
      }
    },

    remove(key, type = STORAGE_TYPES.LOCAL) {
      if (!types.isNonEmptyString(key)) return false;

      try {
        resolveStorage(type).removeItem(storageKey(key));
        return true;
      } catch (error) {
        logger.warn("Storage removal failed", {
          key,
          type,
          error
        });

        return false;
      }
    },

    clear(type = STORAGE_TYPES.LOCAL) {
      try {
        const target = resolveStorage(type);
        const keys = [];

        for (let index = 0; index < target.length; index += 1) {
          const key = target.key(index);

          if (key?.startsWith(config.storagePrefix)) {
            keys.push(key);
          }
        }

        keys.forEach((key) => target.removeItem(key));

        return true;
      } catch (error) {
        logger.warn("Storage cleanup failed", { type, error });
        return false;
      }
    }
  };

  // --------------------------------------------------
  // Event bus
  // --------------------------------------------------

  const eventListeners = new Map();

  const events = {
    on(name, callback) {
      if (!types.isNonEmptyString(name)) {
        throw new TypeError("Event name is required.");
      }

      if (!types.isFunction(callback)) {
        throw new TypeError("Event callback must be a function.");
      }

      if (!eventListeners.has(name)) {
        eventListeners.set(name, new Set());
      }

      const listeners = eventListeners.get(name);

      listeners.add(callback);

      return () => {
        listeners.delete(callback);

        if (listeners.size === 0) {
          eventListeners.delete(name);
        }
      };
    },

    once(name, callback) {
      let unsubscribe;

      unsubscribe = this.on(name, (detail) => {
        unsubscribe();
        callback(detail);
      });

      return unsubscribe;
    },

    emit(name, detail = {}) {
      const listeners = eventListeners.get(name);

      if (!listeners) return 0;

      let delivered = 0;

      for (const callback of Array.from(listeners)) {
        try {
          callback(detail);
          delivered += 1;
        } catch (error) {
          logger.error(`Listener failed for "${name}"`, error);
        }
      }

      return delivered;
    },

    off(name, callback) {
      const listeners = eventListeners.get(name);

      if (!listeners) return false;

      const removed = listeners.delete(callback);

      if (listeners.size === 0) {
        eventListeners.delete(name);
      }

      return removed;
    },

    clear(name) {
      if (name === undefined) {
        eventListeners.clear();
        return;
      }

      eventListeners.delete(name);
    }
  };

  // --------------------------------------------------
  // Timing helpers
  // --------------------------------------------------

  const timing = {
    debounce(callback, delay = config.debounceDelay) {
      if (!types.isFunction(callback)) {
        throw new TypeError("Debounce callback must be a function.");
      }

      let timerId;

      function debounced(...args) {
        window.clearTimeout(timerId);

        timerId = window.setTimeout(() => {
          callback.apply(this, args);
        }, Math.max(0, Number(delay) || 0));
      }

      debounced.cancel = () => {
        window.clearTimeout(timerId);
      };

      debounced.flush = () => {
        window.clearTimeout(timerId);
        callback();
      };

      return debounced;
    },

    throttle(callback, delay = config.throttleDelay) {
      if (!types.isFunction(callback)) {
        throw new TypeError("Throttle callback must be a function.");
      }

      let lastRun = 0;
      let timerId = null;
      let lastArgs;
      let lastThis;

      function throttled(...args) {
        const now = Date.now();
        const wait = Math.max(0, Number(delay) || 0);
        const remaining = wait - (now - lastRun);

        lastArgs = args;
        lastThis = this;

        if (remaining <= 0) {
          if (timerId !== null) {
            window.clearTimeout(timerId);
            timerId = null;
          }

          lastRun = now;
          callback.apply(lastThis, lastArgs);
          lastArgs = lastThis = undefined;
        } else if (timerId === null) {
          timerId = window.setTimeout(() => {
            lastRun = Date.now();
            timerId = null;

            callback.apply(lastThis, lastArgs);

            lastArgs = lastThis = undefined;
          }, remaining);
        }
      }

      throttled.cancel = () => {
        window.clearTimeout(timerId);
        timerId = null;
        lastArgs = lastThis = undefined;
        lastRun = 0;
      };

      return throttled;
    },

    sleep(milliseconds = 0) {
      const duration = Math.max(0, Number(milliseconds) || 0);

      return new Promise((resolve) => {
        window.setTimeout(resolve, duration);
      });
    }
  };

  // --------------------------------------------------
  // ID generation
  // --------------------------------------------------

  const ids = {
    uuid() {
      if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }

      if (typeof crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);

        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = Array.from(bytes, (byte) =>
          byte.toString(16).padStart(2, "0")
        );

        return [
          hex.slice(0, 4).join(""),
          hex.slice(4, 6).join(""),
          hex.slice(6, 8).join(""),
          hex.slice(8, 10).join(""),
          hex.slice(10, 16).join("")
        ].join("-");
      }

      throw new Error("Secure random number generation is unavailable.");
    },

    short(prefix = "mo") {
      return `${prefix}-${this.uuid()}`;
    }
  };

  // --------------------------------------------------
  // Formatting utilities
  // --------------------------------------------------

  const format = {
    number(value, options = {}) {
      const number = Number(value);

      if (!Number.isFinite(number)) return "--";

      try {
        return new Intl.NumberFormat(
          options.locale || config.locale,
          options
        ).format(number);
      } catch {
        return String(number);
      }
    },

    currency(value, options = {}) {
      const number = Number(value);

      if (!Number.isFinite(number)) return "--";

      try {
        return new Intl.NumberFormat(
          options.locale || config.locale,
          {
            style: "currency",
            currency: options.currency || config.currency,
            maximumFractionDigits: options.maximumFractionDigits ?? 2,
            ...options
          }
        ).format(number);
      } catch {
        return `${config.currencySymbol}${number.toFixed(2)}`;
      }
    },

    date(value, options = {}) {
      const date = value instanceof Date ? value : new Date(value);

      if (Number.isNaN(date.getTime())) return "--";

      try {
        return new Intl.DateTimeFormat(
          options.locale || config.locale,
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: options.timeZone || config.timeZone,
            ...options
          }
        ).format(date);
      } catch {
        return date.toISOString().slice(0, 10);
      }
    },

    relativeTime(value, options = {}) {
      const date = value instanceof Date ? value : new Date(value);

      if (Number.isNaN(date.getTime())) return "--";

      const seconds = Math.round((date.getTime() - Date.now()) / 1000);

      const units = [
        ["year", 31536000],
        ["month", 2592000],
        ["week", 604800],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
        ["second", 1]
      ];

      const formatter = new Intl.RelativeTimeFormat(
        options.locale || config.locale,
        { numeric: "auto" }
      );

      for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size || unit === "second") {
          return formatter.format(Math.round(seconds / size), unit);
        }
      }

      return formatter.format(0, "second");
    },

    truncate(value, maxLength = 100, suffix = "…") {
      const text = String(value ?? "");
      const limit = Math.max(0, Number(maxLength) || 0);

      if (text.length <= limit) return text;

      if (limit <= suffix.length) return suffix.slice(0, limit);

      return text.slice(0, limit - suffix.length).trimEnd() + suffix;
    },

    capitalize(value) {
      const text = String(value ?? "").trim();

      if (!text) return "";

      return text.charAt(0).toLocaleUpperCase(config.locale) +
        text.slice(1);
    },

    initials(value, maxCharacters = 2) {
      return String(value ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, Math.max(1, maxCharacters))
        .map((part) => Array.from(part)[0])
        .join("")
        .toLocaleUpperCase(config.locale);
    }
  };

  // --------------------------------------------------
  // String utilities
  // --------------------------------------------------

  const strings = {
    slug(value) {
      return String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },

    escapeHTML(value) {
      return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        };

        return entities[character];
      });
    },

    normalizeWhitespace(value) {
      return String(value ?? "").replace(/\s+/g, " ").trim();
    },

    stripControlCharacters(value) {
      return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "");
    }
  };

  // --------------------------------------------------
  // Validation helpers
  // --------------------------------------------------

  const validators = {
    email(value) {
      if (!types.isString(value)) return false;

      const email = value.trim();

      if (email.length > 254 || /\s/.test(email)) return false;

      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    phone(value) {
      if (!types.isString(value)) return false;

      const normalized = value.replace(/[\s().-]/g, "");

      return /^\+?[0-9]{7,15}$/.test(normalized);
    },

    url(value, options = {}) {
      if (!types.isNonEmptyString(value)) return false;

      try {
        const parsed = new URL(value);

        if (options.allowRelative) return true;

        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        if (!options.allowRelative) return false;

        return (
          value.startsWith("/") &&
          !value.startsWith("//") &&
          !value.includes("\\")
        );
      }
    },

    required(value) {
      if (types.isNullish(value)) return false;

      if (types.isString(value)) {
        return value.trim().length > 0;
      }

      if (types.isArray(value)) {
        return value.length > 0;
      }

      return true;
    },

    length(value, options = {}) {
      const text = String(value ?? "");
      const min = options.min ?? 0;
      const max = options.max ?? Infinity;

      return text.length >= min && text.length <= max;
    }
  };

  // --------------------------------------------------
  // URL and query utilities
  // --------------------------------------------------

  const url = {
    parse(value, base = window.location.href) {
      try {
        return new URL(value, base);
      } catch {
        return null;
      }
    },

    getQuery(name) {
      if (!types.isNonEmptyString(name)) return null;

      return new URLSearchParams(window.location.search).get(name);
    },

    getAllQuery(name) {
      if (!types.isNonEmptyString(name)) return [];

      return new URLSearchParams(window.location.search).getAll(name);
    },

    build(path, parameters = {}) {
      const parsed = this.parse(path);

      if (!parsed) return "";

      if (!types.isPlainObject(parameters)) return parsed.toString();

      for (const [key, value] of Object.entries(parameters)) {
        if (value === null || value === undefined) {
          parsed.searchParams.delete(key);
        } else if (Array.isArray(value)) {
          parsed.searchParams.delete(key);

          value.forEach((item) => {
            parsed.searchParams.append(key, String(item));
          });
        } else {
          parsed.searchParams.set(key, String(value));
        }
      }

      return parsed.toString();
    },

    isSameOrigin(value) {
      const parsed = this.parse(value);

      return parsed !== null &&
        parsed.origin === window.location.origin;
    }
  };

  // --------------------------------------------------
  // Object and JSON helpers
  // --------------------------------------------------

  const objects = {
    safeParseJSON(value, fallback = null) {
      if (!types.isString(value)) return fallback;

      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },

    clone(value) {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }

      return JSON.parse(JSON.stringify(value));
    },

    pick(source, keys = []) {
      if (!types.isPlainObject(source) || !Array.isArray(keys)) {
        return {};
      }

      return Object.fromEntries(
        keys
          .filter((key) =>
            Object.prototype.hasOwnProperty.call(source, key)
          )
          .map((key) => [key, source[key]])
      );
    },

    omit(source, keys = []) {
      if (!types.isPlainObject(source) || !Array.isArray(keys)) {
        return {};
      }

      const excluded = new Set(keys);

      return Object.fromEntries(
        Object.entries(source).filter(([key]) => !excluded.has(key))
      );
    }
  };

  // --------------------------------------------------
  // Device and browser utilities
  // --------------------------------------------------

  const browser = {
    get online() {
      return navigator.onLine;
    },

    get language() {
      return navigator.language || config.locale;
    },

    get reducedMotion() {
      return window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    },

    get touchDevice() {
      return (
        navigator.maxTouchPoints > 0 ||
        "ontouchstart" in window
      );
    },

    get standalone() {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        navigator.standalone === true
      );
    },

    onOnline(callback) {
      window.addEventListener("online", callback);

      return () => window.removeEventListener("online", callback);
    },

    onOffline(callback) {
      window.addEventListener("offline", callback);

      return () => window.removeEventListener("offline", callback);
    }
  };

  // --------------------------------------------------
  // Public runtime API
  // --------------------------------------------------

  const core = Object.freeze({
    config,
    environments: ENVIRONMENTS,
    storageTypes: STORAGE_TYPES,
    storageKeys: STORAGE_KEYS,
    httpStatus: HTTP_STATUS,

    logger,
    types,
    dom,
    storage,
    events,
    timing,
    ids,
    format,
    strings,
    validators,
    url,
    objects,
    browser,

    get ready() {
      return document.readyState !== "loading";
    }
  });

  Object.defineProperty(window, "MedOrbitsCore", {
    value: core,
    enumerable: true,
    configurable: false,
    writable: false
  });

  logger.info("Core runtime loaded", {
    version: config.version,
    environment
  });
})();
