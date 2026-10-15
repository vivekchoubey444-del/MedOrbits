
/**
 * MedOrbits -- Main Frontend Controller
 * File: assets/js/main.js
 *
 * Responsibilities:
 * - Coordinate page-level UI initialization
 * - Highlight active navigation links
 * - Manage sticky header state
 * - Handle scroll progress and back-to-top controls
 * - Support search interfaces and clear controls
 * - Initialize tabs, accordions, and dismissible banners
 * - Provide reusable page utilities
 *
 * Dependencies:
 * - Optional: assets/js/app.js
 *
 * Keep API, authentication, payments, authorization, and
 * data persistence in their dedicated modules.
 */

(() => {
  "use strict";

  const CONFIG = Object.freeze({
    name: "MedOrbits",
    module: "main",
    version: "1.0.0",

    selectors: Object.freeze({
      header: "[data-site-header]",
      activeNav: "[data-active-nav]",
      scrollProgress: "[data-scroll-progress]",
      backToTop: "[data-back-to-top]",
      searchForm: "[data-site-search]",
      searchInput: "[data-search-input]",
      searchClear: "[data-search-clear]",
      searchResults: "[data-search-results]",
      tabs: "[data-tabs]",
      tabButton: "[data-tab]",
      tabPanel: "[data-tab-panel]",
      accordion: "[data-accordion]",
      accordionToggle: "[data-accordion-toggle]",
      accordionPanel: "[data-accordion-panel]",
      dismiss: "[data-dismiss]",
      lazyContent: "[data-lazy-content]",
      currentYear: "[data-current-year]",
      reveal: "[data-reveal]",
      counter: "[data-counter]"
    }),

    breakpoints: Object.freeze({
      mobile: 768
    }),

    scrollThreshold: 80,
    topThreshold: 400
  });

  const state = {
    initialized: false,
    header: null,
    scrollScheduled: false,
    observers: [],
    eventHandlers: new Map()
  };

  // --------------------------------------------------
  // DOM utilities
  // --------------------------------------------------

  const dom = {
    one(selector, root = document) {
      return root.querySelector(selector);
    },

    all(selector, root = document) {
      return Array.from(root.querySelectorAll(selector));
    },

    create(tag, options = {}) {
      const element = document.createElement(tag);

      if (options.className) {
        element.className = options.className;
      }

      if (options.text !== undefined) {
        element.textContent = String(options.text);
      }

      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            element.setAttribute(key, String(value));
          }
        });
      }

      return element;
    },

    isVisible(element) {
      return Boolean(
        element &&
        element.isConnected &&
        element.getClientRects().length
      );
    },

    prefersReducedMotion() {
      return window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  };

  // --------------------------------------------------
  // URL and route utilities
  // --------------------------------------------------

  const routes = {
    normalize(path) {
      if (!path) return "/";

      let normalized = path.split("?")[0].split("#")[0];

      try {
        normalized = decodeURIComponent(normalized);
      } catch {
        // Keep the original path if decoding fails.
      }

      normalized = normalized.replace(/\/+/g, "/");

      if (normalized.length > 1) {
        normalized = normalized.replace(/\/+$/, "");
      }

      return normalized || "/";
    },

    currentPath() {
      return this.normalize(window.location.pathname);
    },

    isCurrentLink(link) {
      if (!link || !link.href) return false;

      try {
        const url = new URL(link.href, window.location.href);

        if (url.origin !== window.location.origin) {
          return false;
        }

        const current = this.currentPath();
        const target = this.normalize(url.pathname);

        if (current === target) return true;

        // Treat index.html as the default document for a directory.
        return (
          target.endsWith("/index.html") &&
          this.normalize(target.slice(0, -"index.html".length)) === current
        );
      } catch {
        return false;
      }
    },

    updateActiveNavigation() {
      const links = dom.all(
        'a[href]:not([data-no-active-route])'
      );

      links.forEach((link) => {
        if (!this.isCurrentLink(link)) return;

        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");

        const parent = link.closest(
          "[data-nav-group], li, [data-navigation-item]"
        );

        parent?.classList.add("is-active");
      });
    }
  };

  // --------------------------------------------------
  // Sticky header
  // --------------------------------------------------

  const header = {
    init() {
      state.header = dom.one(CONFIG.selectors.header);

      if (!state.header) return;

      this.update();

      window.addEventListener("scroll", this.scheduleUpdate, {
        passive: true
      });
    },

    scheduleUpdate() {
      if (state.scrollScheduled) return;

      state.scrollScheduled = true;

      window.requestAnimationFrame(() => {
        state.scrollScheduled = false;
        header.update();
        scrollControls.update();
      });
    },

    update() {
      if (!state.header) return;

      const scrolled = window.scrollY > CONFIG.scrollThreshold;

      state.header.classList.toggle("is-scrolled", scrolled);
      state.header.dataset.scrolled = String(scrolled);
    }
  };

  // --------------------------------------------------
  // Scroll progress and top controls
  // --------------------------------------------------

  const scrollControls = {
    init() {
      this.progressElements = dom.all(
        CONFIG.selectors.scrollProgress
      );

      this.topButtons = dom.all(
        CONFIG.selectors.backToTop
      );

      this.update();

      window.addEventListener(
        "scroll",
        header.scheduleUpdate,
        { passive: true }
      );

      window.addEventListener("resize", header.scheduleUpdate, {
        passive: true
      });

      this.topButtons.forEach((button) => {
        button.addEventListener("click", () => {
          window.scrollTo({
            top: 0,
            behavior: dom.prefersReducedMotion() ? "auto" : "smooth"
          });
        });
      });
    },

    update() {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      const progress = scrollableHeight > 0
        ? Math.min(100, Math.max(0,
            (window.scrollY / scrollableHeight) * 100))
        : 0;

      this.progressElements?.forEach((element) => {
        element.style.width = `${progress}%`;
        element.setAttribute("aria-valuenow", String(Math.round(progress)));
      });

      this.topButtons?.forEach((button) => {
        button.hidden = window.scrollY < CONFIG.topThreshold;
      });
    }
  };

  // --------------------------------------------------
  // Search interface
  // --------------------------------------------------

  const search = {
    init() {
      dom.all(CONFIG.selectors.searchForm).forEach((form) => {
        const input = dom.one(
          CONFIG.selectors.searchInput,
          form
        );

        const clearButton = dom.one(
          CONFIG.selectors.searchClear,
          form
        );

        if (!input) return;

        const updateClearButton = () => {
          if (clearButton) {
            clearButton.hidden = input.value.length === 0;
          }
        };

        input.addEventListener("input", () => {
          updateClearButton();

          form.dispatchEvent(
            new CustomEvent("medorbits:search-input", {
              bubbles: true,
              detail: {
                query: input.value.trim(),
                form
              }
            })
          );
        });

        clearButton?.addEventListener("click", () => {
          input.value = "";
          input.focus();
          updateClearButton();

          input.dispatchEvent(new Event("input", {
            bubbles: true
          }));
        });

        form.addEventListener("submit", (event) => {
          const query = input.value.trim();

          if (!query) {
            event.preventDefault();
            input.focus();
            return;
          }

          // Native GET form submission remains available.
          // Search API behavior belongs in search.js.
          form.dispatchEvent(
            new CustomEvent("medorbits:search-submit", {
              bubbles: true,
              detail: { query, form }
            })
          );
        });

        updateClearButton();
      });
    }
  };

  // --------------------------------------------------
  // Accessible tabs
  // --------------------------------------------------

  const tabs = {
    init() {
      dom.all(CONFIG.selectors.tabs).forEach((container) => {
        const buttons = dom.all(
          CONFIG.selectors.tabButton,
          container
        );

        const panels = dom.all(
          CONFIG.selectors.tabPanel,
          container
        );

        if (!buttons.length || !panels.length) return;

        const activate = (selectedButton, moveFocus = false) => {
          const selectedId =
            selectedButton.getAttribute("aria-controls") ||
            selectedButton.dataset.tab;

          if (!selectedId) return;

          buttons.forEach((button) => {
            const active = button === selectedButton;

            button.setAttribute("aria-selected", String(active));
            button.setAttribute("tabindex", active ? "0" : "-1");
            button.classList.toggle("is-active", active);
          });

          panels.forEach((panel) => {
            const active =
              panel.id === selectedId ||
              panel.dataset.tabPanel === selectedId;

            panel.hidden = !active;
            panel.classList.toggle("is-active", active);
          });

          if (moveFocus) selectedButton.focus();

          container.dispatchEvent(
            new CustomEvent("medorbits:tab-change", {
              bubbles: true,
              detail: { id: selectedId }
            })
          );
        };

        buttons.forEach((button, index) => {
          button.addEventListener("click", () => {
            activate(button);
          });

          button.addEventListener("keydown", (event) => {
            let nextIndex = index;

            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              nextIndex = (index + 1) % buttons.length;
            } else if (
              event.key === "ArrowLeft" ||
              event.key === "ArrowUp"
            ) {
              nextIndex = (index - 1 + buttons.length) % buttons.length;
            } else if (event.key === "Home") {
              nextIndex = 0;
            } else if (event.key === "End") {
              nextIndex = buttons.length - 1;
            } else {
              return;
            }

            event.preventDefault();
            activate(buttons[nextIndex], true);
          });
        });

        const initial =
          buttons.find((button) =>
            button.getAttribute("aria-selected") === "true"
          ) || buttons[0];

        activate(initial);
      });
    }
  };

  // --------------------------------------------------
  // Accessible accordions
  // --------------------------------------------------

  const accordions = {
    init() {
      dom.all(CONFIG.selectors.accordion).forEach((item) => {
        const toggle = dom.one(
          CONFIG.selectors.accordionToggle,
          item
        );

        const panel = dom.one(
          CONFIG.selectors.accordionPanel,
          item
        );

        if (!toggle || !panel) return;

        const setOpen = (open) => {
          toggle.setAttribute("aria-expanded", String(open));
          panel.hidden = !open;

          item.classList.toggle("is-open", open);
        };

        if (!toggle.hasAttribute("aria-expanded")) {
          setOpen(!panel.hidden);
        } else {
          setOpen(toggle.getAttribute("aria-expanded") === "true");
        }

        toggle.addEventListener("click", () => {
          const open = toggle.getAttribute("aria-expanded") !== "true";

          // Optional single-open accordion.
          if (item.parentElement?.dataset.accordionMode === "single" && open) {
            dom.all(
              CONFIG.selectors.accordion,
              item.parentElement
            ).forEach((other) => {
              if (other === item) return;

              const otherToggle = dom.one(
                CONFIG.selectors.accordionToggle,
                other
              );

              const otherPanel = dom.one(
                CONFIG.selectors.accordionPanel,
                other
              );

              if (otherToggle && otherPanel) {
                otherToggle.setAttribute("aria-expanded", "false");
                otherPanel.hidden = true;
                other.classList.remove("is-open");
              }
            });
          }

          setOpen(open);
        });
      });
    }
  };

  // --------------------------------------------------
  // Dismissible banners and notices
  // --------------------------------------------------

  const dismissible = {
    init() {
      document.addEventListener("click", (event) => {
        const button = event.target.closest(
          CONFIG.selectors.dismiss
        );

        if (!button) return;

        const targetId = button.getAttribute("aria-controls");
        const target = targetId
          ? document.getElementById(targetId)
          : button.closest(
              "[data-dismissible], .notice, .alert, .banner"
            );

        if (!target) return;

        target.hidden = true;

        target.dispatchEvent(
          new CustomEvent("medorbits:dismiss", {
            bubbles: true,
            detail: { target }
          })
        );
      });
    }
  };

  // --------------------------------------------------
  // Reveal-on-scroll effects
  // --------------------------------------------------

  const reveal = {
    init() {
      const elements = dom.all(CONFIG.selectors.reveal);

      if (!elements.length) return;

      if (
        dom.prefersReducedMotion() ||
        !("IntersectionObserver" in window)
      ) {
        elements.forEach((element) => {
          element.classList.add("is-visible");
        });

        return;
      }

      const observer = new IntersectionObserver(
        (entries, currentObserver) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -35px 0px"
        }
      );

      elements.forEach((element) => {
        observer.observe(element);
      });

      state.observers.push(observer);
    }
  };

  // --------------------------------------------------
  // Animated number counters
  // --------------------------------------------------

  const counters = {
    init() {
      const elements = dom.all(CONFIG.selectors.counter);

      if (!elements.length) return;

      const animate = (element) => {
        if (element.dataset.counterAnimated === "true") return;

        element.dataset.counterAnimated = "true";

        const target = Number(element.dataset.counter);

        if (!Number.isFinite(target)) return;

        const decimals = Math.min(
          6,
          Math.max(
            0,
            Number(element.dataset.decimals) || 0
          )
        );

        const duration = Math.max(
          100,
          Math.min(
            5000,
            Number(element.dataset.duration) || 1200
          )
        );

        if (dom.prefersReducedMotion()) {
          element.textContent = target.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
          return;
        }

        const startTime = performance.now();

        const step = (now) => {
          const progress = Math.min(
            1,
            (now - startTime) / duration
          );

          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;

          element.textContent = current.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });

          if (progress < 1) {
            window.requestAnimationFrame(step);
          }
        };

        window.requestAnimationFrame(step);
      };

      if (!("IntersectionObserver" in window)) {
        elements.forEach(animate);
        return;
      }

      const observer = new IntersectionObserver(
        (entries, currentObserver) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            animate(entry.target);
            currentObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.4 }
      );

      elements.forEach((element) => observer.observe(element));
      state.observers.push(observer);
    }
  };

  // --------------------------------------------------
  // Footer initialization
  // --------------------------------------------------

  const footer = {
    init() {
      const year = String(new Date().getFullYear());

      dom.all(CONFIG.selectors.currentYear).forEach((element) => {
        element.textContent = year;
      });
    }
  };

  // --------------------------------------------------
  // Reusable page utilities
  // --------------------------------------------------

  const utils = {
    debounce(callback, delay = 250) {
      let timeoutId;

      return (...args) => {
        window.clearTimeout(timeoutId);

        timeoutId = window.setTimeout(() => {
          callback(...args);
        }, delay);
      };
    },

    throttleFrame(callback) {
      let scheduled = false;

      return (...args) => {
        if (scheduled) return;

        scheduled = true;

        window.requestAnimationFrame(() => {
          scheduled = false;
          callback(...args);
        });
      };
    },

    getQueryParam(name) {
      return new URLSearchParams(window.location.search).get(name);
    },

    setQueryParam(name, value) {
      const url = new URL(window.location.href);

      if (value === null || value === undefined || value === "") {
        url.searchParams.delete(name);
      } else {
        url.searchParams.set(name, String(value));
      }

      window.history.replaceState({}, "", url);
    },

    scrollToElement(target, offset = 0) {
      const element = typeof target === "string"
        ? document.querySelector(target)
        : target;

      if (!element) return false;

      const top =
        element.getBoundingClientRect().top +
        window.scrollY -
        offset;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: dom.prefersReducedMotion() ? "auto" : "smooth"
      });

      return true;
    },

    on(name, handler) {
      if (typeof handler !== "function") return () => {};

      document.addEventListener(name, handler);

      const handlers = state.eventHandlers.get(name) || new Set();
      handlers.add(handler);
      state.eventHandlers.set(name, handlers);

      return () => {
        document.removeEventListener(name, handler);
        handlers.delete(handler);

        if (!handlers.size) {
          state.eventHandlers.delete(name);
        }
      };
    }
  };

  // --------------------------------------------------
  // Page initialization
  // --------------------------------------------------

  function init() {
    if (state.initialized) return;

    state.initialized = true;

    try {
      routes.updateActiveNavigation();
      header.init();
      scrollControls.init();
      search.init();
      tabs.init();
      accordions.init();
      dismissible.init();
      reveal.init();
      counters.init();
      footer.init();

      document.documentElement.classList.add("js-enabled");

      document.dispatchEvent(
        new CustomEvent("medorbits:main-ready", {
          bubbles: true,
          detail: {
            version: CONFIG.version,
            path: routes.currentPath()
          }
        })
      );

      if (
        window.MedOrbits &&
        typeof window.MedOrbits.toast === "object"
      ) {
        // The shared app module is available when loaded.
        // No duplicate notifications or app initialization here.
      }
    } catch (error) {
      state.initialized = false;

      console.error(
        `[${CONFIG.name}] Main controller initialization failed`,
        error
      );
    }
  }

  // --------------------------------------------------
  // Public API
  // --------------------------------------------------

  window.MedOrbitsMain = Object.freeze({
    version: CONFIG.version,

    init,
    routes,
    search,
    tabs,
    accordions,
    scroll: scrollControls,
    utils,

    get initialized() {
      return state.initialized;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
