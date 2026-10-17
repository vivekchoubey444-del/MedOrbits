(() => {
  "use strict";

  const list = document.querySelector("[data-bulletin-list]");
  const status = document.querySelector("[data-bulletin-status]");
  const slots = [...document.querySelectorAll("[data-daily-banner-slot]")];
  if (!list && !slots.length) return;

  function makeText(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = String(value ?? "");
    return element;
  }

  function isVisible(item, now) {
    return item &&
      item.active === true &&
      item.publicationStatus === "published" &&
      (!item.publishedAt || Date.parse(item.publishedAt) <= now) &&
      (!item.expiresAt || Date.parse(item.expiresAt) > now);
  }

  function getDocumentUrl(item) {
    if (
      item?.publicationStatus !== "published" ||
      item.format !== "application/pdf" ||
      typeof item.path !== "string"
    ) return null;

    try {
      const url = new URL(item.path, window.location.origin);
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

  function renderItem(item) {
    const article = document.createElement("article");
    article.className = "resource-panel bulletin-item";
    article.appendChild(makeText("span", "kicker", item.category || "Update"));
    article.appendChild(makeText("h3", "", item.title));
    article.appendChild(makeText("p", "", item.summary));

    const meta = document.createElement("p");
    meta.className = "bulletin-meta";
    const sourceName = item.source?.name || "Source not specified";
    const verification = item.verificationStatus === "verified"
      ? "Verified"
      : "MedOrbits informational resource; independently verify official details.";
    meta.textContent = `${sourceName} · ${verification}`;
    article.appendChild(meta);

    const links = document.createElement("div");
    links.className = "bulletin-links";
    for (const documentItem of Array.isArray(item.relatedDocuments) ? item.relatedDocuments : []) {
      const path = getDocumentUrl(documentItem);
      if (!path) continue;
      const link = document.createElement("a");
      link.className = "btn";
      link.href = path;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = `Open ${documentItem.title || "related PDF"}`;
      links.appendChild(link);
    }

    if (item.officialNoticeUrl && item.newsType === "official_notice") {
      try {
        const source = new URL(item.officialNoticeUrl);
        if (source.protocol === "https:") {
          const link = document.createElement("a");
          link.className = "btn btn-outline";
          link.href = source.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Open official notice";
          links.appendChild(link);
        }
      } catch {
        // Ignore malformed notice URLs rather than rendering unsafe links.
      }
    }

    if (links.childElementCount) article.appendChild(links);

    if (item.publishedAt) {
      const time = document.createElement("time");
      time.dateTime = item.publishedAt;
      time.textContent = new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata"
      }).format(new Date(item.publishedAt));
      article.appendChild(time);
    }

    return article;
  }

  function renderSlot(slot, item, category) {
    slot.replaceChildren();
    slot.appendChild(makeText(
      "span",
      "daily-banner__label",
      category === "education" ? "EDUCATION UPDATE" : "CAREER UPDATE"
    ));
    slot.appendChild(makeText("h2", "", item.title));
    slot.appendChild(makeText("p", "", item.summary));
    for (const documentItem of Array.isArray(item.relatedDocuments) ? item.relatedDocuments : []) {
      const path = getDocumentUrl(documentItem);
      if (!path) continue;
      const link = document.createElement("a");
      link.className = "daily-banner__link";
      link.href = path;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = `Open ${documentItem.title || "related PDF"}`;
      slot.appendChild(link);
    }
    slot.hidden = false;
  }

  async function load() {
    try {
      const response = await fetch("/assets/data/bulletins.json", {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-cache"
      });
      if (!response.ok) throw new Error("Bulletin data is unavailable.");
      const data = await response.json();
      if (!Array.isArray(data.bulletins)) throw new Error("Bulletin data has an invalid format.");

      const now = Date.now();
      const items = data.bulletins.filter((item) => isVisible(item, now));
      if (list) list.replaceChildren(...items.map(renderItem));
      slots.forEach((slot) => {
        const category = slot.dataset.dailyBannerSlot;
        const candidates = items.filter((item) =>
          Array.isArray(item.categories) && item.categories.includes(category)
        );
        if (!candidates.length) return;
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).format(new Date()).replace(/-/g, "");
        renderSlot(slot, candidates[Number(date) % candidates.length], category);
      });
      if (status) status.textContent = items.length
        ? "Published information and official notices. Verify important details with the issuing authority."
        : "No published bulletins are available right now.";
    } catch {
      if (status) status.textContent = "The bulletin could not be loaded. Use the resource links below and verify notices with the issuing authority.";
      slots.forEach((slot) => { slot.hidden = true; });
    }
  }

  load();
})();
