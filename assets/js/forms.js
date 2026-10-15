/* =========================================================
   MedOrbits -- assets/js/forms.js
   Form validation, submission, error handling, and UX helpers
   ========================================================= */

(function (window, document) {
  "use strict";

  const CONFIG = window.MedOrbitsConfig || {};

  const DEFAULTS = {
    formSelector: "[data-validate-form]",
    submittingText: "Submitting...",
    successMessage: "Form submitted successfully.",
    errorMessage: "Unable to submit the form. Please try again.",
    resetOnSuccess: false,
    focusFirstError: true
  };

  const state = {
    initialized: false,
    submitting: new WeakSet(),
    originalButtonText: new WeakMap()
  };

  const VALIDATORS = {
    required(value) {
      return String(value ?? "").trim().length > 0;
    },

    email(value) {
      if (!value) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    },

    phone(value) {
      if (!value) return true;
      const digits = String(value).replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },

    url(value) {
      if (!value) return true;

      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    },

    number(value) {
      if (value === "") return true;
      return Number.isFinite(Number(value));
    },

    integer(value) {
      if (value === "") return true;
      return Number.isInteger(Number(value));
    },

    minLength(value, length) {
      return String(value ?? "").length >= Number(length);
    },

    maxLength(value, length) {
      return String(value ?? "").length <= Number(length);
    },

    min(value, minimum) {
      if (value === "") return true;
      return Number(value) >= Number(minimum);
    },

    max(value, maximum) {
      if (value === "") return true;
      return Number(value) <= Number(maximum);
    },

    pattern(value, pattern) {
      if (!value) return true;

      try {
        return new RegExp(pattern).test(String(value));
      } catch {
        return false;
      }
    },

    match(value, selector, form) {
      const target = form.querySelector(selector);
      return Boolean(target) && value === target.value;
    },

    accepted(value, field) {
      return field.type !== "checkbox" || field.checked;
    }
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function getFieldLabel(field) {
    if (field.labels?.length) {
      return field.labels[0].textContent.trim();
    }

    return (
      field.dataset.label ||
      field.getAttribute("aria-label") ||
      field.name ||
      field.id ||
      "This field"
    );
  }

  function getFieldValue(field) {
    if (field.type === "checkbox") {
      return field.checked ? field.value || "on" : "";
    }

    if (field.type === "radio") {
      const checked = field.form?.querySelector(
        `input[type="radio"][name="${CSS.escape(field.name)}"]:checked`
      );

      return checked?.value ?? "";
    }

    if (field.type === "file") {
      return field.files?.length ? field.files : "";
    }

    return String(field.value ?? "").trim();
  }

  function parseRules(field) {
    const rules = {};

    if (field.required || field.dataset.required === "true") {
      rules.required = true;
    }

    if (field.type === "email") rules.email = true;
    if (field.type === "url") rules.url = true;
    if (field.type === "number") rules.number = true;
    if (field.minLength > 0) rules.minLength = field.minLength;
    if (field.maxLength > 0) rules.maxLength = field.maxLength;
    if (field.min !== "") rules.min = field.min;
    if (field.max !== "") rules.max = field.max;
    if (field.pattern) rules.pattern = field.pattern;

    if (field.dataset.rules) {
      try {
        Object.assign(rules, JSON.parse(field.dataset.rules));
      } catch {
        console.warn("[MedOrbits Forms] Invalid data-rules JSON:", field.name);
      }
    }

    if (field.dataset.match) {
      rules.match = field.dataset.match;
    }

    if (field.dataset.phone === "true") {
      rules.phone = true;
    }

    if (field.dataset.integer === "true") {
      rules.integer = true;
    }

    if (field.type === "checkbox" && field.dataset.acceptance === "true") {
      rules.accepted = true;
    }

    return rules;
  }

  function getRuleMessage(rule, value, field, parameter) {
    const label = getFieldLabel(field);

    const messages = {
      required: `${label} is required.`,
      email: "Enter a valid email address.",
      phone: "Enter a valid phone number.",
      url: "Enter a valid URL beginning with http:// or https://.",
      number: `${label} must be a valid number.`,
      integer: `${label} must be a whole number.`,
      minLength: `${label} must contain at least ${parameter} characters.`,
      maxLength: `${label} must contain no more than ${parameter} characters.`,
      min: `${label} must be at least ${parameter}.`,
      max: `${label} must not exceed ${parameter}.`,
      pattern: `${label} has an invalid format.`,
      match: `${label} does not match the required field.`,
      accepted: "You must accept this requirement to continue."
    };

    return field.dataset.errorMessage ||
      field.dataset[`${rule}Message`] ||
      messages[rule] ||
      `${label} is invalid.`;
  }

  function validateField(field, form) {
    if (
      !field ||
      field.disabled ||
      ["submit", "button", "reset"].includes(field.type)
    ) {
      return { valid: true, errors: [] };
    }

    if (field.type === "radio" && form) {
      const group = form.querySelectorAll(
        `input[type="radio"][name="${CSS.escape(field.name)}"]`
      );

      if ([...group].some(item => item !== field && item.dataset.validationChecked)) {
        return { valid: true, errors: [] };
      }
    }

    const value = getFieldValue(field);
    const rules = parseRules(field);
    const errors = [];

    for (const [rule, parameter] of Object.entries(rules)) {
      if (!Object.prototype.hasOwnProperty.call(VALIDATORS, rule)) continue;

      if (rule !== "required" && rule !== "accepted" && value === "") {
        continue;
      }

      let valid;

      if (rule === "match") {
        valid = VALIDATORS.match(value, parameter, form);
      } else if (rule === "accepted") {
        valid = VALIDATORS.accepted(value, field);
      } else {
        valid = VALIDATORS[rule](value, parameter);
      }

      if (!valid) {
        errors.push(getRuleMessage(rule, value, field, parameter));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  function getValidationFields(form) {
    return [...form.querySelectorAll(
      "input, select, textarea"
    )].filter(field => {
      if (field.type === "radio") {
        const radios = form.querySelectorAll(
          `input[type="radio"][name="${CSS.escape(field.name)}"]`
        );

        const hasRequired = [...radios].some(
          radio => radio.required || radio.dataset.required === "true"
        );

        return hasRequired ? field === radios[0] : true;
      }

      return true;
    });
  }

  function getErrorElement(field) {
    const id = field.id || field.name;

    if (!id) return null;

    let errorElement = document.getElementById(`${id}-error`);

    if (!errorElement) {
      errorElement = document.createElement("p");
      errorElement.id = `${id}-error`;
      errorElement.className = "form-field-error";
      errorElement.setAttribute("aria-live", "polite");

      const container = field.closest(
        "[data-form-field], .form-group, .form-field"
      );

      if (container) {
        container.appendChild(errorElement);
      } else {
        field.insertAdjacentElement("afterend", errorElement);
      }
    }

    return errorElement;
  }

  function setFieldError(field, message) {
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");

    const errorElement = getErrorElement(field);

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = !message;
    }

    if (message) {
      const describedBy = new Set(
        (field.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter(Boolean)
      );

      if (errorElement) describedBy.add(errorElement.id);

      if (describedBy.size) {
        field.setAttribute("aria-describedby", [...describedBy].join(" "));
      }
    }
  }

  function clearFieldError(field) {
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");

    const id = field.id || field.name;
    const errorElement = id
      ? document.getElementById(`${id}-error`)
      : null;

    if (errorElement) {
      errorElement.textContent = "";
      errorElement.hidden = true;
    }
  }

  function validateForm(form, options = {}) {
    const fields = getValidationFields(form);
    const errors = [];

    fields.forEach(field => {
      if (field.type === "radio") {
        field.dataset.validationChecked = "true";
      }

      clearFieldError(field);

      const result = validateField(field, form);

      if (!result.valid) {
        result.errors.forEach(message => {
          setFieldError(field, message);
          errors.push({
            field,
            name: field.name,
            message
          });
        });
      }
    });

    if (options.focusFirstError !== false && errors.length) {
      errors[0].field.focus({ preventScroll: false });
    }

    form.dispatchEvent(
      new CustomEvent("medorbits:form-validated", {
        bubbles: true,
        detail: {
          valid: errors.length === 0,
          errors
        }
      })
    );

    return {
      valid: errors.length === 0,
      errors
    };
  }

  function serializeForm(form, options = {}) {
    const data = new FormData(form);
    const result = {};

    for (const [key, value] of data.entries()) {
      if (options.excludeEmpty && value === "") continue;

      if (Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = Array.isArray(result[key])
          ? [...result[key], value]
          : [result[key], value];
      } else {
        result[key] = value;
      }
    }

    if (options.includeUnchecked !== false) {
      form.querySelectorAll('input[type="checkbox"][name]').forEach(field => {
        if (!field.checked && !(field.name in result)) {
          result[field.name] = false;
        }
      });
    }

    if (options.asObjectURLs !== true) {
      Object.keys(result).forEach(key => {
        if (result[key] instanceof File) return;
        if (Array.isArray(result[key])) return;
      });
    }

    return result;
  }

  function serializeFormData(form) {
    return new FormData(form);
  }

  function setSubmitting(form, submitting, options = {}) {
    const buttons = form.querySelectorAll(
      'button[type="submit"], input[type="submit"], [data-submit-button]'
    );

    buttons.forEach(button => {
      if (submitting) {
        if (!state.originalButtonText.has(button)) {
          state.originalButtonText.set(
            button,
            button.tagName === "INPUT"
              ? button.value
              : button.textContent
          );
        }

        button.disabled = true;
        button.setAttribute("aria-busy", "true");

        const text = options.submittingText || DEFAULTS.submittingText;

        if (button.tagName === "INPUT") {
          button.value = text;
        } else {
          button.textContent = text;
        }
      } else {
        button.disabled = false;
        button.removeAttribute("aria-busy");

        const original = state.originalButtonText.get(button);

        if (original !== undefined) {
          if (button.tagName === "INPUT") {
            button.value = original;
          } else {
            button.textContent = original;
          }
        }
      }
    });

    form.setAttribute("aria-busy", submitting ? "true" : "false");
  }

  function showMessage(message, type = "info", container) {
    const target = typeof container === "string"
      ? document.querySelector(container)
      : container;

    if (window.MedOrbitsToast?.show) {
      window.MedOrbitsToast.show(message, type);
      return;
    }

    if (target) {
      target.textContent = message;
      target.className = `form-message form-message--${type}`;
      target.setAttribute("role", type === "error" ? "alert" : "status");
      target.hidden = false;
      return;
    }

    document.dispatchEvent(
      new CustomEvent("medorbits:toast", {
        detail: { message, type }
      })
    );
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
      const error = new Error(
        result?.message ||
        result?.error ||
        `Request failed (${response.status})`
      );

      error.status = response.status;
      error.data = result;

      throw error;
    }

    return result;
  }

  async function submitForm(form, options = {}) {
    if (state.submitting.has(form)) {
      throw new Error("This form is already being submitted.");
    }

    const validation = validateForm(form, options);

    if (!validation.valid) {
      const error = new Error("Please correct the highlighted fields.");
      error.code = "VALIDATION_ERROR";
      error.validationErrors = validation.errors;
      throw error;
    }

    const method = String(
      options.method || form.method || "POST"
    ).toUpperCase();

    const url = options.url || form.action || window.location.href;

    const useMultipart =
      options.multipart === true ||
      form.enctype === "multipart/form-data" ||
      [...form.querySelectorAll('input[type="file"]')].some(
        field => field.files?.length
      );

    const body = useMultipart
      ? serializeFormData(form)
      : JSON.stringify(serializeForm(form, {
          excludeEmpty: options.excludeEmpty
        }));

    state.submitting.add(form);
    setSubmitting(form, true, options);

    try {
      let result;

      if (typeof options.onSubmit === "function") {
        result = await options.onSubmit({
          form,
          data: useMultipart ? body : JSON.parse(body),
          validation
        });
      } else {
        result = await requestJSON(url, {
          method,
          body,
          headers: options.headers
        });
      }

      form.dispatchEvent(
        new CustomEvent("medorbits:form-success", {
          bubbles: true,
          detail: { result }
        })
      );

      showMessage(
        options.successMessage || DEFAULTS.successMessage,
        "success",
        options.messageContainer
      );

      if (options.resetOnSuccess ?? DEFAULTS.resetOnSuccess) {
        form.reset();

        form.querySelectorAll("input, select, textarea").forEach(clearFieldError);
      }

      if (typeof options.onSuccess === "function") {
        await options.onSuccess(result, form);
      }

      return result;
    } catch (error) {
      form.dispatchEvent(
        new CustomEvent("medorbits:form-error", {
          bubbles: true,
          detail: { error }
        })
      );

      if (error.code !== "VALIDATION_ERROR") {
        showMessage(
          options.errorMessage || error.message || DEFAULTS.errorMessage,
          "error",
          options.messageContainer
        );
      }

      if (window.MedOrbitsErrorHandler?.handle) {
        window.MedOrbitsErrorHandler.handle(
          error,
          { source: "form-submit", formId: form.id || null },
          { silent: true }
        );
      }

      if (typeof options.onError === "function") {
        await options.onError(error, form);
      }

      throw error;
    } finally {
      state.submitting.delete(form);
      setSubmitting(form, false, options);
    }
  }

  function bindValidation(form, options = {}) {
    const target = typeof form === "string"
      ? document.querySelector(form)
      : form;

    if (!target) return null;

    const validateOnInput = options.validateOnInput !== false;

    target.addEventListener("submit", event => {
      const result = validateForm(target, options);

      if (!result.valid) {
        event.preventDefault();
      }
    });

    if (validateOnInput) {
      target.addEventListener("input", event => {
        const field = event.target;

        if (!field.matches("input, select, textarea")) return;

        const result = validateField(field, target);

        if (result.valid) {
          clearFieldError(field);
        } else {
          setFieldError(field, result.errors[0]);
        }
      });
    }

    target.addEventListener("change", event => {
      const field = event.target;

      if (!field.matches("input, select, textarea")) return;

      const result = validateField(field, target);

      if (result.valid) {
        clearFieldError(field);
      } else {
        setFieldError(field, result.errors[0]);
      }
    });

    return {
      validate: () => validateForm(target, options),
      clear: () => {
        getValidationFields(target).forEach(clearFieldError);
      }
    };
  }

  function bindAjaxForm(form, options = {}) {
    const target = typeof form === "string"
      ? document.querySelector(form)
      : form;

    if (!target) return null;

    if (target.dataset.ajaxFormBound === "true") return target;

    target.dataset.ajaxFormBound = "true";

    target.addEventListener("submit", event => {
      event.preventDefault();

      submitForm(target, options).catch(() => {
        // Errors are already surfaced through form events and feedback.
      });
    });

    return target;
  }

  function init(root = document) {
    if (!root?.querySelectorAll) return api;

    root.querySelectorAll(DEFAULTS.formSelector).forEach(form => {
      if (form.dataset.validationBound === "true") return;

      form.dataset.validationBound = "true";
      bindValidation(form);
    });

    root.querySelectorAll("[data-ajax-form]").forEach(form => {
      bindAjaxForm(form, {
        url: form.dataset.url || form.action,
        method: form.dataset.method || form.method || "POST",
        successMessage: form.dataset.successMessage,
        errorMessage: form.dataset.errorMessage,
        resetOnSuccess: form.dataset.resetOnSuccess === "true",
        submittingText: form.dataset.submittingText
      });
    });

    return api;
  }

  const api = {
    VALIDATORS,
    validateField,
    validateForm,
    serializeForm,
    serializeFormData,
    submitForm,
    bindValidation,
    bindAjaxForm,
    setSubmitting,
    showMessage,
    requestJSON,
    clearFieldError,
    setFieldError,
    init
  };

  window.MedOrbitsForms = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), {
      once: true
    });
  } else {
    init();
  }

})(window, document);