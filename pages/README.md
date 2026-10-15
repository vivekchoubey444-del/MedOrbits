MedOrbits Website

MedOrbits is an education and career consultancy website designed to help visitors explore courses, colleges, admissions, study-abroad destinations, career resources, internships, and recruitment services.

Project Structure

This README reflects the pages/ directory shown in the supplied screenshot. The screenshot confirms the following files and folder:

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
└── testimonials.html

Page Overview

|File                |Intended purpose                            |
|———————|———————————————|
|`404.html`          |Custom page for URLs that cannot be found   |
|`500.html`          |Custom internal-server-error page           |
|`about.html`        |Information about MedOrbits                 |
|`accessibility.html`|Accessibility information and commitments   |
|`apply.html`        |Guidance or application enquiry entry point |
|`careers.html`      |Career resources and opportunities          |
|`contact.html`      |Contact information and enquiries           |
|`courses.html`      |Course discovery and education pathways     |
|`offline.html`      |Offline or unavailable-network fallback page|
|`search.html`       |Search interface or results                 |
|`services.html`     |Overview of consultancy services            |
|`testimonials.html` |Client or student testimonials              |

The purposes above are inferred from the filenames; the screenshot does not show each page’s contents.

Main Website Design

The MedOrbits homepage code supplied in this conversation uses a premium dark visual theme:

• Deep aubergine and burgundy backgrounds
• Antique-gold highlights
• Lavender and muted text colours
• DM Sans for body text and Playfair Display for display headings
• Responsive layout for desktop and mobile
• Sticky navigation with dropdown menus
• Education, admissions, study-abroad, career-support, and recruitment sections
• An opening logo animation
• A shared footer and reusable asset paths

Shared Asset Paths

The homepage references these shared assets and scripts:

/assets/css/style.css
/assets/images/logo/medorbits-logo.png
/assets/images/hero/hero-home.jpg
/assets/images/placeholders/image-placeholder.svg
/assets/videos/
assets/js/constants.js
assets/js/config.js
assets/js/utils.js
assets/js/navigation.js
assets/js/search.js
assets/js/animations.js
assets/js/app.js

It also references /public/manifest.json.

These paths are references used by the supplied HTML. Confirm that each file exists in the deployed project before relying on it.

Local Development

1. Keep the website files in the expected directory structure.
2. Serve the project through a local web server or your chosen hosting platform.
3. Open the homepage and test the navigation, page links, images, video files, and search form.
4. Test the site at both mobile and desktop widths.
5. Check the browser console and server logs for missing files or JavaScript errors.

For a quick static preview, use any local static web server appropriate for your environment. Root-relative paths such as /assets/... expect the website to be served from the domain root; they may not work correctly if the site is opened directly as a file:// URL or deployed under a nested subdirectory.

Error Pages

The files 404.html and 500.html provide custom error-page documents, but creating the HTML files alone does not configure the server to serve them automatically. Configure the hosting provider or web server to use the appropriate file for HTTP 404 and HTTP 500 responses.

Before Deployment

☐ Confirm all internal links point to existing pages.
☐ Confirm all image and video assets exist at their referenced paths.
☐ Confirm the logo file is present.
☐ Confirm shared CSS and JavaScript files load successfully.
☐ Test dropdowns, mobile navigation, and the opening animation.
☐ Test forms and verify their submission endpoints are implemented.
☐ Configure custom 404 and 500 responses in the hosting environment.
☐ Verify canonical URLs, metadata, and the production domain.
☐ Review privacy, terms, refund, and disclaimer pages before launch.
☐ Test keyboard navigation and reduced-motion behaviour.

Important Notes

• This README documents the visible directory listing and the homepage structure provided in the conversation.
• The screenshot does not confirm the contents of the Status/ folder or whether every listed page is complete.
• Course admissions, recognition, eligibility, fees, employment, and outcomes should be checked against the relevant official institution or authority.