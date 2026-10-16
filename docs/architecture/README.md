Architecture Overview

Project: MedOrbits
Directory: docs/architecture/
Purpose: Document the application’s logical architecture, component responsibilities, system boundaries, and integration points.

1. Overview

MedOrbits is an education and career consultancy platform. Its architecture documentation describes how the user-facing pages, application services, data storage, external integrations, and operational components fit together.

This document defines the intended architectural boundaries. Component names, technology choices, and integration details must be verified against the deployed implementation before being treated as confirmed.

2. Architectural Layers

2.1 Presentation Layer

The presentation layer contains the pages and static assets through which users interact with MedOrbits.

Relevant repository areas may include:

* pages/ — General website pages.
* account/ — User account and account-management pages.
* education/ — Education and admission-related pages.
* career/ — Career services, jobs, and internship pages.
* admin/ — Administrative interfaces.
* legal/ — Legal, privacy, consent, and policy pages.
* assets/ — Shared stylesheets, scripts, images, and other frontend resources.
* public/ — Publicly served resources, subject to the server configuration.

The actual serving behavior of these directories must be confirmed in the application entry point and deployment configuration.

2.2 Application Layer

The application layer receives requests, validates input, applies business rules, coordinates services, and returns responses.

The repository’s src/ directory is the expected location for backend application modules. Its actual responsibilities should be documented using the current controllers, routes, middleware, services, and configuration files.

Do not assume that every conventional module exists. Record only components found in the repository or confirmed in the running application.

2.3 Data Layer

The data layer manages persistent application data.

Relevant repository areas include:

* database/ — Database-related documentation, migrations, seeds, and fixtures, where present.
* storage/ — Application-managed file storage, subject to access controls and deployment configuration.

The database engine, schema, transaction behavior, backup strategy, and file-storage provider must be confirmed from configuration and the deployed environment.

2.4 Integration Layer

Integrations may support services such as payment processing, email delivery, notifications, document handling, or other third-party capabilities.

For every integration, document:

* Provider and purpose.
* Configuration variables, without exposing secret values.
* Request and response handling.
* Authentication and signature verification.
* Timeout, retry, and failure behavior.
* Webhook handling, if applicable.
* Logging and monitoring requirements.

Do not document a provider as active until its implementation and deployment configuration have been verified.

2.5 Operations and Quality

The operational architecture includes deployment configuration, automation scripts, observability, and quality checks.

Relevant repository areas may include:

* scripts/ — Maintenance, development, or deployment scripts.
* tests/ — Automated tests and supporting fixtures.
* infrastructure/ — Deployment and infrastructure configuration.
* docs/ — Technical documentation and operational guidance.

The actual purpose of each directory must be checked against its contents.

3. Architectural Boundaries

Use the following boundaries when developing or reviewing the system:

1. Presentation: Handles display and user interaction; it must not expose server secrets.
2. Request handling: Validates incoming requests, establishes authentication context, and applies applicable middleware.
3. Business logic: Implements domain rules and coordinates application operations.
4. Persistence: Owns database access and durable file operations.
5. External integrations: Encapsulate communication with third-party services.
6. Operations: Supports deployment, diagnostics, scheduled work, and maintenance.

These are logical responsibilities, not proof that separate modules or services already exist.

4. Typical Request Lifecycle

A typical server-backed request follows this sequence:

1. A user or client submits a request.
2. The web server or application entry point receives it.
3. Applicable middleware processes security, authentication, and request validation.
4. A route or controller dispatches the operation.
5. Business logic executes and accesses required data or integrations.
6. The application produces a response.
7. Relevant operational events are logged without exposing sensitive information.

Static-page requests or third-party callbacks may follow different paths. Confirm the actual lifecycle in the deployed application.

5. Security Principles

* Keep credentials and environment-specific secrets outside committed source code.
* Validate and authorize requests on the server.
* Enforce role-based permissions for administrative operations.
* Protect account, application, payment, and document data.
* Validate file uploads and restrict access to private files.
* Verify webhook signatures where supported by the provider.
* Use HTTPS in deployed environments.
* Avoid logging passwords, authentication tokens, payment credentials, or unnecessary personal information.
* Apply appropriate rate limits, session protections, and security headers.

Document the controls that are actually implemented separately from planned improvements.

6. Architecture Verification

Before publishing an architecture change, verify:

* The application entry point and startup configuration.
* Actual route, controller, middleware, and service modules.
* Database engine, schema, migrations, and connection configuration.
* File-upload and file-access behavior.
* Active external providers and callback URLs.
* Background jobs, workers, and scheduling mechanisms, if present.
* Deployment configuration and health checks.
* Automated test coverage for the changed components.

7. Related Documentation

* folder-structure.md — Repository directory responsibilities.
* data-flow.md — Request, data-processing, and background-job flows.
* ../api/README.md — API documentation guidance, if present.
* ../api/openapi.yaml — API contract, if present.

Update this document whenever a significant architectural boundary, dependency, or integration changes.

Accuracy rule: The deployed implementation and its configuration are authoritative. This document describes intended design until each relevant detail has been verified.