/* =========================================================
   MedOrbits -- Search Manager
   File: /assets/js/search.js
   Purpose: Global search, suggestions, filters, sorting,
            pagination, recent searches and result rendering
   ========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";
  const STORAGE_KEY = "medorbits_recent_searches";
  const MAX_RECENT_SEARCHES = 8;
  const DEFAULT_PAGE_SIZE = 10;
  const DEBOUNCE_DELAY = 300;
  const MIN_QUERY_LENGTH = 2;
  const state = {
    query: "",
    category: "all",
    filters: {},
    sortBy: "relevance",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    results: [],
    suggestions: [],
    loading: false,
    initialized: false,
    abortController: null,
    debounceTimers: new WeakMap()
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
        new CustomEvent("medorbits:search:" + name, {
          detail: detail || {}
        })
      );
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
    },
    getRecentSearches() {
      try {
        const items = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || "[]"
        );
        return Array.isArray(items) ? items : [];
      } catch (_) {
        return [];
      }
    },
    saveRecentSearch(query) {
      const value = String(query || "").trim();
      if (!value) return;
      try {
        const recent = utils.getRecentSearches().filter(
          (item) => item.toLowerCase() !== value.toLowerCase()
        );
        recent.unshift(value);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES))
        );
      } catch (_) {
        // Storage may be unavailable.
      }
    },
    safeUrl(value) {
      if (!value) return "";
      try {
        const url = new URL(String(value), window.location.origin);
        if (!["http:", "https:"].includes(url.protocol)) {
          return "";
        }
        return url.href;
      } catch (_) {
        return "";
      }
    },
    notify(message, type) {
      if (window.MedOrbitsErrorHandler?.notify) {
        window.MedOrbitsErrorHandler.notify(message, type || "info");
      } else if (window.MedOrbitsApp?.notify) {
        window.MedOrbitsApp.notify(message, type || "info");
      }
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
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    if (!response.ok) {
      const error = new Error(
        data?.message ||
        data?.error ||
        "Search request failed (" + response.status + ")."
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }
  function normalizeResult(item) {
    const result = item || {};
    return {
      id: String(result.id || result._id || result.slug || ""),
      title: String(
        result.title ||
        result.name ||
        result.courseName ||
        result.collegeName ||
        "Untitled result"
      ),
      description: String(
        result.description ||
        result.summary ||
        result.excerpt ||
        ""
      ),
      category: String(
        result.category ||
        result.type ||
        result.entityType ||
        "general"
      ).toLowerCase(),
      url: utils.safeUrl(
        result.url ||
        result.href ||
        result.link ||
        result.path ||
        ""
      ),
      image: utils.safeUrl(
        result.image ||
        result.imageUrl ||
        result.thumbnail ||
        ""
      ),
      location: String(
        result.location ||
        result.city ||
        result.address ||
        ""
      ),
      price: result.price ?? result.fee ?? null,
      currency: String(result.currency || "INR"),
      rating: result.rating ?? null,
      relevance: Number(result.relevance || result.score || 0),
      createdAt: result.createdAt || result.created_at || null,
      metadata: result.metadata || {}
    };
  }
  function normalizeResponse(response) {
    const data = response?.data ?? response;
    const items = Array.isArray(data)
      ? data
      : data?.results ||
        data?.items ||
        data?.colleges ||
        data?.courses ||
        data?.universities ||
        [];
    return {
      results: items.map(normalizeResult),
      total: Number(
        response?.total ??
        data?.total ??
        response?.meta?.total ??
        data?.meta?.total ??
        items.length
      ),
      page: Number(response?.page ?? data?.page ?? state.page),
      pageSize: Number(
        response?.pageSize ??
        response?.limit ??
        data?.pageSize ??
        data?.limit ??
        state.pageSize
      ),
      suggestions: Array.isArray(response?.suggestions)
        ? response.suggestions
        : Array.isArray(data?.suggestions)
          ? data.suggestions
          : []
    };
  }
  function buildSearchParams(options) {
    const settings = options || {};
    const params = new URLSearchParams();
    const query = String(settings.query ?? state.query).trim();
    if (query) params.set("q", query);
    const category = settings.category ?? state.category;
    if (category && category !== "all") {
      params.set("category", category);
    }
    params.set("page", String(settings.page ?? state.page));
    params.set("limit", String(settings.pageSize ?? state.pageSize));
    const sortBy = settings.sortBy ?? state.sortBy;
    if (sortBy) params.set("sort", sortBy);
    const filters = settings.filters ?? state.filters;
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && !value.length)
      ) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => params.append("filter[" + key + "]", String(item)));
      } else {
        params.set("filter[" + key + "]", String(value));
      }
    });
    return params;
  }
  async function search(query, options) {
    const settings = options || {};
    const normalizedQuery = String(query ?? state.query).trim();
    state.query = normalizedQuery;
    if (normalizedQuery && normalizedQuery.length < MIN_QUERY_LENGTH) {
      state.results = [];
      state.total = 0;
      renderResults(settings.container);
      utils.dispatch("results", {
        query: normalizedQuery,
        results: [],
        total: 0
      });
      return {
        results: [],
        total: 0,
        page: 1,
        pageSize: state.pageSize
      };
    }
    state.page = Number(settings.page) || 1;
    state.pageSize = Number(settings.pageSize) || state.pageSize;
    state.category = settings.category ?? state.category;
    state.sortBy = settings.sortBy ?? state.sortBy;
    state.filters = settings.filters ?? state.filters;
    if (state.abortController) {
      state.abortController.abort();
    }
    state.abortController = new AbortController();
    state.loading = true;
    utils.dispatch("loading", { loading: true });
    try {
      const params = buildSearchParams({
        ...settings,
        query: normalizedQuery
      });
      const response = await request(
        "/search?" + params.toString(),
        { signal: state.abortController.signal }
      );
      const normalized = normalizeResponse(response);
      state.results = normalized.results;
      state.total = normalized.total;
      state.page = normalized.page || state.page;
      state.pageSize = normalized.pageSize || state.pageSize;
      state.suggestions = normalized.suggestions;
      renderResults(settings.container);
      renderSuggestions(settings.suggestionsContainer);
      if (settings.syncUrl !== false) {
        syncUrl();
      }
      if (normalizedQuery) {
        utils.saveRecentSearch(normalizedQuery);
      }
      utils.dispatch("results", {
        query: normalizedQuery,
        results: state.results,
        total: state.total,
        page: state.page,
        pageSize: state.pageSize
      });
      return normalized;
    } catch (error) {
      if (error.name === "AbortError") {
        return null;
      }
      utils.dispatch("error", {
        error,
        action: "search"
      });
      utils.notify(error.message || "Search failed.", "error");
      throw error;
    } finally {
      state.loading = false;
      utils.dispatch("loading", { loading: false });
    }
  }
  async function getSuggestions(query, options) {
    const value = String(query || "").trim();
    if (value.length < MIN_QUERY_LENGTH) {
      state.suggestions = [];
      renderSuggestions(options?.container);
      return [];
    }
    const settings = options || {};
    const params = new URLSearchParams({ q: value });
    if (settings.category) {
      params.set("category", settings.category);
    }
    try {
      const response = await request(
        "/search/suggestions?" + params.toString()
      );
      const data = response?.data ?? response;
      const suggestions = Array.isArray(data)
        ? data
        : data?.suggestions || data?.items || [];
      state.suggestions = suggestions
        .map((item) => {
          if (typeof item === "string") {
            return {
              label: item,
              value: item,
              category: ""
            };
          }
          return {
            label: String(item.label || item.title || item.name || item.value || ""),
            value: String(item.value || item.query || item.title || item.name || ""),
            category: String(item.category || item.type || "")
          };
        })
        .filter((item) => item.label && item.value);
      renderSuggestions(settings.container);
      utils.dispatch("suggestions", {
        query: value,
        suggestions: state.suggestions
      });
      return state.suggestions;
    } catch (error) {
      utils.dispatch("error", {
        error,
        action: "suggestions"
      });
      return [];
    }
  }
  function renderSuggestions(target) {
    const container = utils.getElement(
      target || "[data-search-suggestions]"
    );
    if (!container) return;
    const suggestions = state.suggestions;
    if (!suggestions.length) {
      container.innerHTML = "";
      container.hidden = true;
      return;
    }
    container.innerHTML = suggestions.map((item, index) => `
      <button
        type="button"
        class="mo-search-suggestion"
        data-search-suggestion="${index}"
        role="option"
        aria-selected="false"
      >
        <span class="mo-search-suggestion-icon" aria-hidden="true">⌕</span>
        <span>${utils.escapeHTML(item.label)}</span>
        ${
          item.category
            ? `<small>${utils.escapeHTML(item.category)}</small>`
            : ""
        }
      </button>
    `).join("");
    container.hidden = false;
  }
  function renderResults(target) {
    const containers = target
      ? [utils.getElement(target)]
      : Array.from(document.querySelectorAll("[data-search-results]"));
    containers.filter(Boolean).forEach((container) => {
      const results = state.results;
      if (!results.length) {
        container.innerHTML = `
          <div class="mo-search-empty" role="status">
            <span class="mo-search-empty-icon" aria-hidden="true">⌕</span>
            <h3>No results found</h3>
            <p>Try different keywords or adjust your filters.</p>
          </div>
        `;
        return;
      }
      container.innerHTML = results.map((result) => {
        const title = utils.escapeHTML(result.title);
        const description = utils.escapeHTML(result.description);
        const category = utils.escapeHTML(result.category);
        const location = utils.escapeHTML(result.location);
        const safeUrl = result.url;
        const safeImage = result.image;
        const imageMarkup = safeImage
          ? `<img src="${utils.escapeHTML(safeImage)}" alt="" loading="lazy">`
          : `<span class="mo-search-result-placeholder" aria-hidden="true">⌕</span>`;
        const titleMarkup = safeUrl
          ? `<a href="${utils.escapeHTML(safeUrl)}" class="mo-search-result-title">${title}</a>`
          : `<h3 class="mo-search-result-title">${title}</h3>`;
        return `
          <article
            class="mo-search-result"
            data-search-result-id="${utils.escapeHTML(result.id)}"
            data-search-result-category="${category}"
          >
            <div class="mo-search-result-image">${imageMarkup}</div>
            <div class="mo-search-result-content">
              <span class="mo-search-result-category">${category}</span>
              ${titleMarkup}
              ${description ? `<p>${description}</p>` : ""}
              ${location ? `<span class="mo-search-result-location">${location}</span>` : ""}
              ${
                result.price !== null
                  ? `<span class="mo-search-result-price">${utils.escapeHTML(
                      formatPrice(result.price, result.currency)
                    )}</span>`
                  : ""
              }
            </div>
            <button
              type="button"
              class="mo-search-save"
              data-search-save="${utils.escapeHTML(result.id)}"
              aria-label="Save ${title}"
            >♡</button>
          </article>
        `;
      }).join("");
    });
    document.querySelectorAll("[data-search-total]").forEach((element) => {
      element.textContent = String(state.total);
    });
    document.querySelectorAll("[data-search-query]").forEach((element) => {
      element.textContent = state.query;
    });
    document.querySelectorAll("[data-search-loading]").forEach((element) => {
      element.hidden = !state.loading;
    });
  }
  function formatPrice(value, currency) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return String(value ?? "");
    }
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: String(currency || "INR"),
        maximumFractionDigits: 2
      }).format(amount);
    } catch (_) {
      return String(currency || "INR") + " " + amount.toFixed(2);
    }
  }
  function renderRecentSearches(target) {
    const container = utils.getElement(
      target || "[data-search-recent]"
    );
    if (!container) return [];
    const recent = utils.getRecentSearches();
    container.innerHTML = recent.length
      ? recent.map((query, index) => `
          <div class="mo-search-recent-item">
            <button
              type="button"
              data-search-recent="${index}"
            >${utils.escapeHTML(query)}</button>
            <button
              type="button"
              data-search-remove-recent="${index}"
              aria-label="Remove recent search"
            >×</button>
          </div>
        `).join("")
      : '<p class="mo-search-recent-empty">No recent searches.</p>';
    return recent;
  }
  function removeRecentSearch(index) {
    const recent = utils.getRecentSearches();
    if (index < 0 || index >= recent.length) return recent;
    recent.splice(index, 1);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (_) {
      // Storage may be unavailable.
    }
    renderRecentSearches();
    utils.dispatch("recent-removed", {
      index,
      recent
    });
    return recent;
  }
  function clearRecentSearches() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // Storage may be unavailable.
    }
    renderRecentSearches();
    utils.dispatch("recent-cleared");
    return [];
  }
  function syncUrl() {
    const url = new URL(window.location.href);
    if (state.query) {
      url.searchParams.set("q", state.query);
    } else {
      url.searchParams.delete("q");
    }
    if (state.category !== "all") {
      url.searchParams.set("category", state.category);
    } else {
      url.searchParams.delete("category");
    }
    url.searchParams.set("page", String(state.page));
    url.searchParams.set("limit", String(state.pageSize));
    if (window.history?.replaceState) {
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search + url.hash
      );
    }
  }
  function readUrlState() {
    const url = new URL(window.location.href);
    return {
      query: url.searchParams.get("q") || "",
      category: url.searchParams.get("category") || "all",
      page: Math.max(1, Number(url.searchParams.get("page")) || 1),
      pageSize: Math.max(
        1,
        Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE
      )
    };
  }
  function setFilters(filters, options) {
    state.filters = { ...(filters || {}) };
    state.page = 1;
    return search(state.query, {
      ...(options || {}),
      filters: state.filters,
      page: 1
    });
  }
  function setCategory(category, options) {
    state.category = String(category || "all");
    state.page = 1;
    return search(state.query, {
      ...(options || {}),
      category: state.category,
      page: 1
    });
  }
  function setSort(sortBy, options) {
    state.sortBy = String(sortBy || "relevance");
    state.page = 1;
    return search(state.query, {
      ...(options || {}),
      sortBy: state.sortBy,
      page: 1
    });
  }
  function setPage(page, options) {
    state.page = Math.max(1, Number(page) || 1);
    return search(state.query, {
      ...(options || {}),
      page: state.page
    });
  }
  function setPageSize(pageSize, options) {
    state.pageSize = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
    state.page = 1;
    return search(state.query, {
      ...(options || {}),
      page: 1,
      pageSize: state.pageSize
    });
  }
  function debounceSearch(input, options) {
    if (!input) return;
    const settings = options || {};
    input.addEventListener("input", function () {
      const existingTimer = state.debounceTimers.get(input);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }
      const query = input.value.trim();
      const timer = window.setTimeout(async function () {
        if (query.length >= MIN_QUERY_LENGTH) {
          await getSuggestions(query, {
            container: settings.suggestionsContainer,
            category: settings.category
          });
        } else {
          state.suggestions = [];
          renderSuggestions(settings.suggestionsContainer);
        }
        if (settings.liveSearch !== false) {
          if (!query || query.length >= MIN_QUERY_LENGTH) {
            search(query, {
              ...settings,
              page: 1
            }).catch(() => {});
          }
        }
      }, DEBOUNCE_DELAY);
      state.debounceTimers.set(input, timer);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        state.suggestions = [];
        renderSuggestions(settings.suggestionsContainer);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const query = input.value.trim();
        search(query, {
          ...settings,
          page: 1
        }).catch(() => {});
      }
    });
  }
  function bindSearchForms() {
    document.querySelectorAll("[data-search-form]").forEach((form) => {
      if (form.dataset.searchBound === "true") return;
      form.dataset.searchBound = "true";
      const input = form.querySelector(
        "[name='q'], [name='query'], [data-search-input]"
      );
      if (!input) return;
      debounceSearch(input, {
        liveSearch: form.dataset.liveSearch !== "false",
        category: form.dataset.searchCategory || undefined,
        container: form.dataset.resultsTarget || undefined,
        suggestionsContainer:
          form.dataset.suggestionsTarget || undefined
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        search(input.value, {
          category: form.dataset.searchCategory || state.category,
          container: form.dataset.resultsTarget || undefined,
          suggestionsContainer:
            form.dataset.suggestionsTarget || undefined,
          page: 1
        }).catch(() => {});
      });
    });
  }
  function bindControls() {
    document.addEventListener("click", function (event) {
      const suggestionButton = event.target.closest("[data-search-suggestion]");
      if (suggestionButton) {
        const index = Number(suggestionButton.dataset.searchSuggestion);
        const suggestion = state.suggestions[index];
        if (!suggestion) return;
        const input = document.querySelector(
          "[data-search-input], [data-search-form] input[name='q'], input[name='query']"
        );
        if (input) input.value = suggestion.value;
        search(suggestion.value, { page: 1 }).catch(() => {});
        return;
      }
      const recentButton = event.target.closest("[data-search-recent]");
      if (recentButton) {
        const recent = utils.getRecentSearches();
        const query = recent[Number(recentButton.dataset.searchRecent)];
        if (!query) return;
        const input = document.querySelector(
          "[data-search-input], [data-search-form] input[name='q'], input[name='query']"
        );
        if (input) input.value = query;
        search(query, { page: 1 }).catch(() => {});
        return;
      }
      const removeRecentButton = event.target.closest(
        "[data-search-remove-recent]"
      );
      if (removeRecentButton) {
        removeRecentSearch(
          Number(removeRecentButton.dataset.searchRemoveRecent)
        );
        return;
      }
      const clearRecentButton = event.target.closest(
        "[data-search-clear-recent]"
      );
      if (clearRecentButton) {
        clearRecentSearches();
        return;
      }
      const categoryButton = event.target.closest("[data-search-category]");
      if (categoryButton) {
        setCategory(categoryButton.dataset.searchCategory).catch(() => {});
        return;
      }
      const pageButton = event.target.closest("[data-search-page]");
      if (pageButton) {
        setPage(Number(pageButton.dataset.searchPage)).catch(() => {});
        return;
      }
      const saveButton = event.target.closest("[data-search-save]");
      if (saveButton) {
        const resultId = saveButton.dataset.searchSave;
        utils.dispatch("save-requested", {
          resultId,
          result: state.results.find((item) => item.id === resultId) || null
        });
      }
    });
    document.addEventListener("change", function (event) {
      const sortControl = event.target.closest("[data-search-sort]");
      if (sortControl) {
        setSort(sortControl.value).catch(() => {});
        return;
      }
      const pageSizeControl = event.target.closest("[data-search-page-size]");
      if (pageSizeControl) {
        setPageSize(Number(pageSizeControl.value)).catch(() => {});
        return;
      }
      const filterControl = event.target.closest("[data-search-filter]");
      if (filterControl) {
        const key = filterControl.dataset.searchFilter;
        const value = filterControl.type === "checkbox"
          ? filterControl.checked
          : filterControl.value;
        setFilters({
          ...state.filters,
          [key]: value
        }).catch(() => {});
      }
    });
  }
  function on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("A callback function is required.");
    }
    const event = "medorbits:search:" + eventName;
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
    const event = "medorbits:search:" + eventName;
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
    const urlState = readUrlState();
    state.query = settings.query ?? urlState.query;
    state.category = settings.category ?? urlState.category;
    state.page = settings.page ?? urlState.page;
    state.pageSize = settings.pageSize ?? urlState.pageSize;
    bindSearchForms();
    bindControls();
    renderRecentSearches();
    document.querySelectorAll("[data-search-input]").forEach((input) => {
      if (input.value === "" && state.query) {
        input.value = state.query;
      }
    });
    if (state.query) {
      try {
        await search(state.query, {
          page: state.page,
          pageSize: state.pageSize,
          category: state.category
        });
      } catch (_) {
        // Keep the search interface usable when the API is unavailable.
      }
    }
    state.initialized = true;
    utils.dispatch("initialized", {
      query: state.query,
      category: state.category
    });
    return api;
  }
  function destroy() {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }
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
    search,
    getSuggestions,
    renderResults,
    renderSuggestions,
    renderRecentSearches,
    setFilters,
    setCategory,
    setSort,
    setPage,
    setPageSize,
    getRecentSearches: utils.getRecentSearches,
    removeRecentSearch,
    clearRecentSearches,
    syncUrl,
    readUrlState,
    getResults: () => state.results.slice(),
    getSuggestionsList: () => state.suggestions.slice(),
    getState: () => ({
      query: state.query,
      category: state.category,
      filters: { ...state.filters },
      sortBy: state.sortBy,
      page: state.page,
      pageSize: state.pageSize,
      total: state.total,
      results: state.results.slice(),
      suggestions: state.suggestions.slice(),
      loading: state.loading
    }),
    constants: {
      STORAGE_KEY,
      MAX_RECENT_SEARCHES,
      DEFAULT_PAGE_SIZE,
      DEBOUNCE_DELAY,
      MIN_QUERY_LENGTH
    }
  };
  window.MedOrbitsSearch = api;
  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Search = api;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (
        document.querySelector(
          "[data-search-form], [data-search-results], [data-search-input]"
        )
      ) {
        init();
      }
    }, { once: true });
  } else if (
    document.querySelector(
      "[data-search-form], [data-search-results], [data-search-input]"
    )
  ) {
    init();
  }
})(window, document);