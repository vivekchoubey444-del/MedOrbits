MedOrbits Data Directory

Directory: assets/data/
Purpose: Structured JSON data for education, admissions, study-abroad, career, recruitment, and supporting website content.

⸻

1. Overview

The MedOrbits data directory stores structured content consumed by the website’s frontend and, where applicable, application services.

These datasets support:

* Education and course discovery
* College and university directories
* Admissions and entrance examinations
* Fee structures, scholarships, and accommodation
* Career guidance, jobs, and internships
* Employer and recruitment services
* Countries, locations, categories, and industry sectors
* FAQs, testimonials, news, and notifications

Keep the data layer separate from HTML presentation, CSS styling, and JavaScript application logic.

Important: Treat JSON files served publicly to the browser as public information. Authentication credentials, private student records, application documents, payment details, and other access-controlled data must remain in appropriately secured backend storage.

⸻

2. Directory Structure

The following files are shown in the current repository screenshots.

assets/
└── data/
    ├── README.md
    ├── admission-process.json
    ├── admissions.json
    ├── career-options.json
    ├── categories.json
    ├── colleges.json
    ├── countries.json
    ├── courses.json
    ├── documents.json
    ├── entrance-exams.json
    ├── faqs.json
    ├── fees.json
    ├── hostels.json
    ├── internships.json
    ├── jobs.json
    ├── locations.json
    ├── news.json
    ├── notifications.json
    ├── recruitment.json
    ├── scholarships.json
    ├── sectors.json
    ├── services.json
    ├── testimonials.json
    └── universities.json

Keep this inventory synchronized with the actual repository. Add new datasets to this README when they are introduced.

⸻

3. File Responsibilities

Education and institutions

File	Responsibility
countries.json	Country directory and destination information
courses.json	Course catalogue and associated course metadata
colleges.json	College records
universities.json	University records
categories.json	Reusable course or content classifications
locations.json	Location directory and geographical metadata
sectors.json	Industry and professional sector classifications

Admissions and student planning

File	Responsibility
admissions.json	Admission-related information and records
admission-process.json	Admission steps and process guidance
entrance-exams.json	Entrance examination information
documents.json	Admission document requirements and guidance
fees.json	Course, institution, or admission-related fee information
scholarships.json	Scholarship opportunities and eligibility information
hostels.json	Hostel and accommodation information

Career and recruitment

File	Responsibility
career-options.json	Career pathways and professional options
jobs.json	Job and employment opportunity listings
internships.json	Internship opportunities
recruitment.json	Employer, recruitment, or hiring service information
services.json	Consultancy, candidate, and employer services

Supporting content

File	Responsibility
faqs.json	Frequently asked questions and answers
testimonials.json	Approved testimonials
news.json	News and informational updates
notifications.json	Public-facing notification content, where appropriate

The exact fields and top-level collection names must be confirmed against each dataset and the JavaScript that consumes it.

⸻

4. Data Standards

4.1 JSON validity

* Use valid JSON syntax.
* Encode files as UTF-8.
* Use double quotes for JSON property names and string values.
* Do not include comments or trailing commas.
* Keep the top-level structure consistent within each dataset.
* Ensure every file can be parsed by a standard JSON parser.

4.2 Schema versioning and timestamps

For newly designed datasets, use a documented schema that includes version and update metadata.

Example:

{
  “schemaVersion”: 1,
  “updatedAt”: “2026-10-15T00:00:00Z”,
  “courses”: []
}

This is an illustrative structure, not a claim that every existing MedOrbits file already uses these fields.

Before introducing schemaVersion or updatedAt into existing files, inspect their current structure and update the consuming JavaScript accordingly. Do not change existing top-level keys blindly.

Use ISO 8601 dates or timestamps when dates are required. Use UTC timestamps with Z where a precise timestamp is intended.

4.3 Stable identifiers

Records should have stable, unique identifiers.

Example:

{
  “id”: “COURSE-MBBS”,
  “slug”: “mbbs”,
  “name”: “Bachelor of Medicine and Bachelor of Surgery”
}

Use identifiers that remain stable when display names change. Slugs should be URL-safe and consistent with the website’s routing conventions.

Do not reuse identifiers for unrelated records.

4.4 Cross-file references

When datasets refer to one another, use stable identifiers instead of duplicating entire records.

For example, a course record may refer to an institution using an agreed institution ID.

Before introducing references, establish a consistent ID convention across the relevant files. Do not assume that the current datasets already use matching identifiers.

Validate that referenced records exist and that identifiers are unique within the appropriate dataset.

4.5 Missing and unknown values

* Use null for a known field whose value is unavailable, where permitted by the schema.
* Use an empty array when a collection is known to be empty.
* Omit genuinely optional fields when the schema permits omission.
* Do not use invented fees, placeholder institutions, or misleading sample records as real data.
* Distinguish unknown values from zero, false, and empty strings.

For example, an unknown fee should not be represented as 0, because that could incorrectly imply that the course is free.

⸻

5. Data Accuracy and Verification

Education, admissions, employment, and recruitment information can influence important decisions. Verify factual claims before publishing them.

Institutions and courses

Verify institution names, course availability, official recognition where applicable, and published admission requirements against reliable sources.

Fees and scholarships

Where available, record:

* The applicable academic year
* Currency
* Fee period or billing basis
* Eligibility criteria
* Official source URL
* Date last verified

Clearly distinguish annual fees, semester fees, tuition, hostel charges, deposits, and other expenses.

Admissions and examinations

Verify deadlines, eligibility requirements, examination dates, counselling procedures, and document requirements against the relevant official authority.

Do not present historical deadlines or requirements as current without verification.

Jobs and internships

Where applicable, include:

* Position or opportunity title
* Employer
* Location or work arrangement
* Employment type
* Publication date
* Application deadline
* Application URL
* Current status
* Source or verification information

Remove expired or withdrawn listings when appropriate. Never invent employers, vacancies, salaries, or application links.

Testimonials and news

Publish testimonials only when appropriate authorization and consent have been obtained. Do not fabricate reviews, names, photographs, or endorsements.

Keep news linked to reliable sources and accurately distinguish publication dates from the dates of the events being described.

Verification rule: If a factual field cannot be verified, mark it as unknown or withhold the record until it can be accurately published.

⸻

6. Frontend Integration

6.1 Use the correct public path

If the directory is deployed as assets/data/, a browser request may use:

const response = await fetch(“/assets/data/courses.json”);

The actual URL depends on the repository structure, server configuration, deployment base path, and routing setup. Confirm the public path before integrating the file.

6.2 Example: Load course data

async function loadCourses() {
  const response = await fetch(“/assets/data/courses.json”);
  if (!response.ok) {
    throw new Error(
      `Unable to load courses: HTTP ${response.status}`
    );
  }
  const data = await response.json();
  if (!Array.isArray(data.courses)) {
    throw new Error(“Invalid courses data structure”);
  }
  return data.courses;
}

This example assumes that courses.json contains a top-level courses array. Adapt the property name to the actual file structure.

6.3 Error handling

Frontend consumers should:

* Check response.ok.
* Handle network and JSON parsing failures.
* Validate expected data structures.
* Handle missing optional fields.
* Display a useful fallback state when data cannot be loaded.
* Avoid exposing sensitive server details in user-facing errors.

Do not silently replace missing or invalid data with fabricated institutions, fees, jobs, or other factual content.

6.4 Rendering and security

Treat JSON content as data, not executable code.

When rendering strings in the browser, use safe DOM APIs such as textContent rather than injecting untrusted content into innerHTML.

Validate URLs before using them as navigation destinations, and do not assume that a URL supplied by a dataset is safe merely because it appears in JSON.

⸻

7. Security and Privacy

The data directory is intended for public or non-sensitive frontend datasets.

Never store the following in publicly served JSON files:

* Passwords or password hashes
* API keys, access tokens, or session identifiers
* Private student or applicant information
* Identity documents or uploaded files
* Payment credentials or confidential transaction records
* Private phone numbers, email addresses, or home addresses
* Internal authorization rules or secrets

Public notifications and recruitment information must be reviewed to ensure that they do not expose private records.

For private or user-specific data, use authenticated backend endpoints and enforce authorization on the server.

Removing a sensitive field from the displayed interface does not make it safe if the field remains available in a publicly downloadable JSON file.

⸻

8. Validation and Quality Assurance

Run validation from the project root.

8.1 Validate one JSON file

python -m json.tool assets/data/courses.json

A successful parse confirms JSON syntax validity; it does not confirm that the data follows the expected schema or contains accurate information.

8.2 Validate every JSON file

python - <<‘PY’
import json
from pathlib import Path
data_dir = Path(“assets/data”)
failed = False
if not data_dir.is_dir():
    raise SystemExit(f”Data directory not found: {data_dir}”)
for path in sorted(data_dir.glob(“*.json”)):
    try:
        with path.open(encoding=“utf-8”) as file:
            json.load(file)
        print(f”OK   {path}”)
    except (json.JSONDecodeError, UnicodeDecodeError, OSError) as error:
        failed = True
        print(f”FAIL {path}: {error}”)
if failed:
    raise SystemExit(“One or more JSON files failed validation.”)
print(“All JSON files passed syntax validation.”)
PY

This checks JSON syntax and file readability. It does not validate field types, uniqueness, cross-file references, source reliability, or business rules.

8.3 Additional validation

Before deployment, verify:

* [ ]	Every dataset parses successfully.
* [ ]	Required properties exist.
* [ ]	Property types match the expected schema.
* [ ]	Record identifiers are unique.
* [ ]	Cross-file references resolve.
* [ ]	Dates and URLs use the expected formats.
* [ ]	Fees include the appropriate currency and period where required.
* [ ]	Expired opportunities are handled correctly.
* [ ]	Public data contains no secrets or private records.
* [ ]	Frontend consumers use the correct top-level keys.
* [ ]	Data-loading failures produce appropriate fallback states.
* [ ]	Deployed public paths resolve correctly.

Use a JSON Schema or equivalent automated validator when the datasets become large enough to benefit from formal schema enforcement.

⸻

9. Change Management

When modifying an existing dataset:

1. Inspect the current JSON structure.
2. Identify every frontend or backend consumer.
3. Preserve existing keys unless a migration is intended.
4. Update related records and references together.
5. Validate JSON syntax and expected structure.
6. Test affected pages and data-loading behavior.
7. Review factual accuracy and source information.
8. Confirm that no private information is exposed.
9. Commit the data and necessary code changes together.
10. Update this README if the directory or dataset responsibilities change.

Avoid changing a dataset’s top-level key or identifier format without checking its consumers.

For breaking changes, migrate the data and consuming code together rather than leaving the application in a partially compatible state.

⸻

10. Relationship to the MedOrbits Design System

The data directory supplies content to the application. It does not define visual presentation.

Keep the existing HTML, JavaScript, and CSS architecture responsible for rendering this content in accordance with the established Royal Burgundy and Champagne Gold design system.

Changes to JSON files should not require unrelated changes to:

* Header and navigation styling
* Footer layout
* Homepage opening animations
* CSS design tokens
* Responsive layout conventions
* Shared UI components

When a data change requires a presentation update, make that change explicitly in the relevant frontend component and test it independently.

⸻

11. Definition of Done

A dataset change is ready for review when:

* JSON syntax is valid.
* The actual data structure matches its consumers.
* Identifiers and references are consistent.
* Factual information is appropriately verified.
* Sensitive data is excluded from public files.
* Error handling and fallback behavior have been checked.
* Affected pages have been tested.
* Documentation reflects any structural changes.

⸻

12. Summary

The MedOrbits data directory provides a structured content layer for education, admissions, careers, recruitment, and supporting information.

Maintain valid JSON, stable identifiers, verified factual content, safe public data, and consistent frontend contracts.

Keep data accurate, schemas predictable, references consistent, and sensitive information on the secured backend.