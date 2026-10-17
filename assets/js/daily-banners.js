(() => {
  "use strict";

  const slots = [...document.querySelectorAll("[data-daily-banner-slot]")];
  const socialList = document.querySelector("[data-social-links]");
  if (!slots.length && !socialList) return;

  async function loadJson(path) {
    const response = await fetch(path, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-cache"
    });
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  }

  function todayKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return Number(`${values.year}${values.month}${values.day}`);
  }

  function eligible(item, now) {
    return item?.active === true &&
      item.publicationStatus === "published" &&
      (!item.publishedAt || Date.parse(item.publishedAt) <= now) &&
      (!item.expiresAt || Date.parse(item.expiresAt) > now);
  }

  function safeDocumentPath(documentItem) {
    if (
      documentItem?.publicationStatus !== "published" ||
      documentItem.format !== "application/pdf" ||
      typeof documentItem.path !== "string"
    ) return null;

    try {
      const url = new URL(documentItem.path, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        !url.pathname.startsWith("/assets/documents/") ||
        url.pathname.split("/").includes("..") ||
        !url.pathname.toLowerCase().endsWith(".pdf")
      ) return null;
      return url.pathname;
    } catch {
      return null;
    }
  }

  function renderSlot(slot, item, category) {
    slot.replaceChildren();
    const label = document.createElement("span");
    label.className = "daily-banner__label";
    label.textContent = category === "education" ? "EDUCATION UPDATE" : "CAREER UPDATE";
    const title = document.createElement("h2");
    title.textContent = item.title;
    const summary = document.createElement("p");
    summary.textContent = item.summary;
    slot.append(label, title, summary);

    for (const related of Array.isArray(item.relatedDocuments) ? item.relatedDocuments : []) {
      const path = safeDocumentPath(related);
      if (!path) continue;
      const link = document.createElement("a");
      link.href = path;
      link.target = "_blank";
      link.rel = "noopener";
      link.className = "daily-banner__link";
      link.textContent = `Open ${related.title || "related PDF"}`;
      slot.appendChild(link);
    }
    slot.hidden = false;
  }

  function renderSocialLinks(container, links) {
    container.replaceChildren();
    for (const entry of Array.isArray(links) ? links : []) {
      if (!entry || typeof entry.url !== "string" || !entry.url.trim()) continue;
      try {
        const url = new URL(entry.url);
        if (url.protocol !== "https:") continue;
        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = String(entry.label || entry.id || "Link");
        container.appendChild(link);
      } catch {
        // Ignore unconfigured or malformed social URLs.
      }
    }
    container.hidden = container.childElementCount === 0;
  }

  async function init() {
    try {
      const [bulletinData, socialData] = await Promise.all([
        loadJson("/assets/data/bulletins.json"),
        socialList ? loadJson("/assets/data/social-links.json") : Promise.resolve({ links: [] })
      ]);
      const now = Date.now();
      const allItems = Array.isArray(bulletinData.bulletins)
        ? bulletinData.bulletins.filter((item) => eligible(item, now))
        : [];
      const key = todayKey();

      slots.forEach((slot) => {
        const category = slot.dataset.dailyBannerSlot;
        const candidates = allItems.filter((item) =>
          Array.isArray(item.categories) && item.categories.includes(category)
        );
        if (!candidates.length) return;
        renderSlot(slot, candidates[key % candidates.length], category);
      });

      if (socialList) renderSocialLinks(socialList, socialData.links);
    } catch {
      slots.forEach((slot) => { slot.hidden = true; });
      if (socialList) socialList.hidden = true;
    }
  }

  init();
})();
