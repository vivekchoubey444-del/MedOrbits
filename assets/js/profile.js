
/**
 * MedOrbits -- User Profile Manager
 * File: assets/js/profile.js
 */

(() => {
  "use strict";

  const API = window.MedOrbitsConstants?.API || {
    PREFIX: "/api",
    ENDPOINTS: { USERS: "/users" }
  };

  const API_BASE = window.MedOrbitsConfig?.API_BASE_URL ||
    API.PREFIX || "/api";

  const state = {
    profile: null,
    loading: false
  };

  function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content") || "";
  }

  function notify(message, type = "info") {
    if (window.MedOrbits?.toast) {
      window.MedOrbits.toast.show(message, { type });
    } else {
      console.info(`[MedOrbits Profile] ${message}`);
    }
  }

  async function request(path, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(getCsrfToken()
        ? { "X-CSRF-Token": getCsrfToken() }
        : {})
    };

    const response = await fetch(
      `${API_BASE.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
      {
        ...options,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        body: options.body
          ? JSON.stringify(options.body)
          : undefined
      }
    );

    const payload = response.status === 204
      ? null
      : await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.message || "Unable to complete the profile request."
      );
    }

    return payload;
  }

  function extractProfile(payload) {
    return payload?.data?.user ||
      payload?.data?.profile ||
      payload?.user ||
      payload?.profile ||
      payload?.data ||
      payload;
  }

  function renderProfile(profile) {
    if (!profile || typeof profile !== "object") return;

    document.querySelectorAll("[data-profile-field]").forEach((element) => {
      const field = element.dataset.profileField;
      const value = profile[field];

      if (value !== undefined && value !== null) {
        element.textContent = String(value);
      }
    });

    document.querySelectorAll("[data-profile-name]").forEach((element) => {
      element.textContent =
        profile.full_name ||
        profile.fullName ||
        profile.name ||
        "";
    });

    document.querySelectorAll("[data-profile-email]").forEach((element) => {
      element.textContent = profile.email || "";
    });

    document.querySelectorAll("[data-profile-avatar]").forEach((element) => {
      const avatar = profile.avatar || profile.profile_image;

      if (avatar && element instanceof HTMLImageElement) {
        try {
          const url = new URL(avatar, window.location.origin);

          if (
            ["http:", "https:"].includes(url.protocol) &&
            url.origin === window.location.origin
          ) {
            element.src = url.href;
          }
        } catch {
          // Ignore invalid avatar URLs.
        }
      }
    });

    window.dispatchEvent(new CustomEvent("medorbits:profile-rendered", {
      detail: { profile }
    }));
  }

  async function load() {
    if (state.loading) return state.profile;

    state.loading = true;

    try {
      const payload = await request("/users/me", {
        method: "GET"
      });

      state.profile = extractProfile(payload);
      renderProfile(state.profile);

      return state.profile;
    } finally {
      state.loading = false;
    }
  }

  async function update(details = {}) {
    const form = details instanceof HTMLFormElement ? details : null;

    const data = form
      ? Object.fromEntries(new FormData(form).entries())
      : { ...details };

    delete data.id;
    delete data.user_id;
    delete data.role;
    delete data.role_name;
    delete data.account_role;
    delete data.permissions;
    delete data.is_admin;
    delete data.isAdmin;
    delete data.password;
    delete data.email_verified;
    delete data.emailVerified;

    const payload = await request("/users/me", {
      method: "PATCH",
      body: data
    });

    state.profile = extractProfile(payload);
    renderProfile(state.profile);

    notify("Profile updated successfully.", "success");

    return state.profile;
  }

  async function uploadAvatar(file) {
    if (!(file instanceof File)) {
      throw new TypeError("Select a valid image file.");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Upload a JPG, PNG, or WebP image.");
    }

    if (file.size > maxSize) {
      throw new Error("The image must be 5 MB or smaller.");
    }

    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(
      `${API_BASE.replace(/\/+$/, "")}/users/me/avatar`,
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: getCsrfToken()
          ? { "X-CSRF-Token": getCsrfToken() }
          : {},
        body: formData
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.message || "Avatar upload failed.");
    }

    state.profile = extractProfile(payload);
    renderProfile(state.profile);

    notify("Profile photo updated.", "success");

    return state.profile;
  }

  function bindForms() {
    document.querySelectorAll("[data-profile-form]").forEach((form) => {
      if (!(form instanceof HTMLFormElement)) return;

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const button = form.querySelector('[type="submit"]');

        if (button) button.disabled = true;

        try {
          await update(form);
        } catch (error) {
          notify(error.message || "Unable to update profile.", "error");
        } finally {
          if (button) button.disabled = false;
        }
      });
    });

    document.querySelectorAll("[data-avatar-input]").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
          await uploadAvatar(file);
        } catch (error) {
          notify(error.message || "Avatar upload failed.", "error");
        } finally {
          input.value = "";
        }
      });
    });
  }

  async function init() {
    bindForms();

    if (
      document.querySelector("[data-profile-field]") ||
      document.querySelector("[data-profile-name]") ||
      document.querySelector("[data-profile-email]") ||
      document.querySelector("[data-profile-form]") ||
      document.querySelector("[data-profile-avatar]")
    ) {
      try {
        await load();
      } catch (error) {
        notify(error.message || "Unable to load profile.", "error");
      }
    }
  }

  window.MedOrbitsProfile = Object.freeze({
    load,
    update,
    uploadAvatar,
    render: renderProfile,

    get current() {
      return state.profile;
    },

    get loading() {
      return state.loading;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    void init();
  }
})();
