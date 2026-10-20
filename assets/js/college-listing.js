/* MedOrbits -- College listing. Renders /assets/data/colleges.json into #college-results. */
(function (window, document) {
  "use strict";
  var box = document.getElementById("college-results");
  if (!box) return;

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  var params = new URLSearchParams(window.location.search);
  var q = (params.get("q") || "").trim().toLowerCase();
  var course = (params.get("course") || "").trim().toLowerCase();
  var state = (params.get("state") || "").trim().toLowerCase();
  var type = (params.get("type") || "").trim().toLowerCase();

  fetch("/assets/data/colleges.json", { headers: { Accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error("load"); return r.json(); })
    .then(function (json) {
      var list = (json.colleges || []).filter(function (c) {
        if (c.status && c.status.active === false) return false;
        var loc = c.location || {};
        var hay = [c.name, c.shortName, loc.city, loc.state].join(" ").toLowerCase();
        if (q && hay.indexOf(q) === -1) return false;
        if (state && String(loc.state || "").toLowerCase() !== state) return false;
        if (type && c.institutionType !== type) return false;
        if (course && !(c.courseIds || []).some(function (id) { return id === "course-" + course; })) return false;
        return true;
      });
      box.textContent = "";
      box.appendChild(el("h3", list.length + " college" + (list.length === 1 ? "" : "s") + " found"));
      if (!list.length) { box.appendChild(el("p", "No colleges match your search. Try fewer filters.")); return; }
      var grid = el("div", null, "cards");
      list.forEach(function (c) {
        var loc = c.location || {};
        var card = el("div", null, "card");
        var body = el("div", null, "card-body");
        body.appendChild(el("span", c.institutionType, "tag"));
        body.appendChild(el("h3", c.name));
        body.appendChild(el("p", [c.shortName, loc.city, loc.state].filter(Boolean).join(" \u00B7 ")));
        var website = c.contact && c.contact.officialWebsite;
        if (/^https:\/\//.test(website || "")) {
          var a = el("a", "Official website \u2197", "card-link");
          a.href = website; a.target = "_blank"; a.rel = "noopener noreferrer";
          body.appendChild(a);
        }
        body.appendChild(el("p", "Unverified listing. Confirm recognition, fees and admissions with the institution.", "search-note"));
        card.appendChild(body);
        grid.appendChild(card);
      });
      box.appendChild(grid);
    })
    .catch(function () { box.textContent = "Colleges could not be loaded. Please try again."; });
})(window, document);
