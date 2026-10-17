(() => {
  "use strict";

  const pathname = window.location.pathname;
  const isIndexPage = pathname === "/" || /\/index\.html$/.test(pathname);
  const isPrivateArea = /^\/(admin|account|legal)(\/|$)/.test(pathname);
  if (!isIndexPage || isPrivateArea) return;

  const main = document.querySelector("main");
  if (!main || document.getElementById("published-pdf-library")) return;

  const manifests = [
    { url: "/assets/documents/checklists/MANIFEST.json", base: "/assets/documents/checklists/" },
    { url: "/assets/documents/admission-guides/MANIFEST.json", base: "/assets/documents/admission-guides/" },
    { url: "/assets/documents/fee-guides/manifest.json", base: "/assets/documents/fee-guides/" },
    { url: "/assets/documents/study-abroad/MANIFEST.json", base: "/assets/documents/study-abroad/" }
  ];

  function safePdfPath(value, base) {
    if (typeof value !== "string" || !value.trim()) return null;
    const normalized = value.replace(/\\/g, "/");
    if (normalized.split("/").includes("..") || !normalized.toLowerCase().endsWith(".pdf")) return null;
    const candidate = normalized.startsWith("/assets/documents/")
      ? normalized
      : `${base}${normalized.replace(/^\/+/, "")}`;
    try {
      const url = new URL(candidate, window.location.origin);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/assets/documents/")) return null;
      return url.pathname;
    } catch {
      return null;
    }
  }

  async function readPublishedPdfs() {
    const groups = await Promise.all(manifests.map(async (manifest) => {
      try {
        const response = await fetch(manifest.url, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-cache"
        });
        if (!response.ok) return [];
        const data = await response.json();
        const records = [
          ...(Array.isArray(data.resources) ? data.resources : []),
          ...(Array.isArray(data.documents) ? data.documents : [])
        ];
        return records.filter((item) => item?.status === "published")
          .map((item) => {
            const pdfPath = safePdfPath(item.path || item.filename, manifest.base);
            if (!pdfPath) return null;
            return {
              title: String(item.title || "MedOrbits PDF resource"),
              description: String(item.description || "Published MedOrbits planning resource."),
              category: String(item.category || "Resource"),
              path: pdfPath
            };
          })
          .filter(Boolean);
      } catch {
        return [];
      }
    }));

    const unique = new Map();
    groups.flat().forEach((item) => unique.set(item.path, item));
    return [...unique.values()].sort((left, right) => left.title.localeCompare(right.title));
  }

  function render(items) {
    const section = document.createElement("section");
    section.id = "published-pdf-library";
    section.className = "section alt document-library";
    section.setAttribute("aria-labelledby", "publishedPdfTitle");

    const container = document.createElement("div");
    container.className = "container";
    const heading = document.createElement("div");
    heading.className = "section-head";
    const headingCopy = document.createElement("div");
    const eyebrow = document.createElement("span");
    eyebrow.className = "kicker";
    eyebrow.textContent = "Published downloads";
    const title = document.createElement("h2");
    title.id = "publishedPdfTitle";
    title.append(document.createTextNode("Document "));
    const accent = document.createElement("span");
    accent.textContent = "library";
    title.appendChild(accent);
    const description = document.createElement("p");
    description.textContent = "Browse PDFs approved for public download. Draft or unreviewed documents are not listed.";
    headingCopy.append(eyebrow, title, description);
    heading.appendChild(headingCopy);
    container.appendChild(heading);

    const list = document.createElement("div");
    list.className = "cards document-library__grid";
    list.setAttribute("aria-live", "polite");

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "document-library__empty";
      empty.textContent = "No published PDF resources are available right now.";
      list.appendChild(empty);
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card document-library__card";
      const body = document.createElement("div");
      body.className = "card-body";
      const category = document.createElement("span");
      category.className = "kicker";
      category.textContent = item.category;
      const cardTitle = document.createElement("h3");
      cardTitle.textContent = item.title;
      const cardDescription = document.createElement("p");
      cardDescription.textContent = item.description;
      const link = document.createElement("a");
      link.className = "card-link";
      link.href = item.path;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Open PDF ↗";
      body.append(category, cardTitle, cardDescription, link);
      card.appendChild(body);
      list.appendChild(card);
    });

    container.append(heading, list);
    section.appendChild(container);
    main.appendChild(section);
  }

  readPublishedPdfs().then(render).catch(() => render([]));
})();
