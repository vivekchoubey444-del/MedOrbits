/* =========================================================
   MedOrbits -- Utility Helpers
   File: /assets/js/utils.js
========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};

  const DEFAULTS = Object.freeze({
    currency: CONFIG.CURRENCY || "INR",
    locale: CONFIG.LOCALE || "en-IN",
    dateFormat: CONFIG.DATE_FORMAT || "medium"
  });

  const EVENTS = Object.freeze({
    READY: "medorbits:utils:ready",
    ERROR: "medorbits:utils:error"
  });

  function emit(name, detail) {
    try {
      document.dispatchEvent(
        new CustomEvent(name, { detail: detail || {} })
      );
    } catch (_) {}
  }

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function isPlainObject(value) {
    if (!isObject(value)) return false;

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
  }

  function isEmpty(value) {
    if (value == null) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (isPlainObject(value)) return Object.keys(value).length === 0;

    return false;
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function stripHTML(value) {
    const template = document.createElement("template");
    template.innerHTML = String(value == null ? "" : value);

    return (template.content.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function capitalize(value) {
    const text = String(value == null ? "" : value).trim();

    return text
      ? text.charAt(0).toUpperCase() + text.slice(1)
      : "";
  }

  function titleCase(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/\b([a-z])/g, function (match) {
        return match.toUpperCase();
      });
  }

  function toSlug(value) {
    return String(value == null ? "" : value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function truncate(value, limit, suffix) {
    const text = String(value == null ? "" : value);
    const max = Math.max(0, Number(limit) || 0);
    const ending = suffix === undefined ? "…" : String(suffix);

    if (text.length <= max) return text;
    if (max <= ending.length) return ending.slice(0, max);

    return text.slice(0, max - ending.length).trimEnd() + ending;
  }

  function clamp(value, min, max) {
    const number = Number(value);
    const lower = Number(min);
    const upper = Number(max);

    if (
      !Number.isFinite(number) ||
      !Number.isFinite(lower) ||
      !Number.isFinite(upper) ||
      lower > upper
    ) {
      return null;
    }

    return Math.min(upper, Math.max(lower, number));
  }

  function randomId(prefix) {
    const name = String(prefix || "mo");
    let id;

    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      id = window.crypto.randomUUID();
    } else if (
      window.crypto &&
      typeof window.crypto.getRandomValues === "function"
    ) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);

      id = Array.from(bytes).map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      }).join("");
    } else {
      id = Date.now().toString(36) +
        Math.random().toString(36).slice(2);
    }

    return name + "-" + id;
  }

  function formatCurrency(amount, currency, locale) {
    const value = Number(amount);

    if (!Number.isFinite(value)) return "--";

    try {
      return new Intl.NumberFormat(locale || DEFAULTS.locale, {
        style: "currency",
        currency: currency || DEFAULTS.currency,
        maximumFractionDigits: 2
      }).format(value);
    } catch (_) {
      return value.toFixed(2) + " " + (currency || DEFAULTS.currency);
    }
  }

  function formatNumber(value, options) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "--";

    try {
      return new Intl.NumberFormat(
        (options && options.locale) || DEFAULTS.locale,
        options || {}
      ).format(number);
    } catch (_) {
      return String(number);
    }
  }

  function formatCompactNumber(value, locale) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "--";

    try {
      return new Intl.NumberFormat(locale || DEFAULTS.locale, {
        notation: "compact",
        maximumFractionDigits: 1
      }).format(number);
    } catch (_) {
      return String(number);
    }
  }

  function formatDate(value, options) {
    if (!value) return "--";

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return "--";

    const settings = Object.assign(
      { dateStyle: DEFAULTS.dateFormat },
      options || {}
    );

    try {
      return new Intl.DateTimeFormat(
        settings.locale || DEFAULTS.locale,
        settings
      ).format(date);
    } catch (_) {
      return date.toLocaleDateString();
    }
  }

  function formatDateTime(value, locale) {
    return formatDate(value, {
      locale: locale || DEFAULTS.locale,
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function formatRelativeTime(value, locale) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return "--";

    const difference = date.getTime() - Date.now();
    const seconds = Math.round(difference / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    let amount = seconds;
    let unit = "second";

    if (Math.abs(days) >= 1) {
      amount = days;
      unit = "day";
    } else if (Math.abs(hours) >= 1) {
      amount = hours;
      unit = "hour";
    } else if (Math.abs(minutes) >= 1) {
      amount = minutes;
      unit = "minute";
    }

    try {
      return new Intl.RelativeTimeFormat(locale || DEFAULTS.locale, {
        numeric: "auto"
      }).format(amount, unit);
    } catch (_) {
      return formatDate(date);
    }
  }

  function formatBytes(bytes, decimals) {
    const value = Number(bytes);
    const precision = Math.max(0, Number(decimals) || 2);

    if (!Number.isFinite(value) || value < 0) return "--";
    if (value === 0) return "0 Bytes";

    const units = ["Bytes", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      Math.floor(Math.log(value) / Math.log(1024)),
      units.length - 1
    );

    return (
      (value / Math.pow(1024, index)).toFixed(
        index === 0 ? 0 : precision
      ) +
      " " +
      units[index]
    );
  }

  function normalizePhone(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/[^\d+]/g, "")
      .replace(/(?!^)\+/g, "");
  }

  function isValidEmail(value) {
    const email = String(value == null ? "" : value).trim();

    if (!email || email.length > 254) return false;

    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function isValidPhone(value, minLength, maxLength) {
    const phone = normalizePhone(value).replace(/\D/g, "");

    return phone.length >= (minLength || 7) &&
      phone.length <= (maxLength || 15);
  }

  function isValidURL(value, options) {
    options = options || {};

    try {
      const url = new URL(String(value), window.location.origin);

      if (options.sameOrigin && url.origin !== window.location.origin) {
        return false;
      }

      if (options.allowRelative && !/^[a-z][a-z\d+.-]*:/i.test(String(value))) {
        return true;
      }

      return url.protocol === "https:" ||
        (options.allowHttp && url.protocol === "http:");
    } catch (_) {
      return false;
    }
  }

  function safeURL(value, options) {
    options = options || {};

    try {
      const raw = String(value == null ? "" : value).trim();
      if (!raw) return "";

      const url = new URL(raw, window.location.origin);

      const allowedProtocols = options.allowMailto
        ? ["https:", "http:", "mailto:"]
        : options.allowTel
          ? ["https:", "http:", "tel:"]
          : ["https:", "http:"];

      if (!allowedProtocols.includes(url.protocol)) return "";

      if (options.sameOrigin && url.origin !== window.location.origin) {
        return "";
      }

      return url.href;
    } catch (_) {
      return "";
    }
  }

  function debounce(callback, wait) {
    if (typeof callback !== "function") {
      throw new TypeError("Debounce requires a function.");
    }

    let timer = null;

    function debounced() {
      const context = this;
      const args = arguments;

      window.clearTimeout(timer);

      timer = window.setTimeout(function () {
        callback.apply(context, args);
      }, Math.max(0, Number(wait) || 0));
    }

    debounced.cancel = function () {
      window.clearTimeout(timer);
      timer = null;
    };

    debounced.flush = function () {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
        callback.apply(this, arguments);
      }
    };

    return debounced;
  }

  function throttle(callback, wait) {
    if (typeof callback !== "function") {
      throw new TypeError("Throttle requires a function.");
    }

    let lastRun = 0;
    let timer = null;

    return function () {
      const context = this;
      const args = arguments;
      const now = Date.now();
      const delay = Math.max(0, Number(wait) || 0);
      const remaining = delay - (now - lastRun);

      if (remaining <= 0) {
        window.clearTimeout(timer);
        timer = null;
        lastRun = now;
        callback.apply(context, args);
      } else if (timer === null) {
        timer = window.setTimeout(function () {
          lastRun = Date.now();
          timer = null;
          callback.apply(context, args);
        }, remaining);
      }
    };
  }

  function deepClone(value) {
    if (typeof window.structuredClone === "function") {
      try {
        return window.structuredClone(value);
      } catch (_) {}
    }

    return JSON.parse(JSON.stringify(value));
  }

  function deepMerge(target) {
    const output = isPlainObject(target) ? Object.assign({}, target) : {};

    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      if (!isPlainObject(source)) return;

      Object.keys(source).forEach(function (key) {
        const value = source[key];

        if (isPlainObject(value)) {
          output[key] = deepMerge(
            isPlainObject(output[key]) ? output[key] : {},
            value
          );
        } else if (
          key !== "__proto__" &&
          key !== "constructor" &&
          key !== "prototype"
        ) {
          output[key] = value;
        }
      });
    });

    return output;
  }

  function getNestedValue(object, path, fallback) {
    if (!object || !path) return fallback;

    const keys = Array.isArray(path)
      ? path
      : String(path).split(".").filter(Boolean);

    let current = object;

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];

      if (
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype" ||
        current == null ||
        !Object.prototype.hasOwnProperty.call(current, key)
      ) {
        return fallback;
      }

      current = current[key];
    }

    return current === undefined ? fallback : current;
  }

  function setNestedValue(object, path, value) {
    if (!isObject(object) || !path) return false;

    const keys = Array.isArray(path)
      ? path
      : String(path).split(".").filter(Boolean);

    if (!keys.length) return false;

    let current = object;

    for (let index = 0; index < keys.length - 1; index += 1) {
      const key = keys[index];

      if (
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype"
      ) {
        return false;
      }

      if (!isObject(current[key])) {
        current[key] = {};
      }

      current = current[key];
    }

    const lastKey = keys[keys.length - 1];

    if (
      lastKey === "__proto__" ||
      lastKey === "constructor" ||
      lastKey === "prototype"
    ) {
      return false;
    }

    current[lastKey] = value;
    return true;
  }

  function getQueryParam(name, url) {
    try {
      const target = new URL(url || window.location.href);
      return target.searchParams.get(String(name));
    } catch (_) {
      return null;
    }
  }

  function buildQuery(params) {
    const query = new URLSearchParams();

    if (!isObject(params)) return "";

    Object.keys(params).forEach(function (key) {
      const value = params[key];

      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        value.forEach(function (item) {
          if (item !== undefined && item !== null) {
            query.append(key, String(item));
          }
        });
      } else if (typeof value === "object") {
        query.set(key, JSON.stringify(value));
      } else {
        query.set(key, String(value));
      }
    });

    return query.toString();
  }

  function copyToClipboard(value) {
    const text = String(value == null ? "" : value);

    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      const textarea = document.createElement("textarea");

      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";

      document.body.appendChild(textarea);
      textarea.select();

      let copied = false;

      try {
        copied = document.execCommand("copy");
      } catch (_) {
        copied = false;
      }

      textarea.remove();

      if (copied) {
        resolve(true);
      } else {
        reject(new Error("Clipboard access is unavailable."));
      }
    });
  }

  function downloadBlob(blob, filename) {
    if (!(blob instanceof Blob)) {
      throw new TypeError("A Blob is required.");
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = String(filename || "download");
    anchor.hidden = true;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadText(text, filename, mimeType) {
    const blob = new Blob([String(text == null ? "" : text)], {
      type: mimeType || "text/plain;charset=utf-8"
    });

    downloadBlob(blob, filename || "download.txt");
  }

  function wait(milliseconds, signal) {
    return new Promise(function (resolve, reject) {
      const delay = Math.max(0, Number(milliseconds) || 0);

      if (signal && signal.aborted) {
        reject(new DOMException("Operation aborted.", "AbortError"));
        return;
      }

      const timer = window.setTimeout(function () {
        cleanup();
        resolve();
      }, delay);

      function onAbort() {
        window.clearTimeout(timer);
        cleanup();
        reject(new DOMException("Operation aborted.", "AbortError"));
      }

      function cleanup() {
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
      }

      if (signal) {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }

  function once(callback) {
    let called = false;
    let result;

    return function () {
      if (called) return result;

      called = true;
      result = callback.apply(this, arguments);

      return result;
    };
  }

  function retry(callback, options) {
    options = options || {};

    const attempts = Math.max(1, Number(options.attempts) || 3);
    const delay = Math.max(0, Number(options.delay) || 300);
    const backoff = Math.max(1, Number(options.backoff) || 2);
    const shouldRetry = typeof options.shouldRetry === "function"
      ? options.shouldRetry
      : function () {
          return true;
        };

    if (typeof callback !== "function") {
      return Promise.reject(new TypeError("Retry requires a function."));
    }

    return (async function () {
      let lastError;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          return await callback(attempt + 1);
        } catch (error) {
          lastError = error;

          if (
            attempt === attempts - 1 ||
            !shouldRetry(error, attempt + 1)
          ) {
            throw error;
          }

          await wait(delay * Math.pow(backoff, attempt), options.signal);
        }
      }

      throw lastError;
    })();
  }

  function getElement(selector, root) {
    if (!selector) return null;

    if (selector instanceof Element) {
      return selector;
    }

    try {
      return (root || document).querySelector(selector);
    } catch (_) {
      return null;
    }
  }

  function getElements(selector, root) {
    if (!selector) return [];

    try {
      return Array.from((root || document).querySelectorAll(selector));
    } catch (_) {
      return [];
    }
  }

  function setText(selector, value, root) {
    const element = getElement(selector, root);

    if (!element) return false;

    element.textContent = value == null ? "" : String(value);
    return true;
  }

  function setHTML(selector, value, root) {
    const element = getElement(selector, root);

    if (!element) return false;

    element.innerHTML = escapeHTML(value);
    return true;
  }

  function toggleClass(elementOrSelector, className, force) {
    const element = getElement(elementOrSelector);

    if (!element || !className) return false;

    return element.classList.toggle(className, force);
  }

  function getCookie(name) {
    const key = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(
      new RegExp("(?:^|;\\s*)" + key + "=([^;]*)")
    );

    return match ? decodeURIComponent(match[1]) : null;
  }

  function getDeviceInfo() {
    const userAgent = navigator.userAgent || "";

    return {
      mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent),
      language: navigator.language || DEFAULTS.locale,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      screen: {
        width: window.screen ? window.screen.width : 0,
        height: window.screen ? window.screen.height : 0
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  function isOnline() {
    return navigator.onLine !== false;
  }

  function scrollToElement(selector, options) {
    const element = getElement(selector);

    if (!element) return false;

    options = options || {};

    element.scrollIntoView({
      behavior: options.behavior || "smooth",
      block: options.block || "start",
      inline: options.inline || "nearest"
    });

    return true;
  }

  function focusElement(selector, options) {
    const element = getElement(selector);

    if (!element || typeof element.focus !== "function") return false;

    try {
      element.focus(options || { preventScroll: false });
      return true;
    } catch (_) {
      element.focus();
      return true;
    }
  }

  function dispatch(name, detail, target) {
    if (!name) return false;

    const element = target || document;

    try {
      return element.dispatchEvent(
        new CustomEvent(name, {
          detail: detail || {},
          bubbles: true,
          cancelable: true
        })
      );
    } catch (error) {
      emit(EVENTS.ERROR, {
        message: error.message,
        eventName: name
      });

      return false;
    }
  }

  const api = Object.freeze({
    isObject: isObject,
    isPlainObject: isPlainObject,
    isEmpty: isEmpty,
    escapeHTML: escapeHTML,
    stripHTML: stripHTML,
    capitalize: capitalize,
    titleCase: titleCase,
    toSlug: toSlug,
    truncate: truncate,
    clamp: clamp,
    randomId: randomId,

    formatCurrency: formatCurrency,
    formatNumber: formatNumber,
    formatCompactNumber: formatCompactNumber,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatRelativeTime: formatRelativeTime,
    formatBytes: formatBytes,

    normalizePhone: normalizePhone,
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone,
    isValidURL: isValidURL,
    safeURL: safeURL,

    debounce: debounce,
    throttle: throttle,
    deepClone: deepClone,
    deepMerge: deepMerge,
    getNestedValue: getNestedValue,
    setNestedValue: setNestedValue,

    getQueryParam: getQueryParam,
    buildQuery: buildQuery,
    copyToClipboard: copyToClipboard,
    downloadBlob: downloadBlob,
    downloadText: downloadText,
    wait: wait,
    once: once,
    retry: retry,

    getElement: getElement,
    getElements: getElements,
    setText: setText,
    setHTML: setHTML,
    toggleClass: toggleClass,
    getCookie: getCookie,
    getDeviceInfo: getDeviceInfo,
    isOnline: isOnline,
    scrollToElement: scrollToElement,
    focusElement: focusElement,
    dispatch: dispatch,

    events: EVENTS
  });

  window.MedOrbitsUtils = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Utils = api;

  emit(EVENTS.READY, {
    version: CONFIG.VERSION || "1.0.0"
  });

})(window, document);