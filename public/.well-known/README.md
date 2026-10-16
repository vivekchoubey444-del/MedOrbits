MedOrbits — Well-Known Resources

Directory: public/.well-known/

1. Overview

The .well-known/ directory contains standardized resources that allow browsers, security researchers, identity providers, and other clients to discover website capabilities, security contacts, and protocol metadata.

MedOrbits may use this directory for security disclosure information, application association, password-change discovery, identity-provider metadata, and browser traffic-advice resources.

Implementation principle: A filename alone does not activate a protocol or feature. Every published resource must contain valid content, follow its applicable specification, and be served at the expected URL with appropriate HTTP headers.

2. Directory Structure

public/
└── .well-known/
    ├── README.md
    ├── apple-app-site-association
    ├── change-password
    ├── openid-configuration
    ├── security.txt
    └── traffic-advice

This structure documents the intended resources. It does not imply that all files are required, implemented, or ready for production.

3. Resource Responsibilities

3.1 security.txt

Public URL: https://medorbits.in/.well-known/security.txt

Provides a standardized way for security researchers to find MedOrbits’ vulnerability-reporting contact and disclosure policy.

Recommended fields include:

* Contact — a monitored security reporting address or reporting URL.
* Policy — the URL of the security reporting policy.
* Expires — the expiration date and time of the published information.
* Preferred-Languages — languages accepted for security reports.
* Canonical — the canonical URL of the security.txt resource.

Requirements:

* Follow RFC 9116.
* Use valid field syntax and date formatting.
* Ensure the contact is monitored.
* Ensure referenced policies and URLs are valid.
* Renew the resource before its expiration date.

Do not publish unmonitored contact details or misleading response-time commitments.

3.2 apple-app-site-association

Public URL: https://medorbits.in/.well-known/apple-app-site-association

Associates an eligible website with an iOS or iPadOS application for Universal Links and supported associated-domain capabilities.

When applicable:

* Provide valid JSON using Apple’s required structure.
* Configure the actual Apple Developer Team ID and application Bundle ID.
* Include only paths the application is designed to handle.
* Configure the Associated Domains capability in the application.
* Serve the resource over HTTPS without authentication.
* Return the resource directly rather than an HTML fallback page.
* Verify the deployed response against Apple’s current requirements.

If MedOrbits does not have an associated Apple application, this resource is optional and should be omitted until needed.

3.3 change-password

Public URL: https://medorbits.in/.well-known/change-password

Provides a conventional discovery location for the website’s password-change interface.

If implemented, direct users to the actual MedOrbits password-change page using a controlled server-side redirect or an appropriate static fallback.

Security requirements:

* Require authentication before allowing a password change.
* Verify the current authentication state.
* Apply appropriate session and CSRF protections.
* Validate any required current-password or additional verification step.
* Do not expose passwords, reset tokens, or session secrets.
* Never allow arbitrary user-controlled redirect destinations.

This resource helps clients discover the password-change page; it does not implement the password-change or password-reset workflow.

3.4 openid-configuration

Public URL: https://medorbits.in/.well-known/openid-configuration

Publishes OpenID Provider metadata when MedOrbits operates an OpenID Connect identity provider.

A valid implementation typically describes:

* The issuer identifier.
* Authorization and token endpoints.
* Supported response types and grant types.
* Supported scopes and signing algorithms.
* User-information and key-discovery endpoints, where applicable.
* Other metadata required by the implemented OpenID Connect specification.

Requirements:

* Use the actual issuer identifier.
* Advertise only implemented and supported capabilities.
* Ensure every advertised endpoint is operational and secured.
* Publish valid key-discovery metadata when required.
* Validate the metadata against the relevant OpenID Connect specification.

Do not publish placeholder JSON merely because MedOrbits has a login page. If MedOrbits only consumes an external identity provider, the provider’s discovery document generally belongs to that external provider.

3.5 traffic-advice

Public URL: https://medorbits.in/.well-known/traffic-advice

May provide browser traffic-advice information when MedOrbits deliberately implements the applicable browser-supported mechanism.

Requirements:

* Confirm the intended protocol and supported clients.
* Follow the relevant specification’s exact schema and permitted values.
* Publish only validated content.
* Verify the deployed response and content type.

This resource is optional. If no concrete integration requires it, omit it rather than publishing unverified example data.

3.6 README.md

Documents the purpose, requirements, maintenance procedures, and deployment expectations for the directory.

This file is internal project documentation, not a standardized .well-known protocol resource.

4. Resource Status Checklist

Use this checklist to track implementation readiness.

* [ ]	security.txt contains a real, monitored security contact.
* [ ]	security.txt has a valid expiry date and current policy URL.
* [ ]	apple-app-site-association is configured only when an Apple application association is required.
* [ ]	change-password leads to a secure, functioning password-change interface.
* [ ]	openid-configuration describes a real OpenID Connect Provider, if operated.
* [ ]	traffic-advice follows the applicable specification, if used.
* [ ]	Empty or misleading placeholders are replaced with valid content or removed.
* [ ]	Every required resource is accessible at its intended HTTPS URL.
* [ ]	Hosting and static-file configuration preserve required paths and response formats.

5. Security and Deployment

Before deployment:

* Serve resources over HTTPS.
* Never store API keys, credentials, access tokens, or private application data in this directory.
* Validate JSON resources and protocol-specific text files.
* Verify HTTP status codes, response bodies, and content types.
* Ensure reverse proxies, CDNs, and hosting rules do not block or rewrite required resources.
* Avoid authentication requirements for standardized resources that must be publicly discoverable.
* Restrict redirects to approved destinations.
* Review content whenever application identifiers, endpoints, security contacts, or supported capabilities change.

Where a protocol requires a resource to be served directly, ensure that routing does not replace it with the website homepage or an unrelated redirect.

6. Production Verification

For each resource that MedOrbits actually uses:

1. Confirm that the relevant integration exists.
2. Verify the expected filename and URL.
3. Validate the resource against its applicable specification.
4. Test the local or staging response.
5. Deploy the resource.
6. Verify the production URL, HTTP status, content type, and response body.
7. Confirm that the intended client or integration can consume it.
8. Document the result and any maintenance requirements.

Do not consider a resource production-ready merely because the local file exists.

7. Related Resources

Keep other website resources in their appropriate locations:

* public/robots.txt — crawler access directives.
* public/sitemap.xml — sitemap, when maintained.
* public/manifest.webmanifest — web application manifest, when used.
* SECURITY.md — repository security reporting instructions.
* docs/security/ — detailed application security documentation.

These resources have different purposes. Do not move them into .well-known/ without a protocol-specific reason.

8. Maintenance

Before adding a resource:

1. Identify the protocol or client that requires it.
2. Confirm the expected filename, format, and HTTP behavior.
3. Implement the resource using real configuration.
4. Validate it locally.
5. Verify it in staging.
6. Check the production URL after deployment.
7. Update this README when the directory changes.
8. Review expiration dates and operational contacts periodically.

Production principle: Publish only resources that MedOrbits actually supports. Accurate, validated resources are preferable to a directory filled with unused protocol placeholders.

⸻

MedOrbits — Study · Work · Grow

Standardized discovery resources for a secure and interoperable web platform.