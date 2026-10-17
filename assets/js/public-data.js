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
      { file: "colleges.json", collection: "colleges", title: "College directory records" }
    ],
    "/education/universities.html": [
      { file: "universities.json", collection: "universities", title: "University directory records" }
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

  function isPublicRecord(record) {
    if (!record || typeof record !== "object" || record.active === false) return false;
    if (record.publicationStatus && record.publicationStatus !== "published") return false;
    if (record.status && ["draft", "planned", "inactive", "archived"].includes(record.status)) return false;
    return !record.verificationStatus || approvedVerification.has(record.verificationStatus);
  }

  function textValue(record, keys) {
    for (const key of keys) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
    }
    return "";
  }

  function createCard(record) {
    const card = document.createElement("article");
    card.className = "card";
    const body = document.createElement("div");
    body.className = "card-body";
    const heading = document.createElement("h3");
    heading.textContent = textValue(record, ["title", "name", "question", "shortName", "label"]) || "Information";
    body.appendChild(heading);

    const description = textValue(record, ["shortDescription", "summary", "description", "answer"]);
    if (description) {
      const paragraph = document.createElement("p");
      paragraph.textContent = description;
      body.appendChild(paragraph);
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

  function createSection(config, records, withheldCount) {
    const section = document.createElement("section");
    section.className = "section public-json-data";
    const container = document.createElement("div");
    container.className = "container";
    const heading = document.createElement("h2");
    heading.textContent = config.title;
    container.appendChild(heading);

    if (records.length) {
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
    if (!records.length) return null;

    const publicRecords = records.filter(isPublicRecord);
    return createSection(config, publicRecords, records.length - publicRecords.length);
  }

  Promise.all(datasets.map(async (config) => {
    try {
      return await loadDataset(config);
    } catch (error) {
      console.error(`[MedOrbits data] ${config.file} failed to load.`, error);
      const section = document.createElement("section");
      section.className = "section public-json-data";
      const notice = document.createElement("p");
      notice.className = "disclaimer";
      notice.setAttribute("role", "status");
      notice.textContent = `${config.title} could not be loaded. The existing page information remains available.`;
      section.appendChild(notice);
      return section;
    }
  })).then((sections) => {
    sections.filter(Boolean).forEach((section) => main.appendChild(section));
  });
})();
