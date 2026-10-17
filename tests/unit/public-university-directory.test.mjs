import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicDataScript = fs.readFileSync(
  path.join(directory, "../../assets/js/public-data.js"),
  "utf8",
);

const universities = [
  {
    id: "inst-in-ugc-1",
    name: "University One",
    slug: "university-one-1",
    institutionType: "central-university",
    stateName: "Delhi",
    summary: "UGC directory listing.",
    ugcStatus: "2(f)",
    website: "https://one.example.edu/",
    sourceUrls: [{
      url: "https://www.ugc.gov.in/universitydetails/Getuniversity_details?unitypeID=1",
      sourceType: "government-directory",
    }],
    verificationStatus: "pending-review",
    active: true,
  },
  {
    id: "inst-in-ugc-2",
    name: "University Two",
    slug: "university-two-2",
    institutionType: "private-university",
    stateName: "Maharashtra",
    summary: "UGC directory listing.",
    ugcStatus: "2(f)",
    website: null,
    sourceUrls: [{
      url: "https://www.ugc.gov.in/universitydetails/Getuniversity_details?unitypeID=3",
      sourceType: "government-directory",
    }],
    verificationStatus: "pending-review",
    active: true,
  },
];

async function loadPage(pagePath, collection, records) {
  const dom = new JSDOM(
    '<main><div id="university-results"></div></main>',
    { url: `https://medorbits.in${pagePath}`, runScripts: "outside-only" },
  );
  dom.window.fetch = async () => ({
    ok: true,
    json: async () => ({ success: true, data: { [collection]: records } }),
  });
  dom.window.eval(publicDataScript);
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  return dom;
}

test("loads UGC-backed pending records from the API and filters by state", async () => {
  const dom = await loadPage("/education/universities.html", "universities", universities);
  const document = dom.window.document;

  assert.equal(document.querySelectorAll(".university-cards .card").length, 2);
  assert.match(document.querySelector(".university-data-disclaimer").textContent, /pending independent MedOrbits review/);
  assert.equal(document.querySelectorAll('.university-record-links a[target="_blank"]').length, 3);

  const stateFilter = document.querySelector('[aria-label="Filter by state or union territory"]');
  stateFilter.value = "Delhi";
  stateFilter.dispatchEvent(new dom.window.Event("change"));
  assert.equal(document.querySelectorAll(".university-cards .card").length, 1);
  assert.equal(document.querySelector(".university-cards h3").textContent, "University One");
  dom.window.close();
});

test("does not expose pending records on datasets without the UGC opt-in", async () => {
  const dom = await loadPage("/education/courses.html", "courses", universities);

  assert.equal(dom.window.document.querySelectorAll(".card").length, 0);
  assert.match(dom.window.document.querySelector('[role="status"]').textContent, /withheld/);
  dom.window.close();
});