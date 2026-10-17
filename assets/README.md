MedOrbits Assets

Directory: assets/
Purpose: Shared frontend resources, structured public datasets, visual identity assets, and approved downloadable documents.
Brand Identity: MedOrbits design system, including Royal Burgundy and Champagne Gold where applicable.
Maintained by: MedOrbits

⸻

1. Overview

The assets/ directory contains reusable frontend resources used throughout the MedOrbits platform, including stylesheets, JavaScript modules, structured JSON datasets, images, icons, fonts, and downloadable documents.

Assets should remain organized, maintainable, accessible, optimized for production, and consistent with the established design system for the relevant page or module.

This directory is primarily intended for public-facing resources. It must not be used as secure storage for credentials, private application records, confidential documents, or other restricted information.

The directory structure described below is a reference. Documentation must reflect the files and capabilities actually implemented in the repository.

2. Directory Structure

assets/
├── README.md
├── css/
├── js/
├── data/
├── images/
├── icons/
├── fonts/
├── documents/
└── schemas/

Additional subdirectories may be introduced when they serve a clear purpose and are documented appropriately.

The schemas/ directory contains reusable JSON Schema definitions for structured data and document manifests. Package-specific schemas may also be maintained alongside individual document libraries.

3. Directory Responsibilities

Directory	Responsibility
css/	Global styles, layouts, reusable components, themes, responsive rules, transitions, and animations.
js/	Frontend initialization, navigation, form interactions, search, authentication interfaces, and shared utilities.
data/	Structured JSON datasets for courses, colleges, universities, fees, admissions, careers, and related content.
images/	Brand imagery, logos, hero images, course illustrations, backgrounds, and placeholders.
icons/	Education, career, interface, and social media icons.
fonts/	Approved locally hosted fonts and font licensing documentation.
documents/	Publicly downloadable brochures, guides, checklists, and approved educational resources.
schemas/	Shared and specialized JSON Schema definitions.

Each asset should have a clear purpose and belong in the most appropriate directory.

4. Design System and Branding

All visual assets must preserve the established MedOrbits brand identity.

Design requirements

* Maintain the applicable premium colour palette for each MedOrbits section.
* Use consistent typography, spacing, border radii, shadows, and component states.
* Reuse shared styles and components instead of introducing unnecessary duplicates.
* Preserve established headers, footers, navigation, transitions, and opening animations when updating individual pages.
* Maintain readable contrast across tinted backgrounds, gradients, image overlays, and interactive components.
* Avoid introducing pure-white or transparent sections where the applicable page design requires a visible tinted background.
* Keep animations purposeful and respect reduced-motion preferences.
* Avoid applying one colour palette indiscriminately across unrelated sections.

Use the relevant page or module design specification rather than assuming that every part of the platform must use identical colours.

For applicable premium MedOrbits designs, use the Royal Burgundy and Champagne Gold visual direction.

5. Frontend CSS Guidelines

Stylesheets in assets/css/ should follow a consistent and maintainable structure.

* Prefer shared design tokens and reusable component styles.
* Scope page-specific styles to avoid unintended effects on unrelated pages.
* Use responsive layouts that work on mobile, tablet, laptop, and desktop screens.
* Avoid conflicting overrides, duplicated selectors, and unnecessary !important declarations.
* Preserve existing component behaviour when updating shared styles.
* Ensure visible keyboard focus, hover states, disabled states, and appropriate form validation states.
* Use efficient transitions and animations without compromising usability.
* Respect the user’s reduced-motion preferences.
* Avoid unnecessary layout shifts and expensive rendering effects.

Before introducing a new stylesheet, check whether an existing shared stylesheet already provides the required component or utility.

6. JavaScript Guidelines

JavaScript assets should remain modular, predictable, and compatible with the application’s configured runtime.

* Keep reusable functionality in shared modules where appropriate.
* Separate interface behaviour from data validation and server-side business logic.
* Validate data received from APIs, forms, URL parameters, and other untrusted sources.
* Use safe DOM APIs and avoid inserting untrusted content through innerHTML.
* Handle failed requests, missing elements, and invalid data gracefully.
* Avoid duplicate event listeners, unnecessary global variables, and blocking operations.
* Do not expose private credentials or server-side authorization logic in browser code.
* Test interactions on the pages that consume the affected module.
* Clean up event listeners and resources when components are removed or reinitialized, where applicable.

Frontend authentication interfaces are not a substitute for server-side authentication, authorization, session validation, or access control.

7. Structured JSON Data

The assets/data/ directory stores structured datasets consumed by the MedOrbits frontend and other approved application components.

Examples include:

* Courses and entrance examinations.
* Colleges and universities.
* Countries and locations.
* Admissions and admission processes.
* Fees and hostels.
* Scholarships and required documents.
* Career options and sectors.
* Jobs, internships, and recruitment.
* Services, FAQs, news, notifications, and testimonials.

Data quality requirements

1. Keep JSON syntax valid and encoding consistent.
2. Follow the established schema and naming conventions for each dataset.
3. Use stable, unique identifiers for records.
4. Keep cross-file references consistent with the referenced datasets.
5. Represent unknown values explicitly rather than inventing data.
6. Use consistent date formats and time-zone conventions where applicable.
7. Include only verified claims and clearly distinguish illustrative content from confirmed information.
8. Avoid storing passwords, API secrets, private contact details, confidential application records, or other sensitive information in public datasets.
9. Keep dataset metadata and documentation synchronized with the implemented structure.
10. Validate important business rules separately from basic JSON syntax.

Run the configured JSON and application-data validators before committing changes:

npm run check:json
npm run check:data

These commands must exist in package.json and be correctly configured.

The syntax validator checks JSON validity. The application-data validator checks the structural and consistency rules implemented by the project.

A successful syntax check does not establish that every data record is accurate or that every dataset conforms to every application schema.

8. JSON Schema Management

The assets/schemas/ directory contains reusable JSON Schema definitions.

Schemas may validate:

* Shared document-manifest structures.
* Package-specific document manifests.
* Resource catalogues.
* Course and education datasets.
* Other structured application data where required.

Schema requirements

* Declare the intended JSON Schema draft.
* Use stable and unique $id values.
* Use $ref for reusable definitions where appropriate.
* Define required fields and permitted values according to the actual data contract.
* Configure additionalProperties deliberately.
* Keep schema references valid.
* Maintain representative valid and invalid test cases.
* Update affected datasets and consumers when a schema changes.

The shared MedOrbits document-manifest schema supports standard manifests using metadata and resources, as well as specialised manifests using package-level fields and documents, where the selected schema definition permits those structures.

Package-specific schemas may add stricter rules. Do not assume that all document libraries use identical field names or publication policies.

Important limitations

JSON Schema can validate structure and supported value constraints. It cannot independently confirm:

* Whether a referenced file exists.
* Whether a source URL is authoritative or current.
* Whether a document has actually been reviewed.
* Whether a checksum matches a real file.
* Whether a published document contains confidential information.
* Whether a resource is safe to distribute publicly.

Implement filesystem, cross-reference, verification, and publication checks in repository scripts, tests, or the CI workflow.

9. Images, Icons, and Fonts

Images

* Prefer optimized JPG or AVIF images when supported by the delivery pipeline.
* Provide appropriate dimensions and responsive variants where beneficial.
* Use meaningful alternative text for informative images.
* Use empty alternative text for purely decorative images.
* Avoid unnecessarily large hero images and oversized assets.
* Confirm that image licensing and usage rights permit publication.
* Provide appropriate dimensions or aspect ratios to reduce layout shifts.

Icons

* Use a consistent icon style and sizing system.
* Prefer existing approved icons before introducing additional libraries or duplicate assets.
* Ensure icons used as controls have accessible names.
* Do not rely on colour alone to communicate status or meaning.
* Avoid using decorative icons where they interfere with the meaning of accessible labels.

Fonts

* Use approved font families and sensible fallback stacks.
* Load only the weights and formats required by the interface.
* Use appropriate font-display behaviour to reduce invisible text during loading.
* Include relevant licensing information for locally hosted font files.
* Confirm that typography remains readable across supported screen sizes.

10. Public Documents and Downloads

The assets/documents/ directory is intended for approved public resources, including brochures, educational guides, career checklists, and downloadable reference material.

Before publishing a document:

* Confirm that it is approved for public distribution.
* Remove private information, internal notes, and confidential metadata.
* Verify the document’s accuracy, readability, and accessibility.
* Use descriptive filenames and provide an appropriate title and description.
* Confirm that links resolve correctly and that the document is the intended version.
* Update the relevant manifest and README.
* Validate publication metadata and required source references.
* Confirm that the deployed download URL resolves to the approved file.

Publication policy

Only existing documents that have passed the required publication checks should be exposed as active public downloads.

A manifest entry marked published is not sufficient on its own. The application must also enforce file-existence, approval, privacy, and other applicable publication checks.

Do not store private student applications, identity documents, financial records, confidential admission files, or other restricted materials in publicly accessible asset directories.

Private documents must be stored in appropriately secured storage and delivered through authorized, access-controlled application endpoints.

11. Security Requirements

* Never include API keys, passwords, private tokens, session secrets, or database credentials in public assets.
* Treat client-provided and externally sourced data as untrusted.
* Validate and encode untrusted values before rendering them.
* Enforce authorization and access control on the server.
* Do not rely on hidden buttons, frontend route checks, or JavaScript conditions to protect sensitive operations.
* Avoid exposing internal configuration, private records, or unnecessary personal information in JSON files.
* Publish only approved documents and assets.
* Keep dependency versions and security checks maintained through the project’s established tooling.
* Review third-party asset licensing and provenance before distribution.
* Avoid exposing sensitive details through filenames, source maps, logs, or public error messages.

Public frontend assets must be assumed accessible to anyone who can reach the deployed website.

12. Performance and Accessibility

Performance

* Optimize image dimensions, compression, and delivery formats.
* Avoid duplicate CSS and JavaScript bundles.
* Load noncritical resources only when needed.
* Use appropriate cache headers through the hosting or server configuration.
* Prefer lazy loading for suitable below-the-fold images.
* Avoid unnecessary animation, layout shifts, and render-blocking resources.
* Measure performance changes on representative pages before deployment.
* Ensure cache invalidation or versioning works when important public assets change.

Accessibility

* Use semantic HTML in consuming pages.
* Maintain sufficient text and interface contrast.
* Support keyboard navigation and visible focus.
* Respect prefers-reduced-motion.
* Provide accessible names and labels for interactive controls.
* Associate form errors with their corresponding fields.
* Ensure responsive layouts remain usable at enlarged text sizes.
* Provide useful alternative text for informative images.
* Ensure downloadable documents are accessible where reasonably practicable.

13. Naming and File Organization

Use descriptive, consistent, lowercase filenames.

Recommended conventions:

* Use hyphens to separate words in filenames.
* Choose names that describe an asset’s purpose.
* Keep related resources together.
* Avoid ambiguous names such as new.css, final2.js, or image1.png.
* Avoid unnecessary duplicate files and obsolete versions.
* Update references whenever an asset is moved or renamed.
* Keep naming consistent with manifests and data references.

Use paths that are compatible with the deployment configuration. Root-relative URLs are appropriate when the website is hosted at the domain root; deployments under a subpath may require a configured base path.

14. Validation and Testing

Before submitting asset changes, run the checks applicable to the change:

npm run check:json
npm run check:data
npm run lint:check
npm run format:check
npm test

Run these commands only if the corresponding scripts and test suites exist and are configured correctly in package.json.

Also verify the affected pages in a browser.

Check for:

* Broken images, stylesheets, scripts, and document links.
* Missing fonts or icon resources.
* Incorrect JSON references.
* Schema validation failures.
* Console errors and failed network requests.
* Responsive layout problems.
* Keyboard and reduced-motion behaviour.
* Unexpected effects on shared components.
* Public exposure of sensitive data.
* Missing or incorrect publication files.
* Licensing or attribution issues where applicable.

A passing test suite only confirms the checks actually implemented by that suite. It does not establish that all assets, documents, or external claims have been independently verified.

15. Maintenance and Change Management

When adding, removing, or reorganizing assets:

1. Update the affected files and references.
2. Update the relevant directory-level README.
3. Validate JSON datasets and application-specific data rules.
4. Validate affected schemas and their consumers.
5. Test pages that depend on changed shared resources.
6. Review security, licensing, accessibility, and performance implications.
7. Confirm that the applicable CI workflow passes before merging.
8. Verify deployed URLs when public assets change.

Remove obsolete assets only after verifying that no pages, scripts, stylesheets, tests, or build processes depend on them.

Preserve stable identifiers and URLs where practical. When a public URL must change, update affected references and consider redirects if the hosting architecture supports them.

16. Scope and Limitations

This directory documents frontend resources, structured public datasets, shared schemas, and approved public downloads. It does not replace:

* Server-side application logic.
* Secure database storage.
* Private document storage.
* Environment configuration and secrets management.
* Server-side validation and authorization.
* Backend API documentation.
* Legal review, factual verification, or publication approval.

The actual contents and capabilities of each subdirectory depend on the files implemented in the repository.

⸻

Maintained by: MedOrbits
Directory: assets/
Purpose: Shared frontend resources, structured public datasets, schemas, and approved downloadable documents
Design Identity: MedOrbits design system, including Royal Burgundy and Champagne Gold where applicable

Maintenance note: Keep this README synchronized with the actual assets/ directory. Directory names and capabilities documented here should reflect implemented functionality rather than planned or unverified features.