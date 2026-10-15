# MedOrbits services layer

This directory contains dependency-injected service factories for the MedOrbits Express backend. The services deliberately do not import a specific database driver, email vendor, payment gateway, or object-storage SDK. Inject adapters from `src/repositories/` and provider wrappers from configuration so the business layer stays testable and provider-independent.

## Files

- `auth.service.js` — registration, login, token refresh and logout.
- `session.service.js` — session creation, validation and revocation.
- `verification.service.js` — email verification tokens and resend flow.
- `password.service.js` — password reset/change and session invalidation.
- `user.service.js` — user profile and administrative status operations.
- `course.service.js`, `college.service.js`, `university.service.js` — education catalog operations.
- `admission.service.js`, `application.service.js`, `counselling.service.js` — admissions workflow.
- `document.service.js`, `storage.service.js` — document review and private file storage.
- `job.service.js`, `internship.service.js`, `candidate.service.js`, `employer.service.js`, `recruitment.service.js` — career and recruitment workflows.
- `search.service.js` — bounded multi-source search.
- `notification.service.js`, `email.service.js` — notification/email delivery.
- `payment.service.js`, `subscription.service.js` — payment and recurring subscription orchestration.
- `analytics.service.js`, `audit.service.js` — analytics and security audit records.
- `service-utils.js` — shared validation, safe pagination, errors and audit helpers.

## Integration pattern

Each domain file exports a factory such as `createJobService({ jobRepository, auditService })`. Construct services once in your composition/bootstrap layer, then inject them into controllers. Do not instantiate database connections or providers inside a request handler.

```js
const { createJobService } = require('../services/job.service');
const jobService = createJobService({ jobRepository, auditService });

// In a controller:
const jobs = await jobService.list(req.query);
```

Repository adapters should expose the methods used by their service. Standard CRUD services expect `list({ page, limit, offset, filters, sortBy, sortOrder })` (or `findMany`), `findById(id)`, `create(data)`, `updateById(id, data)`, and `deleteById(id)` (or equivalent aliases supported by `service-utils.js`). Specialized services document their additional adapter methods in their implementation.

## Production requirements before enabling real users/payments

1. Implement and test concrete repository adapters and database transactions/unique constraints.
2. Use a maintained password hashing implementation (Argon2id or bcrypt) behind `passwordHasher.hash()` and `.verify()`; never store plaintext passwords.
3. Implement short-lived access tokens and rotating, revocable refresh tokens in `tokenService`; store only hashes of refresh tokens.
4. Add login throttling, credential-stuffing protection, MFA where appropriate, email verification and account recovery policies.
5. Apply authorization in middleware/controllers for every record operation. Service-level ownership checks are not a substitute for route-level authorization.
6. Use provider-specific signature verification over the exact raw webhook body, webhook idempotency storage, and database transactions for payment state transitions. Never trust a browser redirect as proof of payment.
7. Use private object storage, random object keys, malware scanning, MIME sniffing, file-content validation, size limits and short-lived signed URLs. Do not trust a client-supplied MIME type alone.
8. Keep secrets in environment/secret-manager configuration. Do not log credentials, tokens, document contents, or payment data.
9. Add schema validation at the API boundary, integration tests, migrations, observability and a real readiness check for required dependencies.
10. Review status transitions, retention/deletion policies, privacy notices and applicable Indian data-protection/payment requirements before launch.

## Important integration notes

- `server.js` currently mounts route modules, but it does not automatically construct or inject these services. Add a composition module (for example `src/container.js`) and wire the resulting service instances into controllers.
- The existing server's `express.json({ verify })` preserves `req.rawBody` for the payment webhook route. The payment controller must pass `req.rawBody`, the provider signature header and headers to `paymentService.handleWebhook()`.
- `ready` in the supplied server is currently an HTTP-process check, not a database readiness check.
- Never expose admin/status-changing service methods without strong authorization and audit controls.
- These files are a backend service foundation, not a claim that the entire backend is production-certified. Complete adapters, provider configuration and tests are still required.
