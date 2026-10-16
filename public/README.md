MedOrbits Public Assets

Directory: public/

1. Overview

The public/ directory contains static resources intended to be served directly by the MedOrbits website. These resources support search-engine discovery, browser compatibility, website verification, application association, and standardized security disclosures.

Files in this directory may be accessible without authentication. Never store API keys, private application records, personal documents, session tokens, database credentials, or other confidential information here.

Implementation note: A file’s presence does not guarantee that it is valid, publicly accessible at the expected URL, or actively used. Verify its contents, references, and deployment configuration.

2. Directory Structure

public/
├── README.md
├── .well-known/
│   ├── README.md
│   ├── security.txt
│   ├── apple-app-site-association
│   ├── change-password
│   ├── openid-configuration
│   └── traffic-advice
├── ads.txt
├── browserconfig.xml
├── humans.txt
├── robots.txt
└── sitemap.xml

This tree documents the intended structure, not proof that every file is implemented or required.

The .well-known/ resources are optional unless a relevant protocol, policy, or integration requires them. Populate required resources with valid, specification-compliant content; remove unused placeholders rather than publishing misleading or empty files.

3. File Responsibilities

robots.txt

Expected URL: /robots.txt

Provides crawl directives for compliant search-engine crawlers.

Maintenance requirements:

* Reference the correct production sitemap URL.
* Review crawl rules whenever public pages or URL structures change.
* Avoid unintentionally blocking important education, admissions, and career pages.
* Do not use crawler directives as access controls.
* Ensure rules do not expose sensitive paths unnecessarily.

sitemap.xml

Expected URL: /sitemap.xml

Lists canonical URLs that search engines can discover and consider for indexing.

Maintenance requirements:

* Include eligible, canonical public pages.
* Use the correct production HTTPS domain.
* Exclude private account pages, administrative interfaces, and URLs containing sensitive data.
* Remove obsolete, duplicate, and redirected URLs where appropriate.
* Keep the sitemap synchronized with the deployed website.
* Validate XML structure and URL formatting before deployment.

A sitemap helps discovery; it does not guarantee indexing or ranking.

ads.txt

Expected URL: /ads.txt

Declares authorized digital advertising sellers when MedOrbits participates in advertising arrangements that use the ads.txt standard.

* Include only verified records supplied by relevant advertising partners.
* Confirm publisher identifiers and relationship types with the applicable partner.
* Remove obsolete records when advertising relationships end.
* Omit the file if it is not applicable and no integration requires it.

Never invent seller records or publisher IDs.

browserconfig.xml

Provides legacy Microsoft browser and tile configuration.

Retain this file only when the website references it or requires its supported functionality. Otherwise, it is optional.

humans.txt

Provides optional project credits and general information about the people or organizations responsible for the website.

Keep its content appropriate for public access. Do not include personal contact details, credentials, internal infrastructure information, or private staff information.

README.md

Documents the purpose, contents, maintenance requirements, and deployment expectations of the public directory.

This repository documentation is for maintainers. It does not replace MedOrbits’ public privacy policy, terms, or security disclosure process.

4. The .well-known/ Directory

Path: public/.well-known/

This directory contains standardized resources for security reporting, protocol discovery, and optional application associations.

Resource	Intended purpose
security.txt	Publishes security reporting contact information and policy details.
apple-app-site-association	Associates a compatible website with an Apple application.
change-password	Supports password-change page discovery when implemented.
openid-configuration	Publishes OpenID Connect Provider metadata when MedOrbits operates such a provider.
traffic-advice	Provides traffic-advice information when the applicable protocol is implemented.

Refer to public/.well-known/README.md for resource-specific requirements, validation, and deployment details.

Do not publish protocol metadata that claims support for an integration that MedOrbits does not actually operate.

5. Optional Web Application Resources

Depending on implemented website features, consider adding:

* manifest.webmanifest — application name, theme colors, icons, and installability metadata.
* favicon.ico — browser tab and bookmark icon.
* apple-touch-icon.png — icon for supported Apple home-screen shortcuts.
* site.webmanifest — an alternative manifest filename only when deliberately selected.

Avoid duplicate manifests without a clear reason. Ensure HTML references match the actual filenames, MIME types, and deployed paths.

6. Static File Serving

The hosting platform or Express application must serve the directory from the intended public root.

Verify these expected URLs:

Resource	Expected URL
Robots directives	/robots.txt
XML sitemap	/sitemap.xml
Advertising authorization	/ads.txt, when applicable
Security disclosure	/.well-known/security.txt
Apple application association	/.well-known/apple-app-site-association, when applicable
OpenID Connect metadata	/.well-known/openid-configuration, when applicable

Confirm that:

* Required resources return the expected HTTP status.
* Content types are appropriate for each resource.
* Dot-directory paths are not inadvertently blocked by the host or reverse proxy.
* HTML fallback routing does not replace JSON, XML, or plain-text resources with the homepage.
* CDN and hosting cache rules do not serve stale protocol or SEO files indefinitely.
* File paths are mapped to the correct deployment root.

If Express serves these files, review the static middleware configuration in server.js or src/app.js. Avoid exposing source files, configuration files, private uploads, or unintended directory listings.

7. Security and Privacy

Treat every file in public/ as publicly accessible.

* Never store secrets or private user information.
* Do not publish internal credentials, tokens, or sensitive infrastructure details.
* Keep security reporting information accurate and monitored.
* Validate protocol-specific JSON, XML, and text resources before deployment.
* Review content types and CDN caching behavior.
* Keep private account and administration routes protected by server-side authentication and authorization.
* Do not assume an obscure URL or hidden frontend link provides security.

Public assets must contain only information approved for public distribution.

8. SEO and Content Maintenance

Before publishing changes:

1. Confirm that public pages use the intended canonical URLs.
2. Update sitemap.xml when eligible pages are added, removed, or relocated.
3. Review robots.txt for accidental crawl restrictions.
4. Check internal links and referenced asset paths.
5. Validate XML, JSON, and other structured resources.
6. Confirm that important URLs resolve correctly after deployment.
7. Review redirects and avoid listing inaccessible pages in the sitemap.
8. Ensure private or authenticated pages are not inadvertently published as indexable content.

Do not use robots.txt to protect private content. Apply server-side access controls and appropriate indexing directives where applicable.

9. Deployment Checklist

* [ ]	Public files contain valid, reviewed content.
* [ ]	Unused protocol placeholders have been removed or intentionally populated.
* [ ]	The sitemap uses the correct production domain.
* [ ]	robots.txt references the correct sitemap URL.
* [ ]	Security reporting information is current and monitored.
* [ ]	Advertising seller records are verified, if applicable.
* [ ]	Protocol resources meet their relevant specifications.
* [ ]	Static resources return the expected status codes and content types.
* [ ]	HTTPS is enabled.
* [ ]	No secrets or private records are publicly exposed.
* [ ]	Hosting and CDN rules preserve required resource URLs.
* [ ]	HTML fallback behavior does not interfere with static files.
* [ ]	Deployed URLs have been verified independently of local development.

10. Maintenance

Keep this README synchronized with the actual directory and deployment configuration.

When adding, changing, or removing public resources:

* Update the directory documentation.
* Check any HTML, manifest, or configuration references.
* Validate the resource against its intended specification.
* Verify the deployed URL and response headers.
* Review security and privacy implications.

Production principle: A documented resource is not necessarily implemented, valid, or deployed. Verify the actual file, configuration, and public response before relying on it.

⸻

MedOrbits — Study · Work · Grow

Public website resources for discoverability, compatibility, security transparency, and reliable deployment.