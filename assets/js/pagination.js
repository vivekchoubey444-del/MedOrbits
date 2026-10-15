/* =========================================================
   MedOrbits -- Pagination Manager
   File: /assets/js/pagination.js
   Purpose: Client-side pagination, API pagination, page controls,
            page-size selection, URL sync and accessible rendering
   ========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};
  const CONSTANTS = window.MedOrbitsConstants || {};

  const DEFAULT_PAGE_SIZE = 10;
  const DEFAULT_MAX_VISIBLE_PAGES = 5;
  const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

  const instances = new Map();

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
        new CustomEvent("medorbits:pagination:" + name, {
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

    toPositiveInteger(value, fallback) {
      const number = Number.parseInt(value, 10);

      return Number.isFinite(number) && number > 0
        ? number
        : fallback;
    },

    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  };

  function normalizeOptions(options) {
    const settings = options || {};

    return {
      container: settings.container || null,
      target: settings.target || null,
      page: utils.toPositiveInteger(settings.page, 1),
      pageSize: utils.toPositiveInteger(
        settings.pageSize || settings.limit,
        DEFAULT_PAGE_SIZE
      ),
      totalItems: Math.max(0, Number(settings.totalItems) || 0),
      totalPages: Math.max(0, Number(settings.totalPages) || 0),
      maxVisiblePages: utils.toPositiveInteger(
        settings.maxVisiblePages,
        DEFAULT_MAX_VISIBLE_PAGES
      ),
      pageSizeOptions: Array.isArray(settings.pageSizeOptions)
        ? settings.pageSizeOptions
            .map((value) => utils.toPositiveInteger(value, 0))
            .filter((value) => value > 0)
        : DEFAULT_PAGE_SIZE_OPTIONS.slice(),
      showFirstLast: settings.showFirstLast !== false,
      showPreviousNext: settings.showPreviousNext !== false,
      showPageSize: settings.showPageSize !== false,
      showSummary: settings.showSummary !== false,
      showJumpToPage: Boolean(settings.showJumpToPage),
      urlSync: Boolean(settings.urlSync),
      urlPageParam: settings.urlPageParam || "page",
      urlPageSizeParam: settings.urlPageSizeParam || "limit",
      labels: {
        first: "First",
        previous: "Previous",
        next: "Next",
        last: "Last",
        page: "Page",
        pageSize: "Items per page",
        showing: "Showing",
        of: "of",
        items: "items",
        jump: "Go",
        ...settings.labels
      },
      onChange: typeof settings.onChange === "function"
        ? settings.onChange
        : null
    };
  }

  function getTotalPages(totalItems, pageSize, suppliedTotalPages) {
    if (suppliedTotalPages > 0) {
      return suppliedTotalPages;
    }

    return Math.ceil(totalItems / pageSize);
  }

  function getPageRange(page, pageSize, totalItems) {
    if (totalItems === 0) {
      return { start: 0, end: 0 };
    }

    return {
      start: (page - 1) * pageSize + 1,
      end: Math.min(page * pageSize, totalItems)
    };
  }

  function getVisiblePages(currentPage, totalPages, maxVisiblePages) {
    if (totalPages <= 0) return [];

    const visibleCount = Math.min(maxVisiblePages, totalPages);
    const half = Math.floor(visibleCount / 2);

    let start = Math.max(1, currentPage - half);
    let end = start + visibleCount - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - visibleCount + 1);
    }

    const pages = [];

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }

  function buildPaginationMarkup(options) {
    const settings = options;
    const totalPages = getTotalPages(
      settings.totalItems,
      settings.pageSize,
      settings.totalPages
    );

    const page = utils.clamp(
      settings.page,
      1,
      Math.max(1, totalPages)
    );

    const range = getPageRange(
      page,
      settings.pageSize,
      settings.totalItems
    );

    const visiblePages = getVisiblePages(
      page,
      totalPages,
      settings.maxVisiblePages
    );

    const labels = settings.labels;
    const controls = [];

    if (settings.showFirstLast) {
      controls.push(`
        <button
          type="button"
          class="mo-pagination-button mo-pagination-first"
          data-page-action="first"
          aria-label="${utils.escapeHTML(labels.first)} page"
          ${page <= 1 || totalPages === 0 ? "disabled" : ""}
        >«</button>
      `);
    }

    if (settings.showPreviousNext) {
      controls.push(`
        <button
          type="button"
          class="mo-pagination-button mo-pagination-previous"
          data-page-action="previous"
          aria-label="${utils.escapeHTML(labels.previous)} page"
          ${page <= 1 || totalPages === 0 ? "disabled" : ""}
        >‹</button>
      `);
    }

    if (visiblePages.length && visiblePages[0] > 1) {
      controls.push(`
        <button
          type="button"
          class="mo-pagination-button"
          data-page-number="1"
          aria-label="Page 1"
        >1</button>
      `);

      if (visiblePages[0] > 2) {
        controls.push(
          '<span class="mo-pagination-ellipsis" aria-hidden="true">…</span>'
        );
      }
    }

    visiblePages.forEach((pageNumber) => {
      const active = pageNumber === page;

      controls.push(`
        <button
          type="button"
          class="mo-pagination-button${active ? " is-active" : ""}"
          data-page-number="${pageNumber}"
          aria-label="Page ${pageNumber}"
          ${active ? 'aria-current="page"' : ""}
        >${pageNumber}</button>
      `);
    });

    if (
      visiblePages.length &&
      visiblePages[visiblePages.length - 1] < totalPages
    ) {
      if (visiblePages[visiblePages.length - 1] < totalPages - 1) {
        controls.push(
          '<span class="mo-pagination-ellipsis" aria-hidden="true">…</span>'
        );
      }

      controls.push(`
        <button
          type="button"
          class="mo-pagination-button"
          data-page-number="${totalPages}"
          aria-label="Page ${totalPages}"
        >${totalPages}</button>
      `);
    }

    if (settings.showPreviousNext) {
      controls.push(`
        <button
          type="button"
          class="mo-pagination-button mo-pagination-next"
          data-page-action="next"
          aria-label="${utils.escapeHTML(labels.next)} page"
          ${page >= totalPages || totalPages === 0 ? "disabled" : ""}
        >›</button>
      `);
    }

    if (settings.showFirstLast) {
      controls.push(`
        <button
          type="button"
          class="mo-pagination-button mo-pagination-last"
          data-page-action="last"
          aria-label="${utils.escapeHTML(labels.last)} page"
          ${page >= totalPages || totalPages === 0 ? "disabled" : ""}
        >»</button>
      `);
    }

    let pageSizeControl = "";

    if (settings.showPageSize) {
      const sizeOptions = Array.from(new Set([
        ...settings.pageSizeOptions,
        settings.pageSize
      ])).sort((a, b) => a - b);

      pageSizeControl = `
        <label class="mo-pagination-size-label">
          <span>${utils.escapeHTML(labels.pageSize)}</span>
          <select data-page-size>
            ${sizeOptions.map((size) => `
              <option
                value="${size}"
                ${size === settings.pageSize ? "selected" : ""}
              >${size}</option>
            `).join("")}
          </select>
        </label>
      `;
    }

    const summary = settings.showSummary
      ? `
        <div class="mo-pagination-summary" aria-live="polite">
          ${utils.escapeHTML(labels.showing)}
          <strong>${range.start}–${range.end}</strong>
          ${utils.escapeHTML(labels.of)}
          <strong>${settings.totalItems}</strong>
          ${utils.escapeHTML(labels.items)}
        </div>
      `
      : "";

    const jumpControl = settings.showJumpToPage && totalPages > 1
      ? `
        <form class="mo-pagination-jump-form" data-page-jump-form>
          <label>
            <span>${utils.escapeHTML(labels.page)}</span>
            <input
              type="number"
              data-page-jump
              min="1"
              max="${totalPages}"
              value="${page}"
              inputmode="numeric"
              aria-label="Go to page"
            >
          </label>
          <button type="submit">${utils.escapeHTML(labels.jump)}</button>
        </form>
      `
      : "";

    return `
      <div
        class="mo-pagination"
        role="navigation"
        aria-label="Pagination"
        data-pagination-root
      >
        ${summary}
        ${pageSizeControl}
        <div class="mo-pagination-controls">
          ${totalPages > 1 ? controls.join("") : ""}
        </div>
        ${jumpControl}
      </div>
    `;
  }

  function syncUrl(instance) {
    if (!instance.options.urlSync) return;

    const url = new URL(window.location.href);

    url.searchParams.set(
      instance.options.urlPageParam,
      String(instance.page)
    );

    url.searchParams.set(
      instance.options.urlPageSizeParam,
      String(instance.pageSize)
    );

    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );
  }

  function getUrlState(options) {
    const settings = normalizeOptions(options);
    const url = new URL(window.location.href);

    return {
      page: utils.toPositiveInteger(
        url.searchParams.get(settings.urlPageParam),
        settings.page
      ),
      pageSize: utils.toPositiveInteger(
        url.searchParams.get(settings.urlPageSizeParam),
        settings.pageSize
      )
    };
  }

  function render(target, options) {
    const container = utils.getElement(target);

    if (!container) {
      throw new Error("Pagination container was not found.");
    }

    const settings = normalizeOptions(options);
    const instanceId =
      container.dataset.paginationId ||
      "pagination-" + Math.random().toString(36).slice(2, 10);

    container.dataset.paginationId = instanceId;

    const instance = {
      id: instanceId,
      container,
      options: settings,
      page: settings.page,
      pageSize: settings.pageSize,
      totalItems: settings.totalItems,
      totalPages: getTotalPages(
        settings.totalItems,
        settings.pageSize,
        settings.totalPages
      )
    };

    if (settings.urlSync) {
      const urlState = getUrlState(settings);
      instance.page = urlState.page;
      instance.pageSize = urlState.pageSize;
    }

    instance.page = utils.clamp(
      instance.page,
      1,
      Math.max(1, instance.totalPages)
    );

    instances.set(instanceId, instance);

    container.innerHTML = buildPaginationMarkup({
      ...settings,
      page: instance.page,
      pageSize: instance.pageSize
    });

    bindInstance(instance);

    return instance;
  }

  function bindInstance(instance) {
    const container = instance.container;

    if (container.dataset.paginationBound === "true") {
      container.removeEventListener("click", container._moPaginationClick);
      container.removeEventListener("change", container._moPaginationChange);
      container.removeEventListener("submit", container._moPaginationSubmit);
    }

    container._moPaginationClick = function (event) {
      const button = event.target.closest("[data-page-number], [data-page-action]");

      if (!button || !container.contains(button) || button.disabled) {
        return;
      }

      event.preventDefault();

      if (button.hasAttribute("data-page-number")) {
        goToPage(instance.id, Number(button.dataset.pageNumber));
        return;
      }

      const action = button.dataset.pageAction;

      if (action === "first") {
        goToPage(instance.id, 1);
      } else if (action === "previous") {
        goToPage(instance.id, instance.page - 1);
      } else if (action === "next") {
        goToPage(instance.id, instance.page + 1);
      } else if (action === "last") {
        goToPage(instance.id, instance.totalPages);
      }
    };

    container._moPaginationChange = function (event) {
      if (!event.target.matches("[data-page-size]")) return;

      setPageSize(instance.id, Number(event.target.value));
    };

    container._moPaginationSubmit = function (event) {
      const form = event.target.closest("[data-page-jump-form]");

      if (!form || !container.contains(form)) return;

      event.preventDefault();

      const input = form.querySelector("[data-page-jump]");

      if (input) {
        goToPage(instance.id, Number(input.value));
      }
    };

    container.addEventListener("click", container._moPaginationClick);
    container.addEventListener("change", container._moPaginationChange);
    container.addEventListener("submit", container._moPaginationSubmit);

    container.dataset.paginationBound = "true";
  }

  function update(instance, options) {
    const settings = options || {};

    if (settings.totalItems !== undefined) {
      instance.totalItems = Math.max(0, Number(settings.totalItems) || 0);
    }

    if (settings.totalPages !== undefined) {
      instance.options.totalPages = Math.max(
        0,
        Number(settings.totalPages) || 0
      );
    }

    if (settings.page !== undefined) {
      instance.page = utils.toPositiveInteger(settings.page, 1);
    }

    if (settings.pageSize !== undefined) {
      instance.pageSize = utils.toPositiveInteger(
        settings.pageSize,
        instance.pageSize
      );
    }

    if (settings.onChange !== undefined) {
      instance.options.onChange =
        typeof settings.onChange === "function"
          ? settings.onChange
          : null;
    }

    instance.options.totalItems = instance.totalItems;
    instance.options.page = instance.page;
    instance.options.pageSize = instance.pageSize;

    instance.totalPages = getTotalPages(
      instance.totalItems,
      instance.pageSize,
      instance.options.totalPages
    );

    instance.page = utils.clamp(
      instance.page,
      1,
      Math.max(1, instance.totalPages)
    );

    instance.options.totalPages = instance.totalPages;

    instance.container.innerHTML = buildPaginationMarkup({
      ...instance.options,
      page: instance.page,
      pageSize: instance.pageSize,
      totalItems: instance.totalItems,
      totalPages: instance.totalPages
    });

    bindInstance(instance);

    return instance;
  }

  function notifyChange(instance, reason) {
    const detail = {
      id: instance.id,
      page: instance.page,
      pageSize: instance.pageSize,
      totalItems: instance.totalItems,
      totalPages: instance.totalPages,
      start: getPageRange(
        instance.page,
        instance.pageSize,
        instance.totalItems
      ).start,
      end: getPageRange(
        instance.page,
        instance.pageSize,
        instance.totalItems
      ).end,
      reason
    };

    syncUrl(instance);

    utils.dispatch("change", detail);

    if (instance.options.onChange) {
      instance.options.onChange(detail);
    }
  }

  function goToPage(id, page) {
    const instance = instances.get(String(id));

    if (!instance) return null;

    const requestedPage = Number(page);

    if (!Number.isFinite(requestedPage)) return instance;

    const nextPage = utils.clamp(
      Math.trunc(requestedPage),
      1,
      Math.max(1, instance.totalPages)
    );

    if (nextPage === instance.page) return instance;

    instance.page = nextPage;

    update(instance, { page: nextPage });
    notifyChange(instance, "page");

    return instance;
  }

  function setPageSize(id, pageSize) {
    const instance = instances.get(String(id));

    if (!instance) return null;

    const nextSize = utils.toPositiveInteger(
      pageSize,
      instance.pageSize
    );

    if (nextSize === instance.pageSize) return instance;

    instance.pageSize = nextSize;
    instance.page = 1;

    instance.options.pageSize = nextSize;
    instance.options.page = 1;
    instance.options.totalPages = 0;

    update(instance, {
      page: 1,
      pageSize: nextSize,
      totalPages: 0
    });

    notifyChange(instance, "page-size");

    return instance;
  }

  function setTotalItems(id, totalItems) {
    const instance = instances.get(String(id));

    if (!instance) return null;

    instance.options.totalPages = 0;

    update(instance, {
      totalItems: Math.max(0, Number(totalItems) || 0),
      totalPages: 0
    });

    notifyChange(instance, "total-items");

    return instance;
  }

  function getPageData(items, page, pageSize) {
    const data = Array.isArray(items) ? items : [];
    const size = utils.toPositiveInteger(pageSize, DEFAULT_PAGE_SIZE);
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / size);
    const currentPage = utils.clamp(
      utils.toPositiveInteger(page, 1),
      1,
      Math.max(1, totalPages)
    );

    const startIndex = (currentPage - 1) * size;

    return {
      items: data.slice(startIndex, startIndex + size),
      page: currentPage,
      pageSize: size,
      totalItems,
      totalPages,
      startIndex,
      endIndex: Math.min(startIndex + size, totalItems)
    };
  }

  function paginate(items, options) {
    const settings = options || {};

    return getPageData(
      items,
      settings.page || 1,
      settings.pageSize || settings.limit || DEFAULT_PAGE_SIZE
    );
  }

  function create(target, options) {
    return render(target, options);
  }

  function getInstance(id) {
    return instances.get(String(id)) || null;
  }

  function destroy(id) {
    const instance = instances.get(String(id));

    if (!instance) return false;

    const container = instance.container;

    if (container._moPaginationClick) {
      container.removeEventListener("click", container._moPaginationClick);
    }

    if (container._moPaginationChange) {
      container.removeEventListener("change", container._moPaginationChange);
    }

    if (container._moPaginationSubmit) {
      container.removeEventListener("submit", container._moPaginationSubmit);
    }

    delete container._moPaginationClick;
    delete container._moPaginationChange;
    delete container._moPaginationSubmit;

    delete container.dataset.paginationBound;
    delete container.dataset.paginationId;

    instances.delete(String(id));

    return true;
  }

  function destroyAll() {
    Array.from(instances.keys()).forEach(destroy);
  }

  function initAll() {
    document.querySelectorAll("[data-pagination]").forEach((container) => {
      const page = utils.toPositiveInteger(
        container.dataset.page,
        1
      );

      const pageSize = utils.toPositiveInteger(
        container.dataset.pageSize,
        DEFAULT_PAGE_SIZE
      );

      const totalItems = Math.max(
        0,
        Number(container.dataset.totalItems) || 0
      );

      render(container, {
        page,
        pageSize,
        totalItems,
        totalPages: Number(container.dataset.totalPages) || 0,
        maxVisiblePages:
          Number(container.dataset.maxVisiblePages) ||
          DEFAULT_MAX_VISIBLE_PAGES,
        showPageSize: container.dataset.showPageSize !== "false",
        showSummary: container.dataset.showSummary !== "false",
        showJumpToPage: container.dataset.showJumpToPage === "true",
        urlSync: container.dataset.urlSync === "true"
      });
    });
  }

  const api = {
    initAll,
    create,
    render,
    update,
    destroy,
    destroyAll,

    goToPage,
    setPageSize,
    setTotalItems,

    paginate,
    getPageData,
    getPageRange,
    getVisiblePages,
    getInstance,

    getInstances() {
      return Array.from(instances.values());
    },

    constants: {
      DEFAULT_PAGE_SIZE,
      DEFAULT_MAX_VISIBLE_PAGES,
      DEFAULT_PAGE_SIZE_OPTIONS: DEFAULT_PAGE_SIZE_OPTIONS.slice()
    }
  };

  window.MedOrbitsPagination = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Pagination = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll, { once: true });
  } else {
    initAll();
  }

})(window, document);