Well-Known Resources — MedOrbits

Directory: public/.well-known/

Overview

The .well-known/ directory contains standardized resources that allow browsers, security researchers, identity providers, and other clients to discover specific website capabilities and policies.

For MedOrbits, this directory is intended for security disclosure information and optional application association, password-change discovery, identity-provider metadata, and browser traffic-advice resources.

Implementation note: A filename alone does not activate a protocol or feature. Each resource must contain valid content, follow its relevant specification, and be served at the expected URL with appropriate HTTP headers.

Directory Structure

public/
└── .well-known/
    ├── README.md
    ├── apple-app-site-association
    ├── change-password
    ├── openid-configuration
    ├── security.txt
    └── traffic-advice

File Responsibilities

1. security.txt

Public URL: /.well-known/security.txt

Provides a standardized way for security researchers to find MedOrbits’ vulnerability-reporting contact and disclosure policy.

Recommended fields include:

* Contact — a monitored security reporting address or reporting URL.
* Policy — the URL of the security reporting policy.
* Expires — the date and time when the published information expires.
* Preferred-Languages — languages accepted for security reports.

Use the format specified by RFC 9116. Keep the file current and ensure all listed contacts and URLs are valid.

2. apple-app-site-association

Public URL: /.well-known/apple-app-site-association

Used to associate an eligible website with an iOS or iPadOS application for capabilities such as Universal Links and supported associated-domain features.

Requirements when applicable:

* Provide valid JSON.
* Use the structure required by the relevant Apple documentation.
* Configure the correct application identifiers and supported paths.
* Serve the resource over HTTPS without requiring authentication.
* Ensure the deployed URL returns the file directly rather than an HTML fallback page.

If MedOrbits does not have an associated Apple application, this file is not required.

3. change-password

Public URL: /.well-known/change-password

Provides a conventional discovery location for a website’s password-change page.

If implemented, redirect users to the actual password-change interface, such as the appropriate MedOrbits account settings page.

Security requirements:

* Require authentication before changing a password.
* Verify the user’s current authentication state.
* Apply appropriate session and CSRF protections.
* Do not expose password-reset tokens in a public resource.
* Never allow the discovery endpoint to redirect to an arbitrary user-supplied destination.

This resource does not replace the password-reset workflow.

4. openid-configuration

Public URL: /.well-known/openid-configuration

Publishes OpenID Provider metadata when MedOrbits operates an OpenID Connect identity provider.

A valid implementation typically describes:

* The issuer identifier.
* Authorization and token endpoints.
* Supported response types and scopes.
* Supported signing algorithms.
* User-information and key-discovery endpoints, where applicable.
* Other metadata required by the selected OpenID Connect specification.

The metadata must accurately describe a working identity provider. Do not publish placeholder JSON or create this resource merely because the platform has a login page.

If MedOrbits only consumes an external identity provider, this file generally belongs to that provider rather than MedOrbits.

5. traffic-advice

Public URL: /.well-known/traffic-advice

May provide browser traffic-advice information when MedOrbits deliberately implements the relevant browser-supported mechanism.

Only publish valid content that follows the applicable specification and is supported by the intended clients.

This file is optional and should be omitted if there is no concrete use case.

6. README.md

Documents the purpose, requirements, maintenance, and deployment considerations for resources in this directory.

The README itself is project documentation; it is not a standardized .well-known protocol resource.

Resource Status

Use the following checklist to manage these files:

* [ ]	security.txt contains a real, monitored security contact.
* [ ]	security.txt has a valid expiry date and current policy URL.
* [ ]	apple-app-site-association is configured only if an Apple app association is needed.
* [ ]	change-password leads to a secure, functioning password-change page.
* [ ]	openid-configuration describes a real OpenID Connect Provider, if operated.
* [ ]	traffic-advice follows the relevant specification, if used.
* [ ]	Empty placeholder files are replaced with valid content or removed.
* [ ]	Every published resource is accessible at its intended HTTPS URL.
* [ ]	Hosting and static-file configuration permit the required paths and content types.

Security and Deployment

* Serve public resources over HTTPS.
* Do not place API keys, credentials, access tokens, or private application data in this directory.
* Validate JSON resources before deployment.
* Check response status codes and content types.
* Ensure reverse proxies, CDNs, and hosting rules do not block or rewrite required resources.
* Avoid authentication requirements for standardized resources that must be publicly discoverable.
* Review resource content whenever application identifiers, endpoints, security contacts, or supported capabilities change.

For a deployment check, verify each applicable URL on the production domain rather than relying only on the existence of a local file.

Related Resources

Keep other website resources in their appropriate locations:

* public/robots.txt — crawler access directives.
* public/sitemap.xml — sitemap, if generated and maintained.
* public/manifest.webmanifest — web application manifest, if used.
* SECURITY.md — repository security reporting instructions.
* docs/security/ — detailed application security documentation.

These resources serve different purposes and should not be moved into .well-known/ without a protocol-specific reason.

Maintenance

Before adding a new resource:

1. Identify the protocol or client that requires it.
2. Confirm the expected filename, format, and HTTP behavior.
3. Implement the resource with real configuration.
4. Validate it locally.
5. Deploy it to staging and verify its response.
6. Check the production URL after deployment.
7. Update this README when the directory changes.

⸻

MedOrbits — Study · Work · Grow

Standardized discovery resources for a secure and interoperable web platform.