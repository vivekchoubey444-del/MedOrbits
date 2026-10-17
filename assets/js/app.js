
/**
 * MedOrbits -- Application Bootstrap
 * File: assets/js/app.js
 *
 * Responsibilities:
 * - Initialize application-wide UI behavior
 * - Manage mobile navigation and dropdowns
 * - Handle theme preferences
 * - Provide accessible notifications
 * - Enhance forms and external links
 * - Handle global errors
 *
 * Keep authentication, API requests, payments, and permissions
 * inside their dedicated modules.
 */

(() => {
  "use strict";

  const APP = Object.freeze({
    name: "MedOrbits",
    version: "1.0.0",
    storageKeys: Object.freeze({
      theme: "medorbits-theme",
      cookieConsent: "medorbits-cookie-consent"
    }),
    selectors: Object.freeze({
      header: "[data-site-header]",
      menuToggle: "[data-menu-toggle]",
      navigation: "[data-navigation]",
      dropdownToggle: "[data-dropdown-toggle]",
      themeToggle: "[data-theme-toggle]",
      toastContainer: "[data-toast-container]",
      backToTop: "[data-back-to-top]",
      year: "[data-current-year]",
      form: "form[data-enhance]",
      passwordToggle: "[data-password-toggle]"
    })
  });

  const state = {
    initialized: false,
    menuOpen: false,
    toastTimerIds: new Set()
  };

  const helpers = {
    query(selector, root = document) {
      return root.querySelector(selector);
    },

    queryAll(selector, root = document) {
      return Array.from(root.querySelectorAll(selector));
    },

    safeStorageGet(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },

    safeStorageSet(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },

    prefersReducedMotion() {
      return window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    },

    isModifiedClick(event) {
      return (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      );
    },

    isExternalLink(url) {
      return url.origin !== window.location.origin;
    }
  };

  // --------------------------------------------------
  // Application logging
  // --------------------------------------------------

  const logger = {
    info(message, details) {
      if (window.MEDORBITS_DEBUG === true) {
        console.info(`[${APP.name}] ${message}`, details ?? "");
      }
    },

    warn(message, details) {
      console.warn(`[${APP.name}] ${message}`, details ?? "");
    },

    error(message, error) {
      console.error(`[${APP.name}] ${message}`, error ?? "");
    }
  };

  // --------------------------------------------------
  // Shared custom events
  // --------------------------------------------------

  const events = {
    emit(name, detail = {}) {
      document.dispatchEvent(
        new CustomEvent(`medorbits:${name}`, {
          bubbles: true,
          detail
        })
      );
    }
  };

  // --------------------------------------------------
  // Mobile navigation
  // --------------------------------------------------

  const navigation = {
    init() {
      const toggle = helpers.query(APP.selectors.menuToggle);
      const nav = helpers.query(APP.selectors.navigation);

      if (!toggle || !nav) return;

      if (!toggle.hasAttribute("aria-expanded")) {
        toggle.setAttribute("aria-expanded", "false");
      }

      if (!nav.id) {
        nav.id = "medorbits-primary-navigation";
      }

      toggle.setAttribute("aria-controls", nav.id);

      toggle.addEventListener("click", () => {
        this.setOpen(
          toggle.getAttribute("aria-expanded") !== "true",
          toggle,
          nav
        );
      });

      nav.addEventListener("click", (event) => {
        const link = event.target.closest("a");

        if (link && window.matchMedia("(max-width: 768px)").matches) {
          this.setOpen(false, toggle, nav);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.setOpen(false, toggle, nav);
        }
      });

      document.addEventListener("click", (event) => {
        if (
          state.menuOpen &&
          !toggle.contains(event.target) &&
          !nav.contains(event.target)
        ) {
          this.setOpen(false, toggle, nav);
        }
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
          this.setOpen(false, toggle, nav);
        }
      });
    },

    setOpen(open, toggle, nav) {
      state.menuOpen = open;

      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);

      document.body.classList.toggle("menu-is-open", open);

      events.emit("navigation-change", { open });

      if (open) {
        const firstLink = helpers.query("a", nav);
        firstLink?.focus({ preventScroll: true });
      }
    }
  };

  // --------------------------------------------------
  // Accessible dropdowns
  // --------------------------------------------------

  const dropdowns = {
    init() {
      helpers.queryAll(APP.selectors.dropdownToggle).forEach((toggle) => {
        const targetId = toggle.getAttribute("aria-controls");
        const panel = targetId
          ? document.getElementById(targetId)
          : toggle.nextElementSibling;

        if (!panel) return;

        const setOpen = (open) => {
          toggle.setAttribute("aria-expanded", String(open));
          panel.hidden = !open;
          panel.classList.toggle("is-open", open);
        };

        if (!toggle.hasAttribute("aria-expanded")) {
          setOpen(false);
        }

        toggle.addEventListener("click", () => {
          setOpen(toggle.getAttribute("aria-expanded") !== "true");
        });

        toggle.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            setOpen(false);
            toggle.focus();
          }
        });

        document.addEventListener("click", (event) => {
          if (
            !toggle.contains(event.target) &&
            !panel.contains(event.target)
          ) {
            setOpen(false);
          }
        });
      });
    }
  };

  // --------------------------------------------------
  // Theme preferences
  // --------------------------------------------------

  const theme = {
    init() {
      const toggle = helpers.query(APP.selectors.themeToggle);
      const savedTheme = helpers.safeStorageGet(APP.storageKeys.theme);

      const validTheme = ["dark", "light"].includes(savedTheme)
        ? savedTheme
        : null;

      const initialTheme =
        validTheme ||
        document.documentElement.dataset.theme ||
        "dark";

      this.apply(initialTheme, false);

      if (toggle) {
        toggle.addEventListener("click", () => {
          const current =
            document.documentElement.dataset.theme || "dark";

          this.apply(current === "dark" ? "light" : "dark", true);
        });
      }
    },

    apply(value, persist = true) {
      if (!["dark", "light"].includes(value)) return;

      const root = document.documentElement;

      root.dataset.theme = value;
      root.style.colorScheme = value;

      helpers.queryAll(APP.selectors.themeToggle).forEach((toggle) => {
        toggle.setAttribute(
          "aria-label",
          value === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme"
        );

        toggle.setAttribute("aria-pressed", String(value === "dark"));
      });

      if (persist) {
        helpers.safeStorageSet(APP.storageKeys.theme, value);
      }

      events.emit("theme-change", { theme: value });
    }
  };

  // --------------------------------------------------
  // Toast notifications
  // --------------------------------------------------

  const toast = {
    init() {
      this.container = helpers.query(APP.selectors.toastContainer);

      if (!this.container) {
        this.container = document.createElement("div");
        this.container.dataset.toastContainer = "";
        this.container.className = "toast-container";
        this.container.setAttribute("aria-label", "Notifications");
        this.container.setAttribute("aria-live", "polite");
        this.container.setAttribute("aria-relevant", "additions text");
        document.body.appendChild(this.container);
      }
    },

    show(message, options = {}) {
      if (!this.container) this.init();

      const {
        type = "info",
        duration = 4000
      } = options;

      const allowedTypes = ["info", "success", "warning", "error"];
      const safeType = allowedTypes.includes(type) ? type : "info";

      const item = document.createElement("div");
      item.className = `toast toast--${safeType}`;
      item.setAttribute("role", safeType === "error" ? "alert" : "status");

      const text = document.createElement("span");
      text.textContent = String(message);

      const close = document.createElement("button");
      close.type = "button";
      close.className = "toast__close";
      close.setAttribute("aria-label", "Dismiss notification");
      close.textContent = "×";

      const remove = () => {
        const timerId = item.dataset.timerId;

        if (timerId) {
          window.clearTimeout(Number(timerId));
          state.toastTimerIds.delete(Number(timerId));
        }

        item.remove();
      };

      close.addEventListener("click", remove);

      item.append(text, close);
      this.container.appendChild(item);

      if (duration > 0) {
        const timerId = window.setTimeout(remove, duration);
        state.toastTimerIds.add(timerId);
        item.dataset.timerId = String(timerId);
      }

      events.emit("toast", {
        type: safeType,
        message: String(message)
      });

      return item;
    },

    success(message, options = {}) {
      return this.show(message, { ...options, type: "success" });
    },

    error(message, options = {}) {
      return this.show(message, { ...options, type: "error" });
    },

    warning(message, options = {}) {
      return this.show(message, { ...options, type: "warning" });
    }
  };

  // --------------------------------------------------
  // Form enhancements
  // --------------------------------------------------

  const forms = {
    init() {
      helpers.queryAll(APP.selectors.form).forEach((form) => {
        form.addEventListener("submit", (event) => {
          if (!form.checkValidity()) {
            event.preventDefault();
            form.reportValidity();

            const invalidField = form.querySelector(":invalid");
            invalidField?.focus();

            events.emit("form-invalid", { form });
            return;
          }

          // Application-specific submission belongs in the relevant
          // form handler or API module. Do not simulate a server success.
          events.emit("form-valid", { form });
        });

        form.addEventListener("input", (event) => {
          const field = event.target;

          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
          ) {
            field.removeAttribute("aria-invalid");

            if (field.checkValidity()) {
              field.classList.remove("is-invalid");
            }
          }
        });
      });
    }
  };

  // --------------------------------------------------
  // Password visibility controls
  // --------------------------------------------------

  const passwordVisibility = {
    init() {
      helpers.queryAll(APP.selectors.passwordToggle).forEach((toggle) => {
        const targetId = toggle.getAttribute("aria-controls");
        const input = targetId
          ? document.getElementById(targetId)
          : toggle.previousElementSibling;

        if (!(input instanceof HTMLInputElement)) return;
        if (!["password", "text"].includes(input.type)) return;

        toggle.setAttribute("aria-pressed", "false");

        toggle.addEventListener("click", () => {
          const show = input.type === "password";

          input.type = show ? "text" : "password";
          toggle.setAttribute("aria-pressed", String(show));
          toggle.setAttribute(
            "aria-label",
            show ? "Hide password" : "Show password"
          );
        });
      });
    }
  };

  // --------------------------------------------------
  // External links and safe navigation
  // --------------------------------------------------

  const links = {
    init() {
      helpers.queryAll("a[href]").forEach((link) => {
        let url;

        try {
          url = new URL(link.href, window.location.href);
        } catch {
          return;
        }

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:" &&
          url.protocol !== "mailto:" &&
          url.protocol !== "tel:"
        ) {
          return;
        }

        if (
          link.target === "_blank" &&
          helpers.isExternalLink(url)
        ) {
          const rel = new Set(
            (link.getAttribute("rel") || "")
              .split(/\s+/)
              .filter(Boolean)
          );

          rel.add("noopener");
          rel.add("noreferrer");

          link.setAttribute("rel", Array.from(rel).join(" "));
        }
      });
    }
  };

  // --------------------------------------------------
  // Back-to-top control
  // --------------------------------------------------

  const backToTop = {
    init() {
      const button = helpers.query(APP.selectors.backToTop);

      if (!button) return;

      const update = () => {
        button.hidden = window.scrollY < 400;
      };

      update();
      window.addEventListener("scroll", update, { passive: true });

      button.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: helpers.prefersReducedMotion() ? "auto" : "smooth"
        });
      });
    }
  };

  // --------------------------------------------------
  // Footer year
  // --------------------------------------------------

  const footer = {
    init() {
      const year = String(new Date().getFullYear());

      helpers.queryAll(APP.selectors.year).forEach((element) => {
        element.textContent = year;
      });
    }
  };

  // --------------------------------------------------
  // Catalog sliders
  // --------------------------------------------------

  const catalogSliders = {
    init() {
      helpers.queryAll("[data-catalog-slider]").forEach((track, index) => {
        if (track.dataset.sliderInitialized === "true") return;

        track.dataset.sliderInitialized = "true";
        track.classList.add("is-catalog-slider");
        track.setAttribute(
          "aria-label",
          track.dataset.sliderLabel || `Catalog items ${index + 1}`
        );
        track.setAttribute("tabindex", "0");

        const controls = document.createElement("div");
        controls.className = "catalog-slider-controls";
        controls.setAttribute("role", "group");
        controls.setAttribute("aria-label", "Catalog navigation");

        const previous = document.createElement("button");
        previous.type = "button";
        previous.className = "catalog-slider-button";
        previous.setAttribute("aria-label", "Show previous catalog items");
        previous.title = "Previous items";
        previous.textContent = "‹";

        const next = document.createElement("button");
        next.type = "button";
        next.className = "catalog-slider-button";
        next.setAttribute("aria-label", "Show next catalog items");
        next.title = "Next items";
        next.textContent = "›";

        controls.append(previous, next);
        track.insertAdjacentElement("afterend", controls);

        const updateControls = () => {
          const maxScroll = track.scrollWidth - track.clientWidth;
          previous.disabled = track.scrollLeft <= 1;
          next.disabled = track.scrollLeft >= maxScroll - 1;
          controls.hidden = maxScroll <= 1;
        };

        const scrollByPage = (direction) => {
          const firstItem = track.firstElementChild;
          const itemWidth = firstItem?.getBoundingClientRect().width || track.clientWidth;
          const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
          track.scrollBy({
            left: direction * (itemWidth + gap),
            behavior: helpers.prefersReducedMotion() ? "auto" : "smooth"
          });
        };

        previous.addEventListener("click", () => scrollByPage(-1));
        next.addEventListener("click", () => scrollByPage(1));
        track.addEventListener("scroll", updateControls, { passive: true });
        track.addEventListener("keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          scrollByPage(event.key === "ArrowRight" ? 1 : -1);
        });
        window.addEventListener("resize", updateControls, { passive: true });
        updateControls();
      });
    }
  };

  // --------------------------------------------------
  // Cookie consent helpers
  // --------------------------------------------------

  const consent = {
    get() {
      const value = helpers.safeStorageGet(APP.storageKeys.cookieConsent);

      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },

    save(preferences) {
      if (!preferences || typeof preferences !== "object") {
        return false;
      }

      const normalized = {
        necessary: true,
        analytics: preferences.analytics === true,
        marketing: preferences.marketing === true,
        updatedAt: new Date().toISOString()
      };

      const saved = helpers.safeStorageSet(
        APP.storageKeys.cookieConsent,
        JSON.stringify(normalized)
      );

      if (saved) {
        events.emit("consent-change", normalized);
      }

      return saved;
    }
  };

  // --------------------------------------------------
  // Global error handling
  // --------------------------------------------------

  const errorHandling = {
    init() {
      window.addEventListener("error", (event) => {
        logger.error("Uncaught browser error", {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        logger.error("Unhandled promise rejection", event.reason);
      });
    }
  };

  // --------------------------------------------------
  // Initialize application
  // --------------------------------------------------

  function init() {
    if (state.initialized) return;

    state.initialized = true;

    try {
      navigation.init();
      dropdowns.init();
      theme.init();
      toast.init();
      forms.init();
      passwordVisibility.init();
      links.init();
      backToTop.init();
      footer.init();
      catalogSliders.init();
      errorHandling.init();

      logger.info("Application initialized", {
        version: APP.version
      });

      events.emit("ready", {
        name: APP.name,
        version: APP.version
      });
    } catch (error) {
      logger.error("Application initialization failed", error);
      state.initialized = false;
    }
  }

  // --------------------------------------------------
  // Public application interface
  // --------------------------------------------------

  window.MedOrbits = Object.freeze({
    version: APP.version,
    events,
    toast,
    theme,
    consent,

    get initialized() {
      return state.initialized;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
