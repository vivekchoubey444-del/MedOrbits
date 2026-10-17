/* =========================================================
   MedOrbits -- Messages Module
   File: /assets/js/messages.js
   Purpose: Messaging, conversations, attachments, unread counts
   ========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};
  const CONSTANTS = window.MedOrbitsConstants || {};
  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";

  const STORAGE_KEY = "medorbits_messages_cache";
  const DEFAULT_PAGE_SIZE = 20;
  const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

  const ALLOWED_ATTACHMENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  const state = {
    conversations: [],
    activeConversation: null,
    messages: [],
    unreadCount: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    loading: false,
    sending: false,
    pollingTimer: null,
    initialized: false
  };

  const listeners = new Map();

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

    formatDate(value) {
      if (!value) return "";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "";

      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    },

    formatTime(value) {
      if (!value) return "";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "";

      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
    },

    formatFileSize(bytes) {
      const size = Number(bytes) || 0;

      if (size < 1024) return size + " B";
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";

      return (size / (1024 * 1024)).toFixed(1) + " MB";
    },

    initials(name) {
      const words = String(name || "User")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
    },

    currentUserId() {
      const user =
        window.MedOrbitsAuth?.getUser?.() ||
        window.MedOrbitsUserModel?.getCurrentUser?.() ||
        window.MedOrbitsUser ||
        {};

      return String(user.id || user._id || user.userId || "");
    },

    dispatch(name, detail) {
      document.dispatchEvent(
        new CustomEvent("medorbits:messages:" + name, {
          detail: detail || {}
        })
      );
    },

    notify(message, type) {
      if (window.MedOrbitsErrorHandler?.notify) {
        window.MedOrbitsErrorHandler.notify(message, type || "info");
        return;
      }

      if (window.MedOrbitsApp?.notify) {
        window.MedOrbitsApp.notify(message, type || "info");
        return;
      }

      utils.dispatch("notification", {
        message,
        type: type || "info"
      });
    },

    getCache() {
      try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
      } catch (_) {
        return {};
      }
    },

    setCache(data) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_) {
        // Ignore storage errors.
      }
    },

    updateCache(key, value) {
      const cache = utils.getCache();
      cache[key] = value;
      utils.setCache(cache);
    },

    isValidId(id) {
      return typeof id === "string" || typeof id === "number";
    }
  };

  async function request(path, options) {
    const settings = options || {};
    const headers = new Headers(settings.headers || {});

    if (!(settings.body instanceof FormData) && settings.body != null) {
      headers.set("Content-Type", "application/json");
    }

    const token =
      window.MedOrbitsAuth?.getToken?.() ||
      window.MedOrbitsAuth?.getAccessToken?.();

    if (token) {
      headers.set("Authorization", "Bearer " + token);
    }

    const response = await fetch(API_BASE + path, {
      ...settings,
      headers,
      credentials: "same-origin"
    });

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else if (response.ok && settings.responseType === "blob") {
      data = await response.blob();
    } else {
      data = await response.text().catch(() => "");
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
        data?.error ||
        "Request failed (" + response.status + ")."
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }

  function normalizeConversation(item) {
    const conversation = item || {};

    return {
      id: String(
        conversation.id ||
        conversation._id ||
        conversation.conversationId ||
        ""
      ),
      subject: conversation.subject || conversation.title || "Conversation",
      participants: Array.isArray(conversation.participants)
        ? conversation.participants
        : [],
      lastMessage: conversation.lastMessage || conversation.last_message || null,
      unreadCount: Math.max(
        0,
        Number(
          conversation.unreadCount ??
          conversation.unread_count ??
          0
        )
      ),
      updatedAt:
        conversation.updatedAt ||
        conversation.updated_at ||
        conversation.lastMessageAt ||
        conversation.createdAt ||
        null,
      status: conversation.status || "active",
      metadata: conversation.metadata || {}
    };
  }

  function normalizeMessage(item) {
    const message = item || {};

    return {
      id: String(message.id || message._id || message.messageId || ""),
      conversationId: String(
        message.conversationId ||
        message.conversation_id ||
        message.threadId ||
        ""
      ),
      senderId: String(
        message.senderId ||
        message.sender_id ||
        message.sender?.id ||
        message.userId ||
        ""
      ),
      senderName:
        message.senderName ||
        message.sender?.name ||
        message.user?.name ||
        "User",
      body: String(message.body ?? message.content ?? message.text ?? ""),
      attachments: Array.isArray(message.attachments)
        ? message.attachments
        : [],
      createdAt: message.createdAt || message.created_at || message.timestamp || null,
      readAt: message.readAt || message.read_at || null,
      editedAt: message.editedAt || message.edited_at || null,
      deleted: Boolean(message.deleted || message.isDeleted),
      status: message.status || "sent"
    };
  }

  function normalizeList(response) {
    if (Array.isArray(response)) return response;

    return (
      response?.data?.items ||
      response?.data?.conversations ||
      response?.data?.messages ||
      response?.items ||
      response?.conversations ||
      response?.messages ||
      response?.data ||
      []
    );
  }

  function getConversation(id) {
    return state.conversations.find(
      (conversation) => conversation.id === String(id)
    ) || null;
  }

  function getMessage(id) {
    return state.messages.find(
      (message) => message.id === String(id)
    ) || null;
  }

  function emitUpdate() {
    utils.dispatch("updated", {
      conversations: state.conversations,
      activeConversation: state.activeConversation,
      messages: state.messages,
      unreadCount: state.unreadCount
    });
  }

  function updateUnreadCount() {
    state.unreadCount = state.conversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0
    );

    document.querySelectorAll("[data-message-unread-count]").forEach((element) => {
      element.textContent = String(state.unreadCount);
      element.hidden = state.unreadCount <= 0;
    });

    document.querySelectorAll("[data-message-unread-badge]").forEach((element) => {
      element.textContent = state.unreadCount > 99
        ? "99+"
        : String(state.unreadCount);

      element.hidden = state.unreadCount <= 0;
    });
  }

  async function loadConversations(options) {
    const settings = options || {};

    state.loading = true;
    utils.dispatch("loading", { loading: true });

    try {
      const query = new URLSearchParams();

      if (settings.search) query.set("search", settings.search);
      if (settings.status) query.set("status", settings.status);
      if (settings.page) query.set("page", String(settings.page));

      const suffix = query.toString();
      const response = await request(
        "/messages/conversations" + (suffix ? "?" + suffix : "")
      );

      state.conversations = normalizeList(response)
        .map(normalizeConversation)
        .filter((item) => item.id);

      state.conversations.sort((a, b) => {
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      });

      state.page = Number(settings.page) || 1;

      utils.updateCache("conversations", state.conversations);
      updateUnreadCount();
      renderConversations(settings.container);

      utils.dispatch("conversations-loaded", {
        conversations: state.conversations
      });

      return state.conversations;
    } catch (error) {
      utils.notify(error.message || "Unable to load messages.", "error");
      utils.dispatch("error", { error, action: "load-conversations" });
      throw error;
    } finally {
      state.loading = false;
      utils.dispatch("loading", { loading: false });
    }
  }

  async function loadMessages(conversationId, options) {
    if (!utils.isValidId(conversationId) || !String(conversationId).trim()) {
      throw new Error("A valid conversation ID is required.");
    }

    const settings = options || {};
    const id = String(conversationId);

    state.loading = true;
    state.activeConversation = getConversation(id);
    utils.dispatch("loading", { loading: true });

    try {
      const query = new URLSearchParams({
        page: String(Number(settings.page) || 1),
        limit: String(Number(settings.limit) || state.pageSize)
      });

      if (settings.before) query.set("before", settings.before);
      if (settings.after) query.set("after", settings.after);

      const response = await request(
        "/messages/conversations/" +
        encodeURIComponent(id) +
        "/messages?" +
        query.toString()
      );

      const messages = normalizeList(response)
        .map(normalizeMessage)
        .filter((message) => message.id);

      if (settings.append) {
        const knownIds = new Set(state.messages.map((message) => message.id));

        state.messages = [
          ...messages.filter((message) => !knownIds.has(message.id)),
          ...state.messages
        ];
      } else {
        state.messages = messages;
      }

      state.messages.sort((a, b) => {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });

      state.page = Number(settings.page) || 1;

      renderMessages(settings.container);
      emitUpdate();

      utils.dispatch("messages-loaded", {
        conversationId: id,
        messages: state.messages
      });

      if (settings.markRead !== false) {
        markConversationRead(id).catch(() => {});
      }

      return state.messages;
    } catch (error) {
      utils.notify(error.message || "Unable to load conversation.", "error");
      utils.dispatch("error", { error, action: "load-messages" });
      throw error;
    } finally {
      state.loading = false;
      utils.dispatch("loading", { loading: false });
    }
  }

  async function sendMessage(conversationId, body, options) {
    const id = String(conversationId || "");
    const text = String(body ?? "").trim();
    const settings = options || {};

    if (!id) throw new Error("A conversation is required.");

    if (!text && !(settings.attachments?.length)) {
      throw new Error("Enter a message or attach a file.");
    }

    if (text.length > 10000) {
      throw new Error("Messages cannot exceed 10,000 characters.");
    }

    if (state.sending) {
      throw new Error("A message is already being sent.");
    }

    state.sending = true;
    utils.dispatch("sending", { sending: true });

    try {
      const response = await request(
        "/messages/conversations/" + encodeURIComponent(id) + "/messages",
        {
          method: "POST",
          body: JSON.stringify({
            body: text,
            attachments: settings.attachments || [],
            replyTo: settings.replyTo || null
          })
        }
      );

      const rawMessage =
        response?.data?.message ||
        response?.message ||
        response?.data ||
        response;

      const message = normalizeMessage(rawMessage);

      if (message.id) {
        state.messages.push(message);

        state.messages.sort((a, b) => {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        });
      }

      const conversation = getConversation(id);

      if (conversation) {
        conversation.lastMessage = message;
        conversation.updatedAt = message.createdAt || new Date().toISOString();
      }

      renderMessages(settings.container);
      renderConversations(settings.conversationContainer);
      emitUpdate();

      utils.dispatch("message-sent", {
        conversationId: id,
        message
      });

      return message;
    } catch (error) {
      utils.notify(error.message || "Message could not be sent.", "error");
      utils.dispatch("error", { error, action: "send-message" });
      throw error;
    } finally {
      state.sending = false;
      utils.dispatch("sending", { sending: false });
    }
  }

  async function createConversation(payload) {
    const data = payload || {};
    const recipientIds = Array.isArray(data.recipientIds)
      ? data.recipientIds
      : data.recipientId
        ? [data.recipientId]
        : [];

    if (!recipientIds.length) {
      throw new Error("Select at least one recipient.");
    }

    const response = await request("/messages/conversations", {
      method: "POST",
      body: JSON.stringify({
        subject: String(data.subject || "").trim(),
        recipientIds,
        initialMessage: String(data.initialMessage || "").trim(),
        metadata: data.metadata || {}
      })
    });

    const rawConversation =
      response?.data?.conversation ||
      response?.conversation ||
      response?.data ||
      response;

    const conversation = normalizeConversation(rawConversation);

    if (conversation.id) {
      state.conversations = [
        conversation,
        ...state.conversations.filter((item) => item.id !== conversation.id)
      ];

      renderConversations(data.container);
      updateUnreadCount();

      utils.dispatch("conversation-created", { conversation });
    }

    return conversation;
  }

  async function markConversationRead(conversationId) {
    const id = String(conversationId || "");

    if (!id) throw new Error("A conversation ID is required.");

    const response = await request(
      "/messages/conversations/" + encodeURIComponent(id) + "/read",
      { method: "POST", body: JSON.stringify({}) }
    );

    const conversation = getConversation(id);

    if (conversation) {
      conversation.unreadCount = 0;
    }

    state.messages = state.messages.map((message) => {
      if (message.conversationId === id) {
        return {
          ...message,
          readAt: message.readAt || new Date().toISOString()
        };
      }

      return message;
    });

    updateUnreadCount();
    renderConversations();
    emitUpdate();

    utils.dispatch("conversation-read", {
      conversationId: id,
      response
    });

    return true;
  }

  async function markMessageRead(messageId) {
    const id = String(messageId || "");

    if (!id) throw new Error("A message ID is required.");

    await request("/messages/" + encodeURIComponent(id) + "/read", {
      method: "POST",
      body: JSON.stringify({})
    });

    const message = getMessage(id);

    if (message) {
      message.readAt = new Date().toISOString();
    }

    utils.dispatch("message-read", { messageId: id });

    return true;
  }

  async function deleteMessage(messageId) {
    const id = String(messageId || "");

    if (!id) throw new Error("A message ID is required.");

    await request("/messages/" + encodeURIComponent(id), {
      method: "DELETE"
    });

    const message = getMessage(id);

    state.messages = state.messages.filter((item) => item.id !== id);

    renderMessages();

    utils.dispatch("message-deleted", {
      messageId: id,
      conversationId: message?.conversationId || ""
    });

    return true;
  }

  async function deleteConversation(conversationId) {
    const id = String(conversationId || "");

    if (!id) throw new Error("A conversation ID is required.");

    await request(
      "/messages/conversations/" + encodeURIComponent(id),
      { method: "DELETE" }
    );

    state.conversations = state.conversations.filter(
      (conversation) => conversation.id !== id
    );

    if (state.activeConversation?.id === id) {
      state.activeConversation = null;
      state.messages = [];
      renderMessages();
    }

    updateUnreadCount();
    renderConversations();
    emitUpdate();

    utils.dispatch("conversation-deleted", { conversationId: id });

    return true;
  }

  async function uploadAttachment(file) {
    if (!(file instanceof File)) {
      throw new Error("Select a valid file.");
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error("Attachments must be 10 MB or smaller.");
    }

    if (
      file.type &&
      !ALLOWED_ATTACHMENT_TYPES.includes(file.type)
    ) {
      throw new Error("This file type is not supported.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await request("/messages/attachments", {
      method: "POST",
      body: formData
    });

    const attachment =
      response?.data?.attachment ||
      response?.attachment ||
      response?.data ||
      response;

    utils.dispatch("attachment-uploaded", { attachment });

    return attachment;
  }

  async function downloadAttachment(attachmentId, filename) {
    const id = String(attachmentId || "");

    if (!id) throw new Error("An attachment ID is required.");

    const blob = await request(
      "/messages/attachments/" + encodeURIComponent(id) + "/download",
      {
        method: "GET",
        responseType: "blob"
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename || "attachment";
    link.hidden = true;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    return true;
  }

  async function searchMessages(query, options) {
    const search = String(query || "").trim();

    if (!search) return [];

    const settings = options || {};
    const params = new URLSearchParams({ q: search });

    if (settings.conversationId) {
      params.set("conversationId", String(settings.conversationId));
    }

    if (settings.limit) {
      params.set("limit", String(settings.limit));
    }

    const response = await request("/messages/search?" + params.toString());

    const results = normalizeList(response).map(normalizeMessage);

    utils.dispatch("search-results", {
      query: search,
      results
    });

    return results;
  }

  function renderConversations(target) {
    const containers = target
      ? [typeof target === "string" ? document.querySelector(target) : target]
      : Array.from(document.querySelectorAll("[data-messages-list]"));

    containers.filter(Boolean).forEach((container) => {
      if (!state.conversations.length) {
        container.innerHTML =
          '<div class="mo-messages-empty" role="status">' +
          "No conversations found." +
          "</div>";
        return;
      }

      container.innerHTML = state.conversations.map((conversation) => {
        const lastMessage = conversation.lastMessage;
        const preview = lastMessage
          ? (lastMessage.body || lastMessage.content || "Attachment")
          : "No messages yet";

        const active =
          state.activeConversation?.id === conversation.id;

        return `
          <button
            type="button"
            class="mo-conversation-item${active ? " is-active" : ""}"
            data-message-conversation="${utils.escapeHTML(conversation.id)}"
            aria-current="${active ? "true" : "false"}"
          >
            <span class="mo-conversation-avatar" aria-hidden="true">
              ${utils.escapeHTML(utils.initials(conversation.subject))}
            </span>
            <span class="mo-conversation-content">
              <span class="mo-conversation-title">
                ${utils.escapeHTML(conversation.subject)}
              </span>
              <span class="mo-conversation-preview">
                ${utils.escapeHTML(preview)}
              </span>
            </span>
            <span class="mo-conversation-meta">
              <time>${utils.escapeHTML(utils.formatTime(conversation.updatedAt))}</time>
              ${
                conversation.unreadCount
                  ? `<span class="mo-message-unread" aria-label="${conversation.unreadCount} unread messages">${conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>`
                  : ""
              }
            </span>
          </button>
        `;
      }).join("");
    });
  }

  function renderMessages(target) {
    const containers = target
      ? [typeof target === "string" ? document.querySelector(target) : target]
      : Array.from(document.querySelectorAll("[data-messages-thread]"));

    containers.filter(Boolean).forEach((container) => {
      if (!state.activeConversation) {
        container.innerHTML =
          '<div class="mo-messages-empty" role="status">' +
          "Select a conversation to view messages." +
          "</div>";
        return;
      }

      if (!state.messages.length) {
        container.innerHTML =
          '<div class="mo-messages-empty" role="status">' +
          "No messages yet. Start the conversation." +
          "</div>";
        return;
      }

      const currentUserId = utils.currentUserId();

      container.innerHTML = state.messages.map((message) => {
        const isOwn =
          currentUserId &&
          message.senderId === currentUserId;

        const body = message.deleted
          ? "This message was deleted."
          : message.body;

        const attachments = message.attachments.map((attachment) => {
          const attachmentId =
            attachment.id ||
            attachment._id ||
            attachment.attachmentId ||
            "";

          const filename =
            attachment.name ||
            attachment.filename ||
            "Attachment";

          return `
            <button
              type="button"
              class="mo-message-attachment"
              data-message-download="${utils.escapeHTML(attachmentId)}"
              data-message-filename="${utils.escapeHTML(filename)}"
            >
              <span aria-hidden="true">📎</span>
              <span>${utils.escapeHTML(filename)}</span>
              <small>${utils.escapeHTML(utils.formatFileSize(attachment.size))}</small>
            </button>
          `;
        }).join("");

        return `
          <article
            class="mo-message${isOwn ? " mo-message-own" : ""}"
            data-message-id="${utils.escapeHTML(message.id)}"
          >
            <div class="mo-message-bubble">
              ${
                !isOwn
                  ? `<div class="mo-message-sender">${utils.escapeHTML(message.senderName)}</div>`
                  : ""
              }
              <div class="mo-message-body">${utils.escapeHTML(body).replace(/\n/g, "<br>")}</div>
              ${attachments ? `<div class="mo-message-attachments">${attachments}</div>` : ""}
              <div class="mo-message-footer">
                <time datetime="${utils.escapeHTML(message.createdAt || "")}">
                  ${utils.escapeHTML(utils.formatTime(message.createdAt))}
                </time>
                ${message.editedAt ? "<span>Edited</span>" : ""}
                ${isOwn ? `<span>${utils.escapeHTML(message.status)}</span>` : ""}
              </div>
            </div>
          </article>
        `;
      }).join("");

      container.scrollTop = container.scrollHeight;
    });
  }

  function bindForms() {
    document.querySelectorAll("[data-message-compose]").forEach((form) => {
      if (form.dataset.messagesBound === "true") return;

      form.dataset.messagesBound = "true";

      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const conversationId =
          form.dataset.conversationId ||
          state.activeConversation?.id;

        const textarea =
          form.querySelector("[name='message'], [name='body'], textarea");

        const fileInput = form.querySelector(
          "input[type='file'][name='attachments'], input[type='file'][name='attachment']"
        );

        const submitButton = form.querySelector(
          "button[type='submit'], input[type='submit']"
        );

        const body = textarea?.value || "";

        if (!conversationId) {
          utils.notify("Select a conversation first.", "warning");
          return;
        }

        if (submitButton) submitButton.disabled = true;

        try {
          const attachments = [];

          if (fileInput?.files?.length) {
            for (const file of Array.from(fileInput.files)) {
              attachments.push(await uploadAttachment(file));
            }
          }

          await sendMessage(conversationId, body, {
            attachments,
            container: form.dataset.threadTarget || undefined,
            conversationContainer: form.dataset.listTarget || undefined
          });

          if (textarea) textarea.value = "";
          if (fileInput) fileInput.value = "";

          form.dispatchEvent(new CustomEvent("messages:sent", {
            bubbles: true
          }));
        } catch (error) {
          utils.notify(error.message || "Unable to send message.", "error");
        } finally {
          if (submitButton) submitButton.disabled = false;
        }
      });
    });
  }

  function bindConversationClicks() {
    document.addEventListener("click", async function (event) {
      const conversationButton = event.target.closest(
        "[data-message-conversation]"
      );

      if (conversationButton) {
        const id = conversationButton.dataset.messageConversation;

        try {
          state.activeConversation = getConversation(id);
          renderConversations();
          await loadMessages(id);
        } catch (_) {
          // Error is reported by loadMessages.
        }

        return;
      }

      const downloadButton = event.target.closest(
        "[data-message-download]"
      );

      if (downloadButton) {
        try {
          await downloadAttachment(
            downloadButton.dataset.messageDownload,
            downloadButton.dataset.messageFilename
          );
        } catch (error) {
          utils.notify(error.message || "Download failed.", "error");
        }

        return;
      }

      const deleteButton = event.target.closest(
        "[data-message-delete]"
      );

      if (deleteButton) {
        const id = deleteButton.dataset.messageDelete;

        if (!window.confirm("Delete this message?")) return;

        try {
          await deleteMessage(id);
          utils.notify("Message deleted.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to delete message.", "error");
        }

        return;
      }

      const deleteConversationButton = event.target.closest(
        "[data-conversation-delete]"
      );

      if (deleteConversationButton) {
        const id = deleteConversationButton.dataset.conversationDelete;

        if (!window.confirm("Delete this conversation?")) return;

        try {
          await deleteConversation(id);
          utils.notify("Conversation deleted.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to delete conversation.", "error");
        }
      }
    });
  }

  function bindSearch() {
    document.querySelectorAll("[data-message-search]").forEach((input) => {
      if (input.dataset.messagesBound === "true") return;

      input.dataset.messagesBound = "true";

      let timer = null;

      input.addEventListener("input", function () {
        window.clearTimeout(timer);

        timer = window.setTimeout(async () => {
          const query = input.value.trim();

          if (!query) {
            renderConversations(input.dataset.target || undefined);
            return;
          }

          try {
            const results = await searchMessages(query, {
              conversationId: input.dataset.conversationId || undefined
            });

            const container = input.dataset.resultsTarget
              ? document.querySelector(input.dataset.resultsTarget)
              : document.querySelector("[data-message-search-results]");

            if (!container) return;

            container.innerHTML = results.length
              ? results.map((message) => `
                  <button
                    type="button"
                    class="mo-message-search-result"
                    data-message-search-result="${utils.escapeHTML(message.conversationId)}"
                  >
                    <strong>${utils.escapeHTML(message.senderName)}</strong>
                    <span>${utils.escapeHTML(message.body)}</span>
                    <time>${utils.escapeHTML(utils.formatDate(message.createdAt))}</time>
                  </button>
                `).join("")
              : '<div class="mo-messages-empty">No matching messages.</div>';
          } catch (error) {
            utils.notify(error.message || "Message search failed.", "error");
          }
        }, 300);
      });
    });
  }

  function bindSearchResults() {
    document.addEventListener("click", async function (event) {
      const result = event.target.closest("[data-message-search-result]");

      if (!result) return;

      const conversationId = result.dataset.messageSearchResult;

      if (!conversationId) return;

      state.activeConversation = getConversation(conversationId);

      try {
        if (!state.activeConversation) {
          await loadConversations();
          state.activeConversation = getConversation(conversationId);
        }

        await loadMessages(conversationId);
      } catch (_) {
        // Errors are handled by the request methods.
      }
    });
  }

  function bindRefreshControls() {
    document.querySelectorAll("[data-messages-refresh]").forEach((button) => {
      if (button.dataset.messagesBound === "true") return;

      button.dataset.messagesBound = "true";

      button.addEventListener("click", async function () {
        try {
          await loadConversations();

          if (state.activeConversation) {
            await loadMessages(state.activeConversation.id);
          }
        } catch (_) {
          // Errors are handled by the request methods.
        }
      });
    });
  }

  function startPolling(interval) {
    stopPolling();

    const delay = Math.max(15000, Number(interval) || 30000);

    state.pollingTimer = window.setInterval(async () => {
      if (document.hidden || state.loading || state.sending) return;

      try {
        await loadConversations();

        if (state.activeConversation) {
          await loadMessages(state.activeConversation.id, {
            markRead: false
          });
        }
      } catch (_) {
        // Polling failures should not interrupt the page.
      }
    }, delay);
  }

  function stopPolling() {
    if (state.pollingTimer) {
      window.clearInterval(state.pollingTimer);
      state.pollingTimer = null;
    }
  }

  function on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("A callback function is required.");
    }

    const event = "medorbits:messages:" + eventName;

    document.addEventListener(event, callback);

    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }

    listeners.get(event).add(callback);

    return function unsubscribe() {
      document.removeEventListener(event, callback);
      listeners.get(event)?.delete(callback);
    };
  }

  function off(eventName, callback) {
    const event = "medorbits:messages:" + eventName;

    if (callback) {
      document.removeEventListener(event, callback);
      listeners.get(event)?.delete(callback);
      return;
    }

    listeners.get(event)?.forEach((listener) => {
      document.removeEventListener(event, listener);
    });

    listeners.delete(event);
  }

  async function init(options) {
    if (state.initialized && !(options && options.force)) {
      return api;
    }

    bindForms();
    bindConversationClicks();
    bindSearch();
    bindSearchResults();
    bindRefreshControls();

    try {
      await loadConversations(options || {});
    } catch (_) {
      // Keep the module usable if the endpoint is unavailable.
    }

    if (options?.polling) {
      startPolling(options.pollingInterval);
    }

    state.initialized = true;

    utils.dispatch("initialized", {
      unreadCount: state.unreadCount
    });

    return api;
  }

  function destroy() {
    stopPolling();
    state.initialized = false;
    state.activeConversation = null;
    state.messages = [];

    listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        document.removeEventListener(event, callback);
      });
    });

    listeners.clear();
  }

  const api = {
    init,
    destroy,
    on,
    off,

    loadConversations,
    loadMessages,
    createConversation,
    sendMessage,

    markConversationRead,
    markMessageRead,

    deleteMessage,
    deleteConversation,

    uploadAttachment,
    downloadAttachment,
    searchMessages,

    renderConversations,
    renderMessages,

    startPolling,
    stopPolling,

    getConversations: () => state.conversations.slice(),
    getMessages: () => state.messages.slice(),
    getActiveConversation: () => state.activeConversation,
    getUnreadCount: () => state.unreadCount,

    getState: () => ({
      conversations: state.conversations.slice(),
      activeConversation: state.activeConversation,
      messages: state.messages.slice(),
      unreadCount: state.unreadCount,
      loading: state.loading,
      sending: state.sending
    }),

    constants: {
      DEFAULT_PAGE_SIZE,
      MAX_ATTACHMENT_SIZE,
      ALLOWED_ATTACHMENT_TYPES: ALLOWED_ATTACHMENT_TYPES.slice()
    }
  };

  window.MedOrbitsMessages = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Messages = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (document.querySelector(
        "[data-messages-list], [data-messages-thread], [data-message-compose]"
      )) {
        init();
      }
    }, { once: true });
  } else if (document.querySelector(
    "[data-messages-list], [data-messages-thread], [data-message-compose]"
  )) {
    init();
  }

})(window, document);