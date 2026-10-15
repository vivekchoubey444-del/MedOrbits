/* =========================================================
   MedOrbits -- Subscription Manager
   File: /assets/js/subscription.js
========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const API_BASE = String(
    CONFIG.API_BASE_URL || CONFIG.apiBaseUrl || "/api"
  ).replace(/\/+$/, "");
  const ENDPOINTS = {
    plans: "/subscriptions/plans",
    current: "/subscriptions/current",
    subscribe: "/subscriptions/subscribe",
    cancel: "/subscriptions/cancel",
    change: "/subscriptions/change",
    history: "/subscriptions/history"
  };
  const EVENTS = {
    LOADED: "medorbits:subscription:loaded",
    UPDATED: "medorbits:subscription:updated",
    CANCELLED: "medorbits:subscription:cancelled",
    ERROR: "medorbits:subscription:error"
  };
  const state = {
    plans: [],
    current: null,
    history: [],
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
          : "Subscription request failed (" + response.status + ")."
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
            module: "subscription",
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
  function normalizePlans(data) {
    const payload = unwrap(data);
    const plans = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.plans)
        ? payload.plans
        : [];
    return plans.filter(function (plan) {
      return plan && typeof plan === "object";
    });
  }
  function normalizeSubscription(data) {
    const payload = unwrap(data);
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return payload.subscription || payload.currentSubscription || payload;
  }
  async function loadPlans() {
    const data = await request(ENDPOINTS.plans);
    state.plans = normalizePlans(data);
    renderPlans();
    emit(EVENTS.LOADED, {
      type: "plans",
      plans: state.plans.slice()
    });
    return state.plans.slice();
  }
  async function loadCurrent() {
    const data = await request(ENDPOINTS.current);
    state.current = normalizeSubscription(data);
    renderCurrent();
    emit(EVENTS.LOADED, {
      type: "current",
      subscription: state.current
    });
    return state.current;
  }
  async function loadHistory() {
    const data = await request(ENDPOINTS.history);
    const payload = unwrap(data);
    state.history = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.history)
        ? payload.history
        : [];
    renderHistory();
    emit(EVENTS.LOADED, {
      type: "history",
      history: state.history.slice()
    });
    return state.history.slice();
  }
  async function subscribe(planId, options) {
    if (!planId) {
      throw new Error("A subscription plan must be selected.");
    }
    options = options || {};
    const data = await request(ENDPOINTS.subscribe, {
      method: "POST",
      body: {
        planId: planId,
        billingCycle: options.billingCycle || "monthly"
      }
    });
    const payload = unwrap(data);
    if (payload && (payload.checkoutUrl || payload.paymentUrl)) {
      const checkoutUrl = payload.checkoutUrl || payload.paymentUrl;
      let url;
      try {
        url = new URL(checkoutUrl, window.location.origin);
      } catch (_) {
        throw new Error("The checkout URL is invalid.");
      }
      if (url.protocol !== "https:" && url.origin !== window.location.origin) {
        throw new Error("The checkout URL is not permitted.");
      }
      window.location.assign(url.href);
      return payload;
    }
    state.current = normalizeSubscription(payload);
    renderCurrent();
    emit(EVENTS.UPDATED, {
      subscription: state.current,
      response: payload
    });
    return payload;
  }
  async function changePlan(planId, options) {
    if (!planId) {
      throw new Error("A subscription plan must be selected.");
    }
    options = options || {};
    const data = await request(ENDPOINTS.change, {
      method: "POST",
      body: {
        planId: planId,
        billingCycle: options.billingCycle || "monthly"
      }
    });
    const payload = unwrap(data);
    state.current = normalizeSubscription(payload);
    renderCurrent();
    emit(EVENTS.UPDATED, {
      subscription: state.current,
      response: payload
    });
    return payload;
  }
  async function cancel(options) {
    options = options || {};
    const confirmed = options.confirm === false
      ? true
      : window.confirm(
          "Are you sure you want to cancel your subscription?"
        );
    if (!confirmed) return false;
    const data = await request(ENDPOINTS.cancel, {
      method: "POST",
      body: {
        reason: options.reason || "",
        immediate: Boolean(options.immediate)
      }
    });
    const payload = unwrap(data);
    state.current = normalizeSubscription(payload);
    renderCurrent();
    emit(EVENTS.CANCELLED, {
      subscription: state.current,
      response: payload
    });
    return payload;
  }
  function formatCurrency(amount, currency) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "--";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 2
      }).format(value);
    } catch (_) {
      return value.toFixed(2) + " " + (currency || "INR");
    }
  }
  function formatDate(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "--";
    }
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }
  function getPlanPrice(plan, cycle) {
    if (!plan) return null;
    const normalizedCycle = cycle || "monthly";
    const prices = plan.prices || plan.pricing || {};
    if (prices[normalizedCycle] !== undefined) {
      return prices[normalizedCycle];
    }
    const directKey = normalizedCycle + "Price";
    if (plan[directKey] !== undefined) {
      return plan[directKey];
    }
    if (plan.price !== undefined) {
      return plan.price;
    }
    return null;
  }
  function renderPlans() {
    document.querySelectorAll("[data-subscription-plans]").forEach(function (container) {
      const cycle = container.dataset.billingCycle || "monthly";
      if (!state.plans.length) {
        container.innerHTML =
          '<p class="subscription-empty">No subscription plans are available.</p>';
        return;
      }
      container.innerHTML = state.plans.map(function (plan) {
        const id = plan.id || plan.planId || "";
        const name = plan.name || plan.title || "Subscription plan";
        const description = plan.description || "";
        const currency = plan.currency || "INR";
        const price = getPlanPrice(plan, cycle);
        const features = Array.isArray(plan.features) ? plan.features : [];
        const selected = state.current &&
          String(state.current.planId || state.current.plan_id || "") === String(id);
        return [
          '<article class="subscription-plan' + (selected ? " is-current" : "") + '">',
          '<h3>' + escapeHTML(name) + '</h3>',
          '<p>' + escapeHTML(description) + '</p>',
          '<p class="subscription-plan__price">',
          escapeHTML(price === null ? "Contact us" : formatCurrency(price, currency)),
          price === null ? "" : '<span> / ' + escapeHTML(cycle) + '</span>',
          '</p>',
          features.length
            ? '<ul class="subscription-plan__features">' +
              features.map(function (feature) {
                const label = typeof feature === "string"
                  ? feature
                  : feature && feature.name
                    ? feature.name
                    : "";
                return '<li>' + escapeHTML(label) + '</li>';
              }).join("") +
              '</ul>'
            : "",
          '<button type="button" class="subscription-plan__button" ' +
            'data-subscribe-plan="' + escapeHTML(id) + '" ' +
            (selected ? "disabled" : "") + '>',
          selected ? "Current Plan" : "Choose Plan",
          '</button>',
          '</article>'
        ].join("");
      }).join("");
    });
  }
  function renderCurrent() {
    document.querySelectorAll("[data-subscription-current]").forEach(function (container) {
      const subscription = state.current;
      if (!subscription) {
        container.innerHTML =
          '<p class="subscription-empty">You do not have an active subscription.</p>';
        return;
      }
      const planName =
        subscription.planName ||
        subscription.plan_name ||
        (subscription.plan && subscription.plan.name) ||
        "Subscription";
      const status = subscription.status || "unknown";
      const currency = subscription.currency || "INR";
      const price = subscription.amount !== undefined
        ? subscription.amount
        : subscription.price;
      container.innerHTML = [
        '<section class="subscription-summary">',
        '<h3>' + escapeHTML(planName) + '</h3>',
        '<p>Status: <strong>' + escapeHTML(status) + '</strong></p>',
        price !== undefined
          ? '<p>Price: ' + escapeHTML(formatCurrency(price, currency)) + '</p>'
          : "",
        '<p>Started: ' + escapeHTML(formatDate(
          subscription.startedAt || subscription.started_at || subscription.startDate
        )) + '</p>',
        '<p>Renews / expires: ' + escapeHTML(formatDate(
          subscription.renewsAt ||
          subscription.renews_at ||
          subscription.expiresAt ||
          subscription.expires_at
        )) + '</p>',
        '</section>'
      ].join("");
    });
    document.querySelectorAll("[data-cancel-subscription]").forEach(function (button) {
      const status = String(state.current && state.current.status || "").toLowerCase();
      button.hidden = !state.current ||
        ["cancelled", "canceled", "expired", "inactive"].includes(status);
    });
  }
  function renderHistory() {
    document.querySelectorAll("[data-subscription-history]").forEach(function (container) {
      if (!state.history.length) {
        container.innerHTML =
          '<p class="subscription-empty">No subscription history found.</p>';
        return;
      }
      container.innerHTML = [
        '<div class="subscription-history-list">',
        state.history.map(function (item) {
          const name = item.planName || item.plan_name || item.name || "Subscription";
          const status = item.status || "unknown";
          const currency = item.currency || "INR";
          const amount = item.amount !== undefined ? item.amount : item.price;
          return [
            '<article class="subscription-history-item">',
            '<h4>' + escapeHTML(name) + '</h4>',
            '<p>Status: ' + escapeHTML(status) + '</p>',
            amount !== undefined
              ? '<p>Amount: ' + escapeHTML(formatCurrency(amount, currency)) + '</p>'
              : "",
            '<p>Date: ' + escapeHTML(formatDate(
              item.createdAt || item.created_at || item.date
            )) + '</p>',
            '</article>'
          ].join("");
        }).join(""),
        '</div>'
      ].join("");
    });
  }
  function setLoading(loading) {
    state.loading = Boolean(loading);
    document.querySelectorAll("[data-subscription-submit]").forEach(function (button) {
      button.disabled = state.loading;
      button.setAttribute("aria-busy", String(state.loading));
    });
  }
  function showMessage(message, isError) {
    document.querySelectorAll("[data-subscription-message]").forEach(function (element) {
      element.textContent = message;
      element.hidden = !message;
      element.setAttribute("role", isError ? "alert" : "status");
    });
  }
  function handleError(error) {
    showMessage(
      error && error.message
        ? error.message
        : "Unable to complete the subscription request.",
      true
    );
  }
  async function refresh() {
    setLoading(true);
    try {
      await Promise.allSettled([
        loadPlans(),
        loadCurrent(),
        loadHistory()
      ]);
    } finally {
      setLoading(false);
    }
    return getState();
  }
  function getState() {
    return {
      plans: state.plans.slice(),
      current: state.current,
      history: state.history.slice(),
      loading: state.loading
    };
  }
  function bindEvents() {
    document.addEventListener("click", async function (event) {
      const subscribeButton = event.target.closest("[data-subscribe-plan]");
      const cancelButton = event.target.closest("[data-cancel-subscription]");
      if (subscribeButton) {
        const planId = subscribeButton.dataset.subscribePlan;
        const cycleContainer = subscribeButton.closest("[data-subscription-plans]");
        const billingCycle = cycleContainer
          ? cycleContainer.dataset.billingCycle || "monthly"
          : "monthly";
        setLoading(true);
        showMessage("", false);
        try {
          await subscribe(planId, { billingCycle: billingCycle });
          showMessage("Subscription request completed.", false);
        } catch (error) {
          handleError(error);
        } finally {
          setLoading(false);
        }
        return;
      }
      if (cancelButton) {
        setLoading(true);
        showMessage("", false);
        try {
          await cancel();
          showMessage("Subscription cancellation request completed.", false);
        } catch (error) {
          handleError(error);
        } finally {
          setLoading(false);
        }
      }
    });
    document.querySelectorAll("[data-subscription-billing-cycle]").forEach(function (control) {
      control.addEventListener("change", function () {
        const container = control.closest("[data-subscription-plans]");
        if (container) {
          container.dataset.billingCycle = control.value || "monthly";
          renderPlans();
        }
      });
    });
  }
  function init() {
    const hasSubscriptionUI =
      document.querySelector(
        "[data-subscription-plans], [data-subscription-current], " +
        "[data-subscription-history], [data-subscription-submit], " +
        "[data-cancel-subscription]"
      );
    if (!hasSubscriptionUI) return;
    bindEvents();
    refresh().catch(handleError);
  }
  const api = Object.freeze({
    loadPlans: loadPlans,
    loadCurrent: loadCurrent,
    loadHistory: loadHistory,
    subscribe: subscribe,
    changePlan: changePlan,
    cancel: cancel,
    refresh: refresh,
    getState: getState,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    renderPlans: renderPlans,
    renderCurrent: renderCurrent,
    renderHistory: renderHistory,
    events: Object.freeze(EVENTS)
  });
  window.MedOrbitsSubscription = api;
  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Subscription = api;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);