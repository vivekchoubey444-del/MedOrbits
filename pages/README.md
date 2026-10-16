MedOrbits Website Pages

Directory: pages/
Project: MedOrbits

1. Overview

MedOrbits is an education and career consultancy website designed to help visitors explore courses, colleges, admissions, study-abroad destinations, career resources, internships, and recruitment services.

The pages/ directory contains general website pages, search and enquiry interfaces, informational pages, and custom error or offline pages.

This README documents the directory structure visible in the supplied screenshots and the homepage details provided for MedOrbits. Page purposes are inferred from filenames unless otherwise specified.

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

Note: The Status/ directory is visible in the screenshots, but its contents are not established by the supplied material.

3. Page Responsibilities

File	Intended purpose
404.html	Custom page for URLs that cannot be found.
500.html	Custom internal-server-error page.
about.html	Information about MedOrbits, its purpose, and its services.
accessibility.html	Accessibility information and commitments.
apply.html	Guidance or application-enquiry entry point.
careers.html	Career resources and opportunities.
contact.html	Contact information and enquiry options.
courses.html	Course discovery and education pathways.
offline.html	Offline or unavailable-network fallback page.
search.html	Search interface or search results.
services.html	Overview of consultancy services.
testimonials.html	Client or student testimonials.

The table describes intended responsibilities; the screenshots do not establish the actual implementation or functionality of each page.

4. Main Website Design

The supplied MedOrbits homepage code uses a premium dark visual direction with the following characteristics:

* Deep aubergine and burgundy backgrounds.
* Antique-gold highlights.
* Lavender and muted supporting text.
* DM Sans for body text and Playfair Display for display headings.
* Responsive layouts for desktop and mobile.
* Sticky navigation with dropdown menus.
* Education, admissions, study-abroad, career-support, and recruitment sections.
* An opening logo animation.
* A shared footer and reusable asset paths.

Maintain visual consistency with the established MedOrbits design system when developing or updating pages in this directory.

5. Shared Asset References

The supplied homepage references the following paths:

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

These are references from the supplied HTML, not confirmation that every file exists in the current repository.

Before using them, verify that the actual files, capitalization, and directory locations match the references.

6. Local Development

1. Keep website pages and shared assets in their expected repository locations.
2. Run the project through the configured local development server or an appropriate static web server.
3. Open the homepage and test navigation to the pages in this directory.
4. Verify images, videos, stylesheets, JavaScript files, and search functionality.
5. Test the layout at mobile, tablet, and desktop widths.
6. Inspect browser developer tools and server logs for missing resources, JavaScript errors, and failed requests.

Path Considerations

Root-relative asset paths such as /assets/css/style.css expect the website to be served from the domain root. They may not resolve correctly when pages are opened directly using a file:// URL or when the website is hosted under a nested subdirectory.

7. Error and Offline Pages

404.html

Provides the intended interface for a page that cannot be found.

Verify that internal navigation, search results, and links do not lead users to unexpected missing pages.

500.html

Provides the intended interface for an internal server error.

Ensure the error page does not expose stack traces, environment variables, database details, or other sensitive diagnostics.

offline.html

Provides an intended fallback interface when network connectivity is unavailable or the application cannot reach required resources.

Verify its behavior against the actual offline mechanism, service worker, or hosting configuration, where applicable.

Important: Creating these HTML files does not automatically configure the web server or hosting platform to serve them for the corresponding HTTP responses. Configure custom error handling in the actual hosting environment.

8. Accessibility and User Experience

* Use semantic HTML and a logical heading hierarchy.
* Provide descriptive link text and accessible form labels.
* Ensure keyboard navigation and visible focus indicators.
* Maintain adequate text contrast across the dark visual palette.
* Respect prefers-reduced-motion for animations.
* Verify responsive layouts and touch interactions.
* Provide clear form validation, loading, empty, success, and error states where applicable.
* Ensure error pages offer useful navigation back to relevant content.

9. Testing Checklist

* [ ]	Every documented page exists at the expected path.
* [ ]	Internal links point to the correct pages.
* [ ]	Shared CSS and JavaScript files load successfully.
* [ ]	Logo, hero images, placeholders, and referenced video assets exist.
* [ ]	Navigation, dropdown menus, and mobile layouts work correctly.
* [ ]	Search and application forms use implemented endpoints.
* [ ]	Form submissions handle validation and failures appropriately.
* [ ]	Custom 404 and 500 responses are configured in the hosting environment.
* [ ]	Offline behavior is tested against the implemented mechanism.
* [ ]	Keyboard navigation and reduced-motion behavior are verified.
* [ ]	Page titles, metadata, and production URLs are accurate.
* [ ]	Privacy, terms, refund, and disclaimer pages are reviewed before launch.

10. Related Documentation

* ../legal/README.md — Legal and policy documentation, if legal/ is located at the repository root.
* ../education/README.md — Education section documentation, if present at the repository root.
* ../README.md — Main project documentation, if present at the repository root.

Verify these relative paths against the actual repository structure before relying on the links.

11. Maintenance

Update this README whenever pages are added, renamed, removed, or reassigned to another directory.

Review referenced assets and scripts whenever the shared design system, navigation, search functionality, or deployment configuration changes.

Important: This README documents the visible directory listing and the supplied homepage references. It does not confirm that every page, asset, form endpoint, or hosting configuration is complete or operational. Verify these components against the current MedOrbits repository before deployment.