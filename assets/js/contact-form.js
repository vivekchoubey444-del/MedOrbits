(() => {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;

  const status = document.getElementById("formStatus");
  const email = form.dataset.email || "support@medorbits.in";
  const whatsapp = form.dataset.whatsapp || "916205889064";
  const labels = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    enquiryType: "Enquiry topic",
    subject: "Subject",
    message: "Message",
  };

  function getDetails() {
    return Object.fromEntries(new FormData(form).entries());
  }

  function getMessage(details) {
    return Object.entries(labels)
      .filter(([key]) => String(details[key] || "").trim())
      .map(([key, label]) => `${label}: ${String(details[key]).trim()}`)
      .join("\n");
  }

  function setStatus(message, isError = false) {
    if (!status) return;
    status.style.display = "block";
    status.textContent = message;
    status.setAttribute("aria-live", isError ? "assertive" : "polite");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function isMobile() {
    return window.matchMedia("(max-width: 760px)").matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function downloadText(message) {
    const blob = new Blob([`\uFEFF${message}\n\nMedOrbits\nsupport@medorbits.in\n+91 62058 89064 | +91 76449 87052\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "medorbits-enquiry.txt";
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openPrintView(details) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setStatus("Allow pop-ups to open the branded PDF print view.", true);
      return;
    }

    const rows = Object.entries(labels)
      .filter(([key]) => String(details[key] || "").trim())
      .map(([key, label]) => `<section><h2>${escapeHtml(label)}</h2><p>${escapeHtml(details[key]).replace(/\n/g, "<br>")}</p></section>`)
      .join("");

    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MedOrbits Enquiry</title>
<style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#24202a;font:14px/1.65 Arial,sans-serif}.brand{display:flex;align-items:center;gap:16px;padding-bottom:20px;border-bottom:3px solid #8a2438}.brand img{width:68px;height:68px;object-fit:contain}.brand h1{margin:0;color:#6f1d31;font:700 25px Georgia,serif}.brand p{margin:4px 0 0;color:#77666a;font-size:11px}.document-title{margin:28px 0 16px;padding:14px 18px;background:#f7f1e8;border-left:4px solid #c9a96e}.document-title h2{margin:0;color:#6f1d31;font:700 20px Georgia,serif}.document-title p{margin:4px 0 0;color:#6b6261;font-size:11px}section{padding:13px 0;border-bottom:1px solid #e5ded7;break-inside:avoid}section h2{margin:0 0 4px;color:#6f1d31;font-size:12px}section p{margin:0;white-space:normal;overflow-wrap:anywhere}.contact{margin-top:30px;padding-top:14px;border-top:1px solid #d8c9b0;color:#5d5150;font-size:11px}.disclaimer{margin-top:18px;color:#77666a;font-size:10px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<header class="brand"><img src="/assets/images/logo/medorbits-logo.png" alt="MedOrbits logo"><div><h1>MedOrbits</h1><p>Study · Career · Consultancy</p></div></header>
<div class="document-title"><h2>Enquiry summary</h2><p>Prepared ${escapeHtml(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }))}</p></div>
${rows}<footer class="contact">support@medorbits.in<br>+91 62058 89064 · +91 76449 87052<br>WhatsApp: wa.me/916205889064 · wa.me/917644987052<p class="disclaimer">This document contains information submitted by the enquirer. Do not treat it as confirmation of admission, employment or any service outcome.</p></footer>
<script>window.addEventListener("load",()=>window.print());window.addEventListener("afterprint",()=>window.close());</script></body></html>`);
    printWindow.document.close();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || "Submit Enquiry Online";
    const body = getDetails();
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setStatus("Sending your enquiry...");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error?.message || payload.message || "The enquiry could not be submitted.");
      }
      setStatus("Thank you. Your enquiry has been submitted.");
      form.reset();
    } catch (error) {
      setStatus(error.message || "The enquiry could not be submitted. Please use WhatsApp or email instead.", true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });

  form.querySelectorAll("[data-contact-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!form.reportValidity()) return;
      const details = getDetails();
      const message = getMessage(details);
      const action = button.dataset.contactAction;

      if (action === "download") {
        if (isMobile()) {
          downloadText(message);
          setStatus("Your enquiry text file has been downloaded.");
        } else {
          openPrintView(details);
        }
        return;
      }

      if (action === "whatsapp") {
        const number = button.dataset.number || whatsapp;
        if (isMobile()) downloadText(message);
        window.open(`https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
        return;
      }

      if (action === "email") {
        if (isMobile()) downloadText(message);
        const subject = `MedOrbits enquiry: ${String(details.enquiryType || "General").slice(0, 80)}`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      }
    });
  });
})();