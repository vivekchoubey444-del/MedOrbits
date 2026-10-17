/* =========================================================
   MedOrbits -- File Uploader
   File: /assets/js/uploader.js
========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};

  const API_BASE = String(
    CONFIG.API_BASE_URL || CONFIG.apiBaseUrl || "/api"
  ).replace(/\/+$/, "");

  const DEFAULTS = Object.freeze({
    endpoint: "/documents/upload",
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 10,
    multiple: true,
    allowedTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ],
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"]
  });

  const EVENTS = Object.freeze({
    START: "medorbits:uploader:start",
    PROGRESS: "medorbits:uploader:progress",
    SUCCESS: "medorbits:uploader:success",
    ERROR: "medorbits:uploader:error",
    COMPLETE: "medorbits:uploader:complete",
    REMOVE: "medorbits:uploader:remove"
  });

  const uploads = new Map();
  let uploadCounter = 0;

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

  function getCsrfToken() {
    const meta = document.querySelector(
      'meta[name="csrf-token"], meta[name="csrf_token"]'
    );

    if (meta && meta.content) return meta.content;

    const input = document.querySelector(
      'input[name="_csrf"], input[name="csrfToken"]'
    );

    return input ? input.value : "";
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;

    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";

    return (value / (1024 * 1024)).toFixed(2) + " MB";
  }

  function getExtension(filename) {
    const name = String(filename || "").toLowerCase();
    const index = name.lastIndexOf(".");

    return index >= 0 ? name.slice(index) : "";
  }

  function getOptions(input) {
    const container = input.closest("[data-uploader]");
    const source = container || input;

    const maxSize = Number(source.dataset.maxSize);
    const maxFiles = Number(source.dataset.maxFiles);

    let allowedTypes = DEFAULTS.allowedTypes.slice();
    let allowedExtensions = DEFAULTS.allowedExtensions.slice();

    if (source.dataset.allowedTypes) {
      allowedTypes = source.dataset.allowedTypes
        .split(",")
        .map(function (value) {
          return value.trim().toLowerCase();
        })
        .filter(Boolean);
    }

    if (source.dataset.allowedExtensions) {
      allowedExtensions = source.dataset.allowedExtensions
        .split(",")
        .map(function (value) {
          const extension = value.trim().toLowerCase();
          return extension.startsWith(".") ? extension : "." + extension;
        })
        .filter(Boolean);
    }

    return {
      container: container,
      endpoint: source.dataset.uploadEndpoint || DEFAULTS.endpoint,
      fieldName: source.dataset.fieldName || "files",
      maxFileSize: maxSize > 0 ? maxSize : DEFAULTS.maxFileSize,
      maxFiles: maxFiles > 0 ? maxFiles : DEFAULTS.maxFiles,
      multiple: input.multiple,
      allowedTypes: allowedTypes,
      allowedExtensions: allowedExtensions,
      applicationId: source.dataset.applicationId || "",
      documentType: source.dataset.documentType || ""
    };
  }

  function validateFile(file, options) {
    if (!(file instanceof File)) {
      return "Invalid file.";
    }

    if (file.size <= 0) {
      return "This file is empty.";
    }

    if (file.size > options.maxFileSize) {
      return "File exceeds the maximum size of " +
        formatBytes(options.maxFileSize) + ".";
    }

    const extension = getExtension(file.name);

    if (
      options.allowedExtensions.length &&
      !options.allowedExtensions.includes(extension)
    ) {
      return "This file extension is not allowed.";
    }

    if (
      file.type &&
      options.allowedTypes.length &&
      !options.allowedTypes.includes(file.type.toLowerCase())
    ) {
      return "This file type is not allowed.";
    }

    if (
      options.allowedTypes.length &&
      options.allowedTypes.includes("application/pdf") &&
      extension === ".pdf" &&
      file.type &&
      file.type.toLowerCase() !== "application/pdf"
    ) {
      return "The selected PDF file has an invalid MIME type.";
    }

    return "";
  }

  function showMessage(container, message, isError) {
    if (!container) return;

    const output = container.querySelector("[data-uploader-message]");

    if (output) {
      output.textContent = message || "";
      output.hidden = !message;
      output.setAttribute("role", isError ? "alert" : "status");
    }
  }

  function createProgressItem(file, container) {
    if (!container) return null;

    const list = container.querySelector("[data-uploader-list]");

    if (!list) return null;

    const item = document.createElement("div");
    item.className = "uploader-item";
    item.dataset.uploadItem = "";

    const name = document.createElement("span");
    name.className = "uploader-item__name";
    name.textContent = file.name;

    const size = document.createElement("span");
    size.className = "uploader-item__size";
    size.textContent = formatBytes(file.size);

    const progress = document.createElement("progress");
    progress.className = "uploader-item__progress";
    progress.max = 100;
    progress.value = 0;
    progress.setAttribute("aria-label", "Upload progress for " + file.name);

    const status = document.createElement("span");
    status.className = "uploader-item__status";
    status.textContent = "Preparing upload";

    item.appendChild(name);
    item.appendChild(size);
    item.appendChild(progress);
    item.appendChild(status);

    list.appendChild(item);

    return {
      element: item,
      progress: progress,
      status: status
    };
  }

  function updateProgressItem(item, percent, message, isError) {
    if (!item) return;

    if (item.progress) {
      item.progress.value = Math.max(0, Math.min(100, percent || 0));
    }

    if (item.status) {
      item.status.textContent = message || "";
      item.status.classList.toggle("is-error", Boolean(isError));
    }

    if (item.element) {
      item.element.classList.toggle("is-error", Boolean(isError));
      item.element.classList.toggle(
        "is-complete",
        !isError && percent >= 100
      );
    }
  }

  function buildUploadURL(endpoint) {
    const path = String(endpoint || DEFAULTS.endpoint);

    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path, window.location.origin);

      if (url.origin !== window.location.origin) {
        throw new Error("Uploads must use the same-origin API.");
      }

      return url.href;
    }

    if (!path.startsWith("/")) {
      throw new Error("Upload endpoint must be an absolute path.");
    }

    return API_BASE + path;
  }

  function uploadFile(file, options, item) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      const uploadId = "mo-upload-" + (++uploadCounter);
      const formData = new FormData();

      formData.append(options.fieldName, file, file.name);

      if (options.applicationId) {
        formData.append("applicationId", options.applicationId);
      }

      if (options.documentType) {
        formData.append("documentType", options.documentType);
      }

      const token = getToken();
      const csrfToken = getCsrfToken();

      uploads.set(uploadId, {
        xhr: xhr,
        file: file,
        item: item
      });

      emit(EVENTS.START, {
        id: uploadId,
        filename: file.name,
        size: file.size
      });

      xhr.open("POST", buildUploadURL(options.endpoint), true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Accept", "application/json");

      if (token) {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      }

      if (csrfToken) {
        xhr.setRequestHeader("X-CSRF-Token", csrfToken);
      }

      xhr.upload.addEventListener("progress", function (event) {
        if (!event.lengthComputable) return;

        const percent = Math.round((event.loaded / event.total) * 100);

        updateProgressItem(item, percent, "Uploading " + percent + "%");

        emit(EVENTS.PROGRESS, {
          id: uploadId,
          filename: file.name,
          loaded: event.loaded,
          total: event.total,
          percent: percent
        });
      });

      xhr.addEventListener("load", function () {
        uploads.delete(uploadId);

        let response = null;

        try {
          response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch (_) {
          response = { message: "The server returned an invalid response." };
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          const payload = response && response.data !== undefined
            ? response.data
            : response;

          updateProgressItem(item, 100, "Upload complete");

          emit(EVENTS.SUCCESS, {
            id: uploadId,
            filename: file.name,
            response: payload
          });

          resolve(payload);
        } else {
          const message = response && response.message
            ? response.message
            : "Upload failed (" + xhr.status + ").";

          updateProgressItem(item, 0, message, true);

          const error = new Error(message);
          error.status = xhr.status;
          error.data = response;

          emit(EVENTS.ERROR, {
            id: uploadId,
            filename: file.name,
            message: message,
            status: xhr.status
          });

          reject(error);
        }
      });

      xhr.addEventListener("error", function () {
        uploads.delete(uploadId);

        const error = new Error("Network error while uploading " + file.name + ".");
        updateProgressItem(item, 0, error.message, true);

        emit(EVENTS.ERROR, {
          id: uploadId,
          filename: file.name,
          message: error.message
        });

        reject(error);
      });

      xhr.addEventListener("abort", function () {
        uploads.delete(uploadId);

        const error = new Error("Upload cancelled.");
        error.name = "AbortError";

        updateProgressItem(item, 0, "Upload cancelled", true);

        reject(error);
      });

      try {
        xhr.send(formData);
      } catch (error) {
        uploads.delete(uploadId);
        reject(error);
      }
    });
  }

  async function uploadFiles(fileList, input) {
    const files = Array.from(fileList || []);

    if (!files.length) return [];

    const options = getOptions(input);

    if (!options.multiple && files.length > 1) {
      throw new Error("Please select only one file.");
    }

    if (files.length > options.maxFiles) {
      throw new Error("You can upload a maximum of " + options.maxFiles + " files at once.");
    }

    const invalidFiles = files.map(function (file) {
      return {
        file: file,
        error: validateFile(file, options)
      };
    }).filter(function (item) {
      return Boolean(item.error);
    });

    if (invalidFiles.length) {
      const message = invalidFiles.map(function (item) {
        return item.file.name + ": " + item.error;
      }).join(" ");

      showMessage(options.container, message, true);

      throw new Error(message);
    }

    showMessage(options.container, "", false);

    const results = await Promise.allSettled(
      files.map(function (file) {
        const item = createProgressItem(file, options.container);

        return uploadFile(file, options, item);
      })
    );

    const successful = results
      .filter(function (result) {
        return result.status === "fulfilled";
      })
      .map(function (result) {
        return result.value;
      });

    const failed = results.filter(function (result) {
      return result.status === "rejected";
    });

    emit(EVENTS.COMPLETE, {
      total: files.length,
      successful: successful.length,
      failed: failed.length
    });

    if (failed.length) {
      showMessage(
        options.container,
        successful.length + " of " + files.length + " file(s) uploaded successfully.",
        true
      );
    } else {
      showMessage(
        options.container,
        "All files uploaded successfully.",
        false
      );
    }

    return successful;
  }

  function cancel(uploadId) {
    const upload = uploads.get(uploadId);

    if (!upload) return false;

    upload.xhr.abort();
    return true;
  }

  function cancelAll() {
    Array.from(uploads.keys()).forEach(function (id) {
      cancel(id);
    });
  }

  function clearList(container) {
    if (!container) return;

    const list = container.querySelector("[data-uploader-list]");

    if (list) {
      list.replaceChildren();
    }

    showMessage(container, "", false);
  }

  function bindUploader(container) {
    const input = container.querySelector('input[type="file"]');

    if (!input || input.dataset.uploaderBound === "true") return;

    input.dataset.uploaderBound = "true";

    input.addEventListener("change", async function () {
      try {
        await uploadFiles(input.files, input);
      } catch (error) {
        showMessage(container, error.message, true);
      } finally {
        input.value = "";
      }
    });

    const dropZone = container.querySelector("[data-uploader-dropzone]");

    if (!dropZone) return;

    ["dragenter", "dragover"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.add("is-dragover");
      });
    });

    ["dragleave", "dragend", "drop"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.remove("is-dragover");
      });
    });

    dropZone.addEventListener("drop", async function (event) {
      const files = event.dataTransfer && event.dataTransfer.files;

      if (!files || !files.length) return;

      try {
        await uploadFiles(files, input);
      } catch (error) {
        showMessage(container, error.message, true);
      }
    });

    dropZone.addEventListener("click", function (event) {
      if (event.target.closest("button, a, input, label")) return;
      input.click();
    });

    dropZone.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });

    if (!dropZone.hasAttribute("tabindex")) {
      dropZone.setAttribute("tabindex", "0");
    }

    if (!dropZone.hasAttribute("role")) {
      dropZone.setAttribute("role", "button");
    }
  }

  function init() {
    document.querySelectorAll("[data-uploader]").forEach(bindUploader);

    document.querySelectorAll("[data-upload-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        const targetId = trigger.getAttribute("data-upload-trigger");
        const input = targetId
          ? document.getElementById(targetId)
          : trigger.parentElement &&
            trigger.parentElement.querySelector('input[type="file"]');

        if (input) input.click();
      });
    });

    document.querySelectorAll("[data-upload-cancel]").forEach(function (button) {
      button.addEventListener("click", function () {
        const uploadId = button.getAttribute("data-upload-cancel");

        if (uploadId) {
          cancel(uploadId);
        } else {
          cancelAll();
        }
      });
    });

    document.querySelectorAll("[data-upload-clear]").forEach(function (button) {
      button.addEventListener("click", function () {
        const container = button.closest("[data-uploader]");
        clearList(container);

        emit(EVENTS.REMOVE, {
          container: container || null
        });
      });
    });
  }

  const api = Object.freeze({
    uploadFiles: uploadFiles,
    cancel: cancel,
    cancelAll: cancelAll,
    clearList: clearList,
    formatBytes: formatBytes,
    validateFile: function (file, input) {
      return validateFile(file, getOptions(input));
    },
    getActiveUploads: function () {
      return Array.from(uploads.keys());
    },
    events: EVENTS
  });

  window.MedOrbitsUploader = api;

  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Uploader = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})(window, document);