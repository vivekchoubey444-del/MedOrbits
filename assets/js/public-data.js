(() => {
  "use strict";

  const datasetsByPage = {
    "/education/index.html": [
      { file: "categories.json", collection: "categories", title: "Education categories" }
    ],
    "/education/courses.html": [
      { file: "courses.json", collection: "courses", title: "Course catalogue records" }
    ],
    "/education/colleges.html": [
      {
        file: "colleges.json",
        collection: "colleges",
        title: "College directory",
        directory: true,
        directoryKind: "college",
        showTypeFilter: true,
        mountSelector: "#college-results"
      }
    ],
    "/education/government-colleges.html": [
      {
        file: "colleges.json",
        collection: "colleges",
        title: "Government colleges",
        directory: true,
        directoryKind: "college",
        institutionTypes: ["government", "public", "government-aided"],
        mountSelector: "#college-results"
      }
    ],
    "/education/private-colleges.html": [
      {
        file: "colleges.json",
        collection: "colleges",
        title: "Private colleges",
        directory: true,
        directoryKind: "college",
        institutionTypes: ["private"],
        mountSelector: "#college-results"
      }
    ],
    "/education/universities.html": [
      {
        file: "universities.json",
        collection: "universities",
        title: "Indian university directory",
        directory: true,
        showTypeFilter: true,
        allowUgcPending: true,
        mountSelector: "#university-results"
      }
    ],
    "/education/government-universities.html": [
      {
        file: "universities.json",
        collection: "universities",
        title: "Central and state universities",
        directory: true,
        institutionTypes: ["central-university", "state-university"],
        allowUgcPending: true,
        mountSelector: "#university-results"
      }
    ],
    "/education/private-universities.html": [
      {
        file: "universities.json",
        collection: "universities",
        title: "Private universities",
        directory: true,
        institutionTypes: ["private-university"],
        allowUgcPending: true,
        mountSelector: "#university-results"
      }
    ],
    "/education/deemed-universities.html": [
      {
        file: "universities.json",
        collection: "universities",
        title: "Deemed universities",
        directory: true,
        institutionTypes: ["deemed-university"],
        allowUgcPending: true,
        mountSelector: "#university-results"
      }
    ],
    "/education/study-abroad/index.html": [
      { file: "countries.json", collection: "countries", title: "Study destination records" }
    ],
    "/education/admissions/index.html": [
      { file: "admissions.json", collection: "admissions", title: "Admission records" }
    ],
    "/education/admissions/process.html": [
      { file: "admission-process.json", collection: "processes", title: "Admission planning workflows" }
    ],
    "/education/admissions/documents.html": [
      { file: "documents.json", collection: "documents", title: "Admission document records" }
    ],
    "/education/admissions/exams.html": [
      { file: "entrance-exams.json", collection: "exams", title: "Entrance examination records" }
    ],
    "/education/resources/faqs.html": [
      { file: "faqs.json", collection: "faqs", title: "Frequently asked questions" }
    ],
    "/education/resources/guides.html": [
      { file: "fee-guides.json", collection: "documents", title: "Fee guide documents" }
    ],
    "/education/resources/fees.html": [
      { file: "fees.json", collection: "fees", title: "Fee records" }
    ],
    "/education/resources/hostels.html": [
      { file: "hostels.json", collection: "hostels", title: "Hostel records" }
    ],
    "/career/index.html": [
      { file: "sectors.json", collection: "sectors", title: "Career sectors" },
      { file: "locations.json", collection: ["countries", "states", "cities"], title: "Location records" }
    ],
    "/career/jobs.html": [
      { file: "jobs.json", collection: "jobs", title: "Job listings" }
    ],
    "/career/internships.html": [
      { file: "internships.json", collection: "internships", title: "Internship listings" }
    ],
    "/career/guidance.html": [
      { file: "career-options.json", collection: "careerOptions", title: "Career pathways" }
    ],
    "/career/recruitment.html": [
      { file: "recruitment.json", collection: "recruitments", title: "Recruitment drives" }
    ],
    "/pages/careers.html": [
      { file: "career-options.json", collection: "careerOptions", title: "Career pathways" }
    ],
    "/pages/services.html": [
      { file: "services.json", collection: "services", title: "Service catalogue" }
    ],
    "/pages/notifications.html": [
      { file: "news.json", collection: "news", title: "News" },
      { file: "notifications.json", collection: "notifications", title: "Notifications" }
    ],
    "/pages/testimonials.html": [
      { file: "testimonials.json", collection: "testimonials", title: "Testimonials" }
    ]
  };

  const approvedVerification = new Set(["verified", "content_reviewed"]);
  const currentPath = window.location.pathname.endsWith("/")
    ? `${window.location.pathname}index.html`
    : window.location.pathname;
  const datasets = datasetsByPage[currentPath];
  const main = document.querySelector("main");
  if (!datasets || !main) return;

  function isPublicRecord(record, config = {}) {
    if (!record || typeof record !== "object") return false;
    const recordStatus = record.status && typeof record.status === "object" ? record.status : {};
    if (record.active === false || recordStatus.active === false) return false;
    if (record.publicationStatus && record.publicationStatus !== "published") return false;
    if (typeof record.status === "string" && ["draft", "planned", "inactive", "archived"].includes(record.status)) return false;
    const verificationStatus = record.verificationStatus || recordStatus.verificationStatus;
    if (approvedVerification.has(verificationStatus)) return true;
    if (config.directoryKind === "college") return false;
    if (!verificationStatus) return true;
    return config.allowUgcPending === true
      && verificationStatus === "pending-review"
      && Array.isArray(record.sourceUrls)
      && record.sourceUrls.some((source) => source.sourceType === "government-directory" && source.url);
  }

  function textValue(record, keys) {
    for (const key of keys) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
    }
    return "";
  }

  function createCard(record, config = {}) {
    const card = document.createElement("article");
    card.className = "card";
    const body = document.createElement("div");
    body.className = "card-body";
    const heading = document.createElement("h3");
    heading.textContent = textValue(record, ["title", "name", "question", "shortName", "label"]) || "Information";
    body.appendChild(heading);

    if (config.directory) {
      const status = document.createElement("p");
      status.className = "university-status";
      status.textContent = config.directoryKind === "college"
        ? `College record · ${textValue(record.status || {}, ["verificationStatus"]) || "verification status unavailable"}`
        : "UGC-listed - MedOrbits review pending";
      body.appendChild(status);

      const details = [
        config.directoryKind === "college"
          ? textValue(record.location || {}, ["city", "district", "state"])
          : textValue(record, ["stateName"]),
        config.directoryKind === "college"
          ? textValue(record, ["institutionType"])
          : textValue(record, ["ugcStatus"]) ? `UGC status: ${textValue(record, ["ugcStatus"])}` : "",
      ].filter(Boolean);
      if (details.length) {
        const meta = document.createElement("p");
        meta.className = "university-meta";
        meta.textContent = details.join(" · ");
        body.appendChild(meta);
      }
    }

    const description = textValue(record, ["shortDescription", "summary", "description", "answer"]);
    if (description) {
      const paragraph = document.createElement("p");
      paragraph.textContent = description;
      body.appendChild(paragraph);
    }

    if (config.directory) {
      const links = document.createElement("div");
      links.className = "university-record-links";
      const website = safeHttpUrl(config.directoryKind === "college"
        ? record.contact?.officialWebsite
        : record.website);
      if (website) links.appendChild(createExternalLink(website, config.directoryKind === "college"
        ? "Official college website"
        : "Institution website (listed by UGC)"));
      const sources = config.directoryKind === "college" ? record.officialSources : record.sourceUrls;
      const directorySource = Array.isArray(sources)
        ? sources.find((source) => config.directoryKind === "college"
          ? source.url
          : source.sourceType === "government-directory" && source.url)
        : null;
      const sourceUrl = safeHttpUrl(directorySource?.url);
      if (sourceUrl) links.appendChild(createExternalLink(sourceUrl, config.directoryKind === "college"
        ? "Source"
        : "UGC source"));
      if (links.childElementCount) body.appendChild(links);
    }

    if (Array.isArray(record.steps) && record.steps.length) {
      const steps = document.createElement("ol");
      record.steps.forEach((step) => {
        if (typeof step?.title !== "string" || !step.title.trim()) return;
        const item = document.createElement("li");
        item.textContent = step.title;
        steps.appendChild(item);
      });
      if (steps.childElementCount) body.appendChild(steps);
    }

    if (Array.isArray(record.careerPaths) && record.careerPaths.length) {
      const paths = document.createElement("ul");
      record.careerPaths.forEach((careerPath) => {
        if (typeof careerPath?.title !== "string" || !careerPath.title.trim()) return;
        const item = document.createElement("li");
        item.textContent = careerPath.title;
        paths.appendChild(item);
      });
      if (paths.childElementCount) body.appendChild(paths);
    }

    card.appendChild(body);
    return card;
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function createExternalLink(url, label) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
  }

  function createDirectoryContent(config, records, container) {
    const filters = document.createElement("div");
    filters.className = "university-directory-tools";
    filters.setAttribute("role", "search");

    const search = document.createElement("input");
    search.type = "search";
    search.className = "field";
    search.placeholder = "Search by university, state, or UGC status";
    search.setAttribute("aria-label", "Search universities");
    search.value = new URLSearchParams(window.location.search).get("q") || "";
    filters.appendChild(search);

    let typeSelect;
    if (config.showTypeFilter) {
      typeSelect = document.createElement("select");
      typeSelect.className = "field";
      typeSelect.setAttribute("aria-label", "Filter by university type");
      const typeOptions = [
        ["", "All institution types"],
        ...(config.directoryKind === "college"
          ? [["government", "Government"], ["public", "Public"], ["government-aided", "Government-aided"], ["private", "Private"]]
          : [["central-university", "Central government"], ["state-university", "State government"], ["private-university", "Private"], ["deemed-university", "Deemed"]]),
      ];
      typeOptions.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        typeSelect.appendChild(option);
      });
      filters.appendChild(typeSelect);
    }

    const stateSelect = document.createElement("select");
    stateSelect.className = "field";
    stateSelect.setAttribute("aria-label", "Filter by state or union territory");
    const allStates = document.createElement("option");
    allStates.value = "";
    allStates.textContent = "All states and union territories";
    stateSelect.appendChild(allStates);
    const stateName = (record) => config.directoryKind === "college"
      ? textValue(record.location || {}, ["state"])
      : textValue(record, ["stateName"]);
    const recordName = (record) => textValue(record, ["name", "shortName", "title"]);
    const recordSearchText = (record) => [
      recordName(record),
      record.summary,
      stateName(record),
      record.ugcStatus,
      record.institutionType,
      record.location?.city,
      record.location?.district,
    ].filter(Boolean);

    [...new Set(records.map(stateName).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
      .forEach((state) => {
        const option = document.createElement("option");
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
      });
    stateSelect.value = new URLSearchParams(window.location.search).get("state") || "";
    filters.appendChild(stateSelect);
    container.appendChild(filters);

    const count = document.createElement("p");
    count.className = "university-result-count";
    count.setAttribute("aria-live", "polite");
    container.appendChild(count);

    const grid = document.createElement("div");
    grid.className = "cards university-cards";
    container.appendChild(grid);

    const empty = document.createElement("p");
    empty.className = "university-empty-state";
    empty.hidden = true;
    empty.textContent = "No universities match these filters.";
    container.appendChild(empty);

    const pagination = document.createElement("nav");
    pagination.className = "university-pagination";
    pagination.setAttribute("aria-label", "University result pages");
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "btn btn-outline";
    previous.textContent = "Previous";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn";
    next.textContent = "Next";
    pagination.append(previous, next);
    container.appendChild(pagination);

    const pageSize = 50;
    let page = 1;
    function update() {
      const query = search.value.trim().toLocaleLowerCase();
      const state = stateSelect.value;
      const institutionType = typeSelect?.value || "";
      const filtered = records.filter((record) => {
        if (state && stateName(record) !== state) return false;
        if (institutionType && record.institutionType !== institutionType) return false;
        if (!query) return true;
        return recordSearchText(record)
          .some((value) => String(value).toLocaleLowerCase().includes(query));
      });

      const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
      page = Math.min(page, pageCount);
      const start = (page - 1) * pageSize;
      const visibleRecords = filtered.slice(start, start + pageSize);
      grid.replaceChildren(...visibleRecords.map((record) => createCard(record, config)));
      empty.hidden = filtered.length > 0;
      count.textContent = filtered.length
        ? `Showing ${start + 1}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length.toLocaleString("en-IN")} universities · Page ${page} of ${pageCount}`
        : "0 universities found";
      previous.disabled = page <= 1;
      next.disabled = page >= pageCount;
      pagination.hidden = filtered.length <= pageSize;
    }

    search.addEventListener("input", () => { page = 1; update(); });
    stateSelect.addEventListener("change", () => { page = 1; update(); });
    typeSelect?.addEventListener("change", () => { page = 1; update(); });
    previous.addEventListener("click", () => { page -= 1; update(); });
    next.addEventListener("click", () => { page += 1; update(); });
    update();
  }

  function createSection(config, records, withheldCount) {
    const section = document.createElement("section");
    section.className = "section public-json-data";
    const container = document.createElement("div");
    container.className = "container";
    const heading = document.createElement("h2");
    heading.textContent = config.title;
    container.appendChild(heading);

    if (config.directory && records.length) {
      createDirectoryContent(config, records, container);
    } else if (records.length) {
      const grid = document.createElement("div");
      grid.className = "cards";
      records.forEach((record) => grid.appendChild(createCard(record)));
      container.appendChild(grid);
    }

    if (withheldCount) {
      const notice = document.createElement("p");
      notice.className = "disclaimer";
      notice.setAttribute("role", "status");
      notice.textContent = `${withheldCount} record${withheldCount === 1 ? "" : "s"} are withheld until their publication and verification requirements are met.`;
      container.appendChild(notice);
    }

    if (config.directory) {
      const disclaimer = document.createElement("p");
      disclaimer.className = "disclaimer university-data-disclaimer";
      disclaimer.textContent = "Directory records are sourced from the UGC listing and are pending independent MedOrbits review. A UGC listing is not confirmation of current recognition, programme availability, admissions, or fees. Verify details with the institution and relevant authorities.";
      container.appendChild(disclaimer);
    }

    section.appendChild(container);
    return section;
  }

  async function loadDataset(config) {
    const response = await fetch(`/assets/data/${config.file}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-cache"
    });
    if (!response.ok) throw new Error(`Unable to load ${config.file} (${response.status}).`);

    const data = await response.json();
    const collections = Array.isArray(config.collection) ? config.collection : [config.collection];
    const records = collections.flatMap((collection) => {
      if (!Array.isArray(data[collection])) {
        throw new Error(`${config.file} does not contain a ${collection} array.`);
      }
      return data[collection];
    });
    if (!records.length && !datasetsByPage[currentPath]?.some((config) => config.directory)) return null;

    const scopedRecords = config.institutionTypes
      ? records.filter((record) => config.institutionTypes.includes(record.institutionType))
      : records;
    const publicRecords = scopedRecords.filter((record) => isPublicRecord(record, config));
    return createSection(config, publicRecords, scopedRecords.length - publicRecords.length);
  }

  Promise.all(datasets.map(async (config) => {
    try {
      return { config, section: await loadDataset(config) };
    } catch (error) {
      console.error(`[MedOrbits data] ${config.file} failed to load.`, error);
      const section = document.createElement("section");
      section.className = "section public-json-data";
      const notice = document.createElement("p");
      notice.className = "disclaimer";
      notice.setAttribute("role", "status");
      notice.textContent = `${config.title} could not be loaded. The existing page information remains available.`;
      section.appendChild(notice);
      return { config, section };
    }
  })).then((sections) => {
    sections.forEach(({ config, section }) => {
      if (!section) return;
      const target = config.mountSelector ? document.querySelector(config.mountSelector) : null;
      (target || main).appendChild(section);
    });
  });
})();
