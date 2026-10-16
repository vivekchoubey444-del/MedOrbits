MedOrbits API Documentation

Directory: docs/api/
Primary specification: openapi.yaml
Specification version: OpenAPI 3.1.0

1. Purpose

This directory contains the API documentation for MedOrbits.

The OpenAPI specification describes the intended HTTP API contract, including endpoints, request parameters, request and response schemas, authentication requirements, status codes, and error responses.

The documentation must reflect the implemented backend. A proposed endpoint is not considered available merely because it appears in openapi.yaml.

2. Directory Structure

docs/
└── api/
    ├── README.md
    └── openapi.yaml

Add supporting API documents or reusable schemas only when they provide clear value and remain consistent with the main specification.

3. Documentation Standards

Endpoint accuracy

* Document only endpoints that exist and are mounted in the backend.
* Verify HTTP methods, route paths, middleware, and controller behavior.
* Distinguish implemented operations from proposed or planned functionality.
* Keep operation IDs unique and descriptive.
* Use consistent naming conventions across paths, parameters, and schemas.

Request and response contracts

* Document required and optional parameters.
* Define request-body and response schemas.
* Specify field types, constraints, formats, and permitted values.
* Document pagination, filtering, sorting, and default behavior where implemented.
* Include realistic success and failure status codes.
* Reuse shared schemas and response definitions where appropriate.
* Keep error codes and response envelopes consistent with actual server behavior.

Authentication and authorization

* Document which endpoints are public and which require authentication.
* Specify the actual session-cookie or token mechanism.
* Document authorization requirements without exposing credentials or secrets.
* Confirm that protected operations enforce authorization on the server.
* Describe CSRF requirements where relevant to cookie-based authentication.

Examples and sensitive data

* Use synthetic example data.
* Never include real passwords, access tokens, session cookies, API keys, private user information, or payment credentials.
* Avoid exposing internal stack traces or sensitive infrastructure details in documented error responses.

4. OpenAPI Specification

The primary contract is:

docs/api/openapi.yaml

The document should contain the following sections where applicable:

Section	Responsibility
openapi	OpenAPI specification version
info	API title, version, description, and contact information
servers	Actual API base URLs, with placeholders clearly identified
tags	Logical endpoint groupings
paths	Available HTTP endpoints and operations
components.schemas	Reusable request, response, and data schemas
components.parameters	Reusable query, path, and header parameters
components.responses	Reusable error and common response definitions
components.securitySchemes	Authentication mechanisms
Operation-level security	Authentication requirements for individual operations

Keep the specification compatible with the OpenAPI version declared at the top of the file.

5. Backend Verification Workflow

Before documenting or changing an endpoint:

1. Locate its route definition.
2. Confirm that the route is mounted by the application.
3. Inspect the controller and associated service logic.
4. Verify authentication and authorization middleware.
5. Confirm request validation and accepted input formats.
6. Check the actual response body and status codes.
7. Confirm error handling and relevant business rules.
8. Update the corresponding OpenAPI operation and schemas.
9. Validate the specification and run relevant tests.
10. Review the changes before merging.

If the implementation cannot be verified, clearly mark the operation as proposed or omit it from the available API contract.

6. Validation

Validate openapi.yaml locally using the validator selected by the project.

For example, if MedOrbits adopts Redocly CLI as a development dependency:

npx redocly lint docs/api/openapi.yaml

This command is an example and requires the corresponding package to be installed or available through the project’s chosen toolchain.

For repeatable validation, prefer a pinned development dependency and a lockfile-backed installation over relying on an unpinned tool download.

Validation should check:

* YAML syntax.
* OpenAPI schema compliance.
* Valid $ref references.
* Unique operation IDs.
* Consistent request and response definitions.
* Correct authentication declarations.
* Appropriate response documentation.
* Unresolved placeholders and accidental secrets.

A structurally valid OpenAPI document does not prove that the documented endpoints exist or behave as described. Backend verification and integration tests remain necessary.

7. Continuous Integration

Run OpenAPI validation in the project’s CI pipeline whenever changes affect:

* docs/api/openapi.yaml
* Backend route definitions or controllers
* Request and response schemas
* Authentication and authorization behavior

A minimal GitHub Actions step, assuming the project has installed and pinned Redocly CLI, is:

- name: Validate OpenAPI specification
  run: npx —no-install redocly lint docs/api/openapi.yaml

Ensure the dependency is installed before this step. Adapt the command to the validator and package scripts actually configured in MedOrbits.

Where practical, add automated contract tests that compare the documented behavior with the running API.

8. Change Management

Whenever an API endpoint changes:

1. Update the backend implementation.
2. Update request validation and response handling.
3. Update openapi.yaml.
4. Update relevant automated tests.
5. Run the OpenAPI validator.
6. Verify authentication and authorization behavior.
7. Review compatibility with existing frontend clients.
8. Include breaking changes in release notes where appropriate.

Avoid changing a documented response schema without considering the impact on existing clients.

9. Security Requirements

* Never commit secrets to API documentation.
* Keep production credentials and provider configuration in the appropriate secure environment.
* Do not expose internal administrative endpoints as public operations.
* Document sensitive operations accurately.
* Verify payment-provider webhook signatures using the provider’s actual verification procedure.
* Document rate limiting and idempotency where relevant and implemented.
* Treat API documentation as a contract, not as a substitute for server-side security controls.

10. Maintenance Checklist

* [ ]	Every documented endpoint exists and is mounted.
* [ ]	HTTP methods and paths match the implementation.
* [ ]	Request and response schemas match actual payloads.
* [ ]	Authentication and authorization requirements are correct.
* [ ]	Status codes and error formats match server behavior.
* [ ]	Examples use synthetic data.
* [ ]	No secrets or sensitive personal data are present.
* [ ]	OpenAPI validation passes locally and in CI.
* [ ]	Relevant API tests pass.
* [ ]	Breaking changes are reviewed and documented.

Important Notes

* openapi.yaml is authoritative only to the extent that it matches the implemented backend.
* Placeholders must be replaced or clearly identified before release.
* OpenAPI linting checks the specification’s structure and conventions; it does not establish backend correctness.
* Keep documentation, backend implementation, frontend expectations, and automated tests aligned.

Maintenance principle: MedOrbits API documentation must be accurate, secure, testable, and synchronized with the deployed implementation.