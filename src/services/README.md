MedOrbits Services Layer

Directory: src/services/

Purpose: Provide dependency-injected business services for the MedOrbits Express backend.

1. Overview

The services layer implements business rules and coordinates application workflows. It sits between HTTP controllers and persistence or external integrations.

Services receive repositories, provider wrappers, and other services through dependency injection. They should not create database connections, instantiate provider SDKs inside request handlers, or depend directly on Express request and response objects.

This design improves testability, modularity, maintainability, and provider independence.

Implementation note: The presence of a service module does not establish that its repository adapters, integrations, security controls, or production workflows are complete.

2. Directory structure

src/services/
├── README.md
├── auth.service.js
├── session.service.js
├── verification.service.js
├── password.service.js
├── user.service.js
├── course.service.js
├── college.service.js
├── university.service.js
├── admission.service.js
├── application.service.js
├── counselling.service.js
├── document.service.js
├── storage.service.js
├── job.service.js
├── internship.service.js
├── candidate.service.js
├── employer.service.js
├── recruitment.service.js
├── search.service.js
├── notification.service.js
├── email.service.js
├── payment.service.js
├── subscription.service.js
├── analytics.service.js
├── audit.service.js
└── service-utils.js

Keep the directory tree synchronized with the actual repository.

3. Service responsibilities

Service	Responsibility
auth.service.js	Registration, login, token refresh, and logout orchestration.
session.service.js	Session creation, validation, and revocation.
verification.service.js	Email verification tokens and resend workflows.
password.service.js	Password reset/change and session invalidation.
user.service.js	User profile and administrative status operations.
course.service.js	Course catalog operations.
college.service.js	College catalog operations.
university.service.js	University catalog operations.
admission.service.js	Admissions workflow coordination.
application.service.js	Application submission and status workflows.
counselling.service.js	Counselling records and workflow coordination.
document.service.js	Document metadata, review, and access workflow coordination.
storage.service.js	Private file storage operations through injected adapters.
job.service.js	Job listing and related business operations.
internship.service.js	Internship listing and workflow operations.
candidate.service.js	Candidate profile and employment workflow operations.
employer.service.js	Employer profile and employer-service operations.
recruitment.service.js	Recruitment workflow coordination.
search.service.js	Bounded multi-source search.
notification.service.js	Notification orchestration and delivery-state management.
email.service.js	Email composition and delivery orchestration.
payment.service.js	Payment operations, webhook handling, and payment-state transitions.
subscription.service.js	Subscription lifecycle and recurring-payment orchestration.
analytics.service.js	Analytics aggregation and reporting.
audit.service.js	Security and business audit records.
service-utils.js	Shared validation, pagination, errors, and audit helpers.

The table describes intended responsibilities. Verify the actual exported functions and repository contracts in each module.

4. Dependency injection

Domain services should export factories that accept their dependencies explicitly.

Example:

const { createJobService } = require(‘../services/job.service’);
const jobService = createJobService({
  jobRepository,
  auditService
});
const jobs = await jobService.list({
  page: 1,
  limit: 20
});

Construct services in a composition or bootstrap layer, then inject them into controllers, jobs, and workers as required.

Dependency injection rules

* Pass repositories and integrations through factory arguments.
* Avoid importing concrete database drivers into business services.
* Avoid creating provider clients inside individual request handlers.
* Inject other services only where the dependency is justified.
* Validate required dependencies when constructing the service.
* Keep dependencies explicit and straightforward to mock.
* Avoid circular dependencies between services.

A service should not require an Express req or res object to execute its business operations.

5. Repository contracts

Standard CRUD services may use repository methods such as:

list({
  page,
  limit,
  offset,
  filters,
  sortBy,
  sortOrder
});
findById(id);
create(data);
updateById(id, data);
deleteById(id);

Some services may use findMany or specialized methods instead. Follow the actual repository adapter and service-utils.js contracts.

Repository requirements

* Use parameterized database queries.
* Enforce appropriate database constraints.
* Define pagination and sorting behavior explicitly.
* Allowlist sortable fields rather than passing arbitrary client input into SQL.
* Apply transactions for operations requiring atomic state changes.
* Keep persistence concerns out of controllers.
* Document specialized repository methods used by each service.

A service must not assume that every repository supports the same CRUD interface unless the shared contract explicitly guarantees it.

6. Business logic and error handling

Services own domain rules and coordinate workflows.

They should:

* Validate business invariants.
* Enforce allowed state transitions.
* Coordinate repository and integration calls.
* Use transactions or consistency controls where necessary.
* Return documented results or throw predictable application errors.
* Avoid returning database internals or provider credentials.
* Distinguish permanent business errors from transient infrastructure failures.

Controllers remain responsible for translating service outcomes and errors into the API’s HTTP response format.

7. Authentication and account security

The authentication-related services require particular care.

Password handling

* Use a maintained password-hashing implementation such as Argon2id or bcrypt.
* Inject a passwordHasher interface with hash() and verify() operations.
* Never store plaintext passwords.
* Apply documented password and account-recovery policies.
* Avoid exposing account existence through inconsistent responses.

Token and session management

* Use short-lived access tokens where applicable.
* Use rotating, revocable refresh tokens.
* Store only refresh-token hashes when refresh tokens are persisted.
* Detect token reuse where the chosen design supports it.
* Revoke relevant sessions after password changes or account-security events.
* Validate token expiry, issuer, audience, and signing configuration as appropriate.

Abuse prevention

Use appropriate login throttling, credential-stuffing protections, email verification, account recovery safeguards, and multifactor authentication where required by the application’s risk profile.

Middleware and route-level authorization must remain in place; a service method’s existence does not grant callers permission to invoke it.

8. Education, admissions, and application workflows

Education and admissions services should coordinate validated catalog data, eligibility rules, application states, and supporting records.

Recommended controls:

* Validate identifiers and allowed status transitions.
* Distinguish user-submitted information from verified institutional information.
* Apply ownership and role-based access restrictions.
* Use transactions where related records must change together.
* Preserve appropriate audit history.
* Prevent duplicate submissions where the business rules require uniqueness.

Do not treat an application summary or counselling document as official institutional confirmation unless the relevant verification and issuance workflow supports that status.

9. Documents and storage

Document-related services should coordinate metadata, storage operations, access checks, and lifecycle policies.

Required safeguards include:

* Private storage and unpredictable object keys.
* File-size limits and content validation.
* MIME sniffing and malware scanning where appropriate.
* Authorization before document retrieval or modification.
* Short-lived signed URLs where supported.
* Retention and deletion policies.
* Audit records for sensitive document operations.

Do not trust a client-supplied filename or MIME type as proof of file content.

Keep storage SDKs and provider-specific operations inside src/integrations/storage/ or the relevant adapter boundary.

10. Careers and recruitment

Career-related services may coordinate job listings, internships, candidate profiles, employers, and recruitment workflows.

Apply:

* Input validation and explicit update-field allowlists.
* Resource ownership and role-based authorization.
* Approved status transitions.
* Pagination and bounded search results.
* Appropriate privacy controls for candidate data and resumes.
* Audit records for privileged or consequential changes.

Search results and recruitment records should not expose confidential candidate information to unauthorized users.

11. Notifications and email

Notification and email services should coordinate message preparation, delivery, and state tracking without embedding provider-specific SDK calls in business workflows.

Recommended controls:

* Validate recipients and template variables.
* Render templates with safe escaping.
* Validate link destinations against an approved allowlist.
* Avoid placing sensitive data in email subjects and previews.
* Use idempotency and durable delivery records where appropriate.
* Retry transient failures with bounded backoff.
* Keep delivery status distinct from enqueueing status.
* Avoid logging complete messages or sensitive payloads.

Background delivery should use the established src/jobs/ and src/workers/ architecture where appropriate.

12. Payments and subscriptions

Payment and subscription services require durable state management and careful verification.

Payment processing

* Verify webhook signatures over the exact raw request body where required.
* Validate provider event types and identifiers.
* Persist webhook event identifiers to support duplicate-event detection.
* Apply database transactions and appropriate uniqueness constraints.
* Reconcile provider state with persisted payment records.
* Never treat a browser redirect as proof of payment.
* Keep provider secrets in environment or secret-manager configuration.

Subscription workflows

* Define allowed subscription-state transitions.
* Handle renewals, failures, cancellations, and expiry explicitly.
* Make repeated webhook and worker execution safe.
* Use authoritative provider events and persisted records.
* Document retry and reconciliation behavior.

Payment idempotency must be enforced across the relevant database and provider boundaries; a unique queue job ID alone is insufficient.

13. Analytics and auditing

Analytics and audit services have different purposes.

Analytics

* Produces approved aggregates and operational insights.
* Applies access restrictions to sensitive reporting.
* Avoids collecting unnecessary personal information.

Audit

* Records relevant security and business events.
* Preserves actor, action, target, timestamp, and outcome where appropriate.
* Avoids storing passwords, tokens, payment credentials, or complete document contents.
* Restricts access to audit records.
* Uses retention and integrity controls appropriate to the event type.

Do not treat ordinary application logs as a complete substitute for a durable audit trail.

14. Shared service utilities

service-utils.js may centralize reusable behavior such as:

* Input and dependency validation.
* Safe pagination and bounded limits.
* Standard application errors.
* Audit helpers.
* Common repository-method compatibility.

Keep utility functions small, predictable, and independently testable.

Avoid turning the utility module into a general container for domain-specific business rules. Security-sensitive operations should have explicit contracts and tests.

15. Composition and application bootstrap

Construct service instances in a dedicated composition layer, for example src/container.js, if that matches the repository’s established structure.

A composition layer should:

1. Load and validate configuration.
2. Initialize infrastructure adapters.
3. Construct repositories.
4. Construct integrations and provider wrappers.
5. Construct domain services.
6. Inject services into controllers, jobs, and workers.
7. Coordinate startup and graceful shutdown.

Do not instantiate the entire service graph inside an HTTP request handler.

Before implementation, confirm that each service factory’s required dependencies match the actual controller and repository interfaces.

16. Testing requirements

* [ ]	Required dependencies are validated.
* [ ]	Business rules are tested independently of Express.
* [ ]	Repository interactions use documented contracts.
* [ ]	Authorization is tested at the route and policy layers.
* [ ]	Database constraints and transactions are tested.
* [ ]	Authentication and token-revocation behavior is tested.
* [ ]	Payment webhooks are verified using raw-body test fixtures.
* [ ]	Duplicate payment events are handled safely.
* [ ]	File-access restrictions are tested.
* [ ]	Notification retries and idempotency are tested.
* [ ]	Audit records exclude secrets and unnecessary personal data.
* [ ]	Integration failures are propagated or handled according to documented policy.

Use mocks for unit tests and appropriate test databases or provider sandboxes for integration tests.

17. Production readiness

Before enabling real users or payments, verify:

* Concrete repository adapters and database constraints.
* Database migrations and transaction behavior.
* Password hashing, session management, and token rotation.
* Login abuse prevention and account-recovery controls.
* Route-level authentication and resource authorization.
* Payment webhook verification and event idempotency.
* Private storage, file validation, and retention policies.
* Notification retry and delivery-state handling.
* Audit records, monitoring, and alerting.
* Real dependency-aware readiness checks.
* Backup, recovery, and graceful-shutdown procedures.
* Applicable Indian data-protection, consumer, and payment requirements.

This checklist describes required verification, not a certification that these controls are already implemented.

18. Implementation status

This README documents the intended service architecture and integration contracts. Verify actual exports, dependency requirements, repository methods, route wiring, provider configuration, and tests before treating each workflow as implemented or production-ready.

⸻

MedOrbits — Study · Work · Grow

Dependency-injected business services for education, admissions, careers, recruitment, and platform operations.