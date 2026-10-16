MedOrbits API Routes

Directory: src/routes/

Purpose: Define the HTTP API surface for the MedOrbits Express backend and connect incoming requests to middleware and controller handlers.

1. Overview

The routing layer defines URL paths, HTTP methods, middleware ordering, and controller mappings for education, admissions, careers, recruitment, accounts, payments, notifications, and platform administration.

Routes should remain focused on HTTP concerns. Business rules belong in src/services/, database operations belong in src/repositories/, and provider-specific operations belong in src/integrations/.

Implementation principle: A registered route does not prove that its controller, business workflow, database access, or security controls are implemented.

2. Route mounting and API versioning

The supplied server.js mounts route files individually under /api/v1.

Examples:

Route module	Mount path
auth.routes.js	/api/v1/auth
user.routes.js	/api/v1/users
payment.routes.js	/api/v1/payments
Other route modules	Their explicitly configured /api/v1/ resource prefixes.

index.js also exports a combined router for applications that prefer a single mount point.

Mounting rule: Do not mount the combined router and the same individual route modules simultaneously. Doing so may register duplicate endpoints and cause unexpected middleware execution or response behavior.

Verify the actual mount configuration in server.js before changing route registration.

3. Expected controller convention

Routes load controller modules from src/controllers/. Controllers should export named handler functions matching the handlers referenced by their route modules.

Example:

‘use strict’;
async function list(req, res, next) {
  try {
    // Call the relevant service and return a documented response.
  } catch (error) {
    next(error);
  }
}
module.exports = {
  list
};

A typical CRUD controller may expose:

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};

These names are illustrative. Use the actual exports expected by each route module.

Missing handlers

The route layer uses a safe notImplemented response when a controller module or handler is missing.

This prevents an unimplemented handler from returning a false success response. It does not replace implementation of the controller, business logic, persistence, authorization, validation, or audit logging.

Before production release, identify and resolve every intentionally unfinished route.

4. Request-processing order

A protected route should generally follow this sequence:

1. Route matching — Identify the HTTP method and path.
2. Request controls — Apply applicable security headers, request limits, CORS, and rate limiting.
3. Authentication — Establish the caller’s authenticated identity where required.
4. Authorization — Verify permissions, role requirements, and resource ownership.
5. Validation — Validate path parameters, query parameters, and request bodies.
6. Controller — Coordinate the HTTP request and response.
7. Service — Execute business rules and workflow operations.
8. Repository or integration — Access persistence or external providers as required.
9. Response and error handling — Return the documented response or forward the error to centralized handling.

Not every endpoint requires every middleware component. Public endpoints must still apply appropriate validation and abuse protections.

5. Route design conventions

* Use explicit HTTP methods and resource-oriented paths.
* Keep route handlers small and delegate business logic to services.
* Use consistent naming and response contracts.
* Validate identifiers before passing them to services.
* Avoid accepting arbitrary database fields from request bodies.
* Use pagination and bounded results for list endpoints.
* Return appropriate HTTP status codes.
* Keep internal database IDs and implementation details out of public responses unless required.
* Document authentication requirements and expected permissions.
* Avoid exposing administrative operations through public routes.

Suggested HTTP conventions

Method	Typical purpose
GET	Retrieve a resource or collection.
POST	Create a resource or initiate an operation.
PUT	Replace a resource where supported.
PATCH	Partially update a resource.
DELETE	Delete or deactivate a resource where permitted.

The actual semantics must match each endpoint’s implementation and documented contract.

6. Middleware and authorization

Protected routes must apply authentication and authorization consistently.

Recommended controls include:

* Role-based access restrictions.
* Resource ownership checks.
* Administrative permission checks.
* Request validation.
* Endpoint-specific rate limiting.
* Audit logging for sensitive operations.
* CSRF protection when cookie-based authentication requires it.

Do not assume that hiding a route in the frontend protects it. Do not treat a valid resource identifier as proof of permission to access that resource.

For sensitive resources, enforce authorization close to the operation as well as at the route boundary where appropriate.

7. API response and error conventions

Use a consistent response format across route modules.

Recommended status codes include:

Status	Meaning
200	Successful request.
201	Resource created.
204	Successful operation with no response body.
400	Malformed or invalid request.
401	Authentication required or invalid.
403	Caller lacks permission.
404	Resource not found or intentionally undisclosed.
409	Conflicting resource state or duplicate operation.
413	Request payload too large.
415	Unsupported media type.
422	Semantically invalid input, if adopted by the API.
429	Rate limit exceeded.
500	Unexpected server error.
503	Required service temporarily unavailable.

Forward errors to the application’s centralized error handler. Do not return stack traces, SQL errors, provider secrets, or internal exception messages to clients.

8. Payments and webhooks

Payment routes require additional safeguards.

* Verify provider signatures using the exact raw request body required by the provider.
* Preserve raw-body handling before JSON parsing where necessary.
* Validate provider event types and identifiers.
* Record webhook event IDs to prevent duplicate processing.
* Make payment-state transitions safe to repeat.
* Reconcile payment state against authoritative provider and database records.
* Do not treat browser redirects as proof of successful payment.
* Apply suitable rate limits and operational monitoring.

The supplied backend configuration preserves req.rawBody through JSON-parser verification. The payment controller must pass the correct raw body, signature header, and required headers to the payment service.

Verify this integration against the actual middleware and controller code.

9. File uploads and private documents

Routes handling uploads or document downloads must:

* Enforce request and file-size limits.
* Validate file content, not just filename extensions.
* Apply MIME validation and malware scanning where appropriate.
* Authenticate the caller and verify document ownership.
* Store private files outside publicly served directories.
* Use controlled storage identifiers and authorized download mechanisms.
* Avoid logging document contents or sensitive metadata.
* Apply retention and deletion policies.

Do not expose private documents through a publicly accessible static directory.

10. Route composition and combined router

Where supported, index.js may combine resource routers into a single Express router.

Choose one mounting strategy:

Individual mounting

* Each route module is mounted separately in server.js.
* Resource prefixes remain explicit at the application composition layer.

Combined mounting

* index.js combines the resource routers.
* The application mounts the combined router once under /api/v1.

Document the chosen strategy and ensure every route is registered only once.

11. Testing requirements

* [ ]	Every intended route maps to the correct controller handler.
* [ ]	Missing handlers return a safe non-success response.
* [ ]	Routes are mounted exactly once.
* [ ]	Authentication is required where appropriate.
* [ ]	Authorization and resource ownership are enforced.
* [ ]	Invalid request bodies and parameters are rejected.
* [ ]	Rate limits apply to sensitive endpoints.
* [ ]	Error responses do not expose internal details.
* [ ]	Payment webhooks verify signatures using the required raw body.
* [ ]	Duplicate webhook events are handled safely.
* [ ]	Uploads and document downloads enforce access controls.
* [ ]	Pagination and search results are bounded.
* [ ]	Public and protected endpoints have documented contracts.

Use integration tests with the actual Express application and suitable test repositories or service adapters.

12. Production requirements

Before public launch, implement and verify:

1. Database-backed controllers and required schema or migrations.
2. Authentication and role-based authorization.
3. Resource-level access controls.
4. Request validation and output minimization.
5. Appropriate rate limits for login, password reset, uploads, payments, and public search.
6. CSRF protection where required by the authentication architecture.
7. Secure file storage, content validation, and malware scanning where appropriate.
8. Payment webhook signature verification and idempotency.
9. Automated tests, monitoring, and error reporting.
10. Backup, recovery, and operational procedures.
11. Consistent API versioning and deprecation practices.
12. Verification that no unfinished route is unintentionally exposed.

13. Implementation status

This document describes the intended routing architecture. Verify route registration, controller exports, middleware, service wiring, database behavior, and integration tests before treating any endpoint as production-ready.

⸻

MedOrbits — Study · Work · Grow

Structured API routing for education, admissions, careers, recruitment, payments, and platform operations.