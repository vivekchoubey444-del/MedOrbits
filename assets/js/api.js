
/**
 * MedOrbits -- Central API Client
 * File: assets/js/api.js
 *
 * Responsibilities:
 * - Centralized HTTP requests
 * - JSON request and response handling
 * - Authentication and CSRF hooks
 * - Request timeouts and cancellation
 * - Consistent API errors
 * - Query parameters and pagination support
 * - File uploads using FormData
 * - Safe integration with the MedOrbits backend
 *
 * Dependencies: None
 * Runtime: Browser, modern JavaScript
 *
 * Security:
 * - Never store authentication secrets in this module.
 * - Never trust client-side authorization.
 * - The server must enforce authentication and permissions.
 */

(() => {
  "use strict";

  // --------------------------------------------------
  // Configuration
  // --------------------------------------------------

  const DEFAULTS = Object.freeze({
    baseURL:
      window.MedOrbitsConfig?.api?.baseURL ||
      window.MedOrbitsConstants?.API?.PREFIX ||
      "/api/v1",
    timeout: 20000,
    credentials: "same-origin",
    headers: Object.freeze({
      Accept: "application/json"
    }),
    csrf: Object.freeze({
      enabled: true,
      headerName: "X-CSRF-Token",
      metaName: "csrf-token",
      cookieName: "csrf-token"
    })
  });

  const SAFE_METHODS = new Set([
    "GET",
    "HEAD",
    "OPTIONS"
  ]);

  const BODYLESS_STATUSES = new Set([204, 205, 304]);

  let config = {
    ...DEFAULTS,
    headers: { ...DEFAULTS.headers },
    csrf: { ...DEFAULTS.csrf }
  };

  let authTokenProvider = null;
  let csrfTokenProvider = null;
  let requestInterceptor = null;
  let responseInterceptor = null;
  let errorInterceptor = null;

  // --------------------------------------------------
  // API error class
  // --------------------------------------------------

  class APIError extends Error {
    constructor(message, options = {}) {
      super(message);

      this.name = "APIError";
      this.status = options.status ?? 0;
      this.code = options.code ?? "API_ERROR";
      this.details = options.details ?? null;
      this.data = options.data ?? null;
      this.url = options.url ?? null;
      this.method = options.method ?? null;
      this.isNetworkError = options.isNetworkError === true;
      this.isTimeout = options.isTimeout === true;
      this.isAborted = options.isAborted === true;
    }
  }

  // --------------------------------------------------
  // Utility functions
  // --------------------------------------------------

  const utils = {
    isPlainObject(value) {
      if (value === null || typeof value !== "object") {
        return false;
      }

      const prototype = Object.getPrototypeOf(value);

      return (
        prototype === Object.prototype ||
        prototype === null
      );
    },

    normalizeBaseURL(value) {
      const base = String(value || "/api/v1").trim();

      if (!base) {
        throw new TypeError("API base URL cannot be empty.");
      }

      if (/^[a-z][a-z\d+.-]*:/i.test(base) && typeof window !== "undefined") {
        const parsed = new URL(base);

        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new TypeError("API URL must use HTTP or HTTPS.");
        }

        if (parsed.origin !== window.location.origin && parsed.protocol !== "https:") {
          throw new TypeError("Cross-origin API URLs must use HTTPS.");
        }

        return parsed.href.replace(/\/+$/, "");
      }

      if (!base.startsWith("/")) {
        throw new TypeError(
          "Use an absolute site path such as /api or a valid API URL."
        );
      }

      return base.replace(/\/+$/, "");
    },

    buildURL(path, params) {
      if (typeof path !== "string" || !path.trim()) {
        throw new TypeError("An API endpoint path is required.");
      }

      const normalizedPath = path.trim();

      if (/^[a-z][a-z\d+.-]*:/i.test(normalizedPath) ||
          normalizedPath.startsWith("//")) {
        throw new TypeError(
          "Pass an API path, not an arbitrary external URL."
        );
      }

      if (normalizedPath.includes("\\") ||
          normalizedPath.includes("\0")) {
        throw new TypeError("Invalid API endpoint path.");
      }

      const base = config.baseURL.replace(/\/+$/, "");
      const endpoint = normalizedPath.replace(/^\/+/, "");

      const url = new URL(
        `${base}/${endpoint}`,
        window.location.origin
      );

      if (url.origin !== window.location.origin) {
        const configuredOrigin = new URL(
          config.baseURL,
          window.location.origin
        ).origin;

        if (url.origin !== configuredOrigin) {
          throw new TypeError("API endpoint origin mismatch.");
        }
      }

      if (params) {
        const entries = params instanceof URLSearchParams
          ? params.entries()
          : Object.entries(params);

        for (const [key, value] of entries) {
          if (value === undefined || value === null) {
            continue;
          }

          if (Array.isArray(value)) {
            url.searchParams.delete(key);

            value.forEach((item) => {
              if (item !== undefined && item !== null) {
                url.searchParams.append(key, String(item));
              }
            });
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      }

      return url;
    },

    getCookie(name) {
      if (typeof document === "undefined") return null;

      const prefix = `${encodeURIComponent(name)}=`;

      const entry = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(prefix));

      if (!entry) return null;

      try {
        return decodeURIComponent(entry.slice(prefix.length));
      } catch {
        return entry.slice(prefix.length);
      }
    },

    getMetaContent(name) {
      if (typeof document === "undefined") return null;

      return document
        .querySelector(`meta[name="${name}"]`)
        ?.getAttribute("content") || null;
    },

    isFormData(value) {
      return typeof FormData !== "undefined" &&
        value instanceof FormData;
    },

    isBlob(value) {
      return typeof Blob !== "undefined" &&
        value instanceof Blob;
    },

    isURLSearchParams(value) {
      return typeof URLSearchParams !== "undefined" &&
        value instanceof URLSearchParams;
    },

    isBodyInit(value) {
      return (
        typeof value === "string" ||
        this.isFormData(value) ||
        this.isBlob(value) ||
        this.isURLSearchParams(value) ||
        (typeof ArrayBuffer !== "undefined" &&
          (value instanceof ArrayBuffer ||
            ArrayBuffer.isView(value))) ||
        (typeof ReadableStream !== "undefined" &&
          value instanceof ReadableStream)
      );
    },

    parseRetryAfter(value) {
      if (!value) return null;

      const seconds = Number(value);

      if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds;
      }

      const date = Date.parse(value);

      return Number.isNaN(date)
        ? null
        : Math.max(0, (date - Date.now()) / 1000);
    }
  };

  // --------------------------------------------------
  // Authentication and CSRF
  // --------------------------------------------------

  const security = {
    async getAuthToken() {
      if (typeof authTokenProvider !== "function") {
        return null;
      }

      const token = await authTokenProvider();

      return typeof token === "string" && token.trim()
        ? token.trim()
        : null;
    },

    async getCSRFToken() {
      if (typeof csrfTokenProvider === "function") {
        const token = await csrfTokenProvider();

        if (typeof token === "string" && token.trim()) {
          return token.trim();
        }
      }

      const fromMeta = utils.getMetaContent(
        config.csrf.metaName
      );

      if (fromMeta) return fromMeta;

      // A JavaScript-readable CSRF cookie is supported only when
      // the server explicitly implements that cookie strategy.
      // HttpOnly session cookies should remain inaccessible here.
      return utils.getCookie(config.csrf.cookieName);
    },

    async apply(headers, method) {
      const token = await this.getAuthToken();

      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      if (
        config.csrf.enabled &&
        !SAFE_METHODS.has(method)
      ) {
        const csrfToken = await this.getCSRFToken();

        if (csrfToken && !headers.has(config.csrf.headerName)) {
          headers.set(config.csrf.headerName, csrfToken);
        }
      }
    }
  };

  // --------------------------------------------------
  // Response parsing
  // --------------------------------------------------

  async function parseResponse(response) {
    if (BODYLESS_STATUSES.has(response.status)) {
      return null;
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();

    if (contentType.includes("application/json") ||
        contentType.includes("+json")) {
      try {
        return await response.json();
      } catch (error) {
        throw new APIError("The server returned invalid JSON.", {
          status: response.status,
          code: "INVALID_JSON",
          details: error.message
        });
      }
    }

    if (contentType.includes("text/")) {
      return response.text();
    }

    if (
      contentType.includes("application/octet-stream") ||
      contentType.includes("application/pdf") ||
      contentType.includes("image/")
    ) {
      return response.blob();
    }

    const text = await response.text();

    if (!text) return null;

    return text;
  }

  function createHTTPError(response, data, url, method) {
    const payload = utils.isPlainObject(data) ? data : {};

    const message =
      payload.message ||
      payload.error?.message ||
      (typeof payload.error === "string" ? payload.error : null) ||
      `Request failed with HTTP ${response.status}.`;

    return new APIError(message, {
      status: response.status,
      code:
        payload.code ||
        payload.error?.code ||
        `HTTP_${response.status}`,
      details: payload.details ?? null,
      data,
      url: url.toString(),
      method
    });
  }

  // --------------------------------------------------
  // Core request method
  // --------------------------------------------------

  async function request(path, options = {}) {
    const {
      method = "GET",
      params,
      data,
      body,
      headers: customHeaders = {},
      timeout = config.timeout,
      signal: externalSignal,
      credentials = config.credentials,
      responseType = "auto",
      auth = true,
      csrf = true,
      ...fetchOptions
    } = options;

    const normalizedMethod = String(method).toUpperCase();
    const url = utils.buildURL(path, params);

    const headers = new Headers(config.headers);

    new Headers(customHeaders).forEach((value, key) => {
      headers.set(key, value);
    });

    if (auth) {
      await security.apply(headers, normalizedMethod);
    } else if (
      csrf &&
      config.csrf.enabled &&
      !SAFE_METHODS.has(normalizedMethod)
    ) {
      const csrfToken = await security.getCSRFToken();

      if (csrfToken && !headers.has(config.csrf.headerName)) {
        headers.set(config.csrf.headerName, csrfToken);
      }
    }

    let requestBody;

    if (body !== undefined && data !== undefined) {
      throw new TypeError(
        "Specify either body or data, not both."
      );
    }

    const payload = body !== undefined ? body : data;

    if (payload !== undefined && !SAFE_METHODS.has(normalizedMethod)) {
      if (utils.isFormData(payload)) {
        requestBody = payload;
        // The browser must set the multipart boundary.
        headers.delete("Content-Type");
      } else if (
        utils.isBodyInit(payload) ||
        payload === null
      ) {
        requestBody = payload;
      } else {
        requestBody = JSON.stringify(payload);

        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
      }
    } else if (payload !== undefined && SAFE_METHODS.has(normalizedMethod)) {
      throw new TypeError(
        `${normalizedMethod} requests cannot contain a data/body payload. Use params for query data.`
      );
    }

    const controller = new AbortController();
    let timeoutId = null;
    let timedOut = false;
    let removeAbortListener = () => {};

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort(externalSignal.reason);
      } else {
        const forwardAbort = () => {
          controller.abort(externalSignal.reason);
        };

        externalSignal.addEventListener("abort", forwardAbort, {
          once: true
        });

        removeAbortListener = () => {
          externalSignal.removeEventListener("abort", forwardAbort);
        };
      }
    }

    if (timeout > 0) {
      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort(
          new DOMException("Request timed out.", "TimeoutError")
        );
      }, timeout);
    }

    let fetchConfig = {
      ...fetchOptions,
      method: normalizedMethod,
      headers,
      credentials,
      signal: controller.signal
    };

    if (requestBody !== undefined) {
      fetchConfig.body = requestBody;
    }

    try {
      if (typeof requestInterceptor === "function") {
        const modified = await requestInterceptor({
          url,
          options: fetchConfig
        });

        if (modified?.options) {
          fetchConfig = modified.options;
        }

        if (modified?.url) {
          const modifiedURL = new URL(modified.url, window.location.origin);

          const configuredOrigin = new URL(
            config.baseURL,
            window.location.origin
          ).origin;

          if (
            modifiedURL.origin !== window.location.origin &&
            modifiedURL.origin !== configuredOrigin
          ) {
            throw new APIError("Request interceptor changed the API origin.", {
              code: "INVALID_REQUEST_URL"
            });
          }

          url.href = modifiedURL.href;
        }
      }

      const response = await fetch(url, fetchConfig);

      let result = await parseResponse(response);

      if (typeof responseInterceptor === "function") {
        result = await responseInterceptor(result, response);
      }

      if (!response.ok) {
        throw createHTTPError(response, result, url, normalizedMethod);
      }

      if (responseType === "blob") {
        if (!(result instanceof Blob)) {
          result = await response.blob();
        }
      } else if (responseType === "text" && typeof result !== "string") {
        result = result == null ? "" : String(result);
      } else if (
        responseType === "json" &&
        typeof result === "string"
      ) {
        try {
          result = JSON.parse(result);
        } catch {
          throw new APIError("Expected a JSON response.", {
            status: response.status,
            code: "EXPECTED_JSON",
            url: url.toString(),
            method: normalizedMethod
          });
        }
      }

      return result;
    } catch (error) {
      let normalizedError = error;

      if (error instanceof APIError) {
        normalizedError = error;
      } else if (controller.signal.aborted) {
        normalizedError = new APIError(
          timedOut
            ? "The request timed out. Please try again."
            : "The request was cancelled.",
          {
            code: timedOut ? "REQUEST_TIMEOUT" : "REQUEST_ABORTED",
            url: url.toString(),
            method: normalizedMethod,
            isTimeout: timedOut,
            isAborted: !timedOut
          }
        );
      } else if (error instanceof TypeError) {
        normalizedError = new APIError(
          "Unable to reach the server. Check your connection and try again.",
          {
            code: "NETWORK_ERROR",
            url: url.toString(),
            method: normalizedMethod,
            isNetworkError: true,
            details: error.message
          }
        );
      }

      if (typeof errorInterceptor === "function") {
        try {
          const intercepted = await errorInterceptor(normalizedError);

          if (intercepted instanceof Error) {
            normalizedError = intercepted;
          }
        } catch (interceptorError) {
          console.error(
            "[MedOrbits API] Error interceptor failed.",
            interceptorError
          );
        }
      }

      throw normalizedError;
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      removeAbortListener();
    }
  }

  // --------------------------------------------------
  // HTTP method shortcuts
  // --------------------------------------------------

  const http = {
    request,

    get(path, options = {}) {
      return request(path, { ...options, method: "GET" });
    },

    post(path, data, options = {}) {
      return request(path, {
        ...options,
        method: "POST",
        data
      });
    },

    put(path, data, options = {}) {
      return request(path, {
        ...options,
        method: "PUT",
        data
      });
    },

    patch(path, data, options = {}) {
      return request(path, {
        ...options,
        method: "PATCH",
        data
      });
    },

    delete(path, options = {}) {
      return request(path, { ...options, method: "DELETE" });
    },

    head(path, options = {}) {
      return request(path, { ...options, method: "HEAD" });
    },

    options(path, options = {}) {
      return request(path, { ...options, method: "OPTIONS" });
    }
  };

  // --------------------------------------------------
  // File upload and download
  // --------------------------------------------------

  const files = {
    upload(path, fileOrFormData, options = {}) {
      let formData;

      if (utils.isFormData(fileOrFormData)) {
        formData = fileOrFormData;
      } else {
        formData = new FormData();

        if (Array.isArray(fileOrFormData)) {
          fileOrFormData.forEach((file) => {
            if (file?.file) {
              formData.append(
                file.field || "files",
                file.file,
                file.filename || file.file.name
              );
            }
          });
        } else if (fileOrFormData instanceof File) {
          formData.append("file", fileOrFormData);
        } else {
          throw new TypeError(
            "Provide a File, an array of file descriptors, or FormData."
          );
        }
      }

      return request(path, {
        ...options,
        method: "POST",
        data: formData
      });
    },

    download(path, options = {}) {
      return request(path, {
        ...options,
        responseType: "blob"
      });
    }
  };

  // --------------------------------------------------
  // API configuration
  // --------------------------------------------------

  const settings = {
    configure(options = {}) {
      if (options.baseURL !== undefined) {
        config.baseURL = utils.normalizeBaseURL(options.baseURL);
      }

      if (options.timeout !== undefined) {
        if (
          !Number.isFinite(options.timeout) ||
          options.timeout < 0
        ) {
          throw new TypeError(
            "Timeout must be a non-negative number."
          );
        }

        config.timeout = options.timeout;
      }

      if (options.credentials !== undefined) {
        const allowed = [
          "omit",
          "same-origin",
          "include"
        ];

        if (!allowed.includes(options.credentials)) {
          throw new TypeError("Invalid credentials setting.");
        }

        config.credentials = options.credentials;
      }

      if (options.headers !== undefined) {
        config.headers = {
          ...config.headers,
          ...new Headers(options.headers)
        };
      }

      if (options.csrf !== undefined) {
        config.csrf = {
          ...config.csrf,
          ...options.csrf
        };
      }

      return this.getConfig();
    },

    getConfig() {
      return Object.freeze({
        baseURL: config.baseURL,
        timeout: config.timeout,
        credentials: config.credentials,
        csrf: Object.freeze({ ...config.csrf })
      });
    },

    setAuthTokenProvider(provider) {
      if (provider !== null && typeof provider !== "function") {
        throw new TypeError("Auth token provider must be a function.");
      }

      authTokenProvider = provider;
    },

    setCSRFTokenProvider(provider) {
      if (provider !== null && typeof provider !== "function") {
        throw new TypeError("CSRF token provider must be a function.");
      }

      csrfTokenProvider = provider;
    },

    setRequestInterceptor(interceptor) {
      requestInterceptor = interceptor;
    },

    setResponseInterceptor(interceptor) {
      responseInterceptor = interceptor;
    },

    setErrorInterceptor(interceptor) {
      errorInterceptor = interceptor;
    }
  };

  // --------------------------------------------------
  // Convenience API namespaces
  // --------------------------------------------------

  const endpoints = Object.freeze({
    health: "/health",
    auth: "/auth",
    sessions: "/sessions",
    verification: "/verification",
    password: "/password",
    users: "/users",
    courses: "/courses",
    colleges: "/colleges",
    universities: "/universities",
    admissions: "/admissions",
    applications: "/applications",
    counselling: "/counselling",
    documents: "/documents",
    jobs: "/jobs",
    internships: "/internships",
    candidates: "/candidates",
    employers: "/employers",
    recruitment: "/recruitment",
    services: "/services",
    search: "/search",
    notifications: "/notifications",
    payments: "/payments",
    uploads: "/uploads",
    contact: "/contact",
    faqs: "/faqs",
    faqAnswer: "/faqs/answer",
    subscriptions: "/subscriptions",
    admin: "/admin"
  });

  const api = {
    version: "1.0.0",
    request: http.request,
    get: http.get,
    post: http.post,
    put: http.put,
    patch: http.patch,
    delete: http.delete,
    head: http.head,
    options: http.options,

    http,
    files,
    settings,
    endpoints,
    APIError,

    health: {
      check(options = {}) {
        return http.get(endpoints.health, options);
      }
    }
  };

  // --------------------------------------------------
  // Export public interface
  // --------------------------------------------------

  window.MedOrbitsAPI = Object.freeze(api);

  // Compatibility alias, if other scripts use this name.
  // Prefer MedOrbitsAPI for new code.
  window.MedOrbitsApi = window.MedOrbitsAPI;
})();
