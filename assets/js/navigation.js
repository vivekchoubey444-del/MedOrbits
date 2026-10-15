/* =========================================================
   MedOrbits -- Navigation Manager
   File: /assets/js/navigation.js
   Purpose: Sticky header, mobile menu, dropdowns, active links,
            smooth scrolling, breadcrumbs and navigation events
   ========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const CONSTANTS = window.MedOrbitsConstants || {};
  const SELECTORS = {
    header: "[data-site-header], .site-header, .main-header",
    menuToggle: "[data-nav-toggle], .nav-toggle, .menu-toggle",
    navigation: "[data-site-navigation], .site-navigation, .main-navigation, .navbar-collapse",
    navLinks: "[data-site-navigation] a[href], .site-navigation a[href], .main-navigation a[href], .navbar-collapse a[href]",
    dropdownToggle: "[data-nav-dropdown-toggle], .dropdown-toggle",
    dropdown: "[data-nav-dropdown], .nav-dropdown, .dropdown",
    breadcrumb: "[data-breadcrumbs]",
    backToTop: "[data-back-to-top]"
  };
  const state = {
    initialized: false,
    header: null,
    navigation: null,
    menuToggle: null,
    scrollHandler: null,
    resizeHandler: null,
    lastScrollY: 0,
    ticking: false
  };
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
        new CustomEvent("medorbits:navigation:" + name, {
          detail: detail || {}
        })
      );
    },
    normalizePath(path) {
      if (!path) return "/";
      try {
        const url = new URL(path, window.location.origin);
        let pathname = url.pathname.replace(/\/{2,}/g, "/");
        if (pathname.length > 1) {
          pathname = pathname.replace(/\/+$/, "");
        }
        return pathname.toLowerCase();
      } catch (_) {
        return String(path).split("?")[0].split("#")[0].toLowerCase();
      }
    },
    isInternalLink(link) {
      if (!link) return false;
      try {
        const url = new URL(link.href, window.location.href);
        return (
          url.origin === window.location.origin &&
          !link.hasAttribute("download") &&
          !link.hasAttribute("data-no-spa") &&
          !/^(mailto:|tel:|javascript:)/i.test(link.href)
        );
      } catch (_) {
        return false;
      }
    },
    getFocusable(container) {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), ' +
          'select:not([disabled]), textarea:not([disabled]), ' +
          '[tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => {
        return !element.hidden && element.getClientRects().length > 0;
      });
    }
  };
  function getHeader() {
    return document.querySelector(SELECTORS.header);
  }
  function getNavigation() {
    return document.querySelector(SELECTORS.navigation);
  }
  function getMenuToggle() {
    return document.querySelector(SELECTORS.menuToggle);
  }
  function setMenuState(isOpen) {
    const navigation = state.navigation || getNavigation();
    const toggle = state.menuToggle || getMenuToggle();
    if (!navigation || !toggle) return;
    navigation.classList.toggle("is-open", isOpen);
    navigation.classList.toggle("nav-open", isOpen);
    toggle.classList.toggle("is-active", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (!navigation.id) {
      navigation.id = "medorbits-primary-navigation";
    }
    toggle.setAttribute("aria-controls", navigation.id);
    document.body.classList.toggle("navigation-open", isOpen);
    utils.dispatch("menu-toggle", {
      open: isOpen,
      navigation,
      toggle
    });
  }
  function toggleMenu(force) {
    const navigation = state.navigation || getNavigation();
    if (!navigation) return false;
    const isCurrentlyOpen =
      navigation.classList.contains("is-open") ||
      navigation.classList.contains("nav-open");
    const shouldOpen =
      typeof force === "boolean" ? force : !isCurrentlyOpen;
    setMenuState(shouldOpen);
    return shouldOpen;
  }
  function closeMenu() {
    setMenuState(false);
  }
  function closeDropdowns(except) {
    document.querySelectorAll(SELECTORS.dropdown).forEach((dropdown) => {
      if (except && dropdown === except) return;
      dropdown.classList.remove("is-open", "dropdown-open");
      const toggle = dropdown.querySelector(SELECTORS.dropdownToggle);
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
      }
      const menu = dropdown.querySelector(
        "[data-dropdown-menu], .dropdown-menu, .nav-dropdown-menu"
      );
      if (menu) {
        menu.hidden = true;
      }
    });
  }
  function toggleDropdown(toggle, force) {
    if (!toggle) return false;
    const dropdown = toggle.closest(SELECTORS.dropdown);
    if (!dropdown) return false;
    const menu = dropdown.querySelector(
      "[data-dropdown-menu], .dropdown-menu, .nav-dropdown-menu"
    );
    const isOpen =
      dropdown.classList.contains("is-open") ||
      dropdown.classList.contains("dropdown-open");
    const shouldOpen =
      typeof force === "boolean" ? force : !isOpen;
    closeDropdowns(shouldOpen ? dropdown : null);
    dropdown.classList.toggle("is-open", shouldOpen);
    dropdown.classList.toggle("dropdown-open", shouldOpen);
    toggle.setAttribute("aria-expanded", String(shouldOpen));
    if (menu) {
      menu.hidden = !shouldOpen;
    }
    utils.dispatch("dropdown-toggle", {
      dropdown,
      open: shouldOpen
    });
    return shouldOpen;
  }
  function markActiveLinks() {
    const currentPath = utils.normalizePath(window.location.pathname);
    const links = document.querySelectorAll(
      "nav a[href], [role='navigation'] a[href]"
    );
    let bestMatch = null;
    let bestLength = -1;
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        /^(mailto:|tel:|javascript:)/i.test(href)
      ) {
        return;
      }
      let linkPath;
      try {
        linkPath = utils.normalizePath(
          new URL(href, window.location.href).pathname
        );
      } catch (_) {
        return;
      }
      const exactMatch = linkPath === currentPath;
      const sectionMatch =
        linkPath !== "/" &&
        currentPath.startsWith(linkPath + "/");
      const active = exactMatch || sectionMatch;
      link.classList.toggle("active", active);
      link.classList.toggle("is-active", active);
      if (active && linkPath.length > bestLength) {
        bestMatch = link;
        bestLength = linkPath.length;
      }
      if (exactMatch) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (bestMatch) {
      const dropdown = bestMatch.closest(SELECTORS.dropdown);
      if (dropdown) {
        dropdown.classList.add("has-active-child");
      }
    }
    utils.dispatch("active-links-updated", {
      path: currentPath,
      activeLink: bestMatch
    });
  }
  function updateStickyHeader() {
    const header = state.header || getHeader();
    if (!header) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const threshold = Number(header.dataset.stickyThreshold) || 20;
    header.classList.toggle("is-scrolled", scrollY > threshold);
    header.classList.toggle("header-scrolled", scrollY > threshold);
    if (header.hasAttribute("data-hide-on-scroll")) {
      const delta = scrollY - state.lastScrollY;
      if (scrollY < threshold || delta < -5) {
        header.classList.remove("is-hidden");
      } else if (delta > 5 && !document.body.classList.contains("navigation-open")) {
        header.classList.add("is-hidden");
      }
    }
    state.lastScrollY = scrollY;
    const backToTop = document.querySelectorAll(SELECTORS.backToTop);
    backToTop.forEach((button) => {
      button.hidden = scrollY < 300;
      button.classList.toggle("is-visible", scrollY >= 300);
    });
    utils.dispatch("scroll", {
      scrollY,
      scrolled: scrollY > threshold
    });
  }
  function handleScroll() {
    if (state.ticking) return;
    state.ticking = true;
    window.requestAnimationFrame(function () {
      updateStickyHeader();
      state.ticking = false;
    });
  }
  function setupStickyHeader() {
    state.header = getHeader();
    if (!state.header) return;
    if (state.header.hasAttribute("data-sticky") ||
        state.header.classList.contains("sticky-header")) {
      state.header.classList.add("is-sticky");
    }
    updateStickyHeader();
  }
  function setupDropdowns() {
    document.querySelectorAll(SELECTORS.dropdown).forEach((dropdown) => {
      const toggle = dropdown.querySelector(SELECTORS.dropdownToggle);
      if (!toggle) return;
      if (!toggle.hasAttribute("aria-expanded")) {
        toggle.setAttribute("aria-expanded", "false");
      }
      const menu = dropdown.querySelector(
        "[data-dropdown-menu], .dropdown-menu, .nav-dropdown-menu"
      );
      if (menu && !dropdown.classList.contains("is-open")) {
        menu.hidden = true;
      }
    });
  }
  function setupNavigationAccessibility() {
    state.navigation = getNavigation();
    state.menuToggle = getMenuToggle();
    if (state.navigation && !state.navigation.id) {
      state.navigation.id = "medorbits-primary-navigation";
    }
    if (state.menuToggle && state.navigation) {
      state.menuToggle.setAttribute(
        "aria-controls",
        state.navigation.id
      );
      state.menuToggle.setAttribute(
        "aria-expanded",
        String(
          state.navigation.classList.contains("is-open") ||
          state.navigation.classList.contains("nav-open")
        )
      );
      if (!state.menuToggle.hasAttribute("aria-label")) {
        state.menuToggle.setAttribute(
          "aria-label",
          "Toggle navigation menu"
        );
      }
    }
  }
  function setupSmoothScrolling() {
    document.addEventListener("click", function (event) {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      let target;
      try {
        target = document.querySelector(href);
      } catch (_) {
        return;
      }
      if (!target) return;
      event.preventDefault();
      const header = state.header || getHeader();
      const headerHeight = header
        ? header.getBoundingClientRect().height
        : 0;
      const targetY =
        target.getBoundingClientRect().top +
        window.scrollY -
        headerHeight -
        12;
      const reduceMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: reduceMotion ? "auto" : "smooth"
      });
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
      if (window.history?.replaceState) {
        window.history.replaceState(null, "", href);
      }
      closeMenu();
      utils.dispatch("anchor-navigation", {
        href,
        target
      });
    });
  }
  function setupBackToTop() {
    document.addEventListener("click", function (event) {
      const button = event.target.closest(SELECTORS.backToTop);
      if (!button) return;
      event.preventDefault();
      const reduceMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth"
      });
      utils.dispatch("back-to-top");
    });
  }
  function setupClickHandlers() {
    document.addEventListener("click", function (event) {
      const toggle = event.target.closest(SELECTORS.menuToggle);
      if (toggle) {
        event.preventDefault();
        toggleMenu();
        return;
      }
      const dropdownToggle = event.target.closest(SELECTORS.dropdownToggle);
      if (dropdownToggle) {
        event.preventDefault();
        toggleDropdown(dropdownToggle);
        return;
      }
      const navigationLink = event.target.closest(SELECTORS.navLinks);
      if (navigationLink) {
        const navigation = state.navigation || getNavigation();
        if (navigation && navigation.contains(navigationLink)) {
          if (window.matchMedia("(max-width: 991px)").matches) {
            closeMenu();
          }
          utils.dispatch("link-click", {
            link: navigationLink,
            href: navigationLink.href
          });
        }
        return;
      }
      if (!event.target.closest(SELECTORS.dropdown)) {
        closeDropdowns();
      }
      const navigation = state.navigation || getNavigation();
      if (
        navigation &&
        !navigation.contains(event.target) &&
        !event.target.closest(SELECTORS.menuToggle)
      ) {
        if (window.matchMedia("(max-width: 991px)").matches) {
          closeMenu();
        }
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
        closeDropdowns();
        return;
      }
      const navigation = state.navigation || getNavigation();
      if (!navigation || !navigation.contains(document.activeElement)) {
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      const links = utils.getFocusable(navigation);
      if (!links.length) return;
      const currentIndex = links.indexOf(document.activeElement);
      if (currentIndex === -1) return;
      event.preventDefault();
      const nextIndex = event.key === "ArrowDown"
        ? (currentIndex + 1) % links.length
        : (currentIndex - 1 + links.length) % links.length;
      links[nextIndex].focus();
    });
  }
  function buildBreadcrumbs(options) {
    const settings = options || {};
    const container = utils.getElement(
      settings.container || SELECTORS.breadcrumb
    );
    if (!container) return [];
    const path = window.location.pathname
      .split("/")
      .filter(Boolean);
    const homeLabel = settings.homeLabel || "Home";
    const items = [
      {
        label: homeLabel,
        href: settings.homeUrl || "/"
      }
    ];
    let currentPath = "";
    path.forEach((segment, index) => {
      currentPath += "/" + segment;
      let label = decodeURIComponent(segment)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const customLabels = settings.labels || {};
      if (customLabels[segment]) {
        label = customLabels[segment];
      }
      items.push({
        label,
        href: currentPath,
        current: index === path.length - 1
      });
    });
    container.innerHTML = items.map((item, index) => {
      const isLast = index === items.length - 1;
      const content = isLast
        ? `<span aria-current="page">${utils.escapeHTML(item.label)}</span>`
        : `<a href="${utils.escapeHTML(item.href)}">${utils.escapeHTML(item.label)}</a>`;
      const separator = isLast
        ? ""
        : '<span class="breadcrumb-separator" aria-hidden="true">/</span>';
      return `
        <li class="breadcrumb-item${isLast ? " is-current" : ""}">
          ${content}${separator}
        </li>
      `;
    }).join("");
    container.setAttribute("aria-label", "Breadcrumb");
    container.setAttribute("role", "navigation");
    if (container.tagName !== "OL" && container.tagName !== "UL") {
      container.classList.add("breadcrumb-list");
    }
    return items;
  }
  function navigateTo(url, options) {
    if (!url || typeof url !== "string") {
      throw new Error("A valid navigation URL is required.");
    }
    const settings = options || {};
    const destination = new URL(url, window.location.href);
    if (
      destination.protocol !== "https:" &&
      destination.protocol !== "http:"
    ) {
      throw new Error("Unsupported navigation URL.");
    }
    utils.dispatch("before-navigate", {
      url: destination.href,
      options: settings
    });
    if (settings.replace) {
      window.location.replace(destination.href);
    } else if (settings.newTab) {
      window.open(destination.href, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(destination.href);
    }
  }
  function getCurrentRoute() {
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      href: window.location.href
    };
  }
  function on(name, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("A callback function is required.");
    }
    const eventName = "medorbits:navigation:" + name;
    document.addEventListener(eventName, callback);
    return function unsubscribe() {
      document.removeEventListener(eventName, callback);
    };
  }
  function refresh() {
    setupNavigationAccessibility();
    setupStickyHeader();
    setupDropdowns();
    markActiveLinks();
    utils.dispatch("refreshed", {
      route: getCurrentRoute()
    });
    return api;
  }
  function init() {
    if (state.initialized) return api;
    setupNavigationAccessibility();
    setupStickyHeader();
    setupDropdowns();
    markActiveLinks();
    setupSmoothScrolling();
    setupBackToTop();
    setupClickHandlers();
    state.scrollHandler = handleScroll;
    state.resizeHandler = function () {
      setupNavigationAccessibility();
      if (window.matchMedia("(min-width: 992px)").matches) {
        closeMenu();
      }
      updateStickyHeader();
    };
    window.addEventListener("scroll", state.scrollHandler, {
      passive: true
    });
    window.addEventListener("resize", state.resizeHandler, {
      passive: true
    });
    window.addEventListener("popstate", markActiveLinks);
    state.initialized = true;
    utils.dispatch("initialized", {
      route: getCurrentRoute()
    });
    return api;
  }
  function destroy() {
    if (state.scrollHandler) {
      window.removeEventListener("scroll", state.scrollHandler);
    }
    if (state.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
    }
    state.initialized = false;
    closeMenu();
    closeDropdowns();
  }
  const api = {
    init,
    destroy,
    refresh,
    openMenu: () => toggleMenu(true),
    closeMenu,
    toggleMenu,
    openDropdown: (target) => toggleDropdown(utils.getElement(target), true),
    closeDropdowns,
    toggleDropdown,
    markActiveLinks,
    updateStickyHeader,
    buildBreadcrumbs,
    navigateTo,
    getCurrentRoute,
    on,
    selectors: { ...SELECTORS }
  };
  window.MedOrbitsNavigation = api;
  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Navigation = api;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);