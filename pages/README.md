MedOrbits Website Pages

Directory: pages/
Project: MedOrbits
Purpose: Documentation for public-facing website pages, navigation, shared assets, accessibility, testing, and deployment considerations.

1. Overview

MedOrbits is an education and career consultancy platform designed to help visitors explore courses, colleges, admissions, study-abroad destinations, scholarships, career resources, internships, recruitment services, and student guidance.

The pages/ directory contains general website pages, search and enquiry interfaces, informational content, and custom error or offline pages.

This README documents the intended responsibilities of the pages and the shared design conventions described in the available project material. Actual implementation, functionality, and asset availability must be verified against the current repository.

2. Directory Structure

pages/
├── Status/
├── 404.html
├── 500.html
├── about.html
├── accessibility.html
├── apply.html
├── careers.html
├── contact.html
├── courses.html
├── offline.html
├── search.html
├── services.html
├── testimonials.html
└── README.md

Note: The Status/ directory is visible in the supplied project listing, but its contents and responsibilities have not been established.

3. Page Responsibilities

File	Intended responsibility
404.html	Display a useful not-found page and links to relevant website sections.
500.html	Display a safe internal-server-error page without exposing sensitive diagnostics.
about.html	Explain MedOrbits, its purpose, approach, and services.
accessibility.html	Document accessibility practices, available accommodations, and ways to report barriers.
apply.html	Provide an entry point for guidance requests and application enquiries.
careers.html	Present career resources, job opportunities, internships, and professional guidance.
contact.html	Provide contact details and enquiry options.
courses.html	Support course discovery and exploration of education pathways.
offline.html	Provide a fallback interface when the application or network is unavailable.
search.html	Present search controls, results, empty states, and relevant navigation.
services.html	Describe MedOrbits’ education, admissions, career, study-abroad, and recruitment services.
testimonials.html	Present authentic student or client feedback, subject to appropriate consent and verification.

These descriptions identify intended responsibilities. They do not establish that a particular feature or backend integration is implemented.

4. Shared Design System

Maintain consistency with the supplied MedOrbits homepage and shared stylesheet.

Visual direction

* Deep aubergine, burgundy, and near-black backgrounds.
* Antique-gold highlights and restrained lavender accents.
* DM Sans for body text and Playfair Display for display headings.
* Responsive layouts for mobile, tablet, and desktop.
* Sticky navigation with accessible dropdown menus.
* Consistent branding, page spacing, buttons, cards, and footer.
* Opening logo animation where appropriate.
* Reduced-motion support for users who prefer less animation.

Shared layout conventions

Where appropriate, public-facing pages should include:

1. Semantic document structure and page-specific metadata.
2. A skip link and a clear main-content landmark.
3. Consistent branding and primary navigation.
4. Page-specific content with a logical heading hierarchy.
5. Relevant calls to action and internal links.
6. A shared footer with appropriate legal and contact links.
7. Responsive behavior and visible keyboard focus indicators.

Avoid duplicating shared styles and scripts unnecessarily. Prefer the established shared CSS and JavaScript when they support the required functionality.

5. Shared Asset References

The supplied HTML references these assets:

assets/
├── css/
│   └── style.css
├── images/
│   ├── logo/
│   │   └── medorbits-logo.png
│   ├── hero/
│   │   └── hero-home.jpg
│   └── placeholders/
│       └── image-placeholder.svg
├── videos/
└── js/
    ├── constants.js
    ├── config.js
    ├── utils.js
    ├── navigation.js
    ├── search.js
    ├── animations.js
    └── app.js
public/
└── manifest.json

This is a reference inventory, not a verified inventory of the current repository.

Before referencing an asset, confirm that the file exists and that its filename, capitalization, extension, and directory match the actual repository.

Shared resource responsibilities

Resource	Intended role
assets/css/style.css	Shared colors, typography, layout, responsive rules, and reusable components.
assets/images/logo/medorbits-logo.png	Site branding and logo presentation.
assets/images/hero/hero-home.jpg	Homepage hero imagery, if used by the current design.
assets/images/placeholders/image-placeholder.svg	Fallback imagery, if implemented.
assets/js/constants.js	Shared constants, if defined by the application.
assets/js/config.js	Application configuration, excluding secrets from public client-side code.
assets/js/utils.js	Reusable client-side utility functions.
assets/js/navigation.js	Navigation, dropdown, and mobile-menu behavior.
assets/js/search.js	Search-related client-side functionality, if implemented.
assets/js/animations.js	Shared animation behavior and motion preferences.
assets/js/app.js	Application initialization and shared interactions.
public/manifest.json	Web application manifest, if served from the expected public path.

Additional page-specific images and scripts should follow the project’s established naming and directory conventions.

6. Local Development

1. Inspect the repository root and confirm the actual location of pages/, assets/, and public/.
2. Install the project dependencies using the package manager and lockfile configured for the repository.
3. Start the configured local development server or an appropriate static web server.
4. Open the homepage and navigate to each documented page.
5. Verify that shared styles, scripts, images, fonts, and other referenced resources load successfully.
6. Test search, navigation, enquiry forms, and other interactive features against their actual implementations.
7. Test mobile, tablet, and desktop layouts.
8. Inspect browser developer tools and server logs for missing resources, JavaScript errors, failed requests, and unexpected redirects.
9. Run the project’s existing tests, linting, and build checks before deployment.

Path considerations

Root-relative references such as:

<link rel=“stylesheet” href=“/assets/css/style.css”>

expect the website to be served from the domain root. They may not resolve correctly when HTML files are opened directly through file:// or when the website is deployed under a nested subdirectory.

Check the hosting configuration and actual asset locations before changing paths.

7. Error and Offline Pages

404.html

The not-found page should:

* Explain that the requested page could not be found.
* Offer a link to the homepage.
* Provide useful navigation to relevant sections.
* Allow visitors to retry their search or browse available resources.
* Avoid exposing internal routing or infrastructure details.

Verify that internal links, search results, and navigation do not routinely direct users to missing pages.

500.html

The server-error page should:

* Communicate that a temporary server-side problem occurred.
* Offer a safe retry action and a link to the homepage.
* Provide an appropriate contact option when needed.
* Avoid displaying stack traces, database errors, environment variables, tokens, or other sensitive diagnostics.

offline.html

The offline page should:

* Explain that the application or network is currently unavailable.
* Provide a retry option where appropriate.
* Keep essential fallback content lightweight.
* Avoid claiming that unavailable services or data remain accessible.
* Work with the actual service worker, caching, or hosting mechanism, where applicable.

Deployment requirement: Creating these HTML files does not automatically configure the web server or hosting platform to return the correct HTTP status codes or serve the pages for matching errors. Configure and test error handling in the actual deployment environment.

8. Search, Forms, and Interactive Features

Search

The search page should distinguish between:

* An initial state before a query is submitted.
* Loading or in-progress states.
* Results matching the query.
* Empty results.
* Validation errors or invalid queries.
* Search service failures.
* Results that link to external destinations, when applicable.

Search functionality should use the actual configured search implementation. If external APIs are used, handle unavailable services, rate limits, invalid responses, and timeouts gracefully.

Do not imply that all information is searchable or available internally unless the implemented search system supports that behavior.

Application and enquiry forms

The application page and contact page should:

* Use explicit labels and appropriate input types.
* Validate input on the client and, critically, on the server.
* Provide clear validation and submission feedback.
* Prevent duplicate submissions where necessary.
* Handle network failures and server errors.
* Explain how submitted personal information is used.
* Protect personal information and apply appropriate access controls.

If an OTP, email provider, payment gateway, or other external integration is used, verify its configuration and server-side implementation before describing it as operational.

Never expose API secrets, private credentials, or authentication tokens in client-side JavaScript.

9. Accessibility and User Experience

All public-facing pages should follow these practices:

* Use semantic HTML and a logical heading hierarchy.
* Provide descriptive links and accessible form labels.
* Support keyboard navigation and visible focus indicators.
* Maintain adequate color contrast throughout the dark visual theme.
* Respect prefers-reduced-motion.
* Use accessible names for icon-only controls.
* Provide appropriate alternative text for meaningful images.
* Use empty alternative text for purely decorative images.
* Ensure menus and dialogs work with keyboard and assistive technology.
* Avoid relying on color alone to communicate errors or status.
* Provide clear loading, empty, success, and error states.
* Ensure responsive layouts and usable touch targets.

Test representative pages with keyboard-only navigation and accessibility tools before launch.

10. Security, Privacy, and Trust

Before production deployment:

* Validate all user-submitted data on the server.
* Apply appropriate authentication, authorization, and session controls.
* Protect enquiry endpoints against abuse and automated submissions.
* Avoid exposing sensitive information in error messages or logs.
* Use HTTPS for production traffic.
* Configure security headers appropriate to the hosting environment.
* Review external API integrations and third-party scripts.
* Collect only the personal information needed for the stated purpose.
* Provide accurate privacy, terms, refund, and disclaimer information where applicable.
* Publish testimonials only with appropriate permission and accurate attribution.
* Do not fabricate student outcomes, ratings, endorsements, employment statistics, or institutional affiliations.

The presence of a page or a client-side interface does not prove that its backend, security controls, or data handling are complete.

11. Testing Checklist

Use this checklist before each production release.

Structure and navigation

* [ ]	Every documented HTML page exists at the expected path.
* [ ]	Internal links point to valid destinations.
* [ ]	Navigation dropdowns and mobile menus work correctly.
* [ ]	Page titles, descriptions, canonical URLs, and production URLs are accurate.
* [ ]	The Status/ directory is documented once its contents are verified.

Assets and functionality

* [ ]	Shared CSS and JavaScript files load successfully.
* [ ]	Logo, images, placeholders, fonts, and video references resolve correctly.
* [ ]	Search uses the implemented search service.
* [ ]	Application and contact forms use implemented endpoints.
* [ ]	Validation, loading, success, empty, and error states work correctly.
* [ ]	External integrations are tested using their actual configuration.
* [ ]	No secrets or sensitive diagnostics are exposed to visitors.

Accessibility and responsive design

* [ ]	Pages work at mobile, tablet, and desktop widths.
* [ ]	Keyboard navigation and visible focus indicators are verified.
* [ ]	Form labels and image alternative text are appropriate.
* [ ]	Color contrast is sufficient.
* [ ]	Reduced-motion preferences are respected.

Production and deployment

* [ ]	Custom 404 and 500 responses are configured and tested.
* [ ]	Offline behavior is tested against the implemented mechanism.
* [ ]	HTTPS and applicable security headers are configured.
* [ ]	Privacy, terms, refund, and disclaimer pages are reviewed before launch.
* [ ]	Build, lint, and automated tests pass.
* [ ]	Browser console and server logs have been checked for release-blocking errors.

12. Related Documentation

The following locations may contain related project documentation. Verify their existence and actual repository paths before relying on them.

Path	Intended documentation
../README.md	Main project setup, architecture, and development instructions.
../legal/README.md	Legal and policy documentation, if the legal/ directory exists at the repository root.
../education/README.md	Education section documentation, if the education/ directory exists at the repository root.

13. Maintenance

Update this README whenever pages are added, renamed, removed, or assigned new responsibilities.

Review the documentation whenever the following change:

* Shared design tokens, CSS, or page layout conventions.
* Navigation structure and internal routes.
* Search behavior and external API integrations.
* Application forms, authentication, OTP, or payment workflows.
* Asset locations and filenames.
* Hosting configuration, error handling, or offline behavior.
* Accessibility requirements and security controls.

When documenting a new feature, distinguish between implemented and tested functionality, partially implemented functionality, and planned functionality.

14. Implementation Status

This README describes intended page responsibilities and design conventions based on the supplied project material. It does not certify that every page, asset, endpoint, integration, or deployment configuration exists or works.

Verify the current repository, run the available tests, and validate the production configuration before treating any feature as operational.