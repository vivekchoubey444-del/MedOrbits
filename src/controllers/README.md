MedOrbits — Controllers

Directory: src/controllers/

1. Overview

Controllers translate HTTP requests into application or repository operations and standardized JSON responses.

They coordinate request validation, authenticated identity, authorization-aware operations, business logic invocation, and response formatting. Controllers must remain separate from route registration, infrastructure configuration, and database implementation details.

This document defines the controller architecture and implementation requirements. The suggested inventory does not confirm that every controller, service, repository, validator, or route exists.

2. Responsibilities

Controllers should:

1. Receive requests from explicitly registered routes.
2. Validate and normalize request data using dedicated validators.
3. Obtain authenticated identity from trusted authentication middleware.
4. Enforce authorization and resource ownership before sensitive operations.
5. Invoke application services or repositories for permitted operations.
6. Return consistent JSON responses with appropriate HTTP status codes.
7. Pass unexpected errors to centralized error-handling middleware.
8. Exclude sensitive fields from responses.
9. Fail safely when required functionality is not configured.
10. Avoid embedding database queries, infrastructure configuration, or provider-specific implementation details.

3. Suggested Directory Structure

Adapt this inventory to the controller files that actually exist in the repository.

src/controllers/
├── README.md
├── auth.controller.js
├── user.controller.js
├── application.controller.js
├── request.controller.js
├── document.controller.js
├── course.controller.js
├── college.controller.js
├── university.controller.js
├── job.controller.js
├── employer.controller.js
├── candidate.controller.js
├── subscription.controller.js
├── payment.controller.js
├── notification.controller.js
├── session.controller.js
├── counselling.controller.js
├── recruitment.controller.js
├── service.controller.js
├── search.controller.js
├── upload.controller.js
├── faq.controller.js
├── password.controller.js
├── verification.controller.js
└── admin.controller.js

The inventory is illustrative. Do not create placeholder files merely to match this list unless the application requires them.

4. Request Controller

File: src/controllers/request.controller.js

Purpose

The request controller provides the HTTP boundary for request-submission workflows, including potential consultancy, admissions-guidance, and counselling enquiries.

Its proposed responsibilities include:

* Creating a new request after validation and authorization.
* Listing requests accessible to the authenticated caller.
* Retrieving an individual request after ownership verification.
* Updating explicitly permitted fields or statuses.
* Deleting or withdrawing a request when business rules permit.

These capabilities must be implemented through the application’s actual services, repositories, validators, and routes. Their presence in this document does not establish that the underlying functionality exists.

Exported handlers

The initial controller exposes the following methods:

Method	Intended operation
createRequest	Submit a new request
listRequests	List authorized requests
getRequestById	Retrieve a specific request
updateRequest	Update permitted request fields
deleteRequest	Delete or withdraw a request when permitted

Initial implementation status

The initial request.controller.js implementation is deliberately disabled.

All five handlers return HTTP 501 Not Implemented using the configured API response helper. They do not create records, retrieve private data, modify request statuses, or claim successful processing.

This is a fail-closed starting point, not a completed request-management workflow.

Dependencies to verify

Before enabling any operation, verify the actual project implementations and interfaces for:

* src/utils/async-handler.js
* src/utils/api-response.js
* The request validator.
* The request application service.
* The request repository or persistence layer.
* src/routes/request.routes.js, if implemented.
* Authentication and authorization middleware.
* Automated controller and route tests.

The initial controller assumes that the asynchronous handler exports a compatible wrapper and that the response utility supports the signature:

apiResponse.sendError(
  res,
  501,
  ‘REQUEST_SERVICE_NOT_CONFIGURED’,
  ‘Request submission is not available yet. Please try again later.’
);

Confirm that this matches the actual response helper. Adapt the controller if the repository uses a different contract.

Request security requirements

Before enabling request processing:

1. Validate request bodies using dedicated validators.
2. Define an explicit allowlist of accepted fields.
3. Derive the caller’s identity from trusted authentication middleware.
4. Prevent clients from assigning arbitrary owners, roles, internal identifiers, or privileged statuses.
5. Enforce ownership or documented administrative permissions for reads, updates, and deletions.
6. Apply valid state-transition rules in the application service or data layer.
7. Exclude internal metadata and sensitive information from API responses.
8. Add persistence, duplicate-submission handling, and transactional protections where required.
9. Ensure unexpected errors reach centralized error middleware.
10. Add automated tests before declaring the workflow production-ready.

Public enquiry submission, if supported, must have an explicit public-access policy and appropriate abuse-prevention controls. Protected request-management operations must require the applicable authentication and authorization checks.

Fail-closed behavior

Request creation and management must remain disabled until their backing services and persistence have been implemented and verified.

Do not fabricate request IDs, return success without persistence, expose unverified records, or silently accept operations that have not been implemented.

Use HTTP 501 Not Implemented for genuinely unimplemented functionality. Use appropriate status codes for other conditions, such as validation failures, missing resources, or insufficient permissions.

5. Route Integration

Controllers are not automatically mounted by server.js. Route modules in src/routes/ must explicitly import controller functions and register their HTTP methods and paths.

Illustrative example:

‘use strict’;
const express = require(‘express’);
const router = express.Router();
const { requireAuth } = require(‘../middleware/auth.middleware’);
const requestController = require(‘../controllers/request.controller’);
router.post(
  ‘/‘,
  requireAuth,
  requestController.createRequest
);
router.get(
  ‘/‘,
  requireAuth,
  requestController.listRequests
);
router.get(
  ‘/:id’,
  requireAuth,
  requestController.getRequestById
);
router.patch(
  ‘/:id’,
  requireAuth,
  requestController.updateRequest
);
router.delete(
  ‘/:id’,
  requireAuth,
  requestController.deleteRequest
);
module.exports = router;

This route example is illustrative, not a claim that the middleware or route module exists. Do not register these endpoints until their authentication policy, validators, service implementations, and response contracts have been verified.

Before mounting a route, verify that:

* The controller exists and exports the referenced function.
* Authentication middleware is applied to protected routes.
* Role-based authorization is applied where required.
* Parameters, query strings, and request bodies are validated.
* Private resources are checked for ownership or authorized administrative access.
* Middleware executes in the correct order.
* Errors are handled by the application’s established error-handling mechanism.

Do not expose a controller method through a route merely because that method exists.

6. Authentication and Authorization

Authentication identifies the caller. Authorization determines which resources and operations that caller may access.

Every protected operation must enforce both requirements as applicable.

Resource ownership

* Users: Restrict account access and modification to permitted fields and authorized identities.
* Applications: Applicants may access their own applications unless a documented role grants broader access.
* Requests: Restrict request access and modification to the owner or explicitly authorized administrative staff.
* Documents: Verify ownership, purpose, and permission before metadata access, upload, or download.
* Candidates: Restrict profile and application information to authorized users and organizations.
* Employers: Enforce organization membership, ownership, and role permissions.
* Subscriptions: Restrict subscription and billing information to the subscriber or authorized staff.
* Payments: Restrict transaction details to authorized identities and trusted internal workflows.
* Sessions: Allow users to manage only their permitted sessions.
* Recruitment and jobs: Enforce employer ownership and authorized publishing permissions.

Do not trust a client-provided user ID, role, ownership field, or resource ID as proof of authorization. Derive identity from trusted authentication middleware and verify permissions against authoritative records.

7. Validation and Data Integrity

Controllers should invoke dedicated validators before passing untrusted input to application services or repositories.

Validation should address:

* Required fields and data types.
* String length and format constraints.
* Positive integer identifiers where applicable.
* Supported enum values and status transitions.
* URL and country-code formats where relevant.
* Permitted update fields.
* Referential integrity and related-resource permissions.
* Pagination bounds and supported filters.
* Request ownership and authorized state transitions.

Do not accept unrestricted request bodies as database records. Use explicit field allowlists and distinguish create validation from update validation when their requirements differ.

Business rules, transactional integrity, duplicate handling, and complex workflows should be enforced in application services or the data layer rather than relying solely on controller validation.

8. Sensitive Response Data

Never expose the following in public API responses:

* Password hashes or authentication secrets.
* Session-token hashes and password-reset token hashes.
* Private document storage paths, storage keys, or signed access credentials.
* Payment credentials, webhook secrets, or unnecessary provider metadata.
* Internal exception messages, database errors, or stack traces.
* Private applicant information or request metadata not authorized for the caller.

Use explicit response serializers or field allowlists for sensitive entities. Avoid returning raw database records when they may contain internal or private fields.

Apply the same protections to logs, error responses, and administrative endpoints.

9. Unconfigured Endpoints and Fail-Closed Behavior

The following capabilities remain unconfigured until their backing storage, service, or provider integration has been implemented and verified:

* Identity and account verification.
* Password-reset workflows.
* Administrative overview.
* Request submission and request management.
* Counselling.
* Recruitment.
* Service catalogue.
* Search.
* Notifications.
* Uploads.
* Frequently asked questions.

Payment creation and webhook processing must also remain disabled until provider-specific integration, payment-state handling, and signature verification are implemented.

An unconfigured endpoint must not fabricate success, persist incomplete data, or imply that an operation has completed.

Return a consistent non-success response. HTTP 501 Not Implemented may be appropriate for a genuinely unsupported operation; use other status codes when they more accurately describe the condition.

A stub must not be considered production-ready simply because it returns a standardized error.

10. Payments and Webhooks

Payment operations require stricter controls than ordinary CRUD endpoints.

* Do not trust client-supplied payment status, amount, transaction identity, or provider confirmation.
* Calculate payable amounts using trusted server-side records.
* Verify provider signatures against the exact raw request body.
* Validate the event, merchant or account identity, and expected transaction state.
* Process events idempotently to prevent duplicate handling.
* Protect state transitions against replay, race conditions, and inconsistent updates.
* Keep webhook secrets outside source control.
* Do not acknowledge successful processing before required verification and processing have succeeded.

Payment creation and webhook processing must fail closed until these controls are implemented.

11. Error Handling and Response Format

Use the response contract already established by the application. If no contract exists, define one and apply it consistently across controllers.

Illustrative success response:

{
  “success”: true,
  “data”: {
    “id”: “resource-id”
  }
}

Illustrative error response:

{
  “success”: false,
  “error”: {
    “code”: “RESOURCE_NOT_FOUND”,
    “message”: “The requested resource was not found.”
  }
}

These examples are illustrative and must be adapted to the actual API contract.

Controllers should:

* Use appropriate HTTP status codes.
* Return safe, actionable error messages.
* Preserve known application error codes.
* Delegate unexpected exceptions to centralized error middleware.
* Avoid returning stack traces or implementation details to clients.

Do not introduce a new response format in an individual controller without reviewing compatibility with the existing API.

12. Testing Requirements

Add automated tests for applicable controller behavior.

Functional tests

* Successful requests when the underlying service is implemented.
* Invalid parameters and request bodies.
* Missing resources.
* Unsupported operations.
* Repository or service failures.
* Correct response structure and HTTP status codes.
* Request creation without false success.
* Request updates with permitted and prohibited fields.

Security tests

* Missing or invalid authentication.
* Insufficient permissions.
* Unauthorized resource ownership.
* Attempts to modify protected fields.
* Sensitive-field exclusion.
* Cross-user access to documents, applications, requests, subscriptions, and payments.
* Attempts to bypass permitted request-state transitions.

Integration tests

* Route registration and exported controller methods.
* Middleware ordering.
* Centralized error handling.
* Unconfigured endpoint behavior.
* Payment signature failures and duplicate-event handling when webhook integration is implemented.

Tests should verify both the HTTP response and whether underlying services or repositories were called with the correct authorized inputs.

13. Production-Readiness Checklist

Before treating a controller as production-ready:

* [ ]	The controller file exists and exports the methods used by its routes.
* [ ]	Route modules explicitly register the controller.
* [ ]	Authentication and authorization are enforced where required.
* [ ]	Request validation is implemented.
* [ ]	Resource ownership is checked against authoritative records.
* [ ]	Sensitive fields are excluded from responses.
* [ ]	Errors follow the established API response contract.
* [ ]	Unconfigured operations fail safely.
* [ ]	Repository and service interfaces match the controller.
* [ ]	Automated tests cover success, failure, and access-control scenarios.
* [ ]	API documentation reflects implemented behavior.
* [ ]	Logging does not expose credentials, tokens, or private data.
* [ ]	Request creation does not report success before persistence succeeds.
* [ ]	Request-management operations enforce ownership and permitted state transitions.

14. Maintenance Workflow

When adding or changing a controller:

1. Update the controller and relevant route module.
2. Implement or update required validators, services, and repositories.
3. Review authentication, authorization, ownership, and data-exposure risks.
4. Add or update automated tests.
5. Update API documentation.
6. Verify route mounting and middleware order.
7. Confirm that unimplemented capabilities remain clearly identified.
8. Run the project’s available linting, test, and validation commands.

Only document a command as available if it is defined in the project’s actual tooling configuration.

15. Architecture Principle

Controllers provide a clear boundary between HTTP requests and application operations. They should remain small, explicit, authorization-aware, and consistent with the project’s service, repository, validation, and error-handling contracts.

MedOrbits — Study · Work · Grow