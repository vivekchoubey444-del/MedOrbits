
/**
 * MedOrbits -- Comparison Manager
 * File: assets/js/compare.js
 *
 * Compares colleges, courses, universities, and jobs.
 */

(() => {
  "use strict";

  const CONSTANTS = window.MedOrbitsConstants || {};

  const STORAGE_KEY =
    CONSTANTS.STORAGE_KEYS?.SAVED_FILTERS
      ? "medorbits-comparison"
      : "medorbits-comparison";

  const MAX_ITEMS = 4;

  const state = {
    items: [],
    category: null
  };

  const listeners = new Set();

  // --------------------------------------------------
  // Utilities
  // --------------------------------------------------

  const utils = {
    getId(item) {
      return item?.id ??
        item?.college_id ??
        item?.course_id ??
        item?.university_id ??
        item?.job_id ??
        item?.slug ??
        null;
    },

    getName(item) {
      return String(
        item?.name ||
        item?.title ||
        item?.college_name ||
        item?.course_name ||
        item?.university_name ||
        item?.job_title ||
        "Unnamed item"
      );
    },

    emit(reason) {
      const detail = Object.freeze({
        category: state.category,
        items: [...state.items],
        reason
      });

      document.dispatchEvent(
        new CustomEvent("medorbits:comparison-updated", { detail })
      );

      listeners.forEach((listener) => {
        try {
          listener(detail);
        } catch (error) {
          console.error("[MedOrbits Compare] Listener failed.", error);
        }
      });
    },

    save() {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            category: state.category,
            items: state.items
          })
        );
      } catch {
        // Comparison remains available in memory.
      }
    },

    load() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed.items)) return;

        state.category = parsed.category || null;
        state.items = parsed.items
          .filter((item) => item && typeof item === "object")
          .slice(0, MAX_ITEMS);
      } catch {
        state.items = [];
        state.category = null;
      }
    }
  };

  // --------------------------------------------------
  // Comparison operations
  // --------------------------------------------------

  function add(item, category = "college") {
    if (!item || typeof item !== "object") {
      throw new TypeError("A valid item is required for comparison.");
    }

    const id = utils.getId(item);

    if (id === null || id === undefined) {
      throw new Error("The item must have a unique identifier.");
    }

    if (state.category && state.category !== category) {
      throw new Error(
        "Compare items from the same category. Clear the comparison first."
      );
    }

    if (state.items.some(
      (existing) => String(utils.getId(existing)) === String(id)
    )) {
      return [...state.items];
    }

    if (state.items.length >= MAX_ITEMS) {
      throw new Error(`You can compare up to ${MAX_ITEMS} items.`);
    }

    state.category = category;
    state.items.push(Object.freeze({ ...item }));

    utils.save();
    utils.emit("added");

    return [...state.items];
  }

  function remove(id) {
    const previousLength = state.items.length;

    state.items = state.items.filter(
      (item) => String(utils.getId(item)) !== String(id)
    );

    if (state.items.length === previousLength) {
      return [...state.items];
    }

    if (!state.items.length) {
      state.category = null;
    }

    utils.save();
    utils.emit("removed");

    return [...state.items];
  }

  function clear() {
    state.items = [];
    state.category = null;

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage restrictions.
    }

    utils.emit("cleared");
  }

  function getItems() {
    return [...state.items];
  }

  function contains(id) {
    return state.items.some(
      (item) => String(utils.getId(item)) === String(id)
    );
  }

  function getDifferences(fields = []) {
    if (!state.items.length) return [];

    return fields.map((field) => {
      const values = state.items.map((item) => ({
        id: utils.getId(item),
        name: utils.getName(item),
        value: field.split(".").reduce(
          (value, key) => value?.[key],
          item
        )
      }));

      const distinctValues = new Set(
        values.map((entry) => JSON.stringify(entry.value))
      );

      return {
        field,
        values,
        differs: distinctValues.size > 1
      };
    });
  }

  // --------------------------------------------------
  // Comparison table
  // --------------------------------------------------

  function render(container, fields = []) {
    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    if (!(container instanceof Element)) {
      throw new TypeError("A valid comparison container is required.");
    }

    if (!state.items.length) {
      const empty = document.createElement("p");
      empty.className = "comparison-empty";
      empty.textContent = "Add items to compare them side by side.";
      container.replaceChildren(empty);
      return;
    }

    const table = document.createElement("table");
    table.className = "comparison-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const labelHeader = document.createElement("th");
    labelHeader.scope = "col";
    labelHeader.textContent = "Feature";
    headerRow.appendChild(labelHeader);

    state.items.forEach((item) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = utils.getName(item);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    fields.forEach((field) => {
      const row = document.createElement("tr");
      const label = document.createElement("th");

      label.scope = "row";
      label.textContent = field.label || field.key;

      row.appendChild(label);

      state.items.forEach((item) => {
        const cell = document.createElement("td");

        const value = field.key.split(".").reduce(
          (current, key) => current?.[key],
          item
        );

        cell.textContent =
          value === null || value === undefined || value === ""
            ? "Not available"
            : Array.isArray(value)
              ? value.join(", ")
              : String(value);

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.replaceChildren(table);
  }

  // --------------------------------------------------
  // Change subscriptions
  // --------------------------------------------------

  function onChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("onChange expects a function.");
    }

    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  // --------------------------------------------------
  // UI integration
  // --------------------------------------------------

  function init() {
    utils.load();

    document.querySelectorAll("[data-compare-clear]").forEach((button) => {
      button.addEventListener("click", clear);
    });

    document.querySelectorAll("[data-compare-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.compareRemove;

        if (id) remove(id);
      });
    });

    document.querySelectorAll("[data-compare-count]").forEach((element) => {
      element.textContent = String(state.items.length);
    });

    utils.emit("initialized");
  }

  // --------------------------------------------------
  // Public interface
  // --------------------------------------------------

  const MedOrbitsCompare = Object.freeze({
    MAX_ITEMS,

    add,
    remove,
    clear,
    contains,
    getItems,
    getDifferences,
    render,
    onChange,
    init,

    get state() {
      return Object.freeze({
        category: state.category,
        items: [...state.items]
      });
    }
  });

  if (window.MedOrbitsCompare) {
    console.warn("[MedOrbits] Comparison module already loaded.");
    return;
  }

  Object.defineProperty(window, "MedOrbitsCompare", {
    value: MedOrbitsCompare,
    writable: false,
    configurable: false,
    enumerable: true
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
