MedOrbits Middleware

Directory: src/middleware/

1. Purpose

The middleware layer provides reusable request-processing, authentication, authorization, validation, security, and error-handling components for the MedOrbits Express backend.

Middleware is mounted explicitly in server.js, src/app.js, or individual route modules, depending on the existing application bootstrap.

These modules are security building blocks. Their presence does not prove that a route is protected or that a security control is correctly configured.

2. Middleware Modules

File	Responsibility
authenticate.js	Verifies bearer JWTs and establishes a trusted request identity.
authorize.js	Enforces role, permission, and supported ownership requirements.
validate.js	Validates request bodies, route parameters, query parameters, or complete requests.
rate-limit.js	Provides configurable rate-limit middleware factories.
csrf.js	Implements signed double-submit CSRF protection for applicable cookie-authenticated requests.
error-handler.js	Produces normalized JSON errors, safe production messages, and request IDs.
not-found.js	Handles unmatched routes with API-friendly 404 responses.
request-id.js	Validates or creates request correlation IDs.
request-logger.js	Produces structured request logs without secrets or query strings.
security-headers.js	Configures HTTP security headers using Helmet and conservative defaults.
upload-limits.js	Applies Multer upload limits and normalizes upload errors.
verify-webhook.js	Provides raw-body HMAC verification support where compatible with the provider’s specification.
maintenance.js	Restricts application access during maintenance while allowing configured health routes.

Actual exports, configuration options, and supported behavior must be verified against each implementation.

3. Required Packages

Install the packages used by the middleware modules you enable:

npm install jsonwebtoken express-rate-limit helmet cookie-parser multer

Additional packages may be needed for custom validation, CSRF signing, request logging, or other implementation choices. For example, install Zod only if the application actually uses Zod schemas.

For multi-instance deployments, configure a shared persistent rate-limit store, such as Redis, rather than relying on independent in-memory counters.

Keep dependencies compatible with the project’s supported Node.js version and review dependency advisories before deployment.

4. Authentication and Authorization

Authentication

authenticate.js is intended to verify bearer JWTs using jsonwebtoken and a trusted signing secret, normally process.env.JWT_SECRET.

Requirements:

* Reject missing, malformed, expired, or invalid tokens.
* Restrict accepted algorithms explicitly.
* Validate relevant issuer, audience, and token claims where configured.
* Attach a normalized, trusted identity to req.user.
* Never trust identity or role values copied from request headers or request bodies.
* Avoid logging bearer tokens or complete authentication headers.

If MedOrbits uses opaque sessions, verify session identifiers against the appropriate session store instead of treating them as JWTs.

Token verification does not automatically implement logout, account revocation, session invalidation, or role-change propagation. These require additional application controls.

Authorization

authorize.js provides route-level authorization helpers. The src/policies/ modules provide resource-specific decisions for applications, documents, candidates, employers, payments, and subscriptions.

Use both layers where appropriate:

* Middleware can enforce general role or permission requirements.
* Policy modules can evaluate access to a particular resource using trusted database records.

Do not rely on role checks alone when the operation requires resource ownership or state validation.

5. Request Validation

validate.js supports request validation through Zod-compatible schemas or custom validators, according to the implemented contract.

Validate relevant inputs before business operations, including:

* Request body fields.
* Route identifiers and parameters.
* Query filters, pagination, and sorting.
* Nested objects, arrays, dates, and numeric ranges.
* File metadata and upload-related parameters.

Use explicit field allowlists to prevent mass assignment. Validation does not replace authentication, authorization, or business-rule enforcement.

Do not pass unvalidated user input into SQL identifiers, shell commands, file paths, HTML templates, or arbitrary network destinations.

6. Rate Limiting

rate-limit.js provides configurable rate-limit factories.

Apply limits according to endpoint risk, including:

* Login and account registration.
* Password reset and verification flows.
* OTP or other verification challenges.
* Public search and enquiry endpoints.
* Document uploads and downloads where appropriate.
* Payment initiation and other abuse-sensitive operations.

Configure trusted proxy handling correctly before relying on client IP addresses. Use a shared store across application instances and define appropriate handling for store failures.

Rate limiting complements, but does not replace, authentication, abuse detection, account protections, or application-level quotas.

7. CSRF Protection

csrf.js is intended for cookie-authenticated state-changing requests using a signed double-submit cookie/token pattern.

Requirements:

* Parse cookies before the CSRF middleware.
* Use a strong secret supplied through secure configuration.
* Validate the submitted token against the expected cookie and signature.
* Apply protection to relevant state-changing methods.
* Configure cookie attributes, SameSite, Secure, and HttpOnly according to the token-delivery design.
* Validate origins where appropriate.

A double-submit design must be implemented correctly; simply checking that two client-provided token values match is not sufficient protection.

Bearer-token-only APIs generally do not require CSRF protection when credentials are not automatically attached by the browser. They still require authentication, authorization, and appropriate origin and CORS configuration.

8. Error Handling and Request IDs

Error handling

error-handler.js should provide consistent JSON error responses without exposing stack traces, SQL details, credentials, or internal implementation information in production.

Expected behavior includes:

* Appropriate HTTP status codes.
* Stable application error codes.
* Safe client-facing messages.
* Request correlation IDs.
* Detailed internal logging through approved logging infrastructure.
* Consistent handling of validation, authentication, authorization, upload, and database errors.

Do not expose sensitive details merely because an error originated in a trusted internal module.

Request IDs

request-id.js should validate incoming request IDs against a documented format and length limit or generate a new ID.

Treat client-provided IDs as untrusted correlation values. Do not use them as authentication credentials, authorization evidence, or trusted database identifiers.

Ensure the same resolved request ID is used consistently in request logs and error responses.

9. Request Logging and Security Headers

Request logging

request-logger.js should log useful operational metadata, such as:

* Request ID.
* HTTP method and route path.
* Response status.
* Duration.
* Relevant error classification.

Avoid logging query strings, request bodies, cookies, authorization headers, tokens, passwords, document contents, payment details, and raw webhook bodies.

Redact sensitive fields from structured logs and ensure any user-controlled values are safely encoded.

Security headers

security-headers.js should use Helmet with a configuration appropriate for the actual application.

Review Content Security Policy, cross-origin policies, framing restrictions, MIME-sniffing protection, and transport security settings against the deployment architecture. Avoid weakening security headers merely to make an integration work.

10. File Upload Limits

upload-limits.js uses Multer to limit uploads and normalize upload errors.

Multer memory storage can consume substantial process memory. Enforce file-size limits, file-count limits, request limits, and concurrency controls.

Before making a document available:

1. Validate the upload size and permitted file types.
2. Inspect actual file content rather than trusting the supplied MIME type or filename.
3. Perform malware scanning where required.
4. Generate a safe storage key.
5. Store private documents in approved private storage.
6. Apply authorization before download or access.
7. Define retention and deletion policies.

Do not treat an accepted multipart upload as a validated or safe document. Avoid serving uploads directly from a public directory.

11. Payment Webhook Verification

verify-webhook.js provides HMAC verification support only when its implementation matches the payment provider’s official requirements.

For each provider:

* Use the exact signature header and signing algorithm.
* Preserve the exact raw request bytes used in signature calculation.
* Follow the provider’s timestamp and replay-protection requirements.
* Compare signatures securely.
* Reject invalid or missing signatures.
* Apply event-level idempotency.
* Validate event types and relevant resource identifiers.
* Update payment state through trusted, transaction-safe service logic.

Register the provider-specific raw-body handling in the correct order, before any middleware that consumes or transforms the body.

A generic HMAC helper is not automatically compatible with every provider. Never process a payment event merely because it reaches a webhook route.

12. Maintenance Mode and Health Checks

maintenance.js should deny or restrict normal application traffic while allowing explicitly configured health routes where required.

Health endpoints should distinguish:

* Liveness: Whether the process is running and able to respond.
* Readiness: Whether the instance can safely accept application traffic, including required dependency checks.
* Maintenance status: Whether normal service is intentionally restricted.

Do not expose database credentials, internal infrastructure details, or sensitive dependency diagnostics through public health endpoints.

13. Recommended Middleware Order

A typical Express application may use the following order, adapted to the actual routes and dependencies:

1. Trust-proxy configuration, when required by the deployment.
2. Request ID middleware.
3. Request logging.
4. Security headers.
5. CORS configuration.
6. Cookie parsing, if cookie-based features are enabled.
7. General request parsers with appropriate size limits.
8. Maintenance and rate-limit middleware, as appropriate.
9. Authentication and authorization on protected routes.
10. Request validation.
11. Route handlers and services.
12. Not-found middleware.
13. Centralized error handler.

Webhook exception: Register the required raw-body capture and provider-specific verification path before general body parsing consumes the webhook payload. Keep webhook routing and middleware ordering explicit.

The exact order depends on whether a middleware must inspect raw bytes, parsed bodies, cookies, authenticated identity, or route-specific context.

14. Example Usage

The following illustrates the intended route-level pattern. Confirm the actual factory signatures and exported functions before using it.

const authenticate = require(‘./middleware/authenticate’);
const authorize = require(‘./middleware/authorize’);
const { validate } = require(‘./middleware/validate’);
router.get(‘/me’, authenticate(), (req, res) => {
  return res.json({
    success: true,
    data: req.user,
    requestId: req.id,
  });
});
router.post(
  ‘/admin-task’,
  authenticate(),
  authorize({ roles: [‘admin’] }),
  handler
);

Do not return the entire req.user object unless its contents are intentionally designed for public exposure. Prefer a response DTO containing only approved fields.

15. Production Readiness Checklist

* [ ]	Authentication verifies the configured token or session mechanism.
* [ ]	Authorization is enforced on every protected route.
* [ ]	Resource policies are applied to sensitive operations.
* [ ]	Request schemas and field allowlists are enforced.
* [ ]	Rate limits use appropriate shared storage in multi-instance deployments.
* [ ]	CSRF protection is configured correctly for cookie-authenticated requests.
* [ ]	Error responses do not disclose internal details.
* [ ]	Request IDs and logs avoid sensitive data.
* [ ]	Uploads are size-limited, validated, scanned where required, and stored privately.
* [ ]	Payment webhooks use provider-specific signature verification and replay protection.
* [ ]	Maintenance, liveness, and readiness behavior is clearly defined.
* [ ]	Middleware ordering is verified against the actual bootstrap.
* [ ]	Tests cover denied access, invalid input, rate limits, malformed uploads, and invalid webhook signatures.
* [ ]	Dependency configuration and secrets are managed securely.

Important: Middleware files are not a substitute for integration. Verify their exports, mount order, route coverage, configuration, and tests against the actual MedOrbits application before processing real user data or payments.