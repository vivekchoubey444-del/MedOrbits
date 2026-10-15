Source Code — MedOrbits

Directory: src/

Overview

The src/ directory contains the server-side application code for MedOrbits, including configuration, HTTP controllers, integrations, background jobs, middleware, data models, authorization policies, repositories, routes, business services, templates, utilities, validation, and workers.

The structure separates application responsibilities to improve maintainability, testability, security, and scalability.

Implementation note: Directory and file names describe the repository’s organization. They do not independently establish that a feature, endpoint, integration, or workflow is implemented.

Directory Structure

src/
├── README.md
├── app.js
├── config/
├── controllers/
├── integrations/
│   ├── email/
│   ├── ai/
│   ├── storage/
│   └── payment/
├── jobs/
├── middleware/
├── models/
├── policies/
├── repositories/
├── routes/
├── services/
├── templates/
│   ├── email/
│   └── documents/
├── utils/
├── validators/
└── workers/

Module Responsibilities

Directory or file	Responsibility
app.js	Configures the Express application, middleware, routes, and error handling.
config/	Centralizes environment, database, CORS, security, logging, and application settings.
controllers/	Handles HTTP requests and responses and delegates business logic to services.
integrations/	Encapsulates external providers, including email, AI, storage, and payments.
jobs/	Defines scheduled or queued tasks such as reminders, notifications, and cleanup.
middleware/	Implements request processing, authentication, authorization, rate limiting, and error handling.
models/	Represents domain entities and database records.
policies/	Enforces resource-level authorization and access rules.
repositories/	Encapsulates database queries and persistence operations.
routes/	Defines API endpoints and connects middleware to controllers.
services/	Implements business rules and coordinates application workflows.
templates/	Stores reusable email and document templates.
utils/	Provides shared helpers for formatting, HTTP responses, cryptography, and other common tasks.
validators/	Validates request payloads, query parameters, and domain data.
workers/	Processes background tasks and queued jobs.

Application Architecture

The typical request flow is:

1. Routes: Match the HTTP method and URL.
2. Middleware: Apply authentication, authorization, rate limiting, and other request checks.
3. Validators: Validate untrusted input.
4. Controllers: Coordinate the request and response.
5. Services: Execute business rules and application workflows.
6. Repositories and models: Read and persist data.
7. Integrations: Communicate with external providers when needed.
8. Response handling: Return the appropriate result or pass errors to centralized error handling.

Not every request uses every layer. Simple health checks, for example, may not require database access.

MedOrbits Functional Areas

The source code supports the planned organization of these platform domains:

* Education: Courses, colleges, universities, admissions, eligibility, and study-abroad guidance.
* Applications: Application submissions, status tracking, and document workflows.
* Careers: Jobs, internships, candidate profiles, and employer services.
* Recruitment: Employer workflows, applicant management, and recruitment coordination.
* Accounts: Authentication, verification, profiles, and permissions.
* Payments: Payment processing, webhook verification, receipts, and subscriptions.
* Notifications: Email notifications, reminders, and background processing.
* Administration: Privileged workflows for managing platform records and operations.

Actual functionality depends on the implemented routes, services, data models, configuration, and external integrations.

Coding Conventions

Separation of concerns

* Keep HTTP-specific logic in controllers.
* Keep business rules in services.
* Keep database operations in repositories.
* Keep provider-specific code in integrations.
* Keep reusable validation rules in validators.
* Keep authorization decisions in middleware or policies, as appropriate.

Error handling

* Use consistent application error types.
* Pass asynchronous route errors to the centralized error handler.
* Return suitable HTTP status codes.
* Avoid exposing stack traces, database errors, credentials, or internal implementation details to clients.

Security

* Validate all untrusted input on the server.
* Enforce authentication and authorization for protected operations.
* Check ownership and permissions before accessing private records or documents.
* Keep secrets in environment configuration or a secret manager.
* Verify payment webhooks and prevent duplicate payment processing.
* Store private uploads outside public web roots.
* Avoid logging passwords, tokens, payment credentials, or confidential documents.

Maintainability

* Use consistent filename and export conventions.
* Avoid circular dependencies between modules.
* Keep shared utilities independent of domain-specific business logic.
* Document configuration requirements and external dependencies.
* Add tests when changing application behavior.

Configuration and Integrations

Configuration belongs in src/config/, while provider adapters belong in src/integrations/.

Examples include:

* Email delivery through the configured email provider.
* AI requests through the configured AI provider.
* File operations through local or object storage.
* Payments through the selected payment gateway.

Load and validate required configuration before initializing dependent services. Do not assume a provider is available merely because its adapter file exists.

Jobs and Workers

Use src/jobs/ to define scheduled or queued work and src/workers/ to execute background processing.

Examples include:

* Notification delivery.
* Application reminders.
* Subscription notifications.
* Temporary-file cleanup.

Configure retry behavior, idempotency, logging, and failure handling as appropriate. Ensure scheduled tasks and workers cannot accidentally process the same operation multiple times without safeguards.

Testing

Tests should cover the relevant source modules, including:

* Service and utility unit tests.
* API and integration tests.
* Repository and database tests.
* Authentication and authorization tests.
* Payment webhook verification.
* Background job and worker behavior.

Keep test files in the repository’s established tests/ directory unless the project’s test configuration specifies another convention.

Development Workflow

1. Read the repository’s main README.md.
2. Check package.json for the supported commands and dependencies.
3. Configure environment variables using .env.example.
4. Confirm database and provider requirements.
5. Implement changes in the appropriate module.
6. Add or update relevant tests.
7. Run the available linting and test commands.
8. Update documentation when interfaces or workflows change.
9. Verify the application in staging before production deployment.

Maintenance

Keep this README synchronized with the actual source tree. Update it when directories, module responsibilities, startup behavior, integrations, or architectural conventions change.

⸻

MedOrbits — Study · Work · Grow

Modular backend architecture for education, admissions, careers, recruitment, and platform operations.