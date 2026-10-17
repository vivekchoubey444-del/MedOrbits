(() => {
  "use strict";

  if (!/^\/(education|career)(\/|$)/.test(window.location.pathname)) return;

  const root = document.createElement("div");
  root.className = "site-tools";
  root.innerHTML = `
    <button class="site-tools__toggle" type="button" aria-expanded="false" aria-controls="siteToolsPanel" data-tools-toggle>Tools</button>
    <section class="site-tools__panel" id="siteToolsPanel" aria-labelledby="siteToolsTitle" hidden>
      <header class="site-tools__header"><div><span>MEDORBITS</span><h2 id="siteToolsTitle">Study &amp; career tools</h2></div><button class="site-tools__close" type="button" aria-label="Close tools" data-tools-close>×</button></header>
      <div class="site-tools__tabs" role="tablist" aria-label="Study and career tools">
        <button type="button" role="tab" id="toolTabViewer" aria-controls="toolViewer" aria-selected="true" data-tool-tab="viewer">Viewer</button>
        <button type="button" role="tab" id="toolTabVerify" aria-controls="toolVerify" aria-selected="false" data-tool-tab="verify" tabindex="-1">Verify</button>
        <button type="button" role="tab" id="toolTabEstimate" aria-controls="toolEstimate" aria-selected="false" data-tool-tab="estimate" tabindex="-1">Estimate</button>
        <button type="button" role="tab" id="toolTabCalculator" aria-controls="toolCalculator" aria-selected="false" data-tool-tab="calculator" tabindex="-1">Calculator</button>
        <button type="button" role="tab" id="toolTabCompare" aria-controls="toolCompare" aria-selected="false" data-tool-tab="compare" tabindex="-1">Compare</button>
      </div>
      <a class="site-tools__resource-link" href="/assets/documents/checklists/general/official-notice-verification-checklist.pdf" target="_blank" rel="noopener">Download notice verification checklist (PDF)</a>
      <div class="site-tools__content">
        <section id="toolViewer" class="site-tools__pane" role="tabpanel" aria-labelledby="toolTabViewer" data-tool-pane="viewer"><label for="toolViewerFile">Preview a local PDF or image</label><input id="toolViewerFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-viewer-file><div class="site-tools__viewer" data-viewer-output aria-live="polite">Choose a file to preview it. Files stay in your browser.</div></section>
        <section id="toolVerify" class="site-tools__pane" role="tabpanel" aria-labelledby="toolTabVerify" data-tool-pane="verify" hidden><label for="toolVerifyFile">Check a PDF or image file</label><input id="toolVerifyFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-verify-file><button class="site-tools__action" type="button" data-verify>Check file signature</button><p class="site-tools__result" data-verify-result role="status">This checks the file format only, not authenticity or official status.</p></section>
        <section id="toolEstimate" class="site-tools__pane" role="tabpanel" aria-labelledby="toolTabEstimate" data-tool-pane="estimate" hidden><form class="site-tools__form" data-estimate-form><label data-education-estimate>Tuition per year (INR)<input name="tuition" type="number" min="0" max="100000000" step="1000" value="500000" required></label><label data-education-estimate>Living costs per year (INR)<input name="living" type="number" min="0" max="100000000" step="1000" value="180000" required></label><label data-education-estimate>Course duration (years)<input name="years" type="number" min="1" max="15" step="1" value="4" required></label><label data-education-estimate>Total scholarship (INR)<input name="scholarship" type="number" min="0" max="1000000000" step="1000" value="0" required></label><label data-career-estimate hidden>Training or transition cost (INR)<input name="trainingCost" type="number" min="0" max="1000000000" step="1000" value="0" required></label><label data-career-estimate hidden>Expected annual income increase (INR)<input name="incomeIncrease" type="number" min="0" max="1000000000" step="1000" value="0" required></label><button class="site-tools__action" type="submit" data-education-estimate>Estimate total cost</button><button class="site-tools__action" type="submit" data-career-estimate hidden>Estimate payback</button></form><p class="site-tools__result" data-estimate-result role="status">Planning estimate only. Confirm current fees or salary details independently.</p></section>
        <section id="toolCalculator" class="site-tools__pane" role="tabpanel" aria-labelledby="toolTabCalculator" data-tool-pane="calculator" hidden><form class="site-tools__form" data-calculator-form><label>Monthly amount (INR)<input name="amount" type="number" min="0" max="100000000" step="100" value="10000" required></label><label>Number of months<input name="months" type="number" min="1" max="600" step="1" value="12" required></label><button class="site-tools__action" type="submit">Calculate total</button></form><p class="site-tools__result" data-calculator-result role="status">Simple budget calculation for education or career planning.</p></section>
        <section id="toolCompare" class="site-tools__pane" role="tabpanel" aria-labelledby="toolTabCompare" data-tool-pane="compare" hidden><form class="site-tools__form site-tools__compare-form" data-compare-form><fieldset><legend>Option A</legend><label>Name<input name="nameA" maxlength="60" value="Option A" required></label><label>Total cost (INR)<input name="costA" type="number" min="0" max="1000000000" step="1000" required></label><label>Duration (years)<input name="yearsA" type="number" min="0.25" max="30" step="0.25" required></label></fieldset><fieldset><legend>Option B</legend><label>Name<input name="nameB" maxlength="60" value="Option B" required></label><label>Total cost (INR)<input name="costB" type="number" min="0" max="1000000000" step="1000" required></label><label>Duration (years)<input name="yearsB" type="number" min="0.25" max="30" step="0.25" required></label></fieldset><button class="site-tools__action" type="submit">Compare options</button></form><div class="site-tools__result" data-compare-result role="status" aria-live="polite">Compare values you provide; this is not a recommendation.</div></section>
      </div>
    </section>`;
  document.body.appendChild(root);

  const query = (selector) => root.querySelector(selector);
  const tabs = [...root.querySelectorAll("[data-tool-tab]")];
  const panel = query(".site-tools__panel");
  const toggle = query("[data-tools-toggle]");
  const isCareerPage = /^\/career(\/|$)/.test(window.location.pathname);
  let previewUrl = null;

  root.querySelectorAll("[data-education-estimate]").forEach((element) => {
    element.hidden = isCareerPage;
  });
  root.querySelectorAll("[data-career-estimate]").forEach((element) => {
    element.hidden = !isCareerPage;
  });

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) tabs[0].focus();
    else toggle.focus();
  };

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  query("[data-tools-close]").addEventListener("click", () => setOpen(false));
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  const selectTab = (selected) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      query(`#${tab.getAttribute("aria-controls")}`).hidden = !active;
    });
    selected.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[next]);
    });
  });

  query("[data-viewer-file]").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const output = query("[data-viewer-output]");
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      output.textContent = "Choose a PDF or image smaller than 20 MB.";
      event.target.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    const preview = file.type === "application/pdf" ? document.createElement("iframe") : document.createElement("img");
    preview.className = "site-tools__preview";
    preview.src = previewUrl;
    preview.title = `Preview: ${file.name}`;
    if (preview instanceof HTMLImageElement) preview.alt = file.name;
    output.replaceChildren(preview);
  });

  query("[data-verify]").addEventListener("click", async () => {
    const file = query("[data-verify-file]").files?.[0];
    const output = query("[data-verify-result]");
    if (!file) { output.textContent = "Choose a file first."; return; }
    if (file.size > 20 * 1024 * 1024) { output.textContent = "File exceeds the 20 MB limit."; return; }
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const starts = (...signature) => signature.every((value, index) => bytes[index] === value);
    const isPdf = String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
    const isJpeg = starts(0xff, 0xd8, 0xff);
    const isPng = starts(137, 80, 78, 71, 13, 10, 26, 10);
    const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    const valid = (file.type === "application/pdf" && isPdf) || (file.type === "image/jpeg" && isJpeg) || (file.type === "image/png" && isPng) || (file.type === "image/webp" && isWebp);
    output.textContent = valid ? "File signature matches its declared format. This does not establish authenticity or official status." : "The file signature does not match a supported format.";
  });

  const rupees = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  query("[data-estimate-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (isCareerPage) {
      const cost = Number(form.get("trainingCost"));
      const annualIncrease = Number(form.get("incomeIncrease"));
      query("[data-estimate-result]").textContent = annualIncrease > 0
        ? `Estimated payback period: ${(cost / annualIncrease).toFixed(1)} years, based on the figures entered.`
        : "Enter an annual income increase greater than zero to estimate payback.";
      return;
    }
    const amount = (Number(form.get("tuition")) + Number(form.get("living"))) * Number(form.get("years")) - Number(form.get("scholarship"));
    query("[data-estimate-result]").textContent = `Estimated total: ${rupees(Math.max(0, amount))}. Excludes any costs not entered above.`;
  });
  query("[data-calculator-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    query("[data-calculator-result]").textContent = `Total over ${form.get("months")} months: ${rupees(Number(form.get("amount")) * Number(form.get("months")))}.`;
  });
  query("[data-compare-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const options = [
      { name: String(form.get("nameA")).trim(), cost: Number(form.get("costA")), years: Number(form.get("yearsA")) },
      { name: String(form.get("nameB")).trim(), cost: Number(form.get("costB")), years: Number(form.get("yearsB")) }
    ];
    const table = document.createElement("table");
    table.className = "site-tools__table";
    const head = document.createElement("tr");
    ["Measure", ...options.map((item) => item.name)].forEach((text) => {
      const cell = document.createElement("th");
      cell.textContent = text;
      head.appendChild(cell);
    });
    const body = document.createElement("tbody");
    [["Total cost", ...options.map((item) => rupees(item.cost))], ["Duration", ...options.map((item) => `${item.years} years`)], ["Cost per year", ...options.map((item) => rupees(item.cost / item.years))]].forEach((values) => {
      const row = document.createElement("tr");
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    table.append(head, body);
    query("[data-compare-result]").replaceChildren(table);
  });
})();