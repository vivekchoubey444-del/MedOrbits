MedOrbits System Architecture Overview

Project: MedOrbits
Architecture type: Layered web application
Backend: Node.js and Express-style application, where implemented
Database: MySQL
Status: Logical architecture reference; verify actual implementation before production use.

1. Purpose

MedOrbits is designed as an education and career services platform supporting public information pages, authenticated user workflows, educational applications, career services, employer features, administrative tools, and backend APIs.

The architecture separates presentation, HTTP handling, business logic, persistence, external integrations, and operational responsibilities. This separation is intended to improve maintainability, security, testability, and future extensibility.

This document describes the intended architecture based on the repository structure. It does not establish that every module, integration, or operational capability is implemented or active.

2. Logical Architecture

<CodeBlock language=“mermaid” model_previewable>
flowchart TD
    U[Visitors and Users]
    E[Employers]
    A[Administrators]
subgraph Presentation[“1. Presentation Layer”]
    P[Public Pages]
    AC[Account Pages]
    ED[Education and Career Pages]
    AD[Admin Interface]
    AS[Shared Assets]
end
subgraph HTTP[“2. HTTP Application Layer”]
    MW[Security and Request Middleware]
    RT[Routes and Controllers]
end
subgraph Business[“3. Business Services Layer”]
    US[Users and Authentication]
    ES[Education and Applications]
    CS[Career and Employer Services]
    DS[Documents and Notifications]
    PS[Payments and Subscriptions]
end
subgraph Persistence[“4. Persistence Layer”]
    DB[(MySQL Database)]
    MIG[SQL Migrations and Seeds]
    ST[Private File Storage]
end
subgraph Integrations[“5. External Integrations”]
    EM[Email Provider]
    AI[AI Provider]
    PG[Payment Provider]
end
subgraph Operations[“6. Operations Layer”]
    WK[Background Workers and Jobs]
    MON[Monitoring and Logs]
    CI[Deployment and CI]
    BK[Backups and Recovery]
end
U —> Presentation
E —> Presentation
A —> Presentation
Presentation —> MW
MW —> RT
RT —> Business
Business —> DB
MIG —> DB
DS —> ST
Business —> EM
Business —> AI
PS <—> PG
Business —> WK
WK —> DB
HTTP —> MON
Business —> MON
CI —> HTTP
BK —> DB
</CodeBlock>

Conceptual diagram only. Arrows represent intended relationships, not verified runtime connections or deployment topology.

3. Architectural Layers

3.1 Presentation Layer

Responsibility: Provide user interfaces and browser-side interaction.

Expected areas include:

* Public informational pages.
* Account and authentication pages.
* Education and admissions pages.
* Job, internship, and employer pages.
* Administrative interfaces.
* Legal and policy pages.
* Shared CSS, browser JavaScript, images, icons, and public data.

Design requirements:

* Keep presentation logic separate from sensitive business rules.
* Use documented API contracts for backend communication.
* Provide accessible forms, validation feedback, and loading, empty, and error states.
* Avoid embedding secrets or trusting browser-submitted authorization decisions.
* Ensure private documents and sensitive data are not exposed through static hosting.

3.2 HTTP Application Layer

Responsibility: Receive requests, apply cross-cutting middleware, route operations, and return responses.

The intended stack uses Node.js with an Express-style application where implemented.

Expected responsibilities include:

* Request parsing and validation.
* Security headers and rate limiting.
* Request identification and safe logging.
* Authentication and authorization middleware.
* Route definitions and controllers.
* Consistent response and error handling.

Controllers should coordinate requests and delegate business operations to services rather than accumulating unrelated business logic.

Actual middleware ordering, mounted routes, and controller responsibilities must be confirmed against the running server.

3.3 Business Services Layer

Responsibility: Implement application rules and coordinate domain operations.

Expected service areas include:

Domain	Responsibility
Users and authentication	Account lifecycle, sign-in, verification, and session management.
Education	Course, college, university, and admission-related operations.
Applications	Application creation, validation, review, and status transitions.
Careers	Jobs, internships, employer workflows, and career support.
Documents	Upload metadata, review status, access control, and retention.
Notifications	Notification preferences, delivery requests, and status tracking.
Payments	Payment initiation, provider verification, and transaction status.
Subscriptions	Plan assignment, subscription lifecycle, and billing-related state.
Administration	Authorized management operations and privileged changes.

These are logical domains. They may map to separate services or to modules within a single application.

Business rules should be enforced by trusted backend code and not duplicated as the sole enforcement mechanism in browser JavaScript.

3.4 Persistence Layer

Responsibility: Store and retrieve durable application data.

The intended database is MySQL, supported by version-controlled SQL resources under database/.

Expected responsibilities include:

* Database schema management.
* Versioned schema migrations.
* Transaction management.
* Data access and query execution.
* Seed data and isolated test fixtures.
* Integrity constraints and appropriate indexes.

Design requirements:

* Use parameterized queries or an appropriate query abstraction.
* Enforce referential integrity where appropriate.
* Use transactions for related changes that must succeed or fail together.
* Avoid logging credentials or unnecessary sensitive database values.
* Keep migration history consistent with the documented schema.
* Back up data and test recovery procedures.

Private files should be stored using a suitable private-storage mechanism rather than treating MySQL as a file-storage service by default. The actual file-storage provider remains implementation-dependent.

3.5 Integration Layer

Responsibility: Connect MedOrbits to external systems.

Potential integrations include:

* Email and verification-message delivery.
* AI-assisted features.
* Payment-provider checkout and webhook processing.
* File-storage services.
* Other external services required by the application.

Integration requirements:

* Store credentials in environment configuration or an appropriate secret manager.
* Validate external responses and provider events.
* Apply timeouts and bounded retries.
* Use idempotency controls for operations that may be repeated.
* Handle provider outages and partial failures.
* Never treat browser redirects as authoritative proof of payment.
* Keep provider-specific behavior behind clear integration boundaries.

An integration must be considered active only after its configuration, implementation, and operational behavior have been verified.

3.6 Operations Layer

Responsibility: Support deployment, reliability, maintenance, and observability.

Expected operational capabilities include:

* Automated validation and testing.
* Deployment workflows.
* Background workers and scheduled jobs.
* Logging and monitoring.
* Database backups and recovery.
* Configuration and secret management.
* Incident response and operational troubleshooting.

The actual queue system, scheduler, hosting platform, monitoring tools, and deployment workflow must be identified from the repository and environment configuration.

4. Core Request Lifecycle

A typical HTTP request follows this logical sequence:

1. A browser requests a public page or API resource.
2. The server applies configured request-processing middleware.
3. Authentication identifies the user when required.
4. Validation checks the request parameters and payload.
5. Authorization verifies the requested action and resource ownership.
6. A controller invokes the relevant business service.
7. The service applies business rules and interacts with persistence or integrations.
8. Required state changes are committed, with appropriate transaction handling.
9. The server returns the documented response.
10. Relevant operational logs and audit events are recorded safely.

The exact order and module boundaries must be verified against the implemented application.

5. Security Architecture

Security controls apply across all layers.

Identity and access

* Authenticate protected operations on the server.
* Enforce authorization for every private resource and sensitive action.
* Apply least-privilege permissions.
* Validate session state and expiration.
* Protect cookie-based sessions using appropriate cookie attributes.
* Apply CSRF protection where relevant.

Input and data protection

* Validate and normalize untrusted input.
* Use parameterized database queries.
* Avoid exposing internal errors and sensitive identifiers unnecessarily.
* Apply file validation and private-download authorization.
* Keep secrets out of client-side source and version control.
* Limit access to administrative functions and audit records.

Payments and asynchronous work

* Verify provider signatures and transaction details.
* Apply idempotency to payment events and retryable jobs.
* Validate permitted state transitions.
* Record security-relevant outcomes.
* Provide safe recovery procedures for partially completed operations.

6. Data Flow and Consistency

Database operations

Use database transactions where related changes must be atomic. Do not assume that a database transaction can roll back an external email, payment, or file-storage operation.

Where reliable asynchronous dispatch is necessary, consider a transactional outbox or another durable dispatch mechanism.

Document handling

Private documents should be stored outside publicly browsable directories. Access must be checked server-side, and storage metadata must remain consistent with the actual files.

Payment processing

Payment state must be derived from trusted server-side records after appropriate provider verification. Duplicate events and retries must not apply the same financial change more than once.

Background processing

Workers should validate jobs, execute idempotent operations where necessary, retry transient failures according to policy, and provide a documented process for exhausted jobs.

7. API Contract and Documentation

The intended API contract is documented in:

docs/api/openapi.yaml

Keep the specification aligned with:

* Mounted backend routes.
* Request and response schemas.
* Authentication and authorization requirements.
* Status codes and error formats.
* Pagination and validation rules.
* Payment-provider integration behavior.

Validate the OpenAPI document in CI using the project’s selected validator. Structural validation does not prove that an endpoint exists or behaves as documented; integration tests and implementation review are also required.

8. Testing Strategy

The architecture should support testing at multiple levels:

* Unit tests: Business rules and individual module behavior.
* Integration tests: Database access, services, and external-integration boundaries.
* API tests: Authentication, authorization, validation, and response contracts.
* Database tests: Migrations, constraints, transactions, and data integrity.
* Security tests: Ownership enforcement, privilege escalation, session handling, and sensitive-data exposure.
* End-to-end tests: Important user journeys across frontend and backend.
* Accessibility tests: Keyboard operation, labels, focus behavior, and responsive usability.

Use synthetic test data and isolated test resources. Do not run destructive test procedures against production systems.

9. Design Principles

1. Separation of concerns: Keep presentation, HTTP handling, business logic, persistence, and integrations distinct.
2. Server-side authority: Enforce business rules and permissions on trusted backend components.
3. Least privilege: Give users and services only the permissions they require.
4. Data integrity: Use transactions, constraints, and idempotency where appropriate.
5. Privacy by design: Minimize sensitive data exposure and define retention policies.
6. Operational resilience: Handle timeouts, retries, outages, and partial failures deliberately.
7. Documentation accuracy: Distinguish proposed components from verified implementation.
8. Testability: Make important business rules and integration boundaries testable.
9. Maintainability: Prefer clear module responsibilities and consistent interfaces.

10. Implementation Verification Checklist

* [ ]	Confirm the actual Node.js and HTTP framework configuration.
* [ ]	Verify the mounted routes and middleware order.
* [ ]	Confirm the MySQL configuration and migration workflow.
* [ ]	Identify the implemented domain services and data-access patterns.
* [ ]	Verify private file-storage and download controls.
* [ ]	Confirm active email, AI, and payment integrations.
* [ ]	Verify background worker and scheduled-job execution.
* [ ]	Confirm logging, monitoring, backup, and recovery procedures.
* [ ]	Validate API documentation against mounted routes.
* [ ]	Run relevant automated and security tests.
* [ ]	Update this document when the architecture changes.

Important Notes

This is a logical architecture based on the intended MedOrbits repository structure. It does not confirm that every described component exists, is connected, or is production-ready.

The deployed code, runtime configuration, database schema, and external-service configuration are the sources of truth for implementation status.

Maintenance principle: Keep MedOrbits modular, secure, testable, and operationally reliable while ensuring architecture documentation reflects the actual system.