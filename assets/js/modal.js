/* =========================================================
   MedOrbits -- Modal Manager
   File: /assets/js/modal.js
   Purpose: Accessible modals, dialogs, confirmations, focus
   ========================================================= */

(function (window, document) {
  "use strict";

  const state = {
    stack: [],
    initialized: false,
    previousBodyOverflow: "",
    generatedId: 0
  };

  const FOCUSABLE_SELECTOR = [
    "a[href]",
    "area[href]",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
    "iframe",
    "object",
    "embed",
    "[contenteditable='true']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

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
        new CustomEvent("medorbits:modal:" + name, {
          detail: detail || {}
        })
      );
    },

    notify(message, type) {
      if (window.MedOrbitsErrorHandler?.notify) {
        window.MedOrbitsErrorHandler.notify(message, type || "info");
      }
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

    getFocusable(modal) {
      if (!modal) return [];

      return Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((element) => {
          return (
            !element.hidden &&
            element.getAttribute("aria-hidden") !== "true" &&
            element.getClientRects().length > 0
          );
        });
    },

    createId(prefix) {
      state.generatedId += 1;

      return (
        (prefix || "mo-modal") +
        "-" +
        Date.now().toString(36) +
        "-" +
        state.generatedId
      );
    }
  };

  function getModal(target) {
    const element = utils.getElement(target);

    if (!element) return null;

    if (element.matches("[data-modal], .modal, [role='dialog']")) {
      return element;
    }

    return element.closest("[data-modal], .modal, [role='dialog']");
  }

  function getEntry(modal) {
    return state.stack.find((entry) => entry.modal === modal) || null;
  }

  function getTopEntry() {
    return state.stack.length
      ? state.stack[state.stack.length - 1]
      : null;
  }

  function isOpen(target) {
    const modal = getModal(target);

    return Boolean(modal && getEntry(modal));
  }

  function setBackgroundInert(enabled, modal) {
    const bodyChildren = Array.from(document.body.children);

    bodyChildren.forEach((element) => {
      if (
        element === modal ||
        element.contains(modal) ||
        element.tagName === "SCRIPT" ||
        element.tagName === "STYLE"
      ) {
        return;
      }

      if (enabled) {
        if (!element.hasAttribute("data-mo-modal-inert")) {
          element.dataset.moModalInert = element.inert ? "true" : "false";
        }

        element.inert = true;
        element.setAttribute("aria-hidden", "true");
      } else if (element.hasAttribute("data-mo-modal-inert")) {
        element.inert = element.dataset.moModalInert === "true";

        if (element.dataset.moModalInert === "false") {
          element.removeAttribute("aria-hidden");
        }

        delete element.dataset.moModalInert;
      }
    });
  }

  function prepareModal(modal, options) {
    const settings = options || {};

    if (!modal.id) {
      modal.id = utils.createId();
    }

    modal.setAttribute("role", modal.getAttribute("role") || "dialog");
    modal.setAttribute("aria-modal", "true");

    if (settings.label) {
      modal.setAttribute("aria-label", settings.label);
    } else if (!modal.hasAttribute("aria-label") &&
               !modal.hasAttribute("aria-labelledby")) {
      const heading = modal.querySelector(
        "[data-modal-title], .modal-title, h1, h2, h3"
      );

      if (heading) {
        if (!heading.id) {
          heading.id = utils.createId("mo-modal-title");
        }

        modal.setAttribute("aria-labelledby", heading.id);
      } else {
        modal.setAttribute("aria-label", "Dialog");
      }
    }

    if (!modal.hasAttribute("tabindex")) {
      modal.setAttribute("tabindex", "-1");
    }

    if (settings.size) {
      modal.dataset.modalSize = settings.size;
    }

    modal.dataset.modalOpen = "true";
    modal.hidden = false;
    modal.removeAttribute("aria-hidden");
  }

  function open(target, options) {
    const modal = getModal(target);
    const settings = options || {};

    if (!modal) {
      throw new Error("Modal element was not found.");
    }

    const existing = getEntry(modal);

    if (existing) {
      focusModal(modal);
      return modal;
    }

    const previousActiveElement = document.activeElement;
    const firstOpen = state.stack.length === 0;

    if (firstOpen) {
      state.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    prepareModal(modal, settings);

    const entry = {
      modal,
      previousActiveElement,
      closeOnBackdrop:
        settings.closeOnBackdrop !== false &&
        modal.dataset.closeOnBackdrop !== "false",
      closeOnEscape:
        settings.closeOnEscape !== false &&
        modal.dataset.closeOnEscape !== "false",
      onClose: typeof settings.onClose === "function"
        ? settings.onClose
        : null,
      onOpen: typeof settings.onOpen === "function"
        ? settings.onOpen
        : null
    };

    state.stack.push(entry);

    if (firstOpen) {
      setBackgroundInert(true, modal);
    }

    modal.classList.add("is-open", "modal-open");
    modal.dispatchEvent(new CustomEvent("modal:open", {
      bubbles: true,
      detail: { modal, options: settings }
    }));

    utils.dispatch("opened", { modal, options: settings });

    window.requestAnimationFrame(() => focusModal(modal));

    if (entry.onOpen) {
      try {
        entry.onOpen(modal);
      } catch (error) {
        console.error("[MedOrbits Modal] onOpen error:", error);
      }
    }

    return modal;
  }

  function focusModal(modal) {
    if (!modal) return;

    const autofocus = modal.querySelector("[autofocus]");
    const focusable = utils.getFocusable(modal);
    const target = autofocus || focusable[0] || modal;

    try {
      target.focus({ preventScroll: true });
    } catch (_) {
      target.focus();
    }
  }

  function close(target, options) {
    const settings = options || {};
    const modal = getModal(target) || getTopEntry()?.modal;

    if (!modal) return false;

    const index = state.stack.findIndex((entry) => entry.modal === modal);

    if (index === -1) return false;

    const entry = state.stack[index];

    if (typeof settings.beforeClose === "function") {
      const allowed = settings.beforeClose(modal);

      if (allowed === false) return false;
    }

    state.stack.splice(index, 1);

    modal.classList.remove("is-open", "modal-open");
    modal.removeAttribute("data-modal-open");
    modal.setAttribute("aria-hidden", "true");
    modal.removeAttribute("aria-modal");
    modal.hidden = true;

    modal.dispatchEvent(new CustomEvent("modal:close", {
      bubbles: true,
      detail: { modal, options: settings }
    }));

    utils.dispatch("closed", { modal, options: settings });

    if (entry.onClose) {
      try {
        entry.onClose(modal);
      } catch (error) {
        console.error("[MedOrbits Modal] onClose error:", error);
      }
    }

    const topEntry = getTopEntry();

    if (topEntry) {
      focusModal(topEntry.modal);
    } else {
      document.body.style.overflow = state.previousBodyOverflow;
      setBackgroundInert(false, modal);

      if (
        entry.previousActiveElement &&
        entry.previousActiveElement.isConnected &&
        typeof entry.previousActiveElement.focus === "function"
      ) {
        try {
          entry.previousActiveElement.focus({ preventScroll: true });
        } catch (_) {
          entry.previousActiveElement.focus();
        }
      }
    }

    return true;
  }

  function closeAll(options) {
    const settings = options || {};

    while (state.stack.length) {
      const entry = getTopEntry();

      if (!entry || !close(entry.modal, settings)) break;
    }
  }

  function create(options) {
    const settings = options || {};
    const modal = document.createElement("div");

    modal.className = "mo-modal";
    modal.dataset.modal = "";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "mo-modal-dialog";
    content.setAttribute("role", "document");

    if (settings.size) {
      content.dataset.modalSize = settings.size;
    }

    const header = document.createElement("div");
    header.className = "mo-modal-header";

    const title = document.createElement("h2");
    title.className = "mo-modal-title";
    title.dataset.modalTitle = "";
    title.textContent = settings.title || "Dialog";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "mo-modal-close";
    closeButton.dataset.modalClose = "";
    closeButton.setAttribute("aria-label", "Close dialog");
    closeButton.innerHTML = "&times;";

    header.append(title, closeButton);

    const body = document.createElement("div");
    body.className = "mo-modal-body";

    if (settings.content instanceof Node) {
      body.appendChild(settings.content);
    } else {
      body.textContent = String(settings.content || "");
    }

    content.append(header, body);

    if (settings.footer instanceof Node) {
      const footer = document.createElement("div");
      footer.className = "mo-modal-footer";
      footer.appendChild(settings.footer);
      content.appendChild(footer);
    }

    modal.appendChild(content);
    document.body.appendChild(modal);

    if (settings.closeButton === false) {
      closeButton.hidden = true;
    }

    modal.addEventListener("modal:close", function () {
      if (settings.removeOnClose !== false) {
        modal.remove();
      }
    }, { once: true });

    if (settings.open !== false) {
      open(modal, settings);
    }

    return modal;
  }

  function alertDialog(message, options) {
    const settings = options || {};

    return new Promise((resolve) => {
      const footer = document.createElement("div");
      footer.className = "mo-modal-actions";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "mo-button mo-button-primary";
      button.textContent = settings.confirmText || "OK";

      footer.appendChild(button);

      const modal = create({
        title: settings.title || "Notice",
        content: String(message || ""),
        footer,
        closeOnBackdrop: false,
        closeOnEscape: settings.closeOnEscape !== false,
        removeOnClose: true
      });

      let settled = false;

      function finish() {
        if (settled) return;
        settled = true;
        close(modal);
        resolve(true);
      }

      button.addEventListener("click", finish);

      modal.addEventListener("modal:close", function () {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      button.focus();
    });
  }

  function confirmDialog(message, options) {
    const settings = options || {};

    return new Promise((resolve) => {
      const footer = document.createElement("div");
      footer.className = "mo-modal-actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "mo-button mo-button-secondary";
      cancelButton.textContent = settings.cancelText || "Cancel";

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className =
        "mo-button " +
        (settings.danger ? "mo-button-danger" : "mo-button-primary");
      confirmButton.textContent = settings.confirmText || "Confirm";

      footer.append(cancelButton, confirmButton);

      const modal = create({
        title: settings.title || "Confirm action",
        content: String(message || ""),
        footer,
        closeOnBackdrop: false,
        removeOnClose: true
      });

      let settled = false;

      function finish(result) {
        if (settled) return;
        settled = true;
        close(modal);
        resolve(result);
      }

      cancelButton.addEventListener("click", () => finish(false));
      confirmButton.addEventListener("click", () => finish(true));

      modal.addEventListener("modal:close", function () {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      confirmButton.focus();
    });
  }

  function promptDialog(message, options) {
    const settings = options || {};

    return new Promise((resolve) => {
      const wrapper = document.createElement("div");

      const description = document.createElement("p");
      description.textContent = String(message || "");

      const input = document.createElement(
        settings.multiline ? "textarea" : "input"
      );

      input.className = "mo-modal-input";
      input.name = "modal-prompt";
      input.value = settings.defaultValue || "";
      input.placeholder = settings.placeholder || "";

      if (settings.multiline) {
        input.rows = Number(settings.rows) || 4;
      } else {
        input.type = settings.inputType || "text";
      }

      wrapper.append(description, input);

      const footer = document.createElement("div");
      footer.className = "mo-modal-actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "mo-button mo-button-secondary";
      cancelButton.textContent = settings.cancelText || "Cancel";

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "mo-button mo-button-primary";
      confirmButton.textContent = settings.confirmText || "Submit";

      footer.append(cancelButton, confirmButton);

      const modal = create({
        title: settings.title || "Enter information",
        content: wrapper,
        footer,
        closeOnBackdrop: false,
        removeOnClose: true
      });

      let settled = false;

      function finish(value) {
        if (settled) return;

        if (value !== null && settings.required && !input.value.trim()) {
          input.setAttribute("aria-invalid", "true");
          input.focus();
          return;
        }

        settled = true;
        close(modal);
        resolve(value);
      }

      cancelButton.addEventListener("click", () => finish(null));
      confirmButton.addEventListener("click", () => finish(input.value));

      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !settings.multiline) {
          event.preventDefault();
          finish(input.value);
        }
      });

      modal.addEventListener("modal:close", function () {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      });

      input.focus();
    });
  }

  function bindTriggers() {
    document.addEventListener("click", function (event) {
      const opener = event.target.closest("[data-modal-open]");

      if (opener) {
        const selector = opener.dataset.modalOpen;

        if (selector) {
          event.preventDefault();

          const modal = getModal(selector) || utils.getElement(selector);

          if (modal) {
            open(modal, {
              closeOnBackdrop: modal.dataset.closeOnBackdrop !== "false",
              closeOnEscape: modal.dataset.closeOnEscape !== "false"
            });
          }

          return;
        }
      }

      const closer = event.target.closest("[data-modal-close]");

      if (closer) {
        const modal = getModal(closer) || getTopEntry()?.modal;

        if (modal) {
          event.preventDefault();
          close(modal);
        }
      }
    });

    document.addEventListener("click", function (event) {
      const topEntry = getTopEntry();

      if (!topEntry) return;

      if (
        event.target === topEntry.modal &&
        topEntry.closeOnBackdrop
      ) {
        close(topEntry.modal);
      }
    });
  }

  function bindKeyboard() {
    document.addEventListener("keydown", function (event) {
      const entry = getTopEntry();

      if (!entry) return;

      if (event.key === "Escape" && entry.closeOnEscape) {
        event.preventDefault();
        close(entry.modal);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = utils.getFocusable(entry.modal);

      if (!focusable.length) {
        event.preventDefault();
        entry.modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function init() {
    if (state.initialized) return api;

    bindTriggers();
    bindKeyboard();

    document.querySelectorAll("[data-modal], .modal, [role='dialog']").forEach((modal) => {
      if (!modal.hasAttribute("aria-hidden") && !modal.hidden) {
        modal.setAttribute("aria-hidden", "true");
        modal.hidden = true;
      }
    });

    state.initialized = true;

    utils.dispatch("initialized");

    return api;
  }

  function destroy() {
    closeAll();
    state.initialized = false;
  }

  const api = {
    init,
    destroy,
    open,
    close,
    closeAll,
    create,
    isOpen,
    focus: focusModal,

    alert: alertDialog,
    confirm: confirmDialog,
    prompt: promptDialog,

    getOpenModals() {
      return state.stack.map((entry) => entry.modal);
    },

    getTopModal() {
      return getTopEntry()?.modal || null;
    },

    constants: {
      FOCUSABLE_SELECTOR
    }
  };

  window.MedOrbitsModal = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Modal = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})(window, document);