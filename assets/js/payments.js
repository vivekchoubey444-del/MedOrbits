/* =========================================================
   MedOrbits -- Payments Manager
   File: /assets/js/payments.js
   Purpose: Payment history, checkout, invoices, subscriptions,
            payment status, refunds and payment methods
   ========================================================= */
(function (window, document) {
  "use strict";
  const CONFIG = window.MedOrbitsConfig || {};
  const API_BASE =
    CONFIG.API_BASE_URL ||
    CONFIG.apiBaseUrl ||
    "/api";
  const DEFAULT_PAGE_SIZE = 10;
  const state = {
    payments: [],
    paymentMethods: [],
    invoices: [],
    subscriptions: [],
    activePayment: null,
    loading: false,
    processing: false,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    initialized: false
  };
  const listeners = new Map();
  const PAYMENT_STATUSES = [
    "pending",
    "processing",
    "completed",
    "failed",
    "cancelled",
    "refunded",
    "partially_refunded"
  ];
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
        new CustomEvent("medorbits:payments:" + name, {
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
      }
    },
    formatCurrency(amount, currency) {
      const value = Number(amount);
      if (!Number.isFinite(value)) return "--";
      const code = String(currency || "INR").toUpperCase();
      try {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: code,
          maximumFractionDigits: 2
        }).format(value);
      } catch (_) {
        return code + " " + value.toFixed(2);
      }
    },
    formatDate(value) {
      if (!value) return "--";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "--";
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
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
    normalizeStatus(status) {
      return String(status || "pending")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    },
    safeUrl(value) {
      if (!value) return "";
      try {
        const url = new URL(String(value), window.location.origin);
        if (!["http:", "https:"].includes(url.protocol)) {
          return "";
        }
        return url.href;
      } catch (_) {
        return "";
      }
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
    } else if (settings.responseType === "blob" && response.ok) {
      data = await response.blob();
    } else {
      data = await response.text().catch(() => "");
    }
    if (!response.ok) {
      const error = new Error(
        data?.message ||
        data?.error ||
        "Payment request failed (" + response.status + ")."
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }
  function normalizePayment(item) {
    const payment = item || {};
    return {
      id: String(
        payment.id ||
        payment._id ||
        payment.paymentId ||
        ""
      ),
      orderId: String(
        payment.orderId ||
        payment.order_id ||
        payment.gatewayOrderId ||
        ""
      ),
      transactionId: String(
        payment.transactionId ||
        payment.transaction_id ||
        payment.gatewayTransactionId ||
        ""
      ),
      description: String(
        payment.description ||
        payment.title ||
        payment.purpose ||
        "Payment"
      ),
      amount: Number(payment.amount ?? payment.total ?? 0),
      currency: String(payment.currency || "INR").toUpperCase(),
      status: utils.normalizeStatus(payment.status),
      method: String(
        payment.method ||
        payment.paymentMethod ||
        payment.payment_method ||
        ""
      ),
      createdAt:
        payment.createdAt ||
        payment.created_at ||
        payment.date ||
        null,
      updatedAt: payment.updatedAt || payment.updated_at || null,
      invoiceId: String(payment.invoiceId || payment.invoice_id || ""),
      invoiceUrl: utils.safeUrl(payment.invoiceUrl || payment.invoice_url || ""),
      receiptUrl: utils.safeUrl(payment.receiptUrl || payment.receipt_url || ""),
      refundAmount: Number(payment.refundAmount || payment.refund_amount || 0),
      metadata: payment.metadata || {}
    };
  }
  function normalizePaymentMethod(item) {
    const method = item || {};
    return {
      id: String(method.id || method._id || ""),
      type: String(method.type || method.method || "unknown"),
      brand: String(method.brand || ""),
      last4: String(method.last4 || method.last_four || ""),
      expiryMonth: method.expiryMonth || method.expiry_month || null,
      expiryYear: method.expiryYear || method.expiry_year || null,
      isDefault: Boolean(method.isDefault || method.is_default),
      displayName: String(method.displayName || method.name || "")
    };
  }
  function normalizeSubscription(item) {
    const subscription = item || {};
    return {
      id: String(subscription.id || subscription._id || ""),
      planId: String(subscription.planId || subscription.plan_id || ""),
      planName: String(
        subscription.planName ||
        subscription.plan_name ||
        subscription.name ||
        "Subscription"
      ),
      amount: Number(subscription.amount || 0),
      currency: String(subscription.currency || "INR").toUpperCase(),
      status: utils.normalizeStatus(subscription.status),
      interval: String(subscription.interval || subscription.billingInterval || "monthly"),
      startDate: subscription.startDate || subscription.start_date || null,
      nextBillingDate: subscription.nextBillingDate || subscription.next_billing_date || null,
      cancelAtPeriodEnd: Boolean(
        subscription.cancelAtPeriodEnd ||
        subscription.cancel_at_period_end
      )
    };
  }
  function normalizeList(response, key) {
    if (Array.isArray(response)) return response;
    return (
      response?.data?.[key] ||
      response?.[key] ||
      response?.data?.items ||
      response?.items ||
      response?.data ||
      []
    );
  }
  function setLoading(loading) {
    state.loading = Boolean(loading);
    document.querySelectorAll("[data-payments-loading]").forEach((element) => {
      element.hidden = !state.loading;
    });
    utils.dispatch("loading", { loading: state.loading });
  }
  function setProcessing(processing) {
    state.processing = Boolean(processing);
    document.querySelectorAll("[data-payment-submit]").forEach((button) => {
      button.disabled = state.processing;
      button.setAttribute("aria-busy", String(state.processing));
      const label = button.querySelector("[data-payment-button-label]");
      if (label) {
        if (!button.dataset.originalLabel) {
          button.dataset.originalLabel = label.textContent;
        }
        label.textContent = state.processing
          ? "Processing…"
          : button.dataset.originalLabel;
      }
    });
    utils.dispatch("processing", { processing: state.processing });
  }
  async function loadPayments(options) {
    const settings = options || {};
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(settings.page || state.page),
        limit: String(settings.limit || state.pageSize)
      });
      if (settings.status) params.set("status", settings.status);
      if (settings.search) params.set("search", settings.search);
      if (settings.from) params.set("from", settings.from);
      if (settings.to) params.set("to", settings.to);
      const response = await request("/payments?" + params.toString());
      state.payments = normalizeList(response, "payments")
        .map(normalizePayment)
        .filter((payment) => payment.id);
      state.page = Number(settings.page) || state.page;
      state.pageSize = Number(settings.limit) || state.pageSize;
      state.total = Number(
        response?.total ??
        response?.data?.total ??
        response?.meta?.total ??
        state.payments.length
      );
      renderPayments(settings.container);
      utils.dispatch("payments-loaded", {
        payments: state.payments,
        total: state.total,
        page: state.page
      });
      return state.payments;
    } catch (error) {
      utils.notify(error.message || "Unable to load payment history.", "error");
      utils.dispatch("error", { error, action: "load-payments" });
      throw error;
    } finally {
      setLoading(false);
    }
  }
  async function loadPayment(paymentId) {
    const id = String(paymentId || "");
    if (!id) throw new Error("A payment ID is required.");
    setLoading(true);
    try {
      const response = await request(
        "/payments/" + encodeURIComponent(id)
      );
      const raw =
        response?.data?.payment ||
        response?.payment ||
        response?.data ||
        response;
      state.activePayment = normalizePayment(raw);
      utils.dispatch("payment-loaded", {
        payment: state.activePayment
      });
      return state.activePayment;
    } finally {
      setLoading(false);
    }
  }
  async function createCheckout(payload) {
    const data = payload || {};
    const amount = Number(data.amount);
    if (!data.productId && !data.planId && !data.applicationId) {
      throw new Error("A valid product, plan or application is required.");
    }
    if (data.amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      throw new Error("The payment amount must be greater than zero.");
    }
    setProcessing(true);
    try {
      const response = await request("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({
          productId: data.productId || null,
          planId: data.planId || null,
          applicationId: data.applicationId || null,
          amount: data.amount === undefined ? undefined : amount,
          currency: String(data.currency || "INR").toUpperCase(),
          description: String(data.description || "").slice(0, 500),
          successUrl: utils.safeUrl(data.successUrl || ""),
          cancelUrl: utils.safeUrl(data.cancelUrl || ""),
          metadata: data.metadata || {}
        })
      });
      const checkout =
        response?.data?.checkout ||
        response?.checkout ||
        response?.data ||
        response;
      const checkoutUrl = utils.safeUrl(
        checkout.checkoutUrl ||
        checkout.checkout_url ||
        checkout.paymentUrl ||
        checkout.payment_url ||
        ""
      );
      utils.dispatch("checkout-created", { checkout });
      if (checkoutUrl && data.redirect !== false) {
        window.location.assign(checkoutUrl);
      }
      return checkout;
    } catch (error) {
      utils.dispatch("error", { error, action: "create-checkout" });
      throw error;
    } finally {
      setProcessing(false);
    }
  }
  async function verifyPayment(payload) {
    const data = payload || {};
    if (!data.paymentId && !data.orderId && !data.transactionId) {
      throw new Error("Payment verification details are required.");
    }
    setProcessing(true);
    try {
      const response = await request("/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          paymentId: data.paymentId || null,
          orderId: data.orderId || null,
          transactionId: data.transactionId || null,
          provider: data.provider || null
        })
      });
      const raw =
        response?.data?.payment ||
        response?.payment ||
        response?.data ||
        response;
      const payment = normalizePayment(raw);
      if (payment.id) {
        const index = state.payments.findIndex(
          (item) => item.id === payment.id
        );
        if (index >= 0) {
          state.payments[index] = payment;
        } else {
          state.payments.unshift(payment);
        }
      }
      state.activePayment = payment;
      renderPayments();
      utils.dispatch("payment-verified", { payment });
      return payment;
    } catch (error) {
      utils.dispatch("error", { error, action: "verify-payment" });
      throw error;
    } finally {
      setProcessing(false);
    }
  }
  async function cancelPayment(paymentId, reason) {
    const id = String(paymentId || "");
    if (!id) throw new Error("A payment ID is required.");
    const response = await request(
      "/payments/" + encodeURIComponent(id) + "/cancel",
      {
        method: "POST",
        body: JSON.stringify({
          reason: String(reason || "").slice(0, 500)
        })
      }
    );
    const index = state.payments.findIndex((item) => item.id === id);
    if (index >= 0) {
      state.payments[index] = normalizePayment(
        response?.data?.payment ||
        response?.payment ||
        response?.data ||
        response
      );
    }
    renderPayments();
    utils.dispatch("payment-cancelled", {
      paymentId: id,
      response
    });
    return response;
  }
  async function requestRefund(paymentId, payload) {
    const id = String(paymentId || "");
    const data = payload || {};
    if (!id) throw new Error("A payment ID is required.");
    if (!window.confirm("Submit a refund request for this payment?")) {
      return null;
    }
    const amount = data.amount === undefined
      ? undefined
      : Number(data.amount);
    if (
      amount !== undefined &&
      (!Number.isFinite(amount) || amount <= 0)
    ) {
      throw new Error("Enter a valid refund amount.");
    }
    const response = await request(
      "/payments/" + encodeURIComponent(id) + "/refund",
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          reason: String(data.reason || "").slice(0, 1000)
        })
      }
    );
    utils.dispatch("refund-requested", {
      paymentId: id,
      response
    });
    return response;
  }
  async function loadInvoices(options) {
    const settings = options || {};
    const params = new URLSearchParams();
    if (settings.page) params.set("page", String(settings.page));
    if (settings.limit) params.set("limit", String(settings.limit));
    if (settings.status) params.set("status", settings.status);
    const response = await request(
      "/payments/invoices" +
      (params.toString() ? "?" + params.toString() : "")
    );
    state.invoices = normalizeList(response, "invoices");
    renderInvoices(settings.container);
    utils.dispatch("invoices-loaded", {
      invoices: state.invoices
    });
    return state.invoices;
  }
  async function downloadInvoice(invoiceId, filename) {
    const id = String(invoiceId || "");
    if (!id) throw new Error("An invoice ID is required.");
    const token =
      window.MedOrbitsAuth?.getToken?.() ||
      window.MedOrbitsAuth?.getAccessToken?.();
    const headers = {};
    if (token) {
      headers.Authorization = "Bearer " + token;
    }
    const response = await fetch(
      API_BASE + "/payments/invoices/" + encodeURIComponent(id) + "/download",
      {
        method: "GET",
        headers,
        credentials: "same-origin"
      }
    );
    if (!response.ok) {
      throw new Error("Unable to download invoice.");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || "invoice-" + id + ".pdf";
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    utils.dispatch("invoice-downloaded", {
      invoiceId: id
    });
    return true;
  }
  async function loadPaymentMethods() {
    const response = await request("/payments/methods");
    state.paymentMethods = normalizeList(response, "paymentMethods")
      .map(normalizePaymentMethod)
      .filter((method) => method.id);
    renderPaymentMethods();
    utils.dispatch("payment-methods-loaded", {
      paymentMethods: state.paymentMethods
    });
    return state.paymentMethods;
  }
  async function setDefaultPaymentMethod(methodId) {
    const id = String(methodId || "");
    if (!id) throw new Error("A payment method ID is required.");
    await request(
      "/payments/methods/" + encodeURIComponent(id) + "/default",
      {
        method: "PATCH",
        body: JSON.stringify({})
      }
    );
    state.paymentMethods = state.paymentMethods.map((method) => ({
      ...method,
      isDefault: method.id === id
    }));
    renderPaymentMethods();
    utils.dispatch("payment-method-default-changed", {
      methodId: id
    });
    return true;
  }
  async function removePaymentMethod(methodId) {
    const id = String(methodId || "");
    if (!id) throw new Error("A payment method ID is required.");
    if (!window.confirm("Remove this saved payment method?")) {
      return false;
    }
    await request(
      "/payments/methods/" + encodeURIComponent(id),
      { method: "DELETE" }
    );
    state.paymentMethods = state.paymentMethods.filter(
      (method) => method.id !== id
    );
    renderPaymentMethods();
    utils.dispatch("payment-method-removed", {
      methodId: id
    });
    return true;
  }
  async function loadSubscriptions() {
    const response = await request("/subscriptions");
    state.subscriptions = normalizeList(response, "subscriptions")
      .map(normalizeSubscription)
      .filter((subscription) => subscription.id);
    renderSubscriptions();
    utils.dispatch("subscriptions-loaded", {
      subscriptions: state.subscriptions
    });
    return state.subscriptions;
  }
  async function cancelSubscription(subscriptionId, options) {
    const id = String(subscriptionId || "");
    const settings = options || {};
    if (!id) throw new Error("A subscription ID is required.");
    const response = await request(
      "/subscriptions/" + encodeURIComponent(id) + "/cancel",
      {
        method: "POST",
        body: JSON.stringify({
          immediately: Boolean(settings.immediately),
          reason: String(settings.reason || "").slice(0, 500)
        })
      }
    );
    const index = state.subscriptions.findIndex(
      (subscription) => subscription.id === id
    );
    if (index >= 0) {
      state.subscriptions[index] = normalizeSubscription(
        response?.data?.subscription ||
        response?.subscription ||
        response?.data ||
        response
      );
    }
    renderSubscriptions();
    utils.dispatch("subscription-cancelled", {
      subscriptionId: id,
      response
    });
    return response;
  }
  function statusLabel(status) {
    const normalized = utils.normalizeStatus(status);
    return normalized
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  function renderPayments(target) {
    const containers = target
      ? [utils.getElement(target)]
      : Array.from(document.querySelectorAll("[data-payments-list]"));
    containers.filter(Boolean).forEach((container) => {
      const payments = state.payments;
      if (!payments.length) {
        container.innerHTML =
          '<div class="mo-payments-empty" role="status">No payment records found.</div>';
        return;
      }
      container.innerHTML = payments.map((payment) => {
        const status = utils.escapeHTML(payment.status);
        const statusClass = PAYMENT_STATUSES.includes(payment.status)
          ? payment.status.replace(/_/g, "-")
          : "unknown";
        return `
          <article
            class="mo-payment-item"
            data-payment-id="${utils.escapeHTML(payment.id)}"
          >
            <div class="mo-payment-main">
              <h3>${utils.escapeHTML(payment.description)}</h3>
              <p class="mo-payment-reference">
                ${payment.transactionId
                  ? "Transaction: " + utils.escapeHTML(payment.transactionId)
                  : "Payment reference: " + utils.escapeHTML(payment.id)}
              </p>
              <time datetime="${utils.escapeHTML(payment.createdAt || "")}">
                ${utils.escapeHTML(utils.formatDate(payment.createdAt))}
              </time>
            </div>
            <div class="mo-payment-amount">
              <strong>${utils.escapeHTML(
                utils.formatCurrency(payment.amount, payment.currency)
              )}</strong>
              <span class="mo-payment-status status-${statusClass}">
                ${utils.escapeHTML(statusLabel(status))}
              </span>
            </div>
            <div class="mo-payment-actions">
              <button
                type="button"
                data-payment-view="${utils.escapeHTML(payment.id)}"
              >Details</button>
              ${
                payment.invoiceId
                  ? `<button
                       type="button"
                       data-payment-invoice="${utils.escapeHTML(payment.invoiceId)}"
                     >Download invoice</button>`
                  : ""
              }
              ${
                payment.status === "pending"
                  ? `<button
                       type="button"
                       data-payment-cancel="${utils.escapeHTML(payment.id)}"
                     >Cancel</button>`
                  : ""
              }
              ${
                ["completed", "partially_refunded"].includes(payment.status)
                  ? `<button
                       type="button"
                       data-payment-refund="${utils.escapeHTML(payment.id)}"
                     >Request refund</button>`
                  : ""
              }
            </div>
          </article>
        `;
      }).join("");
    });
  }
  function renderInvoices(target) {
    const containers = target
      ? [utils.getElement(target)]
      : Array.from(document.querySelectorAll("[data-invoices-list]"));
    containers.filter(Boolean).forEach((container) => {
      if (!state.invoices.length) {
        container.innerHTML =
          '<div class="mo-invoices-empty" role="status">No invoices found.</div>';
        return;
      }
      container.innerHTML = state.invoices.map((invoice) => {
        const id = String(invoice.id || invoice._id || invoice.invoiceId || "");
        const number = String(invoice.invoiceNumber || invoice.number || id);
        const amount = Number(invoice.amount || invoice.total || 0);
        const currency = String(invoice.currency || "INR");
        const date = invoice.createdAt || invoice.created_at || invoice.date;
        return `
          <article class="mo-invoice-item" data-invoice-id="${utils.escapeHTML(id)}">
            <div>
              <strong>${utils.escapeHTML(number)}</strong>
              <time>${utils.escapeHTML(utils.formatDate(date))}</time>
            </div>
            <strong>${utils.escapeHTML(utils.formatCurrency(amount, currency))}</strong>
            <button
              type="button"
              data-payment-invoice="${utils.escapeHTML(id)}"
            >Download PDF</button>
          </article>
        `;
      }).join("");
    });
  }
  function renderPaymentMethods(target) {
    const containers = target
      ? [utils.getElement(target)]
      : Array.from(document.querySelectorAll("[data-payment-methods]"));
    containers.filter(Boolean).forEach((container) => {
      if (!state.paymentMethods.length) {
        container.innerHTML =
          '<div class="mo-payment-methods-empty">No saved payment methods.</div>';
        return;
      }
      container.innerHTML = state.paymentMethods.map((method) => {
        const label = [
          method.brand,
          method.last4 ? "•••• " + method.last4 : "",
          method.displayName
        ].filter(Boolean).join(" ");
        return `
          <article class="mo-payment-method" data-payment-method-id="${utils.escapeHTML(method.id)}">
            <div class="mo-payment-method-info">
              <strong>${utils.escapeHTML(label || method.type)}</strong>
              ${method.isDefault ? '<span class="mo-payment-default">Default</span>' : ""}
              ${
                method.expiryMonth && method.expiryYear
                  ? `<small>Expires ${utils.escapeHTML(method.expiryMonth)}/${utils.escapeHTML(method.expiryYear)}</small>`
                  : ""
              }
            </div>
            ${
              !method.isDefault
                ? `<button type="button" data-payment-method-default="${utils.escapeHTML(method.id)}">Set default</button>`
                : ""
            }
            <button
              type="button"
              data-payment-method-remove="${utils.escapeHTML(method.id)}"
            >Remove</button>
          </article>
        `;
      }).join("");
    });
  }
  function renderSubscriptions(target) {
    const containers = target
      ? [utils.getElement(target)]
      : Array.from(document.querySelectorAll("[data-subscriptions-list]"));
    containers.filter(Boolean).forEach((container) => {
      if (!state.subscriptions.length) {
        container.innerHTML =
          '<div class="mo-subscriptions-empty">No subscriptions found.</div>';
        return;
      }
      container.innerHTML = state.subscriptions.map((subscription) => `
        <article
          class="mo-subscription-item"
          data-subscription-id="${utils.escapeHTML(subscription.id)}"
        >
          <div>
            <h3>${utils.escapeHTML(subscription.planName)}</h3>
            <strong>${utils.escapeHTML(
              utils.formatCurrency(subscription.amount, subscription.currency)
            )}</strong>
            <span>${utils.escapeHTML(subscription.interval)}</span>
          </div>
          <div class="mo-subscription-status">
            ${utils.escapeHTML(statusLabel(subscription.status))}
          </div>
          <div class="mo-subscription-dates">
            ${
              subscription.nextBillingDate
                ? `<p>Next billing: ${utils.escapeHTML(utils.formatDate(subscription.nextBillingDate))}</p>`
                : ""
            }
          </div>
          ${
            ["active", "trialing"].includes(subscription.status) &&
            !subscription.cancelAtPeriodEnd
              ? `<button
                   type="button"
                   data-subscription-cancel="${utils.escapeHTML(subscription.id)}"
                 >Cancel subscription</button>`
              : ""
          }
        </article>
      `).join("");
    });
  }
  function renderPaymentDetails(payment, target) {
    const container = utils.getElement(
      target || "[data-payment-details]"
    );
    if (!container || !payment) return;
    container.innerHTML = `
      <div class="mo-payment-details">
        <h2>${utils.escapeHTML(payment.description)}</h2>
        <dl>
          <dt>Amount</dt>
          <dd>${utils.escapeHTML(
            utils.formatCurrency(payment.amount, payment.currency)
          )}</dd>
          <dt>Status</dt>
          <dd>${utils.escapeHTML(statusLabel(payment.status))}</dd>
          <dt>Payment ID</dt>
          <dd>${utils.escapeHTML(payment.id)}</dd>
          <dt>Transaction ID</dt>
          <dd>${utils.escapeHTML(payment.transactionId || "--")}</dd>
          <dt>Payment method</dt>
          <dd>${utils.escapeHTML(payment.method || "--")}</dd>
          <dt>Date</dt>
          <dd>${utils.escapeHTML(utils.formatDate(payment.createdAt))}</dd>
          ${
            payment.refundAmount
              ? `<dt>Refunded</dt><dd>${utils.escapeHTML(
                  utils.formatCurrency(payment.refundAmount, payment.currency)
                )}</dd>`
              : ""
          }
        </dl>
      </div>
    `;
  }
  function bindActions() {
    document.addEventListener("click", async function (event) {
      const viewButton = event.target.closest("[data-payment-view]");
      if (viewButton) {
        try {
          const payment = await loadPayment(viewButton.dataset.paymentView);
          renderPaymentDetails(payment);
          utils.dispatch("details-requested", { payment });
        } catch (error) {
          utils.notify(error.message || "Unable to load payment details.", "error");
        }
        return;
      }
      const invoiceButton = event.target.closest("[data-payment-invoice]");
      if (invoiceButton) {
        try {
          await downloadInvoice(
            invoiceButton.dataset.paymentInvoice
          );
        } catch (error) {
          utils.notify(error.message || "Invoice download failed.", "error");
        }
        return;
      }
      const cancelButton = event.target.closest("[data-payment-cancel]");
      if (cancelButton) {
        const id = cancelButton.dataset.paymentCancel;
        if (!window.confirm("Cancel this pending payment?")) return;
        try {
          await cancelPayment(id);
          utils.notify("Payment cancellation requested.", "success");
          await loadPayments();
        } catch (error) {
          utils.notify(error.message || "Unable to cancel payment.", "error");
        }
        return;
      }
      const refundButton = event.target.closest("[data-payment-refund]");
      if (refundButton) {
        try {
          await requestRefund(refundButton.dataset.paymentRefund, {});
          utils.notify("Refund request submitted.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to request refund.", "error");
        }
        return;
      }
      const defaultMethodButton = event.target.closest(
        "[data-payment-method-default]"
      );
      if (defaultMethodButton) {
        try {
          await setDefaultPaymentMethod(
            defaultMethodButton.dataset.paymentMethodDefault
          );
          utils.notify("Default payment method updated.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to update payment method.", "error");
        }
        return;
      }
      const removeMethodButton = event.target.closest(
        "[data-payment-method-remove]"
      );
      if (removeMethodButton) {
        try {
          const removed = await removePaymentMethod(
            removeMethodButton.dataset.paymentMethodRemove
          );
          if (removed) {
            utils.notify("Payment method removed.", "success");
          }
        } catch (error) {
          utils.notify(error.message || "Unable to remove payment method.", "error");
        }
        return;
      }
      const cancelSubscriptionButton = event.target.closest(
        "[data-subscription-cancel]"
      );
      if (cancelSubscriptionButton) {
        if (!window.confirm("Cancel this subscription?")) return;
        try {
          await cancelSubscription(
            cancelSubscriptionButton.dataset.subscriptionCancel
          );
          utils.notify("Subscription cancellation requested.", "success");
        } catch (error) {
          utils.notify(error.message || "Unable to cancel subscription.", "error");
        }
      }
    });
  }
  function bindCheckoutForms() {
    document.querySelectorAll("[data-payment-checkout]").forEach((form) => {
      if (form.dataset.paymentsBound === "true") return;
      form.dataset.paymentsBound = "true";
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const formData = new FormData(form);
        const payload = {
          productId: formData.get("productId"),
          planId: formData.get("planId"),
          applicationId: formData.get("applicationId"),
          amount: formData.get("amount") || undefined,
          currency: formData.get("currency") || "INR",
          description: formData.get("description") || "",
          successUrl: formData.get("successUrl") || "",
          cancelUrl: formData.get("cancelUrl") || ""
        };
        const submitButton = form.querySelector(
          'button[type="submit"], input[type="submit"]'
        );
        if (submitButton) submitButton.disabled = true;
        try {
          await createCheckout(payload);
        } catch (error) {
          utils.notify(error.message || "Unable to start checkout.", "error");
        } finally {
          if (submitButton) submitButton.disabled = false;
        }
      });
    });
  }
  function bindPaymentFilters() {
    document.querySelectorAll("[data-payment-filter]").forEach((control) => {
      if (control.dataset.paymentsBound === "true") return;
      control.dataset.paymentsBound = "true";
      control.addEventListener("change", function () {
        const status = control.value || "";
        loadPayments({
          page: 1,
          status,
          container: control.dataset.target || undefined
        }).catch(() => {});
      });
    });
    document.querySelectorAll("[data-payments-refresh]").forEach((button) => {
      if (button.dataset.paymentsBound === "true") return;
      button.dataset.paymentsBound = "true";
      button.addEventListener("click", function () {
        loadPayments().catch(() => {});
      });
    });
  }
  function on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("A callback function is required.");
    }
    const event = "medorbits:payments:" + eventName;
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
    const event = "medorbits:payments:" + eventName;
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
    const settings = options || {};
    if (state.initialized && !settings.force) {
      return api;
    }
    bindActions();
    bindCheckoutForms();
    bindPaymentFilters();
    const tasks = [];
    if (settings.payments !== false &&
        document.querySelector("[data-payments-list]")) {
      tasks.push(loadPayments().catch(() => []));
    }
    if (settings.invoices !== false &&
        document.querySelector("[data-invoices-list]")) {
      tasks.push(loadInvoices().catch(() => []));
    }
    if (settings.paymentMethods !== false &&
        document.querySelector("[data-payment-methods]")) {
      tasks.push(loadPaymentMethods().catch(() => []));
    }
    if (settings.subscriptions !== false &&
        document.querySelector("[data-subscriptions-list]")) {
      tasks.push(loadSubscriptions().catch(() => []));
    }
    await Promise.allSettled(tasks);
    state.initialized = true;
    utils.dispatch("initialized");
    return api;
  }
  function destroy() {
    listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        document.removeEventListener(event, callback);
      });
    });
    listeners.clear();
    state.initialized = false;
  }
  const api = {
    init,
    destroy,
    on,
    off,
    loadPayments,
    loadPayment,
    createCheckout,
    verifyPayment,
    cancelPayment,
    requestRefund,
    loadInvoices,
    downloadInvoice,
    loadPaymentMethods,
    setDefaultPaymentMethod,
    removePaymentMethod,
    loadSubscriptions,
    cancelSubscription,
    renderPayments,
    renderInvoices,
    renderPaymentMethods,
    renderSubscriptions,
    renderPaymentDetails,
    formatCurrency: utils.formatCurrency,
    formatDate: utils.formatDate,
    statusLabel,
    getPayments: () => state.payments.slice(),
    getPaymentMethods: () => state.paymentMethods.slice(),
    getInvoices: () => state.invoices.slice(),
    getSubscriptions: () => state.subscriptions.slice(),
    getActivePayment: () => state.activePayment,
    getState: () => ({
      payments: state.payments.slice(),
      paymentMethods: state.paymentMethods.slice(),
      invoices: state.invoices.slice(),
      subscriptions: state.subscriptions.slice(),
      activePayment: state.activePayment,
      loading: state.loading,
      processing: state.processing,
      page: state.page,
      pageSize: state.pageSize,
      total: state.total
    }),
    constants: {
      DEFAULT_PAGE_SIZE,
      PAYMENT_STATUSES: PAYMENT_STATUSES.slice()
    }
  };
  window.MedOrbitsPayments = api;
  window.MedOrbits = window.MedOrbits || {};
  window.MedOrbits.Payments = api;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (
        document.querySelector(
          "[data-payments-list], [data-invoices-list], " +
          "[data-payment-methods], [data-subscriptions-list], " +
          "[data-payment-checkout]"
        )
      ) {
        init();
      }
    }, { once: true });
  } else if (
    document.querySelector(
      "[data-payments-list], [data-invoices-list], " +
      "[data-payment-methods], [data-subscriptions-list], " +
      "[data-payment-checkout]"
    )
  ) {
    init();
  }
})(window, document);