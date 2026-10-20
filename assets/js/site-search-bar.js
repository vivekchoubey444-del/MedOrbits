/* MedOrbits -- Site search bar. Queries /api/v1/site-search and lists matches inline. */
(function (window, document) {
  "use strict";
  var cfg = window.MedOrbitsConfig || {};
  var API = (cfg.API_BASE_URL || cfg.apiBaseUrl || "/api/v1").replace(/\/$/, "");
  if (!/\/v\d+$/.test(API)) API = "/api/v1";
  var ENDPOINT = API + "/site-search";
  var TYPE_LABELS = { course: "Course", university: "University", college: "College", scholarship: "Scholarship",
    service: "Service", faq: "FAQ", news: "News", job: "Job", internship: "Internship", page: "Page" };

  function el(tag, text, css) {
    var n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = text;
    if (css) n.style.cssText = css;
    return n;
  }

  function attach(form, input) {
    var panel = el("div", null, "max-width:760px;margin:6px auto 12px;padding:0 14px;box-sizing:border-box");
    panel.setAttribute("aria-live", "polite");
    form.parentNode.insertBefore(panel, form.nextSibling);
    var controller = null;

    function render(data, q) {
      panel.textContent = "";
      if (!data.length) { panel.appendChild(el("p", "No results found for \u201C" + q + "\u201D.", "color:#a9c0b4;margin:8px 0")); return; }
      panel.appendChild(el("p", data.length + " result" + (data.length === 1 ? "" : "s") + " for \u201C" + q + "\u201D", "color:#a9c0b4;margin:8px 0;font-size:12px"));
      data.forEach(function (item) {
        var a = el("a", null, "display:block;padding:10px 12px;margin-bottom:8px;border:1px solid rgba(201,169,110,.25);border-radius:8px;color:#f2f8f3;text-decoration:none;background:rgba(16,10,23,.6)");
        a.href = item.url;
        a.appendChild(el("small", TYPE_LABELS[item.type] || item.type, "color:#c9a96e;text-transform:uppercase;letter-spacing:.05em;font-size:10px"));
        a.appendChild(el("strong", item.title, "display:block;margin:2px 0"));
        if (item.summary) a.appendChild(el("span", item.summary, "display:block;font-size:12px;color:#a9c0b4"));
        panel.appendChild(a);
      });
    }

    form.addEventListener("submit", function (e) {
      var q = input.value.trim();
      if (q.length < 2) return;
      e.preventDefault();
      if (controller) controller.abort();
      controller = window.AbortController ? new AbortController() : null;
      panel.textContent = "Searching\u2026";
      fetch(ENDPOINT + "?q=" + encodeURIComponent(q) + "&limit=20", {
        headers: { Accept: "application/json" }, signal: controller ? controller.signal : undefined
      }).then(function (r) { if (!r.ok) throw new Error("search"); return r.json(); })
        .then(function (json) { render(json.data || [], q); })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;
          panel.textContent = "Search is unavailable right now. Please try again.";
        });
    });
  }

  function init() {
    var quick = document.getElementById("quickSearch");
    if (quick) {
      var qi = quick.querySelector('input[type="search"]');
      if (qi) attach(quick, qi);
      return;
    }
    if (document.getElementById("directorySearch") || document.querySelector("[data-site-search-bar]")) return;

    var form = el("form", null, "display:flex;gap:8px;max-width:760px;margin:0 auto;padding:10px 14px;box-sizing:border-box");
    form.setAttribute("data-site-search-bar", "");
    form.setAttribute("role", "search");
    form.action = "/pages/search.html";
    form.method = "get";
    var input = el("input", null, "flex:1;min-width:0;padding:10px 12px;border:1px solid #c9a96e;border-radius:8px;background:#21172b;color:#fff");
    input.type = "search";
    input.name = "q";
    input.required = true;
    input.placeholder = "Search MBBS colleges, courses, countries\u2026";
    input.setAttribute("aria-label", "Search MBBS colleges, courses and resources");
    var button = el("button", "Search", "padding:10px 16px;border:0;border-radius:8px;background:#c9a96e;color:#100a17;font-weight:600;cursor:pointer");
    button.type = "submit";
    form.appendChild(input);
    form.appendChild(button);
    var header = document.querySelector("header");
    if (header && header.parentNode) header.parentNode.insertBefore(form, header.nextSibling);
    else document.body.insertBefore(form, document.body.firstChild);
    attach(form, input);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window, document);
