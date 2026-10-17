"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "assets", "data");
const UGC_API = "https://www.ugc.gov.in/universitydetails/Getuniversity_details";
const CATEGORIES = [
  { sourceId: 1, label: "Central", institutionType: "central-university", ownershipType: "public" },
  { sourceId: 2, label: "State", institutionType: "state-university", ownershipType: "public" },
  { sourceId: 3, label: "Private", institutionType: "private-university", ownershipType: "private" },
  { sourceId: 4, label: "Deemed to be Universities", institutionType: "deemed-university", ownershipType: "other" },
];

function cleanText(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "institution";
}

function normalizeWebsite(value) {
  if (typeof value !== "string") return null;
  let candidate = value.trim().replace(/^['"`]+|['"`]+$/g, "");
  if (!candidate || /^(?:null|n\/a|na|none)$/i.test(candidate) || /[,;\s]/.test(candidate)) return null;
  if (/^www\./i.test(candidate)) candidate = `https://${candidate}`;

  try {
    const website = new URL(candidate);
    if (!["http:", "https:"].includes(website.protocol) || !website.hostname.includes(".")) return null;
    return website.href;
  } catch {
    return null;
  }
}

function createStateIndex(locations) {
  return new Map(
    (locations.states || []).map((state) => [state.name.trim().toLowerCase(), state.id]),
  );
}

function createUniversityRecord(row, category, stateIndex, checkedAt, updatedAt) {
  const sourceId = cleanText(row.ID);
  const name = cleanText(row.uni_name);
  if (!sourceId || !/^\d+$/.test(sourceId) || !name) {
    throw new Error("UGC record is missing a valid ID or university name.");
  }

  const stateName = cleanText(row.state);
  const ugcStatus = cleanText(row.status);
  const website = normalizeWebsite(row.url);
  const sourceUrl = `${UGC_API}?unitypeID=${category.sourceId}`;
  const sourceUrls = [{
    url: sourceUrl,
    sourceType: "government-directory",
    description: `University Grants Commission directory; category: ${category.label}${ugcStatus ? `; listed status: ${ugcStatus}` : ""}.`,
    checkedAt,
  }];

  if (website) {
    sourceUrls.push({
      url: website,
      sourceType: "official-website",
      description: "Institution website URL listed by UGC; destination not independently checked.",
      checkedAt: null,
    });
  }

  const summary = `Listed in the UGC directory as ${category.label}${ugcStatus ? ` (UGC listing status: ${ugcStatus})` : ""}. Confirm current recognition, campus, programmes and admissions directly with official sources.`;

  return {
    id: `inst-in-ugc-${sourceId}`,
    name,
    shortName: null,
    slug: `${slugify(name)}-${sourceId}`,
    aliases: [],
    institutionType: category.institutionType,
    ownershipType: category.ownershipType,
    parentInstitutionId: null,
    foundedYear: null,
    countryCode: "IN",
    stateId: stateName ? stateIndex.get(stateName.toLowerCase()) || null : null,
    stateName,
    cityId: null,
    address: cleanText(row.address),
    pincode: /^\d{6}$/.test(String(row.Zip || "").trim()) ? String(row.Zip).trim() : null,
    coordinates: null,
    website,
    contact: null,
    recognitions: [],
    accreditations: [],
    courseIds: [],
    collegeIds: [],
    feeIds: [],
    admissionIds: [],
    examIds: [],
    hostelIds: [],
    facilities: [],
    languageOfInstruction: [],
    summary,
    ugcInstitutionId: sourceId,
    ugcStatus,
    sourceUrls,
    verificationStatus: "pending-review",
    verifiedAt: null,
    verifiedBy: null,
    reviewDueAt: null,
    active: true,
    createdAt: null,
    updatedAt,
  };
}

async function fetchCategory(category, fetchImpl) {
  const url = `${UGC_API}?unitypeID=${category.sourceId}`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://www.ugc.gov.in/universitydetails/university",
    },
  });
  if (!response.ok) throw new Error(`UGC request failed for ${category.label}: HTTP ${response.status}`);

  const payload = await response.json();
  if (!Array.isArray(payload.List) || payload.List.length === 0) {
    throw new Error(`UGC returned no university records for ${category.label}.`);
  }
  return payload.List;
}

async function importUniversities({ fetchImpl = fetch, dryRun = false } = {}) {
  const universitiesPath = path.join(DATA_DIR, "universities.json");
  const locationsPath = path.join(DATA_DIR, "locations.json");
  const dataset = JSON.parse(fs.readFileSync(universitiesPath, "utf8"));
  const locations = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
  const stateIndex = createStateIndex(locations);
  const timestamp = new Date().toISOString();
  const checkedAt = timestamp.slice(0, 10);
  const rowsByCategory = await Promise.all(CATEGORIES.map((category) => fetchCategory(category, fetchImpl)));
  const universities = rowsByCategory.flatMap((rows, index) => rows.map((row) =>
    createUniversityRecord(row, CATEGORIES[index], stateIndex, checkedAt, timestamp),
  ));
  const ids = universities.map((university) => university.id);
  if (new Set(ids).size !== ids.length) throw new Error("UGC returned duplicate institution IDs.");

  if (dryRun) {
    return Object.fromEntries(CATEGORIES.map((category, index) => [category.label, rowsByCategory[index].length]));
  }

  dataset.updatedAt = timestamp;
  dataset.metadata.sourceSnapshot = {
    name: "University Grants Commission university directory",
    url: "https://www.ugc.gov.in/universitydetails/university",
    api: UGC_API,
    importedAt: timestamp,
    records: universities.length,
    verificationNote: "UGC directory data is published as pending review; MedOrbits has not independently verified institution status or website destinations.",
  };
  dataset.universities = universities;
  fs.writeFileSync(universitiesPath, `${JSON.stringify(dataset, null, 2)}\n`);
  return Object.fromEntries(CATEGORIES.map((category, index) => [category.label, rowsByCategory[index].length]));
}

if (require.main === module) {
  importUniversities({ dryRun: process.argv.includes("--dry-run") })
    .then((counts) => {
      console.log(JSON.stringify(counts, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { CATEGORIES, createUniversityRecord, importUniversities, normalizeWebsite, slugify };