/* =========================================================
   MedOrbits -- Storage Manager
   File: /assets/js/storage.js
   Secure, namespaced browser storage utilities
========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const PREFIX = String(CONFIG.STORAGE_PREFIX || "medorbits").replace(/[^a-zA-Z0-9_-]/g, "");
  const MAX_VALUE_SIZE = 1024 * 1024;
  const EVENTS = {
    CHANGE: "medorbits:storage:change",
    ERROR: "medorbits:storage:error",
    CLEAR: "medorbits:storage:clear"
  };
  const MEMORY = new Map();
  const SENSITIVE_KEY_PATTERN =
    /(?:password|passwd|secret|private.?key|access.?token|refresh.?token|authorization|session.?id|csrf|payment.?card|cvv)/i;
  let storageAvailable = {
    local: false,
    session: false
  };
  function emit(name, detail) {
    try {
      document.dispatchEvent(
        new CustomEvent(name, {
          detail: detail || {}
        })
      );
    } catch (_) {
      // Storage operations must remain usable without CustomEvent support.
    }
  }
  function reportError(operation, key, error) {
    const detail = {
      operation: operation,
      key: key || null,
      message: error && error.message ? error.message : "Storage operation failed."
    };
    emit(EVENTS.ERROR, detail);
    if (
      window.MedOrbitsErrorHandler &&
      typeof window.MedOrbitsErrorHandler.notify === "function"
    ) {
      try {
        window.MedOrbitsErrorHandler.notify(error || new Error(detail.message), {
          module: "storage",
          operation: operation,
          key: key || null
        });
      } catch (_) {
        // Error reporting must not interrupt application execution.
      }
    }
  }
  function normalizeKey(key) {
    if (typeof key !== "string" && typeof key !== "number") {
      throw new TypeError("Storage key must be a string or number.");
    }
    const normalized = String(key).trim();
    if (!normalized) {
      throw new TypeError("Storage key cannot be empty.");
    }
    return PREFIX + ":" + normalized;
  }
  function validateValue(value) {
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw new TypeError("Storage value must be JSON-serializable.");
    }
    if (typeof serialized !== "string") {
      throw new TypeError("Storage value cannot be serialized.");
    }
    if (serialized.length > MAX_VALUE_SIZE) {
      throw new RangeError("Storage value exceeds the allowed size.");
    }
    return serialized;
  }
  function getBackend(type) {
    if (type === "session") {
      return storageAvailable.session ? window.sessionStorage : null;
    }
    return storageAvailable.local ? window.localStorage : null;
  }
  function initializeStorage() {
    [
      { name: "local", property: "localStorage" },
      { name: "session", property: "sessionStorage" }
    ].forEach(function (item) {
      try {
        const storage = window[item.property];
        const testKey = PREFIX + ":__storage_test__";
        storage.setItem(testKey, "1");
        storage.removeItem(testKey);
        storageAvailable[item.name] = true;
      } catch (_) {
        storageAvailable[item.name] = false;
      }
    });
  }
  function readRaw(key, type) {
    const normalizedKey = normalizeKey(key);
    const backend = getBackend(type);
    if (backend) {
      try {
        return backend.getItem(normalizedKey);
      } catch (error) {
        reportError("read", key, error);
      }
    }
    return MEMORY.has(normalizedKey) ? MEMORY.get(normalizedKey) : null;
  }
  function writeRaw(key, value, type) {
    const normalizedKey = normalizeKey(key);
    const serialized = validateValue(value);
    const backend = getBackend(type);
    if (backend) {
      try {
        backend.setItem(normalizedKey, serialized);
        MEMORY.delete(normalizedKey);
        return true;
      } catch (error) {
        reportError("write", key, error);
      }
    }
    MEMORY.set(normalizedKey, serialized);
    return true;
  }
  function removeRaw(key, type) {
    const normalizedKey = normalizeKey(key);
    const backend = getBackend(type);
    let removed = false;
    if (backend) {
      try {
        removed = backend.getItem(normalizedKey) !== null;
        backend.removeItem(normalizedKey);
      } catch (error) {
        reportError("remove", key, error);
      }
    }
    if (MEMORY.has(normalizedKey)) {
      MEMORY.delete(normalizedKey);
      removed = true;
    }
    return removed;
  }
  function parseValue(raw, fallback) {
    if (raw === null || raw === undefined) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }
  function set(key, value, options) {
    options = options || {};
    try {
      const success = writeRaw(key, value, options.storage || "local");
      if (success) {
        emit(EVENTS.CHANGE, {
          key: String(key),
          operation: "set",
          storage: options.storage || "local"
        });
      }
      return success;
    } catch (error) {
      reportError("set", key, error);
      return false;
    }
  }
  function get(key, fallback, options) {
    options = options || {};
    try {
      const raw = readRaw(key, options.storage || "local");
      return parseValue(raw, fallback === undefined ? null : fallback);
    } catch (error) {
      reportError("get", key, error);
      return fallback === undefined ? null : fallback;
    }
  }
  function remove(key, options) {
    options = options || {};
    try {
      const removed = removeRaw(key, options.storage || "local");
      if (removed) {
        emit(EVENTS.CHANGE, {
          key: String(key),
          operation: "remove",
          storage: options.storage || "local"
        });
      }
      return removed;
    } catch (error) {
      reportError("remove", key, error);
      return false;
    }
  }
  function has(key, options) {
    options = options || {};
    try {
      return readRaw(key, options.storage || "local") !== null;
    } catch (error) {
      reportError("has", key, error);
      return false;
    }
  }
  function clear(options) {
    options = options || {};
    const type = options.storage || "local";
    const backend = getBackend(type);
    const prefix = PREFIX + ":";
    const removedKeys = [];
    if (backend) {
      try {
        const keys = [];
        for (let index = 0; index < backend.length; index += 1) {
          const key = backend.key(index);
          if (key && key.indexOf(prefix) === 0) {
            keys.push(key);
          }
        }
        keys.forEach(function (key) {
          backend.removeItem(key);
          removedKeys.push(key.slice(prefix.length));
        });
      } catch (error) {
        reportError("clear", null, error);
      }
    }
    Array.from(MEMORY.keys()).forEach(function (key) {
      if (key.indexOf(prefix) === 0) {
        MEMORY.delete(key);
        removedKeys.push(key.slice(prefix.length));
      }
    });
    emit(EVENTS.CLEAR, {
      storage: type,
      keys: removedKeys
    });
    return removedKeys.length;
  }
  function keys(options) {
    options = options || {};
    const type = options.storage || "local";
    const backend = getBackend(type);
    const prefix = PREFIX + ":";
    const result = new Set();
    if (backend) {
      try {
        for (let index = 0; index < backend.length; index += 1) {
          const key = backend.key(index);
          if (key && key.indexOf(prefix) === 0) {
            result.add(key.slice(prefix.length));
          }
        }
      } catch (error) {
        reportError("keys", null, error);
      }
    }
    MEMORY.forEach(function (_, key) {
      if (key.indexOf(prefix) === 0) {
        result.add(key.slice(prefix.length));
      }
    });
    return Array.from(result);
  }
  function setSession(key, value) {
    return set(key, value, { storage: "session" });
  }
  function getSession(key, fallback) {
    return get(key, fallback, { storage: "session" });
  }
  function removeSession(key) {
    return remove(key, { storage: "session" });
  }
  function setJSON(key, value, options) {
    return set(key, value, options);
  }
  function getJSON(key, fallback, options) {
    return get(key, fallback, options);
  }
  function setString(key, value, options) {
    if (typeof value !== "string") {
      value = String(value);
    }
    return set(key, value, options);
  }
  function getString(key, fallback, options) {
    const value = get(key, fallback === undefined ? "" : fallback, options);
    return typeof value === "string"
      ? value
      : fallback === undefined
        ? ""
        : fallback;
  }
  function setBoolean(key, value, options) {
    return set(key, Boolean(value), options);
  }
  function getBoolean(key, fallback, options) {
    const value = get(key, fallback === undefined ? false : fallback, options);
    return typeof value === "boolean"
      ? value
      : fallback === undefined
        ? false
        : fallback;
  }
  function setNumber(key, value, options) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return false;
    }
    return set(key, number, options);
  }
  function getNumber(key, fallback, options) {
    const defaultValue = fallback === undefined ? 0 : Number(fallback);
    const value = get(key, defaultValue, options);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    return defaultValue;
  }
  function setWithExpiry(key, value, ttlMilliseconds, options) {
    const ttl = Number(ttlMilliseconds);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return false;
    }
    return set(
      key,
      {
        value: value,
        expiresAt: Date.now() + ttl
      },
      options
    );
  }
  function getWithExpiry(key, fallback, options) {
    const entry = get(key, null, options);
    if (
      !entry ||
      typeof entry !== "object" ||
      !Object.prototype.hasOwnProperty.call(entry, "expiresAt")
    ) {
      return entry === null ? (fallback === undefined ? null : fallback) : entry;
    }
    if (
      typeof entry.expiresAt !== "number" ||
      entry.expiresAt <= Date.now()
    ) {
      remove(key, options);
      return fallback === undefined ? null : fallback;
    }
    return entry.value;
  }
  function remember(key, value, ttlMilliseconds, options) {
    return setWithExpiry(key, value, ttlMilliseconds, options);
  }
  function forget(key, options) {
    return remove(key, options);
  }
  function isAvailable(type) {
    if (type === "session") {
      return storageAvailable.session;
    }
    if (type === "memory") {
      return true;
    }
    return storageAvailable.local;
  }
  function getStatus() {
    return {
      localStorage: storageAvailable.local,
      sessionStorage: storageAvailable.session,
      memoryFallback: true,
      prefix: PREFIX
    };
  }
  function onChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }
    const handler = function (event) {
      callback(event.detail || {});
    };
    document.addEventListener(EVENTS.CHANGE, handler);
    return function unsubscribe() {
      document.removeEventListener(EVENTS.CHANGE, handler);
    };
  }
  function handleExternalStorageEvent(event) {
    if (!event || !event.key || event.key.indexOf(PREFIX + ":") !== 0) {
      return;
    }
    emit(EVENTS.CHANGE, {
      key: event.key.slice((PREFIX + ":").length),
      operation: event.newValue === null ? "remove" : "external",
      storage: event.storageArea === window.sessionStorage ? "session" : "local",
      external: true
    });
  }
  function clearSensitiveMemory() {
    Array.from(MEMORY.keys()).forEach(function (key) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        MEMORY.delete(key);
      }
    });
  }
  initializeStorage();
  window.addEventListener("storage", handleExternalStorageEvent);
  window.addEventListener("pagehide", clearSensitiveMemory);
  const api = Object.freeze({
    set: set,
    get: get,
    remove: remove,
    has: has,
    clear: clear,
    keys: keys,
    setSession: setSession,
    getSession: getSession,
    removeSession: removeSession,
    setJSON: setJSON,
    getJSON: getJSON,
    setString: setString,
    getString: getString,
    setBoolean: setBoolean,
    getBoolean: getBoolean,
    setNumber: setNumber,
    getNumber: getNumber,
    setWithExpiry: setWithExpiry,
    getWithExpiry: getWithExpiry,
    remember: remember,
    forget: forget,
    isAvailable: isAvailable,
    getStatus: getStatus,
    onChange: onChange,
    events: Object.freeze(EVENTS)
  });
  window.MedOrbitsStorage = api;
  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Storage = api;
})(window, document);