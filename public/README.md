Public Assets — MedOrbits

Directory: public/

Overview

The public/ directory contains static files intended to be served directly by the MedOrbits website. These resources support search-engine discovery, browser compatibility, website ownership and advertising verification, and standardized security disclosures.

Files in this directory may be publicly accessible without authentication. Never store API keys, private application records, personal documents, session tokens, or other confidential information here.

Implementation note: A file’s presence does not guarantee that it is valid, served at the expected URL, or actively used. Verify its contents and the deployment’s static-file configuration.

Directory Structure

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

The .well-known/ files are optional except where a relevant protocol, policy, or integration requires them. Remove unused empty placeholders or populate them with valid, specification-compliant content before deployment.

File Responsibilities

1. robots.txt

Expected URL: /robots.txt

Provides instructions to compliant search-engine crawlers about which website paths they may crawl.

Maintenance requirements:

* Reference the correct production sitemap URL.
* Review crawl rules when public pages are added or removed.
* Avoid accidentally blocking important public education and career pages.
* Do not rely on crawler directives to protect confidential pages or API endpoints.

2. sitemap.xml

Expected URL: /sitemap.xml

Lists canonical URLs that search engines can discover and consider for indexing.

Maintenance requirements:

* Include eligible public pages.
* Use the canonical HTTPS production domain.
* Exclude private account pages, administrative interfaces, and URLs containing sensitive data.
* Remove obsolete, duplicate, and redirected URLs where appropriate.
* Keep the sitemap synchronized with the deployed website.

3. ads.txt

Expected URL: /ads.txt

Declares authorized digital advertising sellers when MedOrbits participates in advertising arrangements that use the ads.txt standard.

Include only verified seller records supplied by the relevant advertising partners. If the website does not use such advertising, an ads.txt file may not be necessary.

4. browserconfig.xml

Provides legacy Microsoft browser and tile configuration.

Keep this file if the website still references it or needs its supported functionality. Otherwise, it is optional.

5. humans.txt

Provides optional project credits and general information about the people or organizations responsible for the website.

Do not include personal contact details or internal information that should not be public.

6. README.md

Documents the purpose, contents, maintenance requirements, and deployment expectations for the public directory.

This documentation file is for repository maintainers and does not replace the website’s public policies.

The .well-known/ Directory

Path: public/.well-known/

This subdirectory contains standardized resources for protocol discovery, security reporting, and optional application associations.

Resource	Purpose
security.txt	Publishes security reporting contact information and policy details.
apple-app-site-association	Associates a compatible website with an Apple application.
change-password	Provides password-change page discovery when implemented.
openid-configuration	Publishes OpenID Provider metadata when MedOrbits operates an OpenID Connect provider.
traffic-advice	Provides traffic-advice information when the applicable protocol is implemented.

Consult .well-known/README.md for resource-specific requirements.

Optional Web Application Resources

Depending on the website’s features, consider adding these resources when required:

* manifest.webmanifest — application name, theme colours, icons, and installability metadata.
* favicon.ico — browser and bookmark icon.
* apple-touch-icon.png — icon for supported Apple home-screen shortcuts.
* site.webmanifest — only if deliberately using this filename instead of manifest.webmanifest.

Do not create duplicate manifests without a clear reason. Ensure that HTML references match the actual filenames and paths.

Static File Serving

The deployment must serve public files from the intended static root.

Verify that:

* robots.txt is accessible at /robots.txt.
* sitemap.xml is accessible at /sitemap.xml.
* ads.txt is accessible at /ads.txt when applicable.
* .well-known/security.txt is accessible at /.well-known/security.txt.
* Required resources return successful HTTP responses and appropriate content types.
* Dot-directory requests are not inadvertently blocked by the hosting platform or reverse proxy.
* HTML fallback routing does not replace JSON, XML, or text resources with the homepage.

If Express serves this directory, review the static middleware configuration in server.js or src/app.js.

Security and Privacy

* Treat every file in public/ as publicly accessible.
* Never store secrets or private user information in this directory.
* Avoid exposing internal infrastructure details or sensitive endpoints.
* Keep security contact information accurate.
* Validate protocol-specific JSON and XML before deployment.
* Review CDN caching and content-type behavior.
* Keep private account and administration routes protected by server-side authentication and authorization.

Search-engine directives, obscure URLs, and hidden frontend links are not access controls.

SEO and Content Maintenance

Before publishing changes:

1. Confirm that public pages use canonical URLs.
2. Update sitemap.xml when eligible pages change.
3. Verify the rules in robots.txt.
4. Check internal links and referenced asset paths.
5. Validate XML, JSON, and other structured resources.
6. Verify important URLs after deployment.
7. Review redirects and avoid listing inaccessible pages in the sitemap.

Deployment Checklist

* [ ]	All public files contain valid content.
* [ ]	Empty protocol placeholders have been populated or removed.
* [ ]	The sitemap uses the correct production domain.
* [ ]	The robots file references the correct sitemap.
* [ ]	Security reporting information is current.
* [ ]	Optional advertising records are verified.
* [ ]	Static resources return the expected content types.
* [ ]	HTTPS is enabled.
* [ ]	No secrets or private records are publicly exposed.
* [ ]	CDN and hosting rules preserve required resource URLs.

Maintenance

Keep this README synchronized with the actual directory. Add documentation for new public resources, remove references to obsolete files, and verify all deployment URLs before relying on them.

⸻

MedOrbits — Study · Work · Grow

Public website resources for discoverability, compatibility, security transparency, and reliable deployment.