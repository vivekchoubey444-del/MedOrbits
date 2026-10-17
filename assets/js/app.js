
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

      helpers.queryAll(".footer-bottom").forEach((element) => {
        if (element.querySelector("[data-social-links]")) return;

        const links = document.createElement("nav");
        links.className = "footer-social-links";
        links.dataset.socialLinks = "";
        links.setAttribute("aria-label", "MedOrbits social links");
        element.appendChild(links);
      });

      fetch("/assets/data/social-links.json", {
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      }).then((response) => {
        if (!response.ok) throw new Error("Social links are unavailable.");
        return response.json();
      }).then((data) => {
        const iconIds = new Set([
          "facebook",
          "instagram",
          "linkedin",
          "telegram",
          "whatsapp",
          "x",
          "youtube",
          "website"
        ]);
        const unconfiguredProfiles = ["instagram", "facebook", "x"];
        helpers.queryAll("[data-social-links]").forEach((container) => {
          container.replaceChildren();
          const configured = Array.isArray(data.links) ? data.links : [];
          const configuredIds = new Set(configured.map((item) => String(item?.id || "").toLowerCase()));
          configured.forEach((item) => {
            if (typeof item?.url !== "string" || !item.url.trim()) return;
            let url;
            try {
              url = new URL(item.url);
            } catch {
              return;
            }
            if (url.protocol !== "https:") return;

            const id = String(item.id || "").toLowerCase();
            const iconId = id.startsWith("whatsapp") ? "whatsapp" : id;
            const link = document.createElement("a");
            const icon = document.createElement("img");
            const label = document.createElement("span");
            const iconName = iconId === "website"
              ? "link"
              : iconIds.has(iconId) ? iconId : "social";

            link.className = "footer-social-button";
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            icon.src = `/assets/icons/social/${iconName}.svg`;
            icon.alt = "";
            icon.width = 18;
            icon.height = 18;
            icon.setAttribute("aria-hidden", "true");
            label.textContent = String(item.label || item.id || "Social link");
            link.append(icon, label);
            container.appendChild(link);
          });

          unconfiguredProfiles.forEach((id) => {
            const item = configured.find((candidate) => String(candidate?.id || "").toLowerCase() === id);
            if (configuredIds.has(id) && item?.url?.trim()) return;

            const placeholder = document.createElement("span");
            const icon = document.createElement("img");
            const label = document.createElement("span");
            placeholder.className = "footer-social-placeholder";
            placeholder.setAttribute("role", "img");
            placeholder.setAttribute("aria-label", `${id} profile link not configured`);
            icon.src = `/assets/icons/social/${id}.svg`;
            icon.alt = "";
            icon.width = 18;
            icon.height = 18;
            icon.setAttribute("aria-hidden", "true");
            label.textContent = id === "x" ? "X" : id[0].toUpperCase() + id.slice(1);
            placeholder.append(icon, label);
            container.appendChild(placeholder);
          });

          container.hidden = container.childElementCount === 0;
        });
      }).catch((error) => {
        logger.error("Social links are unavailable.", error);
        helpers.queryAll("[data-social-links]").forEach((container) => {
          container.hidden = true;
        });
      });
    }
  };

  // --------------------------------------------------
  // Catalog sliders
  // --------------------------------------------------

  const catalogSliders = {
    observer: null,
    init() {
      if (!document.getElementById("medorbits-grid-layout")) {
        const style = document.createElement("style");
        style.id = "medorbits-grid-layout";
        style.textContent = `
          .cards.is-catalog-slider {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
            overflow: visible !important;
            padding: 2px 0 !important;
            scroll-snap-type: none !important;
          }
          .cards.is-catalog-slider > * {
            min-width: 0 !important;
            flex: initial !important;
            scroll-snap-align: none !important;
          }
          .footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 20px 16px !important;
          }
          .footer-grid > .footer-brand {
            grid-column: 1 / -1 !important;
          }
          .footer-social-placeholder {
            display: inline-flex;
            min-height: 38px;
            align-items: center;
            gap: 8px;
            padding: 7px 12px;
            border: 1px solid rgba(201, 169, 110, 0.18);
            border-radius: 8px;
            color: var(--muted, #a79caf);
            font-size: 11px;
            opacity: 0.6;
          }
          .footer-social-placeholder img {
            width: 18px;
            height: 18px;
          }
          .catalog-slider-controls {
            justify-content: flex-end;
          }
          @media (max-width: 390px) {
            .cards.is-catalog-slider,
            .footer-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
        `;
        document.head.appendChild(style);
      }

      helpers.queryAll("[data-catalog-slider], .cards:not([data-no-catalog-slider])").forEach((track, index) => {
        if (track.dataset.sliderInitialized === "true") return;

        track.dataset.sliderInitialized = "true";
        track.dataset.sliderPageSize ||= "4";
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

        const pageSize = Number.parseInt(track.dataset.sliderPageSize || "", 10);
        const paginated = Number.isInteger(pageSize) && pageSize > 0;
        const items = [...track.children];
        let currentPage = 0;

        const updateControls = () => {
          if (paginated) {
            previous.disabled = currentPage === 0;
            next.disabled = (currentPage + 1) * pageSize >= items.length;
            controls.hidden = items.length <= pageSize;
            return;
          }

          const maxScroll = track.scrollWidth - track.clientWidth;
          previous.disabled = track.scrollLeft <= 1;
          next.disabled = track.scrollLeft >= maxScroll - 1;
          controls.hidden = maxScroll <= 1;
        };

        const showPage = (page) => {
          currentPage = Math.max(
            0,
            Math.min(page, Math.ceil(items.length / pageSize) - 1)
          );
          items.forEach((item, index) => {
            item.hidden =
              index < currentPage * pageSize ||
              index >= (currentPage + 1) * pageSize;
          });
          updateControls();
        };

        const scrollByPage = (direction) => {
          if (paginated) {
            showPage(currentPage + direction);
            return;
          }

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
          if (paginated && event.target !== track) return;
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          scrollByPage(event.key === "ArrowRight" ? 1 : -1);
        });
        window.addEventListener("resize", updateControls, { passive: true });
        if (paginated) showPage(0);
        else updateControls();
      });

      if (!this.observer && "MutationObserver" in window && document.body) {
        this.observer = new MutationObserver((records) => {
          const addedCatalog = records.some((record) => [...record.addedNodes].some((node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches(".cards") || node.querySelector(".cards"))
          ));
          if (addedCatalog) this.init();
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  };

  const siteTools = {
    init() {
      if (!/^\/(education|career)(\/|$)/.test(window.location.pathname)) return;
      if (helpers.query('script[data-site-tools-script]')) return;

      const script = document.createElement('script');
      script.src = '/assets/js/site-tools.js';
      script.dataset.siteToolsScript = '';
      script.defer = true;
      document.head.appendChild(script);
    }
  };

  const documentLibrary = {
    init() {
      const pathname = window.location.pathname;
      if (!(pathname === "/" || /\/index\.html$/.test(pathname))) return;
      if (/^\/(admin|account|legal)(\/|$)/.test(pathname)) return;
      if (helpers.query('script[data-document-library]')) return;

      const script = document.createElement("script");
      script.src = "/assets/js/document-library.js";
      script.dataset.documentLibrary = "";
      document.head.appendChild(script);
    }
  };

  const publicData = {
    init() {
      const dataPages = new Set([
        "/education/index.html",
        "/education/courses.html",
        "/education/colleges.html",
        "/education/universities.html",
        "/education/study-abroad/index.html",
        "/education/admissions/index.html",
        "/education/admissions/process.html",
        "/education/admissions/documents.html",
        "/education/admissions/exams.html",
        "/education/resources/faqs.html",
        "/education/resources/guides.html",
        "/education/resources/fees.html",
        "/education/resources/hostels.html",
        "/career/index.html",
        "/career/jobs.html",
        "/career/internships.html",
        "/career/guidance.html",
        "/career/recruitment.html",
        "/pages/careers.html",
        "/pages/services.html",
        "/pages/notifications.html",
        "/pages/testimonials.html"
      ]);
      const pathname = window.location.pathname.endsWith("/")
        ? `${window.location.pathname}index.html`
        : window.location.pathname;
      if (!dataPages.has(pathname)) return;
      if (helpers.query("script[data-public-data]")) return;

      const script = document.createElement("script");
      script.src = "/assets/js/public-data.js";
      script.dataset.publicData = "";
      script.defer = true;
      document.head.appendChild(script);
    }
  };

  const publicBulletins = {
    init() {
      const pathname = window.location.pathname;
      if (
        pathname !== "/" &&
        pathname !== "/index.html" &&
        pathname !== "/pages/notifications.html"
      ) return;
      if (helpers.query("script[data-public-bulletins]")) return;

      const script = document.createElement("script");
      script.src = "/assets/js/bulletins.js";
      script.dataset.publicBulletins = "";
      script.defer = true;
      document.head.appendChild(script);
    }
  };

  const timedEnquiry = {
    init() {
      const pathname = window.location.pathname;
      if (
        (/^\/(admin|account|legal)(\/|$)/.test(pathname) &&
          pathname !== "/legal/disclaimer.html") ||
        pathname === "/pages/400.html" ||
        pathname === "/pages/maintenance.html" ||
        pathname === "/pages/contact.html" ||
        helpers.query("#contactForm")
      ) return;

      const storageKeys = {
        startedAt: "medorbits-enquiry-started-at",
        shown: "medorbits-enquiry-shown"
      };
      const delay = 120000;
      let storageUnavailable = false;
      let storageWarningLogged = false;
      let shownInThisDocument = false;

      const warnStorageUnavailable = (error) => {
        storageUnavailable = true;
        if (storageWarningLogged) return;
        storageWarningLogged = true;
        logger.warn(
          "Timed enquiry session tracking is unavailable.",
          error
        );
      };

      const readSessionValue = (key) => {
        if (storageUnavailable) return null;
        try {
          return window.sessionStorage.getItem(key);
        } catch (error) {
          warnStorageUnavailable(error);
          return null;
        }
      };

      const writeSessionValue = (key, value) => {
        if (storageUnavailable) return;
        try {
          window.sessionStorage.setItem(key, value);
        } catch (error) {
          warnStorageUnavailable(error);
        }
      };

      if (readSessionValue(storageKeys.shown) === "true") return;

      const storedStart = Number(readSessionValue(storageKeys.startedAt));
      const startedAt = Number.isSafeInteger(storedStart) &&
        storedStart > 0 &&
        storedStart <= Date.now()
        ? storedStart
        : Date.now();
      if (startedAt !== storedStart) {
        writeSessionValue(storageKeys.startedAt, String(startedAt));
      }

      const closeButtonSelector = "[data-timed-enquiry-close]";

      const show = () => {
        if (shownInThisDocument) return;
        if (readSessionValue(storageKeys.shown) === "true") return;

        shownInThisDocument = true;
        writeSessionValue(storageKeys.shown, "true");

        const backdrop = document.createElement("div");
        backdrop.className = "timed-enquiry-backdrop";
        backdrop.setAttribute("data-timed-enquiry", "");
        backdrop.innerHTML = `
          <section
            class="timed-enquiry-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timed-enquiry-title"
            aria-describedby="timed-enquiry-description"
            tabindex="-1"
          >
            <button class="timed-enquiry-close" type="button" aria-label="Close enquiry form" data-timed-enquiry-close>×</button>
            <p class="timed-enquiry-eyebrow">Here to help</p>
            <h2 id="timed-enquiry-title">Have a question?</h2>
            <p id="timed-enquiry-description">Share your details and our team will get back to you.</p>
            <form class="timed-enquiry-form" novalidate>
              <label>
                Name
                <input name="name" autocomplete="name" minlength="2" maxlength="100" required>
              </label>
              <label>
                Email
                <input name="email" type="email" autocomplete="email" maxlength="254">
              </label>
              <label>
                Phone
                <input name="phone" type="tel" autocomplete="tel" maxlength="25">
              </label>
              <label>
                What can we help with?
                <select name="category">
                  <option value="general">General enquiry</option>
                  <option value="admissions">Admissions</option>
                  <option value="study_abroad">Study abroad</option>
                  <option value="career">Career</option>
                  <option value="recruitment">Recruitment</option>
                  <option value="partnership">Partnership</option>
                  <option value="technical_support">Technical support</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label class="timed-enquiry-message">
                Your question
                <textarea name="message" rows="3" minlength="10" maxlength="10000" required></textarea>
              </label>
              <input name="source" type="hidden" value="website">
              <p class="timed-enquiry-contact-hint">Please provide an email address or phone number.</p>
              <p class="timed-enquiry-status" role="status" aria-live="polite" hidden></p>
              <button class="timed-enquiry-submit" type="submit">Send enquiry</button>
            </form>
          </section>
        `;

        document.body.appendChild(backdrop);
        const dialog = helpers.query(".timed-enquiry-dialog", backdrop);
        const form = helpers.query(".timed-enquiry-form", backdrop);
        const status = helpers.query(".timed-enquiry-status", backdrop);
        const submit = helpers.query(".timed-enquiry-submit", backdrop);
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        const close = () => {
          backdrop.remove();
          document.body.style.overflow = previousOverflow;
          if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
            previousFocus.focus({ preventScroll: true });
          }
        };

        const focusableElements = () => helpers.queryAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
          dialog
        ).filter((element) => !element.hidden);

        backdrop.addEventListener("click", (event) => {
          if (
            event.target === backdrop ||
            (event.target instanceof Element &&
              event.target.closest(closeButtonSelector))
          ) {
            close();
          }
        });

        dialog.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
          }
          if (event.key !== "Tab") return;

          const focusable = focusableElements();
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!first || !last) {
            event.preventDefault();
            dialog.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        });

        document.body.style.overflow = "hidden";
        form.elements.name.focus();

        [form.elements.email, form.elements.phone].forEach((field) => {
          field.addEventListener("input", () => field.setCustomValidity(""));
        });

        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const email = form.elements.email;
          const phone = form.elements.phone;
          const emailValue = email.value.trim();
          const phoneValue = phone.value.trim();
          const phoneDigits = phoneValue.replace(/\D/g, "").length;

          email.setCustomValidity("");
          phone.setCustomValidity("");
          if (!emailValue && !phoneValue) {
            email.setCustomValidity("Enter an email address or a phone number.");
            phone.setCustomValidity("Enter an email address or a phone number.");
            form.reportValidity();
            return;
          }
          if (
            phoneValue &&
            (!/^[+()\d\s.-]+$/.test(phoneValue) ||
              phoneDigits < 7 ||
              phoneDigits > 15)
          ) {
            phone.setCustomValidity("Enter a valid phone number.");
            form.reportValidity();
            return;
          }
          if (!form.reportValidity()) return;

          if (status) {
            status.hidden = false;
            status.textContent = "Sending your enquiry...";
            status.dataset.state = "pending";
          }
          if (submit) submit.disabled = true;

          try {
            const response = await fetch("/api/v1/contact", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
              },
              credentials: "same-origin",
              body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(
                payload.error?.message ||
                  payload.message ||
                  "Your enquiry could not be submitted. Please try again."
              );
            }
            form.reset();
            if (status) {
              status.textContent = "Thank you. Your enquiry has been submitted.";
              status.dataset.state = "success";
            }
          } catch (error) {
            if (status) {
              status.textContent = error.message ||
                "Your enquiry could not be submitted. Please try again.";
              status.dataset.state = "error";
            }
            logger.error("Timed enquiry submission failed.", error);
          } finally {
            if (submit) submit.disabled = false;
          }
        });
      };

      window.setTimeout(show, Math.max(0, delay - (Date.now() - startedAt)));
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
      siteTools.init();
      documentLibrary.init();
      publicData.init();
      publicBulletins.init();
      timedEnquiry.init();
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
