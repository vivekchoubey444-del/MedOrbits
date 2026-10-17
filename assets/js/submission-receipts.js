(() => {
  "use strict";

  if (window.MedOrbitsSubmissionReceipts) return;

  const BRAND = "MedOrbits";
  const EMAIL = "support@medorbits.in";
  const PHONES = ["+91 62058 89064", "+91 76449 87052"];
  const APP_PATH = "/assets/images/logo/medorbits-logo.png";
  const CONTEXT_TTL_MS = 120000;
  let currentSubmission = null;
  const nativeFetch = window.fetch.bind(window);

  function makeReference() {
    const date = new Date();
    const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("");
    const random = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
    return `MO-${day}-${random.toUpperCase()}`;
  }

  function getPageName() {
    const title = document.title.trim();
    return title || window.location.pathname.split("/").filter(Boolean).pop() || "MedOrbits page";
  }

  function getApiUrl(input) {
    try {
      const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return null;
      return url;
    } catch {
      return null;
    }
  }

  function isEligibleForm(form) {
    if (!(form instanceof HTMLFormElement)) return false;
    if (form.dataset.submissionReceipt === "off") return false;
    if (form.method.toUpperCase() !== "POST") return false;
    const url = getApiUrl(form.action);
    if (!url) return false;
    return !/\/(?:login|logout|refresh|webhook)(?:\/|$)/i.test(url.pathname);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function downloadText(receipt) {
    const lines = [
      `${BRAND} submission receipt`,
      `Reference: ${receipt.reference}`,
      `Page: ${receipt.pageName}`,
      `Page path: ${receipt.pagePath}`,
      `Submitted: ${receipt.submittedAt}`,
      "",
      EMAIL,
      PHONES.join(" | "),
      "",
      "Keep this reference for follow-up. It does not confirm a particular admission, payment, job, or other outcome."
    ];
    const blob = new Blob([`\uFEFF${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${receipt.reference.toLowerCase()}.txt`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printPdf(receipt) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.MedOrbits?.toast?.warning("Allow pop-ups to print or save the receipt as PDF.");
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(receipt.reference)} - MedOrbits</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#342d2d;font:14px/1.6 Arial,sans-serif}.brand{display:flex;align-items:center;gap:15px;padding-bottom:18px;border-bottom:3px solid #711f36}.brand img{width:64px;height:64px;object-fit:contain}.brand h1{margin:0;color:#711f36;font:700 23px Georgia,serif}.brand p{margin:4px 0 0;color:#716863;font-size:10px}.title{margin:28px 0 18px;padding:14px 17px;background:#f6f0e6;border-left:4px solid #c9a96e}.title h2{margin:0;color:#711f36;font:700 20px Georgia,serif}.title p{margin:5px 0 0;color:#716863;font-size:11px}.details{display:grid;grid-template-columns:130px 1fr;gap:0;border-top:1px solid #e2d9d1}.details dt,.details dd{margin:0;padding:12px 8px;border-bottom:1px solid #e2d9d1;overflow-wrap:anywhere}.details dt{color:#711f36;font-weight:700}.contact{margin-top:30px;padding-top:14px;border-top:1px solid #c9a96e;color:#6b625f;font-size:10px}.disclaimer{margin-top:16px;color:#766d69;font-size:9px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header class="brand"><img src="${APP_PATH}" alt="MedOrbits logo"><div><h1>MedOrbits</h1><p>Study · Career · Consultancy</p></div></header><div class="title"><h2>Submission receipt</h2><p>Reference ${escapeHtml(receipt.reference)}</p></div><dl class="details"><dt>Reference</dt><dd>${escapeHtml(receipt.reference)}</dd><dt>Submitted from</dt><dd>${escapeHtml(receipt.pageName)}</dd><dt>Page path</dt><dd>${escapeHtml(receipt.pagePath)}</dd><dt>Date and time</dt><dd>${escapeHtml(receipt.submittedAt)}</dd></dl><footer class="contact">${EMAIL}<br>${PHONES.join(" · ")}<p class="disclaimer">This receipt records successful submission to the connected service. It does not guarantee a particular outcome.</p></footer><script>window.addEventListener("load",()=>window.print());window.addEventListener("afterprint",()=>window.close());</script></body></html>`);
    printWindow.document.close();
  }

  function showReceipt(receipt) {
    const dialog = document.createElement("dialog");
    dialog.className = "submission-receipt";
    dialog.setAttribute("aria-labelledby", "submissionReceiptTitle");
    const heading = document.createElement("h2");
    heading.id = "submissionReceiptTitle";
    heading.textContent = "Submission received";
    const reference = document.createElement("p");
    reference.className = "submission-receipt__reference";
    reference.textContent = receipt.reference;
    const context = document.createElement("p");
    context.textContent = `${receipt.pageName} · ${receipt.pagePath}`;
    const date = document.createElement("p");
    date.textContent = receipt.submittedAt;
    const actions = document.createElement("div");
    actions.className = "submission-receipt__actions";
    const print = document.createElement("button");
    print.type = "button";
    print.className = "btn";
    print.textContent = "Print / Save PDF";
    print.addEventListener("click", () => printPdf(receipt));
    const text = document.createElement("button");
    text.type = "button";
    text.className = "btn btn-outline";
    text.textContent = "Download TXT";
    text.addEventListener("click", () => downloadText(receipt));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "submission-receipt__close";
    close.textContent = "Close";
    close.addEventListener("click", () => dialog.close());
    actions.append(print, text, close);
    dialog.append(heading, reference, context, date, actions);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!isEligibleForm(form)) return;
    const now = Date.now();
    currentSubmission = {
      reference: makeReference(),
      pageName: getPageName(),
      pagePath: window.location.pathname,
      submittedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date()),
      createdAt: now,
      form
    };
    form.dataset.submissionReference = currentSubmission.reference;
    form.dataset.submissionPage = currentSubmission.pagePath;
    window.setTimeout(() => {
      if (currentSubmission?.createdAt === now) currentSubmission = null;
    }, CONTEXT_TTL_MS);
  }, true);

  window.fetch = async function medorbitsFetchWithSubmissionContext(input, init = {}) {
    const context = currentSubmission;
    const method = String(init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = getApiUrl(input);
    if (!context || Date.now() - context.createdAt > CONTEXT_TTL_MS || !url || method !== "POST") {
      return nativeFetch(input, init);
    }

    currentSubmission = null;
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set("X-Submission-Reference", context.reference);
    headers.set("X-Page-Name", context.pageName.slice(0, 160));
    headers.set("X-Page-Path", context.pagePath.slice(0, 512));
    const response = await nativeFetch(input, { ...init, headers });
    if (response.ok) {
      const serverReference = response.headers.get("X-Request-ID");
      showReceipt({ ...context, reference: serverReference || context.reference });
    }
    return response;
  };

  window.MedOrbitsSubmissionReceipts = Object.freeze({ makeReference, downloadText, printPdf });
})();
