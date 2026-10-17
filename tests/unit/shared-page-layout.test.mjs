import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");
const appScript = fs.readFileSync(
  path.join(process.cwd(), "assets/js/app.js"),
  "utf8",
);
const animationScript = fs.readFileSync(
  path.join(process.cwd(), "assets/js/animations.js"),
  "utf8",
);

function setupPage() {
  const cards = Array.from({ length: 5 }, (_, index) => `<article class="card"><h2>Item ${index + 1}</h2></article>`).join("");
  const dom = new JSDOM(`<!doctype html><html><head><style>.cards{grid-template-columns:repeat(4,1fr)}.footer-grid{grid-template-columns:repeat(5,1fr)}</style></head><body><main><section class="section"><div class="section-head"><h1>Catalog</h1></div><div class="cards">${cards}</div></section></main><footer><div class="footer-grid"><div class="footer-brand">Brand</div><div>One</div><div>Two</div><div>Three</div><div>Four</div></div><div class="footer-bottom"></div></footer></body></html>`, {
    url: "https://medorbits.in/education/courses.html",
    runScripts: "outside-only",
  });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
  dom.window.fetch = async () => ({
    ok: true,
    json: async () => ({
      links: [
        { id: "website", label: "MedOrbits website", url: "https://medorbits.in" },
        { id: "whatsapp-primary", label: "WhatsApp", url: "https://wa.me/916205889064" },
        { id: "instagram", label: "Instagram", url: "" },
        { id: "facebook", label: "Facebook", url: "" },
        { id: "x", label: "X", url: "" },
      ],
    }),
  });
  dom.window.eval(appScript);
  dom.window.eval(animationScript);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  return dom;
}

test("catalogs page four cards in a two-column grid and slide to the next set", async () => {
  const dom = setupPage();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  const { document } = dom.window;
  const track = document.querySelector(".cards");
  const cards = [...track.children];

  assert.match(document.getElementById("medorbits-grid-layout").textContent, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.equal(track.classList.contains("is-catalog-slider"), true);
  assert.deepEqual(cards.map((card) => card.hidden), [false, false, false, false, true]);
  document.querySelector('[aria-label="Show next catalog items"]').click();
  assert.deepEqual(cards.map((card) => card.hidden), [true, true, true, true, false]);
  dom.window.close();
});

test("footer uses configured icons and does not invent missing profile links", async () => {
  const dom = setupPage();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  const { document } = dom.window;
  const footer = document.querySelector("[data-social-links]");
  const links = [...footer.querySelectorAll("a")];
  const placeholders = [...footer.querySelectorAll(".footer-social-placeholder")];

  assert.deepEqual(links.map((link) => link.textContent), ["MedOrbits website", "WhatsApp"]);
  assert.equal(links[0].querySelector("img").getAttribute("src"), "/assets/icons/social/link.svg");
  assert.deepEqual(placeholders.map((item) => item.textContent), ["Instagram", "Facebook", "X"]);
  assert.equal(footer.querySelectorAll("a").length, 2);
  dom.window.close();
});