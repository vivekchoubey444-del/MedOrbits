/* =========================================================
   MedOrbits -- Toast Notification System
   File: /assets/js/toast.js
========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};

  const DEFAULTS = Object.freeze({
    duration: 4000,
    position: CONFIG.TOAST_POSITION || "top-right",
    maxVisible: 5,
    closeButton: true,
    pauseOnHover: true
  });

  const TYPES = Object.freeze([
    "success",
    "error",
    "warning",
    "info",
    "loading"
  ]);

  const ICONS = Object.freeze({
    success: "✓",
    error: "✕",
    warning: "!",
    info: "i",
    loading: "…"
  });

  const EVENTS = Object.freeze({
    SHOW: "medorbits:toast:show",
    HIDE: "medorbits:toast:hide",
    CLEAR: "medorbits:toast:clear"
  });

  const activeToasts = new Map();
  const containers = new Map();

  let toastCounter = 0;

  function emit(name, detail) {
    try {
      document.dispatchEvent(
        new CustomEvent(name, {
          detail: detail || {}
        })
      );
    } catch (_) {
      // Notifications should not interrupt application behavior.
    }
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function normalizeType(type) {
    const value = String(type || "info").toLowerCase();
    return TYPES.includes(value) ? value : "info";
  }

  function normalizeOptions(message, options) {
    if (message && typeof message === "object" && !Array.isArray(message)) {
      options = message;
      message = options.message || options.title || "";
    }

    options = options || {};

    return {
      message: String(message == null ? "" : message),
      title: options.title ? String(options.title) : "",
      type: normalizeType(options.type),
      duration: options.duration === undefined
        ? DEFAULTS.duration
        : Math.max(0, Number(options.duration) || 0),
      position: options.position || DEFAULTS.position,
      closeButton: options.closeButton === undefined
        ? DEFAULTS.closeButton
        : Boolean(options.closeButton),
      pauseOnHover: options.pauseOnHover === undefined
        ? DEFAULTS.pauseOnHover
        : Boolean(options.pauseOnHover),
      dismissible: options.dismissible !== false,
      id: options.id ? String(options.id) : "",
      onClick: typeof options.onClick === "function" ? options.onClick : null,
      onClose: typeof options.onClose === "function" ? options.onClose : null,
      actionLabel: options.actionLabel ? String(options.actionLabel) : "",
      onAction: typeof options.onAction === "function" ? options.onAction : null
    };
  }

  function ensureStyles() {
    if (document.getElementById("medorbits-toast-styles")) return;

    const style = document.createElement("style");
    style.id = "medorbits-toast-styles";

    style.textContent = `
      .mo-toast-container {
        position: fixed;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(390px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        overflow: hidden;
        pointer-events: none;
        padding: 4px;
        box-sizing: border-box;
      }

      .mo-toast-container[data-position="top-right"] {
        top: 12px;
        right: 12px;
      }

      .mo-toast-container[data-position="top-left"] {
        top: 12px;
        left: 12px;
      }

      .mo-toast-container[data-position="bottom-right"] {
        right: 12px;
        bottom: 12px;
      }

      .mo-toast-container[data-position="bottom-left"] {
        left: 12px;
        bottom: 12px;
      }

      .mo-toast-container[data-position="top-center"] {
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
      }

      .mo-toast-container[data-position="bottom-center"] {
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
      }

      .mo-toast {
        --mo-toast-accent: #8b6a36;
        position: relative;
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: start;
        padding: 15px;
        color: #f5efe6;
        background: #211b24;
        border: 1px solid rgba(207, 176, 121, .24);
        border-left: 3px solid var(--mo-toast-accent);
        border-radius: 12px;
        box-shadow: 0 12px 35px rgba(0, 0, 0, .25);
        font-family: inherit;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity .22s ease, transform .22s ease;
        overflow-wrap: anywhere;
        box-sizing: border-box;
      }

      .mo-toast.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .mo-toast.is-leaving {
        opacity: 0;
        transform: translateY(-8px);
      }

      .mo-toast--success { --mo-toast-accent: #35b887; }
      .mo-toast--error { --mo-toast-accent: #e16b72; }
      .mo-toast--warning { --mo-toast-accent: #e6b45f; }
      .mo-toast--info { --mo-toast-accent: #77a9e8; }
      .mo-toast--loading { --mo-toast-accent: #b79add; }

      .mo-toast__icon {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        color: var(--mo-toast-accent);
        background: color-mix(in srgb, var(--mo-toast-accent) 15%, transparent);
        font-weight: 700;
        font-size: 16px;
      }

      .mo-toast__content {
        min-width: 0;
      }

      .mo-toast__title {
        margin: 0 0 4px;
        color: #f7e7c6;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.4;
      }

      .mo-toast__message {
        margin: 0;
        color: #ded5df;
        font-size: 13px;
        line-height: 1.55;
        white-space: pre-wrap;
      }

      .mo-toast__close {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        padding: 0;
        color: #d6cbd8;
        background: transparent;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        font-size: 19px;
      }

      .mo-toast__close:hover {
        background: rgba(255, 255, 255, .09);
      }

      .mo-toast__action {
        grid-column: 2 / 4;
        justify-self: start;
        margin-top: 3px;
        padding: 7px 11px;
        color: #f7e7c6;
        background: rgba(207, 176, 121, .12);
        border: 1px solid rgba(207, 176, 121, .3);
        border-radius: 7px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
      }

      .mo-toast__progress {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 2px;
        background: var(--mo-toast-accent);
        transform-origin: left;
        animation: mo-toast-progress linear forwards;
        opacity: .75;
      }

      .mo-toast--loading .mo-toast__icon {
        animation: mo-toast-spin 1.2s linear infinite;
      }

      @keyframes mo-toast-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }

      @keyframes mo-toast-spin {
        to { transform: rotate(360deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .mo-toast,
        .mo-toast__icon {
          transition: none;
          animation: none;
        }
      }

      @media (max-width: 480px) {
        .mo-toast-container {
          width: calc(100vw - 20px);
        }

        .mo-toast-container[data-position="top-right"],
        .mo-toast-container[data-position="top-left"] {
          top: 8px;
          right: 10px;
          left: 10px;
        }

        .mo-toast-container[data-position="bottom-right"],
        .mo-toast-container[data-position="bottom-left"] {
          right: 10px;
          bottom: 8px;
          left: 10px;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function normalizePosition(position) {
    const allowed = [
      "top-right",
      "top-left",
      "top-center",
      "bottom-right",
      "bottom-left",
      "bottom-center"
    ];

    return allowed.includes(position) ? position : DEFAULTS.position;
  }

  function getContainer(position) {
    position = normalizePosition(position);

    if (containers.has(position)) {
      const existing = containers.get(position);

      if (existing.isConnected) return existing;
    }

    ensureStyles();

    const container = document.createElement("div");
    container.className = "mo-toast-container";
    container.dataset.position = position;
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-relevant", "additions text");
    container.setAttribute("aria-atomic", "false");
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "Notifications");

    (document.body || document.documentElement).appendChild(container);
    containers.set(position, container);

    return container;
  }

  function clearTimer(toast) {
    if (toast.timer) {
      window.clearTimeout(toast.timer);
      toast.timer = null;
    }
  }

  function removeToast(id, reason) {
    const toast = activeToasts.get(id);

    if (!toast || toast.removing) return false;

    toast.removing = true;
    clearTimer(toast);

    if (toast.element) {
      toast.element.classList.remove("is-visible");
      toast.element.classList.add("is-leaving");

      const element = toast.element;

      const finish = function () {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }

        activeToasts.delete(id);

        emit(EVENTS.HIDE, {
          id: id,
          type: toast.options.type,
          reason: reason || "dismissed"
        });

        if (toast.options.onClose) {
          try {
            toast.options.onClose(reason || "dismissed");
          } catch (error) {
            window.setTimeout(function () {
              throw error;
            }, 0);
          }
        }
      };

      element.addEventListener("transitionend", finish, { once: true });
      window.setTimeout(finish, 350);
    } else {
      activeToasts.delete(id);
    }

    return true;
  }

  function startTimer(toast, duration) {
    clearTimer(toast);

    if (!duration || duration <= 0 || toast.paused) return;

    toast.remaining = duration;
    toast.startedAt = Date.now();

    toast.timer = window.setTimeout(function () {
      removeToast(toast.id, "timeout");
    }, duration);

    const progress = toast.element.querySelector(".mo-toast__progress");

    if (progress) {
      progress.style.animationDuration = duration + "ms";
      progress.style.animationPlayState = "running";
    }
  }

  function pauseTimer(toast) {
    if (!toast.options.pauseOnHover || !toast.timer || toast.paused) return;

    toast.remaining = Math.max(
      0,
      toast.remaining - (Date.now() - toast.startedAt)
    );

    clearTimer(toast);
    toast.paused = true;

    const progress = toast.element.querySelector(".mo-toast__progress");

    if (progress) {
      progress.style.animationPlayState = "paused";
    }
  }

  function resumeTimer(toast) {
    if (!toast.paused) return;

    toast.paused = false;

    if (toast.remaining > 0) {
      startTimer(toast, toast.remaining);
    } else {
      removeToast(toast.id, "timeout");
    }
  }

  function createToast(message, options) {
    const toastOptions = normalizeOptions(message, options);

    if (!toastOptions.message && !toastOptions.title) {
      return null;
    }

    if (toastOptions.id && activeToasts.has(toastOptions.id)) {
      const existing = activeToasts.get(toastOptions.id);

      existing.options.message = toastOptions.message;
      existing.options.title = toastOptions.title;

      const content = existing.element.querySelector(".mo-toast__content");

      if (content) {
        content.replaceChildren();

        if (toastOptions.title) {
          const title = document.createElement("p");
          title.className = "mo-toast__title";
          title.textContent = toastOptions.title;
          content.appendChild(title);
        }

        const body = document.createElement("p");
        body.className = "mo-toast__message";
        body.textContent = toastOptions.message;
        content.appendChild(body);
      }

      return toastOptions.id;
    }

    const id = toastOptions.id || "mo-toast-" + (++toastCounter);
    const container = getContainer(toastOptions.position);

    const maxVisible = Math.max(1, Number(DEFAULTS.maxVisible) || 5);

    while (container.children.length >= maxVisible) {
      const first = container.firstElementChild;

      if (!first) break;

      const firstId = first.dataset.toastId;

      if (firstId) {
        removeToast(firstId, "limit");
      } else {
        first.remove();
      }
    }

    const element = document.createElement("div");
    element.className = "mo-toast mo-toast--" + toastOptions.type;
    element.dataset.toastId = id;
    element.setAttribute("role", toastOptions.type === "error" ? "alert" : "status");
    element.setAttribute("aria-atomic", "true");

    const icon = document.createElement("span");
    icon.className = "mo-toast__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = ICONS[toastOptions.type];

    const content = document.createElement("div");
    content.className = "mo-toast__content";

    if (toastOptions.title) {
      const title = document.createElement("p");
      title.className = "mo-toast__title";
      title.textContent = toastOptions.title;
      content.appendChild(title);
    }

    const body = document.createElement("p");
    body.className = "mo-toast__message";
    body.textContent = toastOptions.message;
    content.appendChild(body);

    element.appendChild(icon);
    element.appendChild(content);

    if (toastOptions.closeButton && toastOptions.dismissible) {
      const close = document.createElement("button");
      close.type = "button";
      close.className = "mo-toast__close";
      close.setAttribute("aria-label", "Dismiss notification");
      close.textContent = "×";

      close.addEventListener("click", function () {
        removeToast(id, "dismissed");
      });

      element.appendChild(close);
    } else {
      const spacer = document.createElement("span");
      spacer.setAttribute("aria-hidden", "true");
      element.appendChild(spacer);
    }

    if (toastOptions.actionLabel && toastOptions.onAction) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "mo-toast__action";
      action.textContent = toastOptions.actionLabel;

      action.addEventListener("click", function () {
        try {
          toastOptions.onAction();
        } finally {
          removeToast(id, "action");
        }
      });

      element.appendChild(action);
    }

    if (toastOptions.duration > 0 && toastOptions.type !== "loading") {
      const progress = document.createElement("span");
      progress.className = "mo-toast__progress";
      progress.setAttribute("aria-hidden", "true");
      progress.style.animationDuration = toastOptions.duration + "ms";
      element.appendChild(progress);
    }

    if (toastOptions.onClick) {
      element.addEventListener("click", function (event) {
        if (event.target.closest("button")) return;
        toastOptions.onClick();
      });
    }

    const toast = {
      id: id,
      element: element,
      options: toastOptions,
      timer: null,
      startedAt: 0,
      remaining: toastOptions.duration,
      paused: false,
      removing: false
    };

    if (toastOptions.pauseOnHover) {
      element.addEventListener("mouseenter", function () {
        pauseTimer(toast);
      });

      element.addEventListener("mouseleave", function () {
        resumeTimer(toast);
      });

      element.addEventListener("focusin", function () {
        pauseTimer(toast);
      });

      element.addEventListener("focusout", function (event) {
        if (!element.contains(event.relatedTarget)) {
          resumeTimer(toast);
        }
      });
    }

    activeToasts.set(id, toast);
    container.appendChild(element);

    window.requestAnimationFrame(function () {
      element.classList.add("is-visible");
    });

    if (toastOptions.duration > 0 && toastOptions.type !== "loading") {
      startTimer(toast, toastOptions.duration);
    }

    emit(EVENTS.SHOW, {
      id: id,
      type: toastOptions.type,
      message: toastOptions.message
    });

    return id;
  }

  function show(message, options) {
    return createToast(message, options);
  }

  function success(message, options) {
    options = Object.assign({}, options || {}, { type: "success" });
    return show(message, options);
  }

  function error(message, options) {
    options = Object.assign({}, options || {}, { type: "error" });
    return show(message, options);
  }

  function warning(message, options) {
    options = Object.assign({}, options || {}, { type: "warning" });
    return show(message, options);
  }

  function info(message, options) {
    options = Object.assign({}, options || {}, { type: "info" });
    return show(message, options);
  }

  function loading(message, options) {
    options = Object.assign({}, options || {}, {
      type: "loading",
      duration: 0,
      closeButton: false
    });

    return show(message || "Please wait…", options);
  }

  function update(id, message, options) {
    const toast = activeToasts.get(id);

    if (!toast) {
      return show(message, options);
    }

    options = options || {};
    toast.options.message = String(message == null ? "" : message);

    if (options.type) {
      const type = normalizeType(options.type);

      toast.element.classList.remove(
        ...TYPES.map(function (item) {
          return "mo-toast--" + item;
        })
      );

      toast.element.classList.add("mo-toast--" + type);
      toast.element.querySelector(".mo-toast__icon").textContent = ICONS[type];
      toast.options.type = type;
    }

    const body = toast.element.querySelector(".mo-toast__message");

    if (body) {
      body.textContent = toast.options.message;
    }

    if (options.title !== undefined) {
      toast.options.title = String(options.title || "");
    }

    if (options.duration !== undefined) {
      toast.options.duration = Math.max(0, Number(options.duration) || 0);
      toast.remaining = toast.options.duration;

      if (toast.options.duration > 0) {
        startTimer(toast, toast.options.duration);
      } else {
        clearTimer(toast);
      }
    }

    return id;
  }

  function dismiss(id) {
    return removeToast(id, "dismissed");
  }

  function dismissAll() {
    Array.from(activeToasts.keys()).forEach(function (id) {
      removeToast(id, "clear");
    });

    emit(EVENTS.CLEAR, {});
  }

  function promise(promiseOrFunction, messages, options) {
    messages = messages || {};
    options = options || {};

    const loadingId = loading(
      messages.loading || "Please wait…",
      Object.assign({}, options, { id: options.id || "" })
    );

    let task;

    try {
      task = typeof promiseOrFunction === "function"
        ? promiseOrFunction()
        : promiseOrFunction;
    } catch (error) {
      dismiss(loadingId);
      this.error(messages.error || error.message || "Something went wrong.", options);
      return Promise.reject(error);
    }

    return Promise.resolve(task).then(
      function (result) {
        dismiss(loadingId);

        if (messages.success) {
          success(messages.success, options);
        }

        return result;
      },
      function (error) {
        dismiss(loadingId);

        const message = messages.error ||
          (error && error.message) ||
          "Something went wrong. Please try again.";

        show(message, Object.assign({}, options, { type: "error" }));

        throw error;
      }
    );
  }

  function bindDataAttributes() {
    document.addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-toast-message]");

      if (!trigger) return;

      const message = trigger.getAttribute("data-toast-message");
      const type = trigger.getAttribute("data-toast-type") || "info";

      show(message, {
        type: type,
        title: trigger.getAttribute("data-toast-title") || "",
        duration: Number(trigger.getAttribute("data-toast-duration")) || DEFAULTS.duration
      });
    });
  }

  const api = Object.freeze({
    show: show,
    success: success,
    error: error,
    warning: warning,
    info: info,
    loading: loading,
    update: update,
    dismiss: dismiss,
    dismissAll: dismissAll,
    promise: promise,
    getActive: function () {
      return Array.from(activeToasts.keys());
    },
    events: EVENTS
  });

  window.MedOrbitsToast = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Toast = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindDataAttributes, { once: true });
  } else {
    bindDataAttributes();
  }

})(window, document);