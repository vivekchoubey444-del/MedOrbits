MedOrbits Icon Library

Directory: assets/icons/
Project: MedOrbits
Design System: Royal Burgundy and Champagne Gold
Primary Format: SVG
Purpose: Centralized, reusable icons for education, career services, social media, and shared website interfaces.

⸻

1. Overview

The assets/icons/ directory contains reusable visual assets used across the MedOrbits website.

Icons must be organized by feature area, follow a consistent visual language, and remain easy to maintain as the platform grows.

The icon library supports:

* Education, courses, institutions, and admissions.
* Entrance examinations, counselling, and student services.
* Scholarships, fees, and educational resources.
* Career guidance, employment, and internships.
* Recruitment, professional development, and employer services.
* Social media links and content-sharing controls.
* Shared navigation and interface components where appropriate.

Design preservation requirement: Introducing or updating icons must not unintentionally change the website’s existing layout, opening animation, header, footer, typography, or colour theme. Integrate icons through the existing components and design tokens.

2. Directory Structure

assets/icons/
├── README.md
├── education/
│   └── README.md
├── career/
│   └── README.md
└── social/
    └── README.md

Each feature directory may contain its own SVG assets and README documentation.

The structure above identifies the documented directories; individual icon files should be added as required by the application.

Directory responsibilities

Directory	Purpose
education/	Education discovery, academic programmes, admissions, examinations, counselling, scholarships, and student services.
career/	Career guidance, jobs, internships, recruitment, employment support, and professional development.
social/	Social media logos, communication links, sharing controls, and community engagement.

If shared interface icons are introduced later, consider adding a dedicated ui/ directory rather than mixing generic controls into feature-specific collections.

3. Education Icons

Directory: assets/icons/education/

Use this directory for education and admissions interfaces, including:

* Courses and academic programmes.
* Colleges, universities, and institutions.
* Admission processes and applications.
* Entrance examinations, results, and merit lists.
* Counselling and seat allocation.
* Fees, scholarships, and financial aid.
* Required documents and verification.
* Hostels and student support.
* Study-abroad and international admissions.
* Academic resources and career pathways.

Suggested filenames:

course-medical.svg
course-dental.svg
course-nursing.svg
course-pharmacy.svg
college.svg
university.svg
admission.svg
entrance-exam.svg
scholarship.svg
documents.svg
study-abroad.svg

These are naming examples, not confirmation that the files already exist. Follow the existing education directory’s README and actual inventory when adding assets.

4. Career Icons

Directory: assets/icons/career/

Use this directory for job seekers, employers, recruitment services, and professional development.

Typical use cases include:

* Job listings, saved jobs, and applications.
* Internships and employment opportunities.
* Career planning and counselling.
* Resume and cover-letter resources.
* Interview preparation.
* Recruitment and employer services.
* Technical and professional skills.
* Portfolios, certifications, and training.
* Employment support and career progression.

Suggested filenames:

career.svg
career-guidance.svg
career-planning.svg
resume.svg
cover-letter.svg
interview.svg
job-search.svg
job-opening.svg
saved-job.svg
job-application.svg
internship.svg
recruitment.svg
employer.svg
professional-skills.svg
certification.svg
career-resources.svg

Check assets/icons/career/README.md for the intended inventory and usage conventions.

5. Social Icons

Directory: assets/icons/social/

Use this directory for social networks, official brand links, communication links, and sharing controls.

Typical use cases include:

* Official MedOrbits social profiles.
* Social links in website headers and footers.
* WhatsApp and other approved communication links.
* Social sharing for courses and educational resources.
* Newsletter and community engagement.
* External-link and copy-link controls.

Suggested filenames:

instagram.svg
facebook.svg
linkedin.svg
youtube.svg
whatsapp.svg
telegram.svg
x.svg
share.svg
share-link.svg
copy-link.svg
external-link.svg

Use authentic, approved brand assets and follow the applicable platform’s current logo and brand-use guidelines. Do not alter official platform marks in ways that compromise recognition or violate those guidelines.

Replace example destinations with the actual approved MedOrbits profile URLs before publishing.

6. File Naming and Organization

Use descriptive, lowercase, hyphen-separated filenames.

Naming rules

* Prefer names that communicate the icon’s purpose.
* Use .svg for vector icons.
* Use .png or .webp only when raster artwork is necessary.
* Avoid spaces, unclear labels, and names such as icon1.svg.
* Avoid duplicate files that represent the same concept.
* Keep filenames stable to prevent broken references.
* Use the same terminology across filenames, documentation, and consuming components.
* Check existing shared icons before creating a new asset.

Examples:

course-medical.svg
career-guidance.svg
job-application.svg
scholarship.svg
instagram.svg
share-link.svg

Do not create separate files for every colour or display size when CSS, existing design tokens, or a shared icon system can handle the variation.

7. Visual Design Standards

All icons must complement the MedOrbits Royal Burgundy and Champagne Gold design system.

General interface icons

* Reuse the existing brand colours and design tokens.
* Maintain consistent stroke width, proportions, and alignment.
* Prefer simple, recognizable silhouettes.
* Use transparent backgrounds unless a specific design requires otherwise.
* Ensure icons remain legible at their intended display sizes.
* Avoid unnecessary gradients, shadows, and decorative effects that conflict with the existing design.
* Keep icon appearance consistent across education and career interfaces.

Social brand icons

Social logos have different requirements from general interface icons. Preserve recognizable official brand marks and their permitted colour variants.

Layout preservation

Adding icons must not introduce unwanted spacing, overflow, alignment changes, or shifts in the existing page structure.

Use the site’s current CSS classes and design tokens where practical. Avoid adding global CSS rules that unintentionally affect unrelated images, buttons, navigation, or page sections.

8. SVG Technical Standards

SVG is the preferred format for simple, scalable interface icons.

Each published SVG should:

1. Contain valid SVG markup.
2. Use an appropriate viewBox; 0 0 24 24 is recommended for standard interface icons.
3. Scale without distortion.
4. Avoid unnecessary metadata and excessive path complexity.
5. Avoid scripts, embedded event handlers, and unsafe external references.
6. Be optimized before deployment.
7. Render consistently in supported browsers.
8. Follow the accessibility requirements of its intended use.

Example SVG structure:

<svg
  xmlns=“http://www.w3.org/2000/svg”
  viewBox=“0 0 24 24”
  fill=“none”
  stroke=“currentColor”
  stroke-width=“1.75”
  stroke-linecap=“round”
  stroke-linejoin=“round”
  aria-hidden=“true”
>
  <!— Insert reviewed SVG paths here. —>
</svg>

This is a structural example, not a complete icon. Replace the comment with valid vector geometry before publishing.

When an SVG is referenced through an HTML img element, currentColor inside the SVG does not automatically inherit the parent element’s text colour. Use a compatible rendering strategy or explicit SVG colours when necessary.

9. Referencing Icons

Use asset paths appropriate to the page’s actual location. Root-relative paths are suitable when the website is deployed at the domain root; nested or subdirectory deployments may require different paths.

Example: Decorative education icon

<img
  src=“/assets/icons/education/course-medical.svg”
  alt=“”
  aria-hidden=“true”
  width=“24”
  height=“24”
/>

The empty alt attribute is appropriate because the example treats the icon as decorative and assumes the adjacent content already explains its meaning.

Example: Accessible social link

<a
  href=“https://www.instagram.com/“
  target=“_blank”
  rel=“noopener noreferrer”
  aria-label=“Visit MedOrbits on Instagram”
>
  <img
    src=“/assets/icons/social/instagram.svg”
    alt=“”
    aria-hidden=“true”
    width=“22”
    height=“22”
  />
</a>

Replace the example URL with the official MedOrbits profile URL before deployment.

Important: Verify that each referenced file exists. A filename in documentation does not establish that its asset has been created.

10. Accessibility Requirements

Icons must be accessible in the context in which they are used.

* Use empty alternative text for decorative images.
* Give informative icons an appropriate accessible name or equivalent visible text.
* Provide accessible names for icon-only buttons and links.
* Do not rely on an icon’s shape or colour alone to communicate an important action or status.
* Maintain sufficient contrast against the surrounding background.
* Preserve visible keyboard focus for interactive controls.
* Ensure that icon-only controls are keyboard operable.
* Keep important labels available to screen readers.
* Avoid redundant accessible names when surrounding text already communicates the same information.

For interactive controls, the accessible name should describe the action, such as “Save job” or “View university details”, rather than merely stating “Icon”.

11. Security and Privacy

Before publishing an SVG:

* Sanitize assets obtained from third parties.
* Remove scripts and embedded event handlers.
* Avoid unsafe external references.
* Inspect unexpected embedded content.
* Validate and optimize the SVG markup.

Additional requirements:

* Do not embed credentials, API keys, personal information, or private configuration in public assets.
* Validate social destinations supplied through configuration or content-management systems.
* Do not place session tokens or sensitive application information in sharing URLs.
* Use appropriate security attributes for links opened in new browsing contexts.
* Follow applicable privacy requirements when integrating third-party social widgets.

Public assets should contain only content approved for public delivery.

12. Performance and Browser Compatibility

* Prefer optimized SVGs for simple vector artwork.
* Keep file sizes reasonable.
* Avoid loading unnecessary duplicate icons.
* Use explicit width and height values to reduce layout shifts.
* Use lazy loading for appropriate non-critical image assets.
* Do not delay essential interface icons unnecessarily.
* Verify rendering across supported browsers and screen sizes.
* Reuse existing shared icon libraries where appropriate.

Do not add a new icon dependency solely to replace assets already provided by the project.

13. Integration Guidelines

Before integrating an icon:

1. Identify the relevant feature directory.
2. Check whether a suitable icon already exists.
3. Confirm the intended filename and visual style.
4. Add the asset and update its directory README.
5. Reference the asset from the relevant component or page.
6. Verify the path, accessible name, dimensions, and rendering.
7. Confirm that existing page layout and interactions remain unchanged.

Icons should support the existing UI rather than introduce a separate design system.

14. Maintenance Checklist

Before releasing icon changes:

* [ ]	Place each asset in the correct feature directory.
* [ ]	Confirm the file exists and loads successfully.
* [ ]	Validate and optimize SVG markup.
* [ ]	Check for duplicate assets.
* [ ]	Verify colours, proportions, and alignment.
* [ ]	Test icon sizing and contrast on desktop and mobile.
* [ ]	Check alternative text and accessible names.
* [ ]	Test keyboard interaction for icon-only controls.
* [ ]	Verify social URLs and platform-brand usage.
* [ ]	Confirm that existing layout, animations, header, and footer remain unchanged.
* [ ]	Update the relevant directory README files.
* [ ]	Remove obsolete references only after checking all consumers.

15. Adding or Removing Icons

When an icon is added, renamed, replaced, or removed:

1. Update the inventory in this README when the change affects the shared structure or documented examples.
2. Update the relevant feature directory’s README.
3. Search for all references to the asset.
4. Update affected pages and components.
5. Verify that no broken image paths remain.
6. Test visual consistency, accessibility, and responsive behaviour.
7. Remove obsolete assets only after confirming that they are no longer used.

Maintain documentation as an accurate record of implemented assets, not merely planned filenames.

⸻

Module objective: Provide a centralized, reusable, accessible, secure, and maintainable icon library for MedOrbits while preserving the existing website’s design, layout, navigation, and user experience.

Core principle: Organize icons by feature, reuse assets consistently, preserve official brand marks, and validate every asset before it reaches production.