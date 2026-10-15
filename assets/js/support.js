/* =========================================================
   MedOrbits -- Support Center
   File: /assets/js/support.js
========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};
  const API_BASE = String(
    CONFIG.API_BASE_URL || CONFIG.apiBaseUrl || "/api"
  ).replace(/\/+$/, "");

  const ENDPOINTS = {
    tickets: "/support/tickets",
    ticket: "/support/tickets/",
    categories: "/support/categories",
    replies: "/support/tickets/"
  };

  const EVENTS = {
    LOADED: "medorbits:support:loaded",
    TICKET_CREATED: "medorbits:support:ticket-created",
    TICKET_UPDATED: "medorbits:support:ticket-updated",
    REPLY_SENT: "medorbits:support:reply-sent",
    ERROR: "medorbits:support:error"
  };

  const state = {
    tickets: [],
    categories: [],
    currentTicket: null,
    loading: false
  };

  function emit(name, detail) {
    document.dispatchEvent(
      new CustomEvent(name, { detail: detail || {} })
    );
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

  function getToken() {
    const auth = window.MedOrbitsAuth;

    if (!auth) return "";

    try {
      if (typeof auth.getToken === "function") {
        return auth.getToken() || "";
      }

      if (typeof auth.getAccessToken === "function") {
        return auth.getAccessToken() || "";
      }
    } catch (_) {
      return "";
    }

    return "";
  }

  async function request(path, options) {
    options = options || {};

    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = getToken();

    if (token) {
      headers.set("Authorization", "Bearer " + token);
    }

    const response = await fetch(API_BASE + path, {
      method: options.method || "GET",
      headers: headers,
      credentials: "same-origin",
      cache: "no-store",
      body: options.body === undefined
        ? undefined
        : JSON.stringify(options.body)
    });

    const contentType = response.headers.get("content-type") || "";
    let result = null;

    if (contentType.includes("application/json")) {
      result = await response.json().catch(function () {
        return null;
      });
    } else {
      const text = await response.text().catch(function () {
        return "";
      });

      result = text ? { message: text } : null;
    }

    if (!response.ok) {
      const error = new Error(
        result && result.message
          ? result.message
          : "Support request failed (" + response.status + ")."
      );

      error.status = response.status;
      error.data = result;

      emit(EVENTS.ERROR, {
        message: error.message,
        status: response.status
      });

      if (
        window.MedOrbitsErrorHandler &&
        typeof window.MedOrbitsErrorHandler.notify === "function"
      ) {
        try {
          window.MedOrbitsErrorHandler.notify(error, {
            module: "support",
            endpoint: path
          });
        } catch (_) {}
      }

      throw error;
    }

    return result;
  }

  function unwrap(data) {
    if (!data || typeof data !== "object") return data;
    return data.data !== undefined ? data.data : data;
  }

  function normalizeTickets(data) {
    const payload = unwrap(data);

    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.tickets)) return payload.tickets;
    if (payload && Array.isArray(payload.items)) return payload.items;

    return [];
  }

  function normalizeCategories(data) {
    const payload = unwrap(data);

    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.categories)) return payload.categories;

    return [];
  }

  function formatDate(value) {
    if (!value) return "--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "--";

    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function statusClass(status) {
    const value = String(status || "open").toLowerCase();

    if (["resolved", "closed", "completed"].includes(value)) {
      return "is-resolved";
    }

    if (["pending", "waiting", "on-hold"].includes(value)) {
      return "is-pending";
    }

    if (["in-progress", "in progress", "processing"].includes(value)) {
      return "is-in-progress";
    }

    return "is-open";
  }

  function renderCategories() {
    document.querySelectorAll("[data-support-category]").forEach(function (select) {
      const currentValue = select.value;

      select.innerHTML = [
        '<option value="">Select a category</option>',
        state.categories.map(function (category) {
          const value = typeof category === "string"
            ? category
            : category.id || category.slug || category.name || "";

          const label = typeof category === "string"
            ? category
            : category.name || category.label || value;

          return '<option value="' + escapeHTML(value) + '">' +
            escapeHTML(label) +
            '</option>';
        }).join("")
      ].join("");

      if (currentValue) select.value = currentValue;
    });
  }

  function renderTickets() {
    document.querySelectorAll("[data-support-tickets]").forEach(function (container) {
      if (!state.tickets.length) {
        container.innerHTML =
          '<p class="support-empty">You have no support tickets yet.</p>';
        return;
      }

      container.innerHTML = state.tickets.map(function (ticket) {
        const id = ticket.id || ticket.ticketId || ticket.ticket_id || "";
        const subject = ticket.subject || ticket.title || "Support request";
        const status = ticket.status || "open";
        const priority = ticket.priority || "normal";
        const createdAt = ticket.createdAt || ticket.created_at || ticket.createdOn;

        return [
          '<article class="support-ticket" data-ticket-id="' + escapeHTML(id) + '">',
          '<div class="support-ticket__header">',
          '<h3>' + escapeHTML(subject) + '</h3>',
          '<span class="support-ticket__status ' + statusClass(status) + '">',
          escapeHTML(status),
          '</span>',
          '</div>',
          '<p class="support-ticket__id">Ticket #' + escapeHTML(id) + '</p>',
          '<p class="support-ticket__priority">Priority: ' + escapeHTML(priority) + '</p>',
          '<p class="support-ticket__date">Created: ' + escapeHTML(formatDate(createdAt)) + '</p>',
          '<button type="button" data-support-open-ticket="' + escapeHTML(id) + '">',
          'View ticket',
          '</button>',
          '</article>'
        ].join("");
      }).join("");
    });
  }

  function renderTicketDetails() {
    document.querySelectorAll("[data-support-ticket-details]").forEach(function (container) {
      const ticket = state.currentTicket;

      if (!ticket) {
        container.innerHTML =
          '<p class="support-empty">Select a ticket to view its details.</p>';
        return;
      }

      const id = ticket.id || ticket.ticketId || ticket.ticket_id || "";
      const subject = ticket.subject || ticket.title || "Support request";
      const status = ticket.status || "open";
      const description = ticket.description || ticket.message || "";
      const replies = Array.isArray(ticket.replies)
        ? ticket.replies
        : Array.isArray(ticket.messages)
          ? ticket.messages
          : [];

      container.innerHTML = [
        '<article class="support-ticket-details">',
        '<header>',
        '<h2>' + escapeHTML(subject) + '</h2>',
        '<p>Ticket #' + escapeHTML(id) + '</p>',
        '<span class="support-ticket__status ' + statusClass(status) + '">',
        escapeHTML(status),
        '</span>',
        '</header>',
        '<div class="support-ticket-details__description">',
        escapeHTML(description).replace(/\n/g, "<br>"),
        '</div>',
        '<h3>Conversation</h3>',
        replies.length
          ? '<div class="support-replies">' + replies.map(function (reply) {
              const author = reply.authorName || reply.author_name ||
                reply.senderName || reply.sender_name || reply.author || "Support";
              const message = reply.message || reply.body || reply.content || "";
              const createdAt = reply.createdAt || reply.created_at || reply.date;

              return [
                '<article class="support-reply">',
                '<p class="support-reply__author">' + escapeHTML(author) + '</p>',
                '<p class="support-reply__message">' +
                  escapeHTML(message).replace(/\n/g, "<br>") +
                '</p>',
                '<time>' + escapeHTML(formatDate(createdAt)) + '</time>',
                '</article>'
              ].join("");
            }).join("") + '</div>'
          : '<p class="support-empty">No replies yet.</p>',
        '</article>'
      ].join("");

      document.querySelectorAll("[data-support-reply-form]").forEach(function (form) {
        form.dataset.ticketId = String(id);
        form.hidden = ["resolved", "closed", "completed"].includes(
          String(status).toLowerCase()
        );
      });
    });
  }

  async function loadCategories() {
    try {
      const data = await request(ENDPOINTS.categories);
      state.categories = normalizeCategories(data);
      renderCategories();
      return state.categories.slice();
    } catch (error) {
      // Categories may be configured locally when the endpoint is unavailable.
      const fallback = document.querySelector("[data-support-category]");

      if (fallback && fallback.options.length > 1) {
        state.categories = Array.from(fallback.options)
          .slice(1)
          .map(function (option) {
            return {
              id: option.value,
              name: option.textContent
            };
          });
      }

      throw error;
    }
  }

  async function loadTickets(options) {
    options = options || {};

    const params = new URLSearchParams();

    if (options.status) params.set("status", options.status);
    if (options.page) params.set("page", String(options.page));
    if (options.limit) params.set("limit", String(options.limit));

    const query = params.toString();
    const data = await request(
      ENDPOINTS.tickets + (query ? "?" + query : "")
    );

    state.tickets = normalizeTickets(data);
    renderTickets();

    emit(EVENTS.LOADED, {
      tickets: state.tickets.slice()
    });

    return state.tickets.slice();
  }

  async function createTicket(payload) {
    if (!payload || typeof payload !== "object") {
      throw new TypeError("Ticket details are required.");
    }

    const subject = String(payload.subject || "").trim();
    const description = String(payload.description || payload.message || "").trim();

    if (!subject) {
      throw new Error("Please enter a ticket subject.");
    }

    if (!description) {
      throw new Error("Please describe your issue.");
    }

    if (subject.length > 200) {
      throw new Error("Subject must be 200 characters or fewer.");
    }

    if (description.length > 10000) {
      throw new Error("Description must be 10,000 characters or fewer.");
    }

    const body = {
      subject: subject,
      description: description,
      category: String(payload.category || "").trim(),
      priority: ["low", "normal", "high", "urgent"].includes(
        String(payload.priority || "normal").toLowerCase()
      )
        ? String(payload.priority || "normal").toLowerCase()
        : "normal"
    };

    const data = await request(ENDPOINTS.tickets, {
      method: "POST",
      body: body
    });

    const ticket = unwrap(data);

    emit(EVENTS.TICKET_CREATED, { ticket: ticket });

    await loadTickets().catch(function () {});

    return ticket;
  }

  async function getTicket(ticketId) {
    if (!ticketId) {
      throw new Error("Ticket ID is required.");
    }

    const safeId = encodeURIComponent(String(ticketId));
    const data = await request(ENDPOINTS.ticket + safeId);
    const ticket = unwrap(data);

    state.currentTicket = ticket && (ticket.ticket || ticket);
    renderTicketDetails();

    emit(EVENTS.LOADED, {
      type: "ticket",
      ticket: state.currentTicket
    });

    return state.currentTicket;
  }

  async function sendReply(ticketId, message) {
    if (!ticketId) {
      throw new Error("Ticket ID is required.");
    }

    const text = String(message || "").trim();

    if (!text) {
      throw new Error("Please enter a reply.");
    }

    if (text.length > 10000) {
      throw new Error("Reply must be 10,000 characters or fewer.");
    }

    const safeId = encodeURIComponent(String(ticketId));

    const data = await request(
      ENDPOINTS.replies + safeId + "/replies",
      {
        method: "POST",
        body: { message: text }
      }
    );

    const reply = unwrap(data);

    emit(EVENTS.REPLY_SENT, {
      ticketId: ticketId,
      reply: reply
    });

    await getTicket(ticketId);

    return reply;
  }

  async function closeTicket(ticketId) {
    if (!ticketId) {
      throw new Error("Ticket ID is required.");
    }

    const safeId = encodeURIComponent(String(ticketId));

    const data = await request(ENDPOINTS.ticket + safeId + "/close", {
      method: "POST",
      body: {}
    });

    emit(EVENTS.TICKET_UPDATED, {
      ticketId: ticketId,
      response: unwrap(data)
    });

    await Promise.allSettled([
      loadTickets(),
      getTicket(ticketId)
    ]);

    return unwrap(data);
  }

  function showMessage(message, isError) {
    document.querySelectorAll("[data-support-message]").forEach(function (element) {
      element.textContent = message || "";
      element.hidden = !message;
      element.setAttribute("role", isError ? "alert" : "status");
    });
  }

  function setLoading(form, loading) {
    if (!form) return;

    form.querySelectorAll(
      'button[type="submit"], input[type="submit"]'
    ).forEach(function (button) {
      button.disabled = Boolean(loading);
      button.setAttribute("aria-busy", String(Boolean(loading)));
    });
  }

  function handleError(error) {
    showMessage(
      error && error.message
        ? error.message
        : "Unable to complete your support request.",
      true
    );
  }

  function bindEvents() {
    document.querySelectorAll("[data-support-create-form]").forEach(function (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const payload = {
          subject: formData.get("subject"),
          description: formData.get("description") || formData.get("message"),
          category: formData.get("category"),
          priority: formData.get("priority")
        };

        setLoading(form, true);
        showMessage("", false);

        try {
          const ticket = await createTicket(payload);

          form.reset();

          showMessage(
            "Your support ticket has been submitted." +
              (ticket && (ticket.id || ticket.ticketId)
                ? " Ticket ID: " + (ticket.id || ticket.ticketId)
                : ""),
            false
          );
        } catch (error) {
          handleError(error);
        } finally {
          setLoading(form, false);
        }
      });
    });

    document.querySelectorAll("[data-support-reply-form]").forEach(function (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const message = formData.get("message") || formData.get("reply");
        const ticketId = form.dataset.ticketId;

        setLoading(form, true);
        showMessage("", false);

        try {
          await sendReply(ticketId, message);
          form.reset();
          showMessage("Your reply has been sent.", false);
        } catch (error) {
          handleError(error);
        } finally {
          setLoading(form, false);
        }
      });
    });

    document.addEventListener("click", async function (event) {
      const openButton = event.target.closest("[data-support-open-ticket]");
      const closeButton = event.target.closest("[data-support-close-ticket]");

      if (openButton) {
        const ticketId = openButton.dataset.supportOpenTicket;

        showMessage("", false);

        try {
          await getTicket(ticketId);
        } catch (error) {
          handleError(error);
        }

        return;
      }

      if (closeButton) {
        const ticketId = closeButton.dataset.supportCloseTicket;

        if (!window.confirm("Close this support ticket?")) return;

        try {
          await closeTicket(ticketId);
          showMessage("The support ticket has been closed.", false);
        } catch (error) {
          handleError(error);
        }
      }
    });
  }

  async function refresh() {
    state.loading = true;

    try {
      const results = await Promise.allSettled([
        loadTickets(),
        loadCategories()
      ]);

      const failed = results.find(function (result) {
        return result.status === "rejected";
      });

      if (failed) {
        throw failed.reason;
      }

      return getState();
    } finally {
      state.loading = false;
    }
  }

  function getState() {
    return {
      tickets: state.tickets.slice(),
      categories: state.categories.slice(),
      currentTicket: state.currentTicket,
      loading: state.loading
    };
  }

  function init() {
    const supportUI = document.querySelector(
      "[data-support-create-form], [data-support-tickets], " +
      "[data-support-ticket-details], [data-support-category]"
    );

    if (!supportUI) return;

    bindEvents();

    refresh().catch(handleError);
  }

  const api = Object.freeze({
    loadTickets: loadTickets,
    loadCategories: loadCategories,
    createTicket: createTicket,
    getTicket: getTicket,
    sendReply: sendReply,
    closeTicket: closeTicket,
    refresh: refresh,
    getState: getState,
    events: Object.freeze(EVENTS)
  });

  window.MedOrbitsSupport = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Support = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})(window, document);