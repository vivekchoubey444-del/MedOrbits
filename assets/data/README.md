MedOrbits Data Directory

Directory: assets/data/
Project: MedOrbits
Purpose: Structured JSON datasets for education, admissions, study abroad, careers, recruitment, and supporting website content
Data format: UTF-8 JSON
Access model: Public frontend data
Maintained by: MedOrbits
Documentation version: 1.1.0

⸻

1. Overview

The assets/data/ directory contains structured reference data consumed by the MedOrbits website and other approved application components.

Datasets are maintained separately from HTML, CSS, and JavaScript so that content can be updated without unnecessarily changing presentation components.

The directory supports:

* Education courses and entrance examinations.
* Institutions, locations, and admission opportunities.
* Fees, scholarships, and accommodation information.
* Jobs, internships, recruitment, and career-related content.
* Public services, FAQs, news, and notifications.
* Testimonials and supporting reference catalogues.

Core principles

1. Maintain one canonical source for each type of entity.
2. Keep data structures consistent and documented.
3. Separate factual verification from publication status.
4. Validate JSON syntax, schemas, identifiers, and references.
5. Keep public datasets free of confidential information.
6. Preserve compatibility with existing frontend consumers.
7. Update related documentation and tests whenever schemas change.

Critical security rule: Files in this directory must be treated as public. Never store secrets, private applicant information, identity documents, confidential payment data, or unpublished personal contact details here.

Dataset presence does not establish factual accuracy. Records remain unverified until an authorized reviewer completes the required verification process.

⸻

2. Dataset Inventory and Status

The following inventory reflects the documented repository state and must be checked against the actual files before release.

2.1 Existing datasets

File	Collection key	Documented status	Notes
courses.json	courses	Seeded — 38 records	Course names, levels, and examination links; durations and regulators are null where unavailable.
entrance-exams.json	exams	Seeded — 10 records	Includes placeholder entries for state, institutional, and other examinations.
documents.json	documents	Seeded — 31 records	Catalogue of common documents; does not establish mandatory admission requirements.
locations.json	countries, states, cities	Seeded	Documented as 41 countries and 36 states and union territories; cities is empty.
sectors.json	sectors	Seeded — 16 records	Editorial sector groupings without salary or demand claims.
services.json	services	Seeded — 8 drafts	Proposed services; active: false until approved by the business.
faqs.json	faqs	Seeded — 5 records	Public informational questions and answers.
scholarships.json	scholarships	4 current-cycle records	NSP lists these 2026-27 schemes with application windows ending 31 October 2026; verify current details on the official portal.
recruitment.json	To be confirmed	Schema-only	Includes recruitment-body and stage catalogues.
admissions.json	admissions	Schema-only	Documented schema version 1.2.0.
universities.json	universities	Schema-only	Canonical source for institution records; no institutions are currently listed.
colleges.json	colleges	Empty	No college records are currently listed; use universities.json as the canonical institution source unless a verified college record is available.
fees.json	fees	Schema-only	Fee record structure.
hostels.json	hostels	Schema-only	Accommodation record structure.
internships.json	internships	Schema-only	Internship record structure.
jobs.json	jobs	Schema-only	Employment listing structure.
news.json	news	Schema-only	News and update structure.
notifications.json	notifications	Schema-only	Includes public message templates.
testimonials.json	testimonials	Schema-only	Never populate with fabricated reviews or placeholder endorsements.

The counts, collection keys, and statuses above are documented reference values. They are not a guarantee that the files currently contain those records or structures. Confirm them against the actual repository before release.

2.2 Status definitions

Status	Meaning
Seeded	Contains initial reference records or drafts. Seeded does not mean verified.
Schema-only	Defines the intended dataset structure or catalogues but is not ready to provide verified live records.
Verified	A record has completed the approved review process and meets the applicable verification requirements.

Verified is primarily a record-level status. A dataset containing some verified records should not automatically be described as entirely verified.

Update the inventory whenever datasets, collection keys, record counts, or implementation status changes.

2.3 Previously listed datasets

File	Current handling
colleges.json	Prefer universities.json as the canonical institution source. Add a college record only when required by a consumer and supported by verified sources.
countries.json	Countries currently belong to locations.json. A separate dataset must not become a competing source of truth.
categories.json	Not currently listed as created.
admission-process.json	Not currently listed as created.
career-options.json	Not currently listed as created; sectors.json covers only part of this subject.
exams.json	Superseded by entrance-exams.json. Update remaining consumers before removing the old file, if it still exists.

Every new dataset must be added to this inventory.

⸻

3. JSON Conventions

3.1 File format

All datasets must:

* Contain valid UTF-8 JSON.
* Use straight double quotation marks.
* Exclude comments and trailing commas.
* Avoid duplicate object keys.
* Use consistent collection names and field types.
* Preserve numeric values as numbers and Boolean values as Booleans.
* Represent unavailable optional values using documented conventions.
* Follow the same structural contract within each dataset.

Example dataset envelope:

{
  “schemaVersion”: “1.0.0”,
  “updatedAt”: null,
  “metadata”: {},
  “fields”: [],
  “allowedValues”: {},
  “dataRules”: [],
  “courses”: []
}

This example illustrates the envelope only. Each dataset must use its own documented collection key and appropriate metadata.

3.2 Dataset envelope

Property	Meaning
schemaVersion	Semantic-version string identifying the dataset schema.
updatedAt	null until populated, then an ISO 8601 timestamp.
metadata	Dataset description, language, disclaimer, and related metadata.
fields	Field catalogue, where supported.
allowedValues	Permitted enumeration values.
dataRules	Editorial and validation rules.
displayRules	Optional frontend presentation guidance.
fieldDefinitions	Optional field-level documentation.
Collection key	The actual array or collection consumed by the application.

Documentation properties such as metadata, fields, allowedValues, dataRules, displayRules, and fieldDefinitions must not be interpreted as business records by cross-reference validators.

Consumers must read the documented collection key, not assume every file has a collection named data.

3.3 Schema versioning

schemaVersion must be a string, such as “1.2.0”.

Increment the schema version when a structural or contractual change requires it. Changes may include:

* Renaming or removing a field.
* Changing a field’s type.
* Changing the collection structure.
* Changing required-field rules.
* Changing the meaning of an existing field.

Update relevant consumers, schemas, and tests in the same change.

Content-only changes do not necessarily require a schema-version increment, but dataset update metadata should reflect the applicable policy.

3.4 Update timestamps

Use an ISO 8601 UTC timestamp for updatedAt, for example:

{
  “updatedAt”: “2026-10-15T00:00:00Z”
}

Use null when no update timestamp has been assigned.

Dates representing calendar events should use YYYY-MM-DD. Precise timestamps should use ISO 8601 with an explicit offset, preferably UTC when appropriate.

3.5 Character encoding

Save all JSON files as UTF-8.

Preserve legitimate Unicode characters in institution names, locations, and multilingual content. Do not corrupt accented characters or regional-language text through incorrect encoding conversions.

⸻

4. Identifiers, Slugs, and Canonical Records

4.1 Identifier conventions

Identifiers must be stable, lowercase, and hyphenated. Use the established type prefix.

Entity	Identifier pattern	Example
Course	course-<slug>	course-mbbs
Examination	exam-<slug>	exam-neet-ug
Document	doc-<slug>	doc-class-12-marksheet
Country	country-<alpha2>	country-in
State or union territory	state-<country>-<code>	state-in-mh
Institution	inst-<country>-<slug>	inst-in-example-college
Service	service-<slug>	service-course-guidance
Sector	sector-<slug>	sector-dentistry
FAQ	faq-<slug>	faq-jobs

These are conventions, not permission to invent records. Institution identifiers must be assigned to actual institutions only after the record has been created and reviewed.

4.2 Slugs

Slugs must be:

* Lowercase.
* Kebab-case.
* URL-safe.
* Unique within the relevant dataset.
* Stable enough for existing URLs and internal links.

Display names may change without changing the identifier.

Never reuse an identifier for an unrelated record. Mark a record inactive, outdated, or superseded as appropriate.

4.3 Canonical source of truth

Each entity should have one canonical record.

For example:

* Courses are defined in courses.json.
* Examinations are defined in entrance-exams.json.
* Documents are defined in documents.json.
* Countries, states, and cities are defined in locations.json.
* Institutions are defined in universities.json.

Other datasets should reference these records by ID instead of duplicating complete objects.

4.4 Duplicate prevention

Before creating a record:

1. Search the existing dataset for the entity.
2. Check its identifier and slug.
3. Determine whether an existing record can be updated.
4. Preserve existing references when an entity’s display name changes.
5. Create a new ID only for a genuinely distinct entity.

⸻

5. Missing Values and Data Types

5.1 Missing-value rules

Value	Meaning
null	The field exists, but its value is unavailable or unknown.
[]	The collection is known to be empty.
0	A genuine numeric zero, such as a verified fee of zero.
Missing property	The field is omitted because it is optional or not applicable under the schema.

Never use zero to represent an unknown fee, salary, vacancy count, seat count, or scholarship amount.

Do not replace missing facts with invented values, fabricated links, or speculative records.

5.2 Currency and amounts

Use ISO 4217 currency codes, with INR as the default only where the dataset explicitly establishes that default.

Amounts must be numeric:

{
  “amount”: 125000,
  “currency”: “INR”,
  “period”: “per_year”
}

This amount is an illustrative format example, not a verified fee.

Every amount must identify its currency and applicable period. Define permitted periods in the relevant schema, such as:

* one_time
* per_year
* per_semester
* per_month

Use only the periods supported by the dataset’s actual schema.

For fees and scholarships, record the relevant academic year or validity period where applicable.

Do not combine tuition, accommodation, deposits, and other charges into a single amount without documenting what is included.

5.3 Geographic codes

Use:

* ISO 3166-1 alpha-2 for country codes.
* ISO 3166-2 for subdivision codes where applicable.
* A consistent, documented identifier format for internal references.

Do not treat an internal state ID as interchangeable with an ISO subdivision code.

5.4 Boolean fields

Use actual JSON Boolean values:

{
  “active”: false
}

Do not use “true”, “false”, “yes”, or “no” as substitutes for Boolean values unless a specific field is intentionally defined as a string.

⸻

6. Record Verification and Publication

6.1 Verification block

Records containing factual claims should include the verification fields required by their schema.

{
  “verificationStatus”: “unverified”,
  “verifiedAt”: null,
  “verifiedBy”: null,
  “reviewDueAt”: null
}

This is an illustrative structure. Use the exact field names and allowed values defined by the dataset’s schema.

6.2 Allowed verification statuses

Status	Meaning
unverified	The record has not completed verification.
pending_review	The record is awaiting review.
verified	The record has passed the approved verification process.
outdated	The record is no longer current or needs renewed review.
rejected	The record failed review or must not be published.

A dataset may use different status values when its schema defines a different lifecycle. Do not mix status vocabularies without an explicit mapping.

6.3 Verification requirements

* verifiedAt and verifiedBy must be populated together when required by the applicable schema.
* Only an authorized reviewer may approve a record.
* A verified record must contain a valid sourceUrl or noticeUrl, according to the applicable schema.
* Review dates and source evidence must be maintained.
* Expired, withdrawn, or outdated information must not be presented as current.
* Frontend publication must not infer verification from active: true.

The identity represented by verifiedBy should be handled according to the project’s privacy and audit policy. Do not expose private staff information unnecessarily in public data.

active is a display or availability control. It does not establish official verification or prove that admissions, applications, recruitment, or vacancies are open.

6.4 Publication policy

The frontend must distinguish verification from publication.

A record should be displayed according to the applicable combination of:

* active
* verificationStatus
* Publication or approval status, where defined.
* Applicable start and end dates.
* Source and review requirements.
* Dataset-specific displayRules.

Unverified records must be clearly labeled where they are intentionally shown for informational purposes. They must not be represented as officially confirmed.

Records that fail the publication policy must be withheld from public listings.

6.5 Validity periods

Where a record has a start and end date:

* Use the documented date format.
* Validate that the end date does not precede the start date.
* Define whether the end date is inclusive.
* Apply a consistent timezone policy to precise timestamps.
* Avoid treating missing dates as proof of indefinite validity.

⸻

7. Cross-File References

Use identifiers to establish relationships between datasets. Do not copy complete records into related files.

Source collection	Reference fields	Target
courses	examIds	entrance-exams.json → exams
exams	courseIds	courses.json → courses
sectors	courseIds	courses.json → courses
services	relatedCourseIds, relatedExamIds, relatedFaqIds	Courses, examinations, FAQs
scholarships	courseIds, requiredDocumentIds, stateIds, institutionIds	Courses, documents, states, universities
recruitments	jobIds, courseIds, requiredDocumentIds, stateIds, corrigendumIds, supersedesId	Jobs, courses, documents, states, recruitment records
admissions	courseId, institutionId, examId, supersedesId	Courses, universities, examinations, admissions
fees	Schema-defined course and institution references	Courses, universities
hostels	Schema-defined course and institution references	Courses, universities
internships	Schema-defined course and institution references	Courses, universities
jobs	Schema-defined course and institution references	Courses, universities
universities	programmes[].courseId, stateId, cityId, hostelIds, feeIds	Courses, locations, hostels, fees
news	examIds, courseIds, admissionIds, stateIds	Examinations, courses, admissions, states
notifications	examIds, courseIds, admissionIds, stateIds, newsId	Corresponding datasets
testimonials	relatedCourseId, relatedInstitutionId, stateId	Courses, universities, states

Reference field names in this table are intended to document relationships. Confirm each property against the actual dataset schema before implementing a validator.

The notation “schema-defined course and institution references” does not represent literal JSON property names.

7.1 Institution naming convention

Some existing schema descriptions refer to institutions.id. The canonical source of institution IDs is universities.json.

Treat institutions.id as a legacy reference to universities.id until the schema descriptions and consumers have been updated.

Do not create a second institution identifier namespace.

7.2 Service and testimonial compatibility

The documented services.json catalogue contains the service key scholarship_information, but testimonials.json does not yet include that value in serviceUsed.

Before collecting testimonials for that service:

1. Update the testimonial schema’s allowed values.
2. Update relevant validation rules.
3. Update frontend selectors and consumers.
4. Test the revised schema and validation.

Do not bypass allowed-value validation to accommodate the mismatch.

7.3 Reference integrity

Reference validation should detect:

* Unknown target IDs.
* Duplicate IDs and slugs.
* Invalid collection names.
* References to missing or unapproved records where the relationship requires approval.
* Invalid self-references.
* Invalid supersession chains where applicable.
* References to retired records where the relationship requires a current target.

A reference to an existing ID does not, by itself, establish that the target record is verified or publishable.

⸻

8. Data Accuracy and Source Quality

Education, admissions, recruitment, and employment information can influence significant personal decisions.

When a fact cannot be verified, leave it unavailable or withhold the record until adequate evidence is available.

8.1 Institutions and courses

Verify institution names, programmes, recognition, and admission requirements using the institution and relevant official regulator or authority.

Never infer institutional recognition, accreditation, licensing eligibility, or programme approval from an institution’s name alone.

8.2 Fees and scholarships

Record applicable:

* Academic year or validity period.
* Currency and amount period.
* Eligibility conditions.
* Tuition, hostel, deposits, and additional charges separately.
* Official source URL.
* Verification and review dates.

Do not combine different fee categories into a single amount without explaining the calculation and inclusions.

8.3 Admissions and examinations

Verify eligibility, deadlines, examination dates, counselling procedures, and application instructions with the official authority.

Do not display expired deadlines as current or imply that an application window is open without adequate evidence.

8.4 Jobs, internships, and recruitment

Where applicable, record:

* Position or opportunity title.
* Employer or recruiting authority.
* Location and opportunity type.
* Publication date and deadline.
* Application URL.
* Current status.
* Official source.
* Verification and review dates.

Archive or flag expired, withdrawn, and superseded opportunities. Direct users to official application channels.

8.5 Testimonials

Publish only genuine testimonials with documented consent.

Never fabricate:

* Reviews or endorsements.
* Names or profile photos.
* Academic results or admission outcomes.
* Employment outcomes.
* Claims that imply guaranteed results.

8.6 News and corrections

Use reliable sources and distinguish the publication date from the date of the event.

When correcting or replacing a record, create an appropriate replacement record and use supersedesId where supported.

8.7 Source maintenance

When source information changes:

1. Recheck the affected record.
2. Update its verification status.
3. Record the new verification timestamp when applicable.
4. Update the source URL or supporting reference.
5. Review dependent records and frontend displays.
6. Flag or retire outdated information.

Do not retain a verified status indefinitely if the underlying fact has expired or requires renewed review.

⸻

9. Security and Privacy

9.1 Prohibited public data

Never store the following in assets/data/:

* Passwords, password hashes, API keys, or access tokens.
* Session identifiers or private authentication data.
* Private applicant or student information.
* Identity documents, uploaded files, or confidential records.
* Payment credentials or confidential transaction details.
* Personal phone numbers, private email addresses, or home addresses.
* Internal authorization rules or security secrets.

A file remains public even if a frontend component does not display its contents.

9.2 Official contact information

Institutional, employer, or helpdesk contact details may be included only when the organization has published them for public use.

Copy official details accurately and preserve their source.

Never add an individual’s private contact information. If contactEmail or contactPhone is not supported by an authoritative public source, leave the field null or omit it according to the schema.

9.3 Consent records

Testimonial records may contain a consent block and an internal consentRecordRef.

The actual consent evidence and submitter contact details must remain in secured backend storage, not in the public JSON dataset.

The reference itself must not expose a private document URL, access token, or sensitive storage location.

9.4 Notifications

notifications.json may contain approved public message content and templates.

Subscriber lists, delivery targets, personal preferences, authentication details, and delivery logs belong in the backend.

9.5 Frontend rendering

Treat all JSON content as data, never as executable code.

* Use textContent or framework-safe text rendering for untrusted strings.
* Avoid inserting untrusted data through innerHTML.
* Validate URLs before navigation.
* Allow only appropriate HTTPS URLs or approved site-relative paths.
* Use rel=“noopener noreferrer” when opening external links in a new browsing context.
* Do not expose internal storage paths or private record references.
* Do not rely on CSS visibility or frontend filtering to protect confidential information.

Public JSON must contain only information that is approved for public access.

⸻

10. Frontend Integration

10.1 Public data paths

For a site deployed at the domain root, the standard URL pattern is:

/assets/data/<filename>.json

For deployments using a subdirectory or a configurable base path, resolve the URL using the application’s established asset-path configuration.

Do not assume the root-relative path works for every hosting configuration.

10.2 Loading a dataset

Example using valid JavaScript syntax:

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

This example demonstrates loading and basic structural validation. It does not verify course accuracy, references, publication eligibility, or schema compliance.

The path and collection key must match the actual deployment and courses.json structure.

10.3 Frontend requirements

* Check HTTP response status.
* Handle network and JSON parsing errors.
* Validate the expected collection and required fields.
* Tolerate missing optional fields.
* Show an appropriate fallback when data cannot load.
* Never invent missing institutions, fees, jobs, or examination information.
* Respect the record’s verification and publication status.
* Apply dataset-specific disclaimers.
* Avoid displaying stale opportunities as currently open.

A frontend fallback should communicate that data is unavailable without exposing internal paths, credentials, or server diagnostics.

10.4 Verification and expiry display

Where relevant, the frontend should:

* Label unverified information appropriately.
* Withhold rejected or otherwise unpublished records.
* Display approved records only according to the applicable publication policy.
* Identify expired or outdated opportunities.
* Evaluate dates using a consistent timezone policy.
* Avoid interpreting active: true as proof of current availability.

The actual publication rules should be implemented and tested in the appropriate application components.

10.5 Data caching

Public JSON can be cached, but the cache policy should reflect how frequently the data changes.

* Use appropriate HTTP cache headers where supported.
* Ensure updates become visible within the intended publication window.
* Avoid indefinite caching of time-sensitive admissions or recruitment data.
* Use versioned asset URLs or appropriate cache invalidation when necessary.
* Do not confuse a successful cache response with current factual accuracy.

⸻

11. Data Validation

Validation commands must use the filenames and arguments supported by the actual repository.

11.1 JSON syntax validation

For an individual dataset:

python3 -m json.tool assets/data/courses.json

This checks JSON syntax. It does not validate the dataset schema, factual accuracy, or cross-file references.

To check multiple JSON files in a shell environment:

find assets/data -maxdepth 1 -type f -name ‘*.json’ -print

This lists files only; it does not validate them.

11.2 Full dataset validation

The proposed repository utility is:

python3 scripts/validate-data.py assets/data

Before using this command, confirm that scripts/validate-data.py exists and accepts the specified directory argument. Its presence and functionality are not established by this README.

The intended full-validation responsibilities are:

* JSON syntax and UTF-8 validation.
* Duplicate ID and slug detection.
* Required collection checks.
* Cross-file reference validation.
* Verification timestamp and reviewer consistency.
* Required source checks for verified records.
* Date-format validation.
* Application start and end date consistency.
* Warnings for potentially incorrect zero-value amounts.
* Dataset inventory and file-existence checks.
* Validation of permitted enumeration values.
* Checks for broken or unsupported URL formats.

These are expected responsibilities, not a guarantee that every check has already been implemented.

The validator should distinguish blocking errors from non-blocking warnings. Its exit-code behaviour must be verified before relying on it in CI/CD.

11.3 Full validation checklist

Before deploying data changes:

* [ ]	Every dataset parses as valid JSON.
* [ ]	The full validator reports zero blocking errors.
* [ ]	Collection names and field types match their schemas.
* [ ]	IDs and slugs are unique.
* [ ]	Cross-file references resolve.
* [ ]	Dates and timestamps follow the documented formats.
* [ ]	Amounts include the required currency and period.
* [ ]	Verification metadata is consistent.
* [ ]	Expired opportunities are flagged or archived.
* [ ]	No secrets or private data are exposed.
* [ ]	Frontend consumers use the correct collection keys.
* [ ]	Public URLs resolve under the actual deployment base path.
* [ ]	Error and fallback states have been tested.

11.4 Future schema validation

As datasets grow, introduce JSON Schema for stricter structural enforcement.

Schema validation should cover:

* Required properties.
* Data types.
* Enumerations.
* Identifier formats.
* Supported conditional requirements.
* Array item structures.
* Date and timestamp formats where supported.

Cross-file references and factual verification require additional checks beyond ordinary JSON Schema validation.

⸻

12. Change Management

When adding or updating a dataset:

1. Inspect the existing file and its current schema.
2. Identify every frontend and backend consumer.
3. Preserve existing keys unless a migration is intended.
4. Update related records and references together.
5. Update schemaVersion when the schema contract changes.
6. Run the full data validator.
7. Review source quality and verification metadata.
8. Check for private or sensitive information.
9. Test affected frontend components.
10. Update this README’s inventory and reference tables.
11. Commit related data, schema, code, and test changes together.

Breaking changes must include an appropriate migration plan for all affected consumers.

12.1 Removing or renaming a dataset

Before removing or renaming a file:

* Search HTML, JavaScript, server code, tests, build configuration, and deployment scripts for references.
* Identify any legacy consumers.
* Migrate consumers to the canonical dataset.
* Test the new references.
* Update the inventory and documentation.
* Remove the old file only when it is no longer required.

Avoid maintaining two competing sources of truth for the same entity.

12.2 Review and release

For important changes to admissions, fees, scholarships, recruitment, or employment data, require a review before publication.

The review process should confirm that the dataset is structurally valid, sources are appropriate, publication rules are satisfied, and affected consumers have been tested.

⸻

13. Relationship to the Design System

The data directory supplies content; it does not define the presentation layer.

HTML, JavaScript, CSS, and shared components are responsible for rendering data according to the MedOrbits design system, including the Royal Burgundy and Champagne Gold visual direction where applicable.

Data-only changes should not require unrelated changes to:

* Header and footer components.
* Homepage animations.
* Design tokens.
* Responsive layouts.
* Shared navigation.
* Global typography.

If a data change requires a presentation update, implement and test that change explicitly in the relevant component.

⸻

14. Definition of Done

A dataset change is ready for review when:

* JSON syntax and structure are valid.
* IDs and references are consistent.
* Factual claims are verified or appropriately withheld.
* Verification and publication rules are respected.
* No sensitive data is exposed publicly.
* Frontend consumers handle missing data safely.
* Affected pages and relevant tests pass.
* Documentation reflects the current repository.
* Any required migration is complete.
* Cache and deployment behaviour are appropriate for the dataset.

⸻

15. Disclaimer

MedOrbits provides informational guidance and does not replace official admission authorities, regulators, institutions, or employers.

A listing does not guarantee admission, employment, funding, eligibility, or any other outcome.

Users should confirm current requirements, fees, deadlines, recognition, and application procedures through the relevant official source.

⸻

16. Ownership and Maintenance

Ownership: MedOrbits project maintainers
Canonical directory: assets/data/
Data visibility: Public
Primary maintenance requirement: Keep schemas, validation rules, consumers, and this documentation synchronized.

Every dataset must have a clear purpose, a documented structure, an appropriate source of truth, and a safe publication process.

Final principle: Validate the structure, verify the facts, protect private information, and test the consumer before publishing data changes.