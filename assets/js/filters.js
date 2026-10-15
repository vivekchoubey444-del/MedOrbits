/* =========================================================
   MedOrbits -- assets/js/filters.js
   Reusable filtering, sorting, searching, and URL sync
   ========================================================= */
(function (window, document) {
  "use strict";
  const state = {
    collections: new Map(),
    initialized: false
  };
  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
  function getValue(item, path) {
    if (!path) return item;
    return String(path).split(".").reduce((value, key) => {
      return value == null ? undefined : value[key];
    }, item);
  }
  function compareValues(a, b, direction = "asc") {
    const multiplier = direction === "desc" ? -1 : 1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    const numberA = Number(a);
    const numberB = Number(b);
    if (
      String(a).trim() !== "" &&
      String(b).trim() !== "" &&
      Number.isFinite(numberA) &&
      Number.isFinite(numberB)
    ) {
      return (numberA - numberB) * multiplier;
    }
    return String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base"
    }) * multiplier;
  }
  function parseList(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") {
      return [];
    }
    return String(value)
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }
  function matchesSearch(item, query, fields = []) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return true;
    const values = fields.length
      ? fields.map(field => getValue(item, field))
      : Object.values(item || {});
    const searchable = values
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter(value => value !== null && value !== undefined)
      .map(value => normalize(
        typeof value === "object" ? JSON.stringify(value) : value
      ))
      .join(" ");
    return searchable.includes(normalizedQuery);
  }
  function matchesCondition(item, condition) {
    if (!condition || typeof condition !== "object") return true;
    const value = getValue(item, condition.field);
    const expected = condition.value;
    const operator = condition.operator || "equals";
    switch (operator) {
      case "equals":
        return normalize(value) === normalize(expected);
      case "notEquals":
        return normalize(value) !== normalize(expected);
      case "contains":
        return normalize(value).includes(normalize(expected));
      case "notContains":
        return !normalize(value).includes(normalize(expected));
      case "startsWith":
        return normalize(value).startsWith(normalize(expected));
      case "endsWith":
        return normalize(value).endsWith(normalize(expected));
      case "greaterThan":
        return Number(value) > Number(expected);
      case "greaterThanOrEqual":
        return Number(value) >= Number(expected);
      case "lessThan":
        return Number(value) < Number(expected);
      case "lessThanOrEqual":
        return Number(value) <= Number(expected);
      case "between": {
        const min = Number(condition.min);
        const max = Number(condition.max);
        const number = Number(value);
        return Number.isFinite(number) &&
          Number.isFinite(min) &&
          Number.isFinite(max) &&
          number >= min &&
          number <= max;
      }
      case "in":
        return parseList(expected)
          .some(option => normalize(option) === normalize(value));
      case "notIn":
        return !parseList(expected)
          .some(option => normalize(option) === normalize(value));
      case "isEmpty":
        return value === null ||
          value === undefined ||
          String(value).trim() === "";
      case "isNotEmpty":
        return value !== null &&
          value !== undefined &&
          String(value).trim() !== "";
      case "truthy":
        return Boolean(value);
      case "falsy":
        return !value;
      default:
        return true;
    }
  }
  function filterItems(items = [], options = {}) {
    if (!Array.isArray(items)) return [];
    const {
      search = "",
      searchFields = [],
      conditions = [],
      filters = {},
      customFilter,
      match = "all"
    } = options;
    let results = items.filter(item => {
      if (!matchesSearch(item, search, searchFields)) {
        return false;
      }
      const conditionResults = conditions.map(condition =>
        matchesCondition(item, condition)
      );
      const conditionsMatch = match === "any"
        ? conditionResults.some(Boolean)
        : conditionResults.every(Boolean);
      if (!conditionsMatch) return false;
      for (const [field, expected] of Object.entries(filters)) {
        if (
          expected === "" ||
          expected === null ||
          expected === undefined
        ) {
          continue;
        }
        const value = getValue(item, field);
        if (Array.isArray(expected)) {
          if (expected.length && !expected.some(option =>
            normalize(option) === normalize(value)
          )) {
            return false;
          }
        } else if (typeof expected === "object") {
          if (!matchesCondition(item, { field, ...expected })) {
            return false;
          }
        } else if (normalize(value) !== normalize(expected)) {
          return false;
        }
      }
      if (typeof customFilter === "function") {
        return Boolean(customFilter(item));
      }
      return true;
    });
    if (options.sortBy) {
      results = sortItems(results, options.sortBy, options.sortDirection);
    }
    if (Number.isFinite(Number(options.offset)) && Number(options.offset) > 0) {
      results = results.slice(Number(options.offset));
    }
    if (Number.isFinite(Number(options.limit)) && Number(options.limit) >= 0) {
      results = results.slice(0, Number(options.limit));
    }
    return results;
  }
  function sortItems(items = [], sortBy, direction = "asc") {
    if (!Array.isArray(items) || !sortBy) {
      return Array.isArray(items) ? [...items] : [];
    }
    const fields = Array.isArray(sortBy) ? sortBy : [sortBy];
    return [...items].sort((a, b) => {
      for (const field of fields) {
        const path = typeof field === "string" ? field : field.field;
        const order = typeof field === "string"
          ? direction
          : field.direction || direction;
        const result = compareValues(
          getValue(a, path),
          getValue(b, path),
          order
        );
        if (result !== 0) return result;
      }
      return 0;
    });
  }
  function getUniqueValues(items = [], field, options = {}) {
    const values = items
      .map(item => getValue(item, field))
      .filter(value => value !== null && value !== undefined && value !== "");
    const unique = [...new Map(
      values.map(value => [normalize(value), value])
    ).values()];
    if (options.sort !== false) {
      unique.sort((a, b) => compareValues(a, b, options.direction || "asc"));
    }
    return unique;
  }
  function getNumericRange(items = [], field) {
    const values = items
      .map(item => Number(getValue(item, field)))
      .filter(Number.isFinite);
    if (!values.length) {
      return { min: null, max: null };
    }
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
  function getFacets(items = [], fields = []) {
    const facets = {};
    fields.forEach(field => {
      facets[field] = getUniqueValues(items, field);
    });
    return facets;
  }
  function getPagination(total, page = 1, pageSize = 10) {
    const safePageSize = Math.max(1, Number(pageSize) || 10);
    const totalItems = Math.max(0, Number(total) || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
    const currentPage = Math.max(
      1,
      Math.min(Number(page) || 1, totalPages)
    );
    return {
      total: totalItems,
      page: currentPage,
      pageSize: safePageSize,
      totalPages,
      start: totalItems ? (currentPage - 1) * safePageSize : 0,
      end: Math.min(currentPage * safePageSize, totalItems),
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages
    };
  }
  function paginate(items = [], page = 1, pageSize = 10) {
    const pagination = getPagination(items.length, page, pageSize);
    return {
      items: items.slice(
        pagination.start,
        pagination.start + pagination.pageSize
      ),
      pagination
    };
  }
  function readURLFilters(keys = []) {
    const params = new URLSearchParams(window.location.search);
    const filters = {};
    keys.forEach(key => {
      if (params.has(key)) {
        filters[key] = params.get(key);
      }
    });
    return filters;
  }
  function writeURLFilters(filters = {}, options = {}) {
    const url = new URL(window.location.href);
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        url.searchParams.delete(key);
      } else if (Array.isArray(value)) {
        url.searchParams.delete(key);
        value.forEach(item => url.searchParams.append(key, item));
      } else {
        url.searchParams.set(key, String(value));
      }
    });
    if (options.replace) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }
    return url;
  }
  function getFormValues(form) {
    const target = typeof form === "string"
      ? document.querySelector(form)
      : form;
    if (!target) return {};
    const values = {};
    const data = new FormData(target);
    for (const [key, value] of data.entries()) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = Array.isArray(values[key])
          ? [...values[key], value]
          : [values[key], value];
      } else {
        values[key] = value;
      }
    }
    target.querySelectorAll('input[type="checkbox"][name]').forEach(input => {
      if (!input.checked && !Object.prototype.hasOwnProperty.call(values, input.name)) {
        values[input.name] = "";
      }
    });
    return values;
  }
  function applyFormFilters(items, form, options = {}) {
    const values = getFormValues(form);
    const searchField = options.searchField || "search";
    const sortField = options.sortField || "sortBy";
    const directionField = options.directionField || "sortDirection";
    const search = values[searchField] || "";
    const sortBy = values[sortField] || options.sortBy || "";
    const sortDirection = values[directionField] || options.sortDirection || "asc";
    delete values[searchField];
    delete values[sortField];
    delete values[directionField];
    return filterItems(items, {
      ...options,
      search,
      filters: {
        ...(options.filters || {}),
        ...values
      },
      sortBy,
      sortDirection
    });
  }
  function createFilterController(config = {}) {
    const id = config.id || `filters-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const controller = {
      id,
      items: Array.isArray(config.items) ? [...config.items] : [],
      filtered: [],
      options: { ...(config.options || {}) },
      listeners: new Set(),
      setItems(items) {
        this.items = Array.isArray(items) ? [...items] : [];
        return this.apply();
      },
      setOptions(options = {}) {
        this.options = {
          ...this.options,
          ...options
        };
        return this.apply();
      },
      apply() {
        this.filtered = filterItems(this.items, this.options);
        this.listeners.forEach(callback => {
          try {
            callback(this.getState());
          } catch (error) {
            console.error("[MedOrbits Filters] Listener error:", error);
          }
        });
        return this.getItems();
      },
      getItems() {
        return [...this.filtered];
      },
      getAllItems() {
        return [...this.items];
      },
      getState() {
        return {
          id: this.id,
          total: this.items.length,
          count: this.filtered.length,
          items: this.getItems(),
          options: { ...this.options }
        };
      },
      subscribe(callback) {
        if (typeof callback !== "function") return () => {};
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
      },
      clear() {
        this.options = {};
        return this.apply();
      },
      destroy() {
        this.listeners.clear();
        state.collections.delete(this.id);
      }
    };
    controller.apply();
    state.collections.set(id, controller);
    return controller;
  }
  function bindForm(form, options = {}) {
    const target = typeof form === "string"
      ? document.querySelector(form)
      : form;
    if (!target) return null;
    const controller = options.controller ||
      createFilterController({
        id: options.id,
        items: options.items || [],
        options: options.filterOptions || {}
      });
    const render = typeof options.render === "function"
      ? options.render
      : null;
    const update = () => {
      const filtered = applyFormFilters(
        controller.getAllItems(),
        target,
        options
      );
      controller.filtered = filtered;
      if (render) render(filtered, controller.getState());
      target.dispatchEvent(
        new CustomEvent("medorbits:filters-applied", {
          bubbles: true,
          detail: {
            count: filtered.length,
            items: [...filtered]
          }
        })
      );
    };
    target.addEventListener("submit", event => {
      event.preventDefault();
      update();
    });
    if (options.live !== false) {
      target.addEventListener("input", update);
      target.addEventListener("change", update);
    }
    target.addEventListener("reset", () => {
      window.setTimeout(update, 0);
    });
    if (options.applyOnInit !== false) update();
    return {
      controller,
      apply: update,
      destroy: () => controller.destroy()
    };
  }
  function renderOptions(select, values = [], options = {}) {
    const target = typeof select === "string"
      ? document.querySelector(select)
      : select;
    if (!target) return false;
    const placeholder = options.placeholder || "All";
    const selectedValue = options.selected ?? target.value;
    target.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = placeholder;
    target.appendChild(defaultOption);
    values.forEach(item => {
      const value = typeof item === "object"
        ? item.value
        : item;
      const label = typeof item === "object"
        ? item.label ?? item.value
        : item;
      const option = document.createElement("option");
      option.value = String(value ?? "");
      option.textContent = String(label ?? "");
      if (normalize(value) === normalize(selectedValue)) {
        option.selected = true;
      }
      target.appendChild(option);
    });
    return true;
  }
  function updateResultCount(container, count, total = count) {
    const target = typeof container === "string"
      ? document.querySelector(container)
      : container;
    if (!target) return false;
    target.textContent = count === total
      ? `${count} results`
      : `${count} of ${total} results`;
    target.setAttribute("aria-live", "polite");
    return true;
  }
  function clearForm(form) {
    const target = typeof form === "string"
      ? document.querySelector(form)
      : form;
    if (!target) return false;
    target.reset();
    target.querySelectorAll("[data-filter-value]").forEach(element => {
      element.value = "";
    });
    return true;
  }
  function init(root = document) {
    if (!root?.querySelectorAll) return api;
    root.querySelectorAll("[data-filter-form]").forEach(form => {
      if (form.dataset.filtersInitialized === "true") return;
      form.dataset.filtersInitialized = "true";
      form.addEventListener("submit", event => {
        event.preventDefault();
        form.dispatchEvent(
          new CustomEvent("medorbits:filter-submit", {
            bubbles: true,
            detail: { values: getFormValues(form) }
          })
        );
      });
      form.addEventListener("reset", () => {
        window.setTimeout(() => {
          form.dispatchEvent(
            new CustomEvent("medorbits:filter-reset", {
              bubbles: true
            })
          );
        }, 0);
      });
    });
    state.initialized = true;
    return api;
  }
  const api = {
    init,
    normalize,
    getValue,
    compareValues,
    matchesSearch,
    matchesCondition,
    filterItems,
    sortItems,
    getUniqueValues,
    getNumericRange,
    getFacets,
    getPagination,
    paginate,
    readURLFilters,
    writeURLFilters,
    getFormValues,
    applyFormFilters,
    createFilterController,
    bindForm,
    renderOptions,
    updateResultCount,
    clearForm
  };
  window.MedOrbitsFilters = api;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), {
      once: true
    });
  } else {
    init();
  }
})(window, document);