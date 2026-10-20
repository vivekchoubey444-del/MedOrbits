/* MedOrbits -- Course details page. Reads /assets/data/courses.json and renders ?slug=. */
(function (window, document) {
  "use strict";
  var detail = document.getElementById("courseDetail");
  var related = document.getElementById("relatedCourses");
  if (!detail) return;

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function label(v) { return v ? String(v).replace(/-/g, " ") : "Not specified"; }

  fetch("/assets/data/courses.json", { headers: { Accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error("load"); return r.json(); })
    .then(function (json) {
      var courses = (json.courses || []).filter(function (c) { return c.active !== false; });
      var slug = new URLSearchParams(window.location.search).get("slug");
      var course = courses.filter(function (c) { return c.slug === slug || c.id === slug; })[0];
      detail.textContent = "";
      if (!course) {
        detail.appendChild(el("h1", "Course not found"));
        detail.appendChild(el("p", "Choose a course from the course list."));
        return;
      }
      document.title = course.name + " | MedOrbits";
      detail.appendChild(el("span", course.shortName || "Course", "kicker"));
      detail.appendChild(el("h1", course.name));
      detail.appendChild(el("p", course.description || "Check official regulator information for current details."));
      var list = el("ul");
      [["Level", label(course.level)], ["Discipline", label(course.discipline)],
       ["Duration", course.durationYears ? course.durationYears + " years" : "Verify with the official regulator"],
       ["Entrance exams", (course.examIds || []).map(function (e) { return label(e.replace(/^exam-/, "")).toUpperCase(); }).join(", ") || "Not specified"]
      ].forEach(function (row) { list.appendChild(el("li", row[0] + ": " + row[1])); });
      detail.appendChild(list);
      if (course.verificationStatus !== "verified") {
        detail.appendChild(el("p", "This information is not yet verified. Confirm details with the relevant official authority.", "search-note"));
      }
      courses.filter(function (c) { return c.id !== course.id && c.discipline === course.discipline; })
        .slice(0, 4).forEach(function (c) {
          var a = el("a", null, "card");
          a.href = "/education/course-details.html?slug=" + encodeURIComponent(c.slug || c.id);
          var body = el("div", null, "card-body");
          body.appendChild(el("h3", c.shortName || c.name));
          body.appendChild(el("p", c.name));
          a.appendChild(body);
          related.appendChild(a);
        });
    })
    .catch(function () { detail.textContent = "Course details could not be loaded. Please try again."; });
})(window, document);
