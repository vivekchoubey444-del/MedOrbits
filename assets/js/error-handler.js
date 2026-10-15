/* =========================================================
   MedOrbits -- assets/js/error-handler.js
   Centralized error handling, logging, and user feedback
   ========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};

  const settings = {
    debug: Boolean(
      CONFIG.DEBUG ??
      CONFIG.debug ??
      false
    ),
    logToConsole: true,
    captureGlobalErrors: true,
    captureUnhandledRejections: true,
    notifyUser: true,
    maxStoredErrors: 100
  };

  const state = {
    errors: [],
    initialized: false,
    errorCount: 0
  };

  const listeners = new Set();

  const ERROR_TYPES = {
    NETWORK: "NETWORK_ERROR",
    VALIDATION: "VALIDATION_ERROR",
    AUTHENTICATION: "AUTHENTICATION_ERROR",
    AUTHORIZATION: "AUTHORIZATION_ERROR",
    NOT_FOUND: "NOT_FOUND_ERROR",
    SERVER: "SERVER_ERROR",
    TIMEOUT: "TIMEOUT_ERROR",
    UNKNOWN: "UNKNOWN_ERROR"
  };

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `err-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getMessage(error, fallback = "Something went wrong.") {
    if (typeof error === "string") return error;

    return (
      error?.userMessage ||
      error?.message ||
      error?.error ||
      fallback
    );
  }

  function classify(error) {
    const status = Number(error?.status || error?.statusCode || 0);
    const message = getMessage(error, "").toLowerCase();

    if (
      error?.name === "AbortError" ||
      message.includes("timeout")
    ) {
      return ERROR_TYPES.TIMEOUT;
    }

    if (
      status === 400 ||
      status === 422 ||
      message.includes("validation")
    ) {
      return ERROR_TYPES.VALIDATION;
    }

    if (status === 401) {
      return ERROR_TYPES.AUTHENTICATION;
    }

    if (status === 403) {
      return ERROR_TYPES.AUTHORIZATION;
    }

    if (status === 404) {
      return ERROR_TYPES.NOT_FOUND;
    }

    if (status >= 500) {
      return ERROR_TYPES.SERVER;
    }

    if (
      error instanceof TypeError ||
      message.includes("network") ||
      message.includes("fetch failed") ||
      message.includes("failed to fetch") ||
      message.includes("load failed")
    ) {
      return ERROR_TYPES.NETWORK;
    }

    return ERROR_TYPES.UNKNOWN;
  }

  function normalizeError(error, context = {}) {
    const original = error instanceof Error
      ? error
      : new Error(getMessage(error));

    return {
      id: createId(),
      name: original.name || "Error",
      message: getMessage(original),
      type: context.type || classify(error),
      status: Number(error?.status || error?.statusCode || 0) || null,
      code: error?.code || null,
      context: sanitizeContext(context),
      timestamp: new Date().toISOString(),
      url: window.location?.pathname || "",
      stack: settings.debug ? original.stack || null : null
    };
  }

  function sanitizeContext(context) {
    if (!context || typeof context !== "object") return {};

    const safe = {};
    const blockedKeys = /password|token|secret|authorization|cookie|email|phone|address|document|file|credential/i;

    Object.entries(context).forEach(([key, value]) => {
      if (blockedKeys.test(key)) return;

      if (
        value === null ||
        ["string", "number", "boolean"].includes(typeof value)
      ) {
        safe[key] = typeof value === "string"
          ? value.slice(0, 300)
          : value;
      }
    });

    return safe;
  }

  function log(error, context = {}) {
    const record = normalizeError(error, context);

    state.errors.unshift(record);
    state.errorCount += 1;

    if (state.errors.length > settings.maxStoredErrors) {
      state.errors.length = settings.maxStoredErrors;
    }

    if (settings.logToConsole) {
      const logger = record.type === ERROR_TYPES.VALIDATION
        ? console.warn
        : console.error;

      if (settings.debug) {
        logger("[MedOrbits]", record.message, record);
      } else {
        logger("[MedOrbits]", record.message);
      }
    }

    notifyListeners(record);

    document.dispatchEvent(
      new CustomEvent("medorbits:error", {
        detail: record
      })
    );

    return record;
  }

  function getUserMessage(error, options = {}) {
    const type = options.type || classify(error);

    const messages = {
      [ERROR_TYPES.NETWORK]:
        "Unable to connect. Please check your internet connection and try again.",
      [ERROR_TYPES.VALIDATION]:
        "Please check the information entered and try again.",
      [ERROR_TYPES.AUTHENTICATION]:
        "Your session may have expired. Please sign in again.",
      [ERROR_TYPES.AUTHORIZATION]:
        "You do not have permission to perform this action.",
      [ERROR_TYPES.NOT_FOUND]:
        "The requested information could not be found.",
      [ERROR_TYPES.SERVER]:
        "Our server is temporarily unavailable. Please try again later.",
      [ERROR_TYPES.TIMEOUT]:
        "The request took too long. Please try again.",
      [ERROR_TYPES.UNKNOWN]:
        "Something went wrong. Please try again."
    };

    if (options.exposeMessage && error?.message) {
      return getMessage(error);
    }

    return messages[type] || messages[ERROR_TYPES.UNKNOWN];
  }

  function show(message, type = "error", options = {}) {
    if (!settings.notifyUser || options.silent) return;

    const safeMessage = String(message || "Something went wrong.");

    if (window.MedOrbitsToast?.show) {
      window.MedOrbitsToast.show(safeMessage, type);
      return;
    }

    if (typeof window.MedOrbitsToast?.error === "function" && type === "error") {
      window.MedOrbitsToast.error(safeMessage);
      return;
    }

    document.dispatchEvent(
      new CustomEvent("medorbits:toast", {
        detail: {
          message: safeMessage,
          type,
          duration: options.duration || 5000
        }
      })
    );
  }

  function handle(error, context = {}, options = {}) {
    const record = log(error, context);

    if (!options.silent) {
      show(
        options.message || getUserMessage(error, options),
        options.toastType || "error",
        options
      );
    }

    return record;
  }

  function handleAsync(error, context = {}, options = {}) {
    handle(error, context, options);
    return null;
  }

  function handleResponse(response, context = {}) {
    if (!response || response.ok) return response;

    const error = new Error(
      `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.statusCode = response.status;

    handle(error, {
      ...context,
      source: context.source || "http-response"
    });

    return response;
  }

  function wrap(callback, context = {}, options = {}) {
    if (typeof callback !== "function") return callback;

    return function wrappedHandler(...args) {
      try {
        const result = callback.apply(this, args);

        if (result && typeof result.then === "function") {
          return result.catch(error => {
            handle(error, context, options);

            if (options.rethrow) throw error;
            return options.fallback;
          });
        }

        return result;
      } catch (error) {
        handle(error, context, options);

        if (options.rethrow) throw error;
        return options.fallback;
      }
    };
  }

  function guard(promise, context = {}, options = {}) {
    return Promise.resolve(promise).catch(error => {
      handle(error, context, options);

      if (options.rethrow !== false) {
        throw error;
      }

      return options.fallback ?? null;
    });
  }

  function notifyListeners(record) {
    listeners.forEach(callback => {
      try {
        callback(record);
      } catch (error) {
        if (settings.debug) {
          console.error("[MedOrbits Error Handler] Listener failed:", error);
        }
      }
    });
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return () => {};

    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function getErrors(options = {}) {
    const errors = [...state.errors];

    if (options.type) {
      return errors.filter(error => error.type === options.type);
    }

    return errors;
  }

  function clear(options = {}) {
    state.errors = [];

    if (options.resetCount) {
      state.errorCount = 0;
    }
  }

  function getState() {
    return {
      initialized: state.initialized,
      errorCount: state.errorCount,
      storedErrors: state.errors.length,
      settings: { ...settings }
    };
  }

  function configure(options = {}) {
    Object.keys(settings).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        settings[key] = options[key];
      }
    });

    return { ...settings };
  }

  function captureGlobalErrors() {
    if (settings.captureGlobalErrors) {
      window.addEventListener("error", event => {
        const error = event.error || new Error(event.message || "Uncaught error");

        handle(error, {
          source: "window-error",
          filename: event.filename || "",
          line: event.lineno || 0,
          column: event.colno || 0
        }, {
          silent: false
        });
      });
    }

    if (settings.captureUnhandledRejections) {
      window.addEventListener("unhandledrejection", event => {
        const error = event.reason instanceof Error
          ? event.reason
          : new Error(getMessage(event.reason, "Unhandled promise rejection"));

        handle(error, {
          source: "unhandled-rejection"
        });
      });
    }
  }

  function init(options = {}) {
    if (state.initialized) {
      configure(options);
      return api;
    }

    configure(options);
    captureGlobalErrors();

    state.initialized = true;

    document.dispatchEvent(
      new CustomEvent("medorbits:error-handler-ready")
    );

    return api;
  }

  const api = {
    ERROR_TYPES,
    init,
    configure,
    classify,
    normalizeError,
    log,
    handle,
    handleAsync,
    handleResponse,
    getUserMessage,
    show,
    wrap,
    guard,
    subscribe,
    getErrors,
    getState,
    clear
  };

  window.MedOrbitsErrorHandler = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), {
      once: true
    });
  } else {
    init();
  }

})(window, document);