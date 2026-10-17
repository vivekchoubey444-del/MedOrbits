MedOrbits Documents

Directory: assets/documents/
Brand Identity: Royal Burgundy and Champagne Gold
Classification: Public-facing document resources
Maintained by: MedOrbits

PDF cover generation: Run `npm run brand:pdfs` to preflight the library without changing files. Run `npm run brand:pdfs -- --write` to add a branded cover page with the MedOrbits logo, support contacts, and category-specific colors. Original PDFs are backed up under `storage/temporary/pdf-brand-backups/`, which is excluded from version control. The branding pass does not change publication or verification status.

⸻

1. Overview

The assets/documents/ directory contains public-facing document resources used by the MedOrbits platform. Resources are organized into topic-specific libraries supporting education planning, admissions, career development, financial planning, professional development, and international study.

This directory provides a consistent framework for managing downloadable documents, resource indexes, manifests, schemas, category documentation, publication statuses, and verification metadata.

Publication rule: The presence of a file or manifest record does not automatically authorize public distribution. Only resources that have passed the required content, privacy, accessibility, file-integrity, and publication checks may be exposed as public downloads.

Planned and draft resources may be registered before their files exist, but they must not be presented as available downloads.

2. Directory Structure

The following is the reference structure. Keep it synchronized with the actual repository and create optional files only when they are implemented.

assets/documents/
├── README.md
├── MANIFEST.json
├── manifest.schema.json
├── admission-guides/
│   ├── README.md
│   ├── MANIFEST.json
│   ├── manifest.schema.json
│   └── *.pdf
├── career-resources/
│   ├── README.md
│   └── *.pdf
├── checklists/
│   ├── README.md
│   ├── MANIFEST.json
│   ├── manifest.schema.json
│   ├── admissions/
│   ├── applications/
│   ├── career/
│   ├── education/
│   ├── examinations/
│   ├── general/
│   └── study-abroad/
├── fee-guides/
│   ├── README.md
│   ├── MANIFEST.json
│   └── *.pdf
└── study-abroad/
    ├── README.md
    └── *.pdf

A category may also contain its own schema or structured catalogue where required by its validation workflow.

Use consistent manifest naming. The recommended canonical filename is MANIFEST.json. If a package uses manifest.json, either retain that convention consistently or rename the file and update all references, scripts, and CI workflows.

3. Resource Categories

Directory	Purpose
admission-guides/	General and programme-specific admission guides, application instructions, and educational resources.
career-resources/	Career planning, job-search preparation, resumes, interviews, and professional development.
checklists/	Printable checklists for applications, documents, examinations, career readiness, and study planning.
fee-guides/	Education fees, accommodation costs, scholarships, financial aid, education loans, counselling charges, and refund guidance.
study-abroad/	International education, overseas admissions, destination research, visa-document preparation, budgeting, and pre-departure planning.

Place each resource in the directory that best matches its primary purpose. Avoid duplicate public copies unless a documented operational requirement justifies them.

4. Manifest and Schema Management

The root manifest, shared schema, and category manifests serve different purposes.

File	Responsibility
MANIFEST.json	Provides a central inventory or discovery index for document libraries.
manifest.schema.json	Defines shared structural rules for supported document-manifest formats.
Category MANIFEST.json	Records resources belonging to an individual library.
Category-specific schema	Defines additional validation rules for a package with a specialised manifest format.
Category README.md	Documents the library’s purpose, inventory, content standards, and maintenance process.
Structured catalogue JSON	Supplies resource metadata to frontend components when implemented.

4.1 Supported manifest formats

The shared schema at assets/documents/manifest.schema.json supports two manifest structures:

Standard document-library manifest

Uses schemaVersion, manifestVersion, metadata, and resources.

Specialised document-package manifest

Uses package-level fields such as package, directory, purpose, brand, access, and documents.

A package-specific schema should be used when a manifest has additional requirements that cannot be adequately enforced by the shared schema.

4.2 Validation requirements

Manifest records should use:

* Stable, descriptive IDs.
* Clear titles and descriptions.
* Valid repository-relative paths.
* Consistent filenames, formats, and MIME types.
* Accurate publication and verification statuses.
* Relevant source references and review dates.
* Valid version values where versioning is supported.
* Correct references to categories and related resources.

The shared schema permits additional properties for compatibility. Consequently, schema validation alone does not enforce every project-specific business rule.

Repository validation scripts or CI workflows should separately check:

1. JSON syntax and schema compliance.
2. Duplicate IDs, filenames, and public paths.
3. Whether required files exist for the resource’s current status.
4. Whether category and related-resource references resolve.
5. Whether publication statuses satisfy the publication policy.
6. Whether published files have the required verification metadata.
7. Whether checksums and recorded file sizes match the actual files when supplied.
8. Whether public URLs resolve to the intended deployed assets.

Do not require planned resources to have existing files. Apply file-existence requirements according to the resource’s publication status.

5. Publication and Verification Statuses

Use the status values supported by the applicable manifest schema.

Status	Meaning
planned	The resource is scheduled for creation or registration; the final file may not exist.
draft	The resource is being prepared and is not approved for public distribution.
in_review	The resource is undergoing review.
approved	Required approval has been recorded; deployment checks may still be pending.
published	The resource has passed the required checks and is available through its approved public distribution route.
under_review	A previously prepared resource is undergoing a new review.
outdated	The content may no longer be current and should not be treated as current guidance.
archived	The resource is retained for recordkeeping or historical purposes.
withdrawn	The resource has been withdrawn from distribution.

Recommended verification values are:

Verification status	Meaning
not_verified	No verification claim has been established.
content_reviewed	The document has undergone a content review.
official_sources_checked	Relevant authoritative sources have been checked and recorded.
officially_verified	Documented evidence supports the specific official-verification claim.

Verification status and publication status are different. A resource may have undergone a content review but still require approval, privacy checks, or deployment validation.

Public-download rule: Only published resources that pass the application’s additional publication checks should be exposed as downloadable assets. A published value alone must not override a failed security check, missing file, or invalid approval.

6. File Formats and Naming

Use the following conventions:

* Prefer PDF (application/pdf) for finalized, printable documents.
* Use Markdown (.md) for documentation and resource indexes.
* Use JSON (.json) for manifests, structured metadata, and validation schemas.
* Use lowercase, descriptive, hyphen-separated filenames.
* Keep filenames consistent with manifest records and website URLs.
* Avoid ambiguous names such as final.pdf, new-version.pdf, or document-final-v2.pdf.
* Do not include personal names, passport numbers, application numbers, or other sensitive information in filenames.
* Update all affected references when a resource is renamed, moved, or retired.

Examples:

admission-document-checklist.pdf
career-readiness-checklist.pdf
education-budget-checklist.pdf
study-abroad-budget-checklist.pdf
pre-departure-checklist.pdf

Where supported, record the document’s MIME type, version, file size, and checksum in its manifest. Do not invent file sizes, checksums, publication dates, or verification dates when the information has not been established.

7. Content Accuracy and Verification

Before publishing a new or materially revised resource:

1. Confirm that the content is accurate, clear, complete, and appropriate for its intended audience.
2. Check spelling, formatting, external links, page layout, and accessibility.
3. Verify changing admission criteria, eligibility rules, fees, deadlines, examination requirements, recognition, and immigration conditions against authoritative sources.
4. Record relevant source URLs and review dates for time-sensitive information.
5. Distinguish general recommendations from mandatory requirements.
6. Identify requirements that depend on the institution, programme, jurisdiction, nationality, or individual circumstances.
7. Remove outdated, misleading, contradictory, or unsupported statements.
8. Ensure the disclaimer matches the document’s subject.
9. Update verification metadata only after the corresponding review has actually been completed.

Prefer primary sources, including official institutions, examination authorities, regulators, government departments, and other relevant authorities.

A resource must not be described as officially verified unless the claim is supported by documented evidence. Checking an official website does not automatically mean that MedOrbits itself is an official authority or that a document has been endorsed by that authority.

8. Accessibility and Readability

All published documents should be usable on common mobile and desktop PDF readers.

* Use readable typography and sufficient contrast.
* Maintain meaningful headings and a logical reading order.
* Use descriptive link text.
* Do not communicate essential information through colour alone.
* Ensure checkboxes, tables, symbols, and page breaks render correctly.
* Review print layout and grayscale readability.
* Provide selectable text and accessible PDF structure where supported.
* Offer an accessible HTML or text alternative for essential information where practical.
* Ensure branding does not compromise legibility.

The MedOrbits Royal Burgundy and Champagne Gold design system should be applied during document authoring or generation. Website CSS does not automatically style PDF files.

9. Brand and Design Standards

Primary design direction: Royal Burgundy and Champagne Gold.

Maintain consistent typography, spacing, headings, page numbering, branding, and footer details. Use a professional layout suitable for digital viewing and printing.

Decorative elements must remain secondary to the document’s purpose. Prioritize contrast, readability, accessibility, and clear instructions.

Use the approved project design tokens where available rather than introducing unrelated colour values or typography systems into individual document packages.

10. Privacy and Security

This directory is intended for approved public-facing assets. It is not secure storage for confidential documents.

Permitted content

* Approved educational and career guidance.
* Blank checklists and planning templates.
* Publicly distributable reference documents.
* Reviewed instructions and public links.

Prohibited content

* Passwords, API keys, credentials, and access tokens.
* Private student records or completed application files containing personal information.
* Passports, identity documents, financial statements, and private academic records.
* Confidential internal correspondence or case records.
* Unreviewed files containing sensitive metadata or embedded information.

Before publication, inspect PDFs for metadata, comments, attachments, hidden content, and embedded files.

Keep source files and editable working documents separate from approved public downloads where necessary. Never treat a public frontend directory as secure storage.

If a resource requires authentication or access restrictions, do not rely on its location inside assets/documents/ or on a manifest’s access field to protect it. Store it behind an appropriate server-side authorization mechanism.

11. Website Integration

Use stable, descriptive URLs for approved downloadable resources.

Example:

<a
  href=“/assets/documents/checklists/admissions/admissions-checklist.pdf”
  target=“_blank”
  rel=“noopener”
>
  Download the Admissions Checklist (PDF)
</a>

This example assumes that the website serves the repository’s assets/ directory from the site root. Adjust the URL if production uses a different static asset base path.

Integration requirements:

* Confirm that the URL resolves to the intended file.
* Serve PDFs with the application/pdf content type.
* Use accessible download labels.
* Keep website indexes synchronized with the relevant manifests.
* Do not link to private, temporary, or development-only files.
* Test deployed links after releases.
* Do not represent a downloaded guide as an application submission, official verification, payment confirmation, or approval.

11.1 Frontend publication controls

The frontend should use a trusted resource catalogue or validated manifest data rather than constructing links from arbitrary user input.

Before displaying a download link, confirm that:

* The resource has a published status.
* The resource’s file and metadata have passed the applicable publication checks.
* The path resolves to an approved asset.
* The resource is permitted for the intended audience.
* The deployed URL matches the approved resource record.

The frontend must not interpret a planned or draft record as an available download.

12. Publication Workflow

Follow this workflow for each new or revised resource:

1. Draft: Prepare the document using the approved MedOrbits design system.
2. Review: Check the content, intended audience, source references, and disclaimer.
3. Validate: Inspect the PDF, metadata, links, layout, accessibility, and privacy.
4. Register: Add or update the relevant manifest record.
5. Document: Update category documentation and indexes.
6. Test: Run JSON, schema, duplicate-ID, file-existence, reference, and publication-policy checks.
7. Approve: Record completion of required reviews and approvals.
8. Publish: Deploy only the approved public resource.
9. Confirm: Test the live URL and inspect the deployed document.
10. Maintain: Reassess the resource when relevant requirements change.

Where automated validation is available, publication should be blocked when required checks fail.

A successful schema-validation result is not sufficient on its own to authorize publication.

13. Maintenance and Versioning

Review this directory whenever resources are added, revised, renamed, reorganized, or retired.

* Keep the root README, category READMEs, manifests, schemas, catalogues, and website references synchronized.
* Preserve stable resource IDs where practical.
* Record versions and review dates when supported by the applicable schema.
* Recheck file paths and URLs after deployment changes.
* Remove or archive obsolete resources according to the project’s retention policy.
* Do not change a review date merely to make an unreviewed document appear current.
* Avoid marking planned or draft documents as published.
* Revalidate manifests after changing schemas or metadata conventions.
* Update CI validation rules whenever publication requirements change.
* Avoid silently changing a resource’s meaning while retaining misleading version or verification metadata.

When renaming a manifest or changing a schema reference, update all relevant scripts, documentation, tests, and deployment workflows.

14. Disclaimer

MedOrbits documents provide general informational and planning guidance. They do not replace official instructions, legal or financial advice, or qualified professional guidance.

They do not guarantee admission, employment, examination success, scholarship eligibility, loan approval, professional recognition, or visa approval.

Users must independently confirm applicable eligibility criteria, fees, deadlines, documentation, recognition, and procedures with the relevant institution, regulator, examination authority, employer, financial provider, or government authority.

Do not describe a resource as an official form, government document, or approved notice unless that status has been specifically established.

15. Contribution Checklist

Before submitting a new or revised resource, confirm:

* [ ]	The resource is in the correct directory.
* [ ]	The filename is descriptive and consistent.
* [ ]	The content and external links have been reviewed.
* [ ]	Time-sensitive claims have been checked against relevant authoritative sources.
* [ ]	Accessibility, readability, and print layout have been checked.
* [ ]	Sensitive information and unintended metadata have been removed.
* [ ]	Publication and verification statuses accurately reflect completed work.
* [ ]	The relevant manifest validates against the intended schema.
* [ ]	Duplicate IDs, paths, and filenames have been checked.
* [ ]	File-existence requirements appropriate to the resource status have passed.
* [ ]	Related-resource and category references resolve.
* [ ]	Related README files, catalogues, and website links have been updated.
* [ ]	The deployed public URL has been tested where applicable.

⸻

Maintained by: MedOrbits
Directory: assets/documents/
Brand Identity: Royal Burgundy and Champagne Gold
Classification: Public-facing document resources