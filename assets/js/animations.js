/* =========================================================
   MedOrbits -- assets/js/animations.js
   Scroll animations, reveal effects, counters, and motion
   ========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const settings = {
    enabled: CONFIG.ANIMATIONS_ENABLED !== false,
    duration: 700,
    stagger: 100,
    threshold: 0.12,
    counterDuration: 1800,
    rootMargin: "0px 0px -40px 0px"
  };
  const state = {
    initialized: false,
    observer: null,
    counters: new WeakSet(),
    animatedElements: new WeakSet()
  };
  const SELECTORS = {
    reveal: "[data-animate], .animate-on-scroll, .reveal",
    counter: "[data-counter]",
    stagger: "[data-animate-stagger]",
    parallax: "[data-parallax]"
  };
  const AUTO_REVEAL = ".hero-grid > div, .section-head, .cta-inner, .pillar, .faq, .footer-grid > div:not(.footer-brand)";
  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  function isAnimationEnabled() {
    return settings.enabled && !prefersReducedMotion();
  }
  function injectStyles() {
    if (document.getElementById("medorbits-animation-styles")) return;
    const style = document.createElement("style");
    style.id = "medorbits-animation-styles";
    style.textContent = `
      [data-animate],
      .animate-on-scroll,
      .reveal {
        opacity: 0;
        transition:
          opacity var(--mo-animation-duration, 700ms) ease,
          transform var(--mo-animation-duration, 700ms) ease;
        will-change: opacity, transform;
      }
      [data-animate="fade-up"],
      .reveal {
        transform: translate3d(0, 28px, 0);
      }
      [data-animate="fade-down"] {
        transform: translate3d(0, -24px, 0);
      }
      [data-animate="fade-left"] {
        transform: translate3d(28px, 0, 0);
      }
      [data-animate="fade-right"] {
        transform: translate3d(-28px, 0, 0);
      }
      [data-animate="zoom-in"] {
        transform: scale(0.94);
      }
      [data-animate="zoom-out"] {
        transform: scale(1.06);
      }
      [data-animate="flip-up"] {
        transform: perspective(800px) rotateX(12deg);
      }
      [data-animate="blur-in"] {
        filter: blur(8px);
        transform: translate3d(0, 12px, 0);
      }
      .mo-animated {
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      }
      [data-animate-stagger] > * {
        opacity: 0;
        transform: translate3d(0, 18px, 0);
        transition:
          opacity var(--mo-animation-duration, 700ms) ease,
          transform var(--mo-animation-duration, 700ms) ease;
      }
      [data-animate-stagger].mo-animated > * {
        opacity: 1;
        transform: none;
      }
      [data-hover-effect="lift"] {
        transition: transform 250ms ease, box-shadow 250ms ease;
      }
      [data-hover-effect="lift"]:hover {
        transform: translateY(-5px);
      }
      [data-hover-effect="scale"] {
        transition: transform 250ms ease;
      }
      [data-hover-effect="scale"]:hover {
        transform: scale(1.025);
      }
      [data-hover-effect="glow"] {
        transition: box-shadow 250ms ease;
      }
      [data-hover-effect="glow"]:hover {
        box-shadow: 0 0 24px rgba(212, 181, 109, 0.24);
      }
      [data-animate-stagger].mo-animated > * {
        transition-delay: var(--mo-stagger-delay, 0ms);
      }
      @media (prefers-reduced-motion: reduce) {
        [data-animate],
        .animate-on-scroll,
        .reveal,
        [data-animate-stagger] > *,
        [data-hover-effect] {
          opacity: 1 !important;
          transform: none !important;
          filter: none !important;
          transition: none !important;
          animation: none !important;
          scroll-behavior: auto !important;
          will-change: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
  function revealElement(element) {
    if (!element || state.animatedElements.has(element)) return;
    state.animatedElements.add(element);
    element.classList.add("mo-animated");
    if (element.hasAttribute("data-animate-stagger")) {
      Array.from(element.children).forEach((child, index) => {
        child.style.setProperty(
          "--mo-stagger-delay",
          `${index * settings.stagger}ms`
        );
      });
    }
    element.dispatchEvent(
      new CustomEvent("medorbits:animation-complete", {
        bubbles: true
      })
    );
    if (state.observer) {
      state.observer.unobserve(element);
    }
  }
  function observeElement(element) {
    if (!element || element.classList.contains("mo-animated")) return;
    if (!isAnimationEnabled() || !("IntersectionObserver" in window)) {
      revealElement(element);
      return;
    }
    state.observer.observe(element);
  }
  function initRevealAnimations(root = document) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll(AUTO_REVEAL).forEach((element) => {
      if (!element.hasAttribute("data-animate")) element.setAttribute("data-animate", "fade-up");
    });
    root.querySelectorAll(".cards:not([data-no-catalog-slider])").forEach((element) => {
      if (!element.hasAttribute("data-animate-stagger")) element.setAttribute("data-animate-stagger", "");
    });
    root.querySelectorAll(SELECTORS.reveal).forEach(observeElement);
    root.querySelectorAll(SELECTORS.stagger).forEach(observeElement);
  }
  function parseNumber(value) {
    if (typeof value === "number") return value;
    const parsed = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function formatCounter(value, element) {
    const decimals = Math.max(
      0,
      Math.min(10, Number(element.dataset.decimals) || 0)
    );
    const prefix = element.dataset.prefix || "";
    const suffix = element.dataset.suffix || "";
    const formatted = value.toLocaleString(
      element.dataset.locale || "en-IN",
      {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }
    );
    return `${prefix}${formatted}${suffix}`;
  }
  function animateCounter(element) {
    if (!element || state.counters.has(element)) return;
    state.counters.add(element);
    const target = parseNumber(
      element.dataset.counter ?? element.textContent
    );
    const start = parseNumber(element.dataset.counterStart || 0);
    const duration = Math.max(
      0,
      Number(element.dataset.counterDuration) || settings.counterDuration
    );
    if (!isAnimationEnabled() || duration === 0) {
      element.textContent = formatCounter(target, element);
      return;
    }
    let startTime = null;
    function frame(timestamp) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = start + (target - start) * eased;
      element.textContent = formatCounter(current, element);
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        element.textContent = formatCounter(target, element);
        element.dispatchEvent(
          new CustomEvent("medorbits:counter-complete", {
            bubbles: true,
            detail: { value: target }
          })
        );
      }
    }
    element.textContent = formatCounter(start, element);
    window.requestAnimationFrame(frame);
  }
  function initCounters(root = document) {
    if (!root?.querySelectorAll) return;
    const counters = root.querySelectorAll(SELECTORS.counter);
    if (!isAnimationEnabled() || !("IntersectionObserver" in window)) {
      counters.forEach(animateCounter);
      return;
    }
    counters.forEach(element => {
      if (element.dataset.counterObserved === "true") return;
      element.dataset.counterObserved = "true";
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      }, {
        threshold: settings.threshold
      });
      observer.observe(element);
    });
  }
  function initParallax(root = document) {
    if (!root?.querySelectorAll || !isAnimationEnabled()) return;
    const elements = Array.from(root.querySelectorAll(SELECTORS.parallax));
    if (!elements.length) return;
    let ticking = false;
    function update() {
      const viewportHeight = window.innerHeight;
      elements.forEach(element => {
        const speed = Math.max(
          -1,
          Math.min(1, Number(element.dataset.parallax) || 0.15)
        );
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) return;
        const offset = (rect.top - viewportHeight / 2) * speed;
        element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });
      ticking = false;
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }
  function initHoverEffects(root = document) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll("[data-hover-effect]").forEach(element => {
      if (element.dataset.hoverInitialized === "true") return;
      element.dataset.hoverInitialized = "true";
      element.addEventListener("pointerenter", () => {
        if (!isAnimationEnabled()) return;
        element.classList.add("mo-hover-active");
      });
      element.addEventListener("pointerleave", () => {
        element.classList.remove("mo-hover-active");
      });
    });
  }
  function refresh(root = document) {
    initRevealAnimations(root);
    initCounters(root);
    initParallax(root);
    initHoverEffects(root);
  }
  function configure(options = {}) {
    if (typeof options.enabled === "boolean") {
      settings.enabled = options.enabled;
    }
    if (Number.isFinite(Number(options.duration))) {
      settings.duration = Math.max(0, Number(options.duration));
    }
    if (Number.isFinite(Number(options.stagger))) {
      settings.stagger = Math.max(0, Number(options.stagger));
    }
    if (Number.isFinite(Number(options.threshold))) {
      settings.threshold = Math.max(
        0,
        Math.min(1, Number(options.threshold))
      );
    }
    if (Number.isFinite(Number(options.counterDuration))) {
      settings.counterDuration = Math.max(
        0,
        Number(options.counterDuration)
      );
    }
    document.documentElement.style.setProperty(
      "--mo-animation-duration",
      `${settings.duration}ms`
    );
    if (!isAnimationEnabled()) {
      document.querySelectorAll(
        `${SELECTORS.reveal}, ${SELECTORS.stagger}`
      ).forEach(revealElement);
    }
    return getSettings();
  }
  function getSettings() {
    return {
      ...settings,
      reducedMotionPreferred: prefersReducedMotion()
    };
  }
  function init(options = {}) {
    if (state.initialized) {
      configure(options);
      refresh();
      return api;
    }
    configure(options);
    injectStyles();
    if (isAnimationEnabled() && "IntersectionObserver" in window) {
      state.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            revealElement(entry.target);
          }
        });
      }, {
        threshold: settings.threshold,
        rootMargin: settings.rootMargin
      });
    }
    refresh();
    const motionPreference = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    );
    motionPreference?.addEventListener?.("change", () => {
      if (prefersReducedMotion()) {
        document.querySelectorAll(
          `${SELECTORS.reveal}, ${SELECTORS.stagger}`
        ).forEach(revealElement);
      }
    });
    if ("MutationObserver" in window) {
      const mutationObserver = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              refresh(node);
            }
          });
        });
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    state.initialized = true;
    document.dispatchEvent(
      new CustomEvent("medorbits:animations-ready")
    );
    return api;
  }
  const api = {
    init,
    refresh,
    configure,
    getSettings,
    revealElement,
    animateCounter,
    initRevealAnimations,
    initCounters,
    initParallax,
    initHoverEffects
  };
  window.MedOrbitsAnimations = api;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), {
      once: true
    });
  } else {
    init();
  }
})(window, document);