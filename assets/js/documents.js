/* =========================================================
   MedOrbits -- assets/js/documents.js
   Document management, upload, download, preview, and delete
   ========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const CONSTANTS = window.MedOrbitsConstants || {};
  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";
  const ENDPOINTS = {
    documents:
      CONSTANTS.API?.DOCUMENTS ||
      `${API_BASE}/documents`
  };
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png"
  ];
  const ALLOWED_EXTENSIONS = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png"
  ];
  const state = {
    documents: [],
    loading: false,
    uploading: false,
    error: null,
    selectedDocument: null
  };
  const listeners = new Set();
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
  }
  function getDocumentId(item) {
    return String(item.id || item.documentId || item._id || "");
  }
  function getDocumentName(item) {
    return item.originalName || item.name || item.filename || "Document";
  }
  function getDocumentType(item) {
    return item.documentType || item.type || "Other";
  }
  function getDocumentStatus(item) {
    return item.status || item.verificationStatus || "Uploaded";
  }
  function formatBytes(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size < 0) return "Unknown size";
    if (size === 0) return "0 Bytes";
    const units = ["Bytes", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(size) / Math.log(1024)),
      units.length - 1
    );
    return `${(size / Math.pow(1024, index)).toFixed(index ? 2 : 0)} ${units[index]}`;
  }
  function formatDate(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }
  function validateFile(file) {
    if (!(file instanceof File)) {
      return { valid: false, error: "Please select a valid file." };
    }
    if (file.size <= 0) {
      return { valid: false, error: "The selected file is empty." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: "File size must not exceed 10 MB."
      };
    }
    const extension = `.${file.name.split(".").pop().toLowerCase()}`;
    const validExtension = ALLOWED_EXTENSIONS.includes(extension);
    const validMime = ALLOWED_TYPES.includes(file.type);
    if (!validExtension || !validMime) {
      return {
        valid: false,
        error: "Only PDF, JPG, PNG, and JPEG files are allowed."
      };
    }
    return { valid: true, error: null };
  }
  async function requestJSON(url, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers
    });
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      throw new Error(
        result?.message ||
        result?.error ||
        `Request failed (${response.status})`
      );
    }
    return result;
  }
  function extractDocuments(result) {
    if (Array.isArray(result)) return result;
    return (
      result?.documents ||
      result?.data?.documents ||
      result?.data ||
      result?.results ||
      []
    );
  }
  async function load(options = {}) {
    state.loading = true;
    state.error = null;
    notify();
    try {
      const query = new URLSearchParams();
      if (options.type) query.set("type", options.type);
      if (options.status) query.set("status", options.status);
      const suffix = query.toString();
      const url = suffix
        ? `${ENDPOINTS.documents}?${suffix}`
        : ENDPOINTS.documents;
      const result = await requestJSON(url);
      state.documents = extractDocuments(result).filter(
        item => item && typeof item === "object"
      );
      return getDocuments();
    } catch (error) {
      state.error = error.message || "Unable to load documents.";
      return [];
    } finally {
      state.loading = false;
      notify();
    }
  }
  async function upload(file, metadata = {}) {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    state.uploading = true;
    state.error = null;
    notify();
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "documentType",
        metadata.documentType || metadata.type || "Other"
      );
      if (metadata.applicationId) {
        formData.append("applicationId", metadata.applicationId);
      }
      if (metadata.description) {
        formData.append("description", metadata.description);
      }
      if (metadata.title) {
        formData.append("title", metadata.title);
      }
      const result = await requestJSON(ENDPOINTS.documents, {
        method: "POST",
        body: formData
      });
      const uploaded =
        result?.document ||
        result?.data?.document ||
        result?.data ||
        result;
      if (uploaded && typeof uploaded === "object") {
        state.documents.unshift(uploaded);
      } else {
        await load();
      }
      notify();
      return uploaded;
    } catch (error) {
      state.error = error.message || "Document upload failed.";
      throw error;
    } finally {
      state.uploading = false;
      notify();
    }
  }
  async function uploadFromForm(form) {
    const target = typeof form === "string"
      ? document.querySelector(form)
      : form;
    if (!target) {
      throw new Error("Document upload form was not found.");
    }
    const fileInput = target.querySelector('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      throw new Error("Please choose a file to upload.");
    }
    const formData = new FormData(target);
    const metadata = {
      documentType:
        formData.get("documentType") ||
        formData.get("type") ||
        "Other",
      applicationId: formData.get("applicationId"),
      description: formData.get("description"),
      title: formData.get("title")
    };
    return upload(file, metadata);
  }
  async function remove(id) {
    const documentId = String(id || "");
    if (!documentId) {
      throw new Error("Document ID is required.");
    }
    await requestJSON(
      `${ENDPOINTS.documents}/${encodeURIComponent(documentId)}`,
      { method: "DELETE" }
    );
    state.documents = state.documents.filter(
      item => getDocumentId(item) !== documentId
    );
    if (
      state.selectedDocument &&
      getDocumentId(state.selectedDocument) === documentId
    ) {
      state.selectedDocument = null;
    }
    notify();
    return true;
  }
  async function download(id) {
    const item = getDocument(id);
    if (!item) {
      throw new Error("Document not found.");
    }
    const documentId = getDocumentId(item);
    const response = await fetch(
      `${ENDPOINTS.documents}/${encodeURIComponent(documentId)}/download`,
      { credentials: "same-origin" }
    );
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}).`);
    }
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectURL;
    anchor.download = getDocumentName(item);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
    return true;
  }
  async function preview(id) {
    const item = getDocument(id);
    if (!item) {
      throw new Error("Document not found.");
    }
    const documentId = getDocumentId(item);
    const response = await fetch(
      `${ENDPOINTS.documents}/${encodeURIComponent(documentId)}/preview`,
      { credentials: "same-origin" }
    );
    if (!response.ok) {
      throw new Error(`Preview failed (${response.status}).`);
    }
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    state.selectedDocument = {
      ...item,
      previewURL: objectURL
    };
    renderPreview("[data-document-preview]", state.selectedDocument);
    notify();
    return state.selectedDocument;
  }
  function getDocuments() {
    return [...state.documents];
  }
  function getDocument(id) {
    const target = String(id);
    return state.documents.find(
      item => getDocumentId(item) === target
    ) || null;
  }
  function filter(options = {}) {
    return state.documents.filter(item => {
      if (
        options.type &&
        normalize(getDocumentType(item)) !== normalize(options.type)
      ) {
        return false;
      }
      if (
        options.status &&
        normalize(getDocumentStatus(item)) !== normalize(options.status)
      ) {
        return false;
      }
      if (options.search) {
        const query = normalize(options.search);
        const searchable = [
          getDocumentName(item),
          getDocumentType(item),
          getDocumentStatus(item),
          item.description
        ].map(normalize).join(" ");
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }
  function getState() {
    return {
      documents: getDocuments(),
      loading: state.loading,
      uploading: state.uploading,
      error: state.error,
      selectedDocument: state.selectedDocument
    };
  }
  function render(container, items = state.documents) {
    const target = resolveElement(container);
    if (!target) return false;
    if (state.loading && !items.length) {
      target.innerHTML = `
        <p class="documents-status">Loading documents...</p>
      `;
      return true;
    }
    if (state.error && !items.length) {
      target.innerHTML = `
        <p class="documents-status documents-status--error">
          ${escapeHTML(state.error)}
        </p>
      `;
      return true;
    }
    if (!items.length) {
      target.innerHTML = `
        <div class="documents-empty-state">
          <h3>No documents uploaded</h3>
          <p>Upload your documents to keep your application records organized.</p>
        </div>
      `;
      return true;
    }
    target.innerHTML = items.map(item => {
      const id = getDocumentId(item);
      const name = getDocumentName(item);
      const status = getDocumentStatus(item);
      const statusClass = normalize(status).replace(/[^a-z0-9-]/g, "-");
      return `
        <article class="document-card" data-document-id="${escapeHTML(id)}">
          <div class="document-card__icon" aria-hidden="true">📄</div>
          <div class="document-card__content">
            <h3>${escapeHTML(name)}</h3>
            <p>${escapeHTML(getDocumentType(item))}</p>
            <p>${escapeHTML(formatBytes(item.size || item.fileSize))}</p>
            <p>Uploaded: ${escapeHTML(formatDate(item.createdAt || item.uploadedAt))}</p>
            <span class="document-status document-status--${statusClass}">
              ${escapeHTML(status)}
            </span>
          </div>
          <div class="document-card__actions">
            <button type="button" data-document-preview-id="${escapeHTML(id)}">
              Preview
            </button>
            <button type="button" data-document-download-id="${escapeHTML(id)}">
              Download
            </button>
            <button type="button" data-document-delete-id="${escapeHTML(id)}">
              Delete
            </button>
          </div>
        </article>
      `;
    }).join("");
    return true;
  }
  function renderPreview(container, item = state.selectedDocument) {
    const target = resolveElement(container);
    if (!target) return false;
    if (!item) {
      target.innerHTML = "";
      return true;
    }
    const url = item.previewURL || item.previewUrl || item.url || "";
    const isPDF =
      normalize(item.mimeType || item.mimetype || item.contentType) ===
        "application/pdf" ||
      normalize(getDocumentName(item)).endsWith(".pdf");
    target.innerHTML = `
      <section class="document-preview">
        <div class="document-preview__header">
          <h3>${escapeHTML(getDocumentName(item))}</h3>
          <button type="button" data-document-preview-close>Close</button>
        </div>
        ${url && isPDF
          ? `<iframe title="Document preview"
                     src="${escapeHTML(url)}"
                     class="document-preview__frame"></iframe>`
          : url
            ? `<img src="${escapeHTML(url)}"
                    alt="${escapeHTML(getDocumentName(item))}"
                    class="document-preview__image">`
            : `<p>Preview is not available for this document.</p>`}
      </section>
    `;
    return true;
  }
  function resolveElement(element) {
    if (!element) return null;
    return typeof element === "string"
      ? document.querySelector(element)
      : element;
  }
  function subscribe(callback) {
    if (typeof callback !== "function") return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  function notify() {
    const snapshot = getState();
    listeners.forEach(callback => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error("[MedOrbits Documents] Listener error:", error);
      }
    });
    document.dispatchEvent(
      new CustomEvent("medorbits:documents-updated", {
        detail: snapshot
      })
    );
  }
  function showMessage(message, type = "info") {
    if (window.MedOrbitsToast?.show) {
      window.MedOrbitsToast.show(message, type);
      return;
    }
    const event = new CustomEvent("medorbits:toast", {
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }
  document.addEventListener("submit", async event => {
    const form = event.target.closest("[data-document-upload-form]");
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    try {
      await uploadFromForm(form);
      form.reset();
      render("[data-documents-list]");
      showMessage("Document uploaded successfully.", "success");
    } catch (error) {
      showMessage(error.message || "Document upload failed.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  });
  document.addEventListener("change", event => {
    if (!event.target.matches("[data-document-file-input]")) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const result = validateFile(file);
    if (!result.valid) {
      event.target.value = "";
      showMessage(result.error, "error");
    }
  });
  document.addEventListener("click", async event => {
    const previewButton = event.target.closest("[data-document-preview-id]");
    const downloadButton = event.target.closest("[data-document-download-id]");
    const deleteButton = event.target.closest("[data-document-delete-id]");
    const closeButton = event.target.closest("[data-document-preview-close]");
    if (previewButton) {
      try {
        await preview(previewButton.dataset.documentPreviewId);
      } catch (error) {
        showMessage(error.message, "error");
      }
    }
    if (downloadButton) {
      try {
        await download(downloadButton.dataset.documentDownloadId);
      } catch (error) {
        showMessage(error.message, "error");
      }
    }
    if (deleteButton) {
      const id = deleteButton.dataset.documentDeleteId;
      if (!window.confirm("Are you sure you want to delete this document?")) {
        return;
      }
      deleteButton.disabled = true;
      try {
        await remove(id);
        render("[data-documents-list]");
        showMessage("Document deleted successfully.", "success");
      } catch (error) {
        showMessage(error.message || "Unable to delete document.", "error");
      } finally {
        deleteButton.disabled = false;
      }
    }
    if (closeButton) {
      if (state.selectedDocument?.previewURL) {
        URL.revokeObjectURL(state.selectedDocument.previewURL);
      }
      state.selectedDocument = null;
      renderPreview("[data-document-preview]", null);
      notify();
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("[data-documents-list]")) {
      load().then(() => {
        render("[data-documents-list]");
      });
    }
  });
  window.MedOrbitsDocuments = {
    load,
    upload,
    uploadFromForm,
    remove,
    download,
    preview,
    validateFile,
    formatBytes,
    formatDate,
    getDocuments,
    getDocument,
    getState,
    filter,
    render,
    renderPreview,
    subscribe
  };
})(window, document);