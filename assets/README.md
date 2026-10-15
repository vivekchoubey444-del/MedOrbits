Assets — MedOrbits

Overview

The assets/ directory contains the frontend resources used throughout the MedOrbits website, including stylesheets, JavaScript modules, structured JSON data, images, icons, fonts, and downloadable documents.

Directory Structure

assets/
├── README.md
├── css/
├── js/
├── data/
├── images/
├── icons/
├── fonts/
└── documents/

Directory Responsibilities

Directory	Purpose
css/	Global styles, page layouts, components, themes, responsive rules and animations
js/	Application initialization, navigation, authentication interfaces, forms, search and shared utilities
data/	Structured JSON data for courses, colleges, universities, fees, admissions, careers and other website content
images/	Logos, hero images, course imagery, destinations, backgrounds and placeholders
icons/	Education, career and social media icons
fonts/	Locally hosted font files and font documentation
documents/	Publicly downloadable brochures, guides, checklists and other approved resources

Design Consistency

* Preserve the established MedOrbits visual identity and premium colour palettes.
* Reuse existing styles and shared components wherever possible.
* Maintain consistent typography, spacing, border radii and responsive behaviour.
* Preserve existing opening animations, navigation, headers and footers when updating individual pages.
* Avoid introducing unnecessary duplicate CSS or JavaScript.

Development Guidelines

1. Use descriptive, lowercase filenames.
2. Keep each asset in its designated directory.
3. Use root-relative paths consistently where supported by the deployment configuration.
4. Optimize images and fonts for performance.
5. Keep JSON files valid and use verified data.
6. Avoid placing secrets or private user information in public assets.
7. Test mobile layouts, keyboard navigation and reduced-motion preferences.
8. Update relevant README files whenever the asset structure changes.

Security and Performance

* Do not store API keys, passwords, session tokens or private documents in publicly accessible assets.
* Validate and sanitize untrusted data before displaying it.
* Use appropriate caching and compression in production.
* Serve only approved public downloads from assets/documents/.

Maintenance

This directory supports the frontend across MedOrbits. Changes should be tested on the affected pages before deployment.