Contributing to MedOrbits

Thank you for your interest in contributing to MedOrbits.

MedOrbits aims to provide reliable, secure, accessible, and user-friendly solutions across education guidance, medical admissions, study-abroad services, career development, recruitment, employment opportunities, and related services.

We welcome bug reports, feature proposals, documentation improvements, accessibility enhancements, performance optimizations, security improvements, and code contributions from developers and community members.

This guide explains how to prepare your development environment, propose changes, maintain quality standards, and submit contributions for review.

By participating in this project, you agree to follow the project’s Code of Conduct.

⸻

Table of Contents

1. Before You Start
2. Development Environment
3. Repository Structure and Architecture
4. Choosing an Issue
5. Development Principles
6. Coding Standards
7. Backend and API Contributions
8. Frontend and Accessibility
9. Database and Migrations
10. Security and Privacy Requirements
11. Testing and Quality Assurance
12. Branches and Commit Messages
13. Pull Request Process
14. Pull Request Checklist
15. Reporting Bugs
16. Proposing Features
17. Security Vulnerability Reporting
18. Documentation and Configuration
19. Dependencies and Third-Party Services
20. Review, Approval, and Merging
21. Release and Compatibility Considerations
22. Code of Conduct
23. License and Contribution Rights
24. Questions and Support

⸻

1. Before You Start

Before making changes:

* Read the root README.md for the project’s purpose, supported technologies, installation instructions, and development workflow.
* Review SECURITY.md before investigating or reporting security vulnerabilities.
* Read CODE_OF_CONDUCT.md and communicate respectfully throughout the contribution process.
* Review CHANGELOG.md to understand documented changes and release history.
* Inspect the existing implementation, configuration, tests, and related documentation before introducing new patterns.
* Search existing issues and pull requests to avoid duplicate work.
* For substantial architectural changes, new dependencies, database redesigns, payment integrations, or authentication changes, discuss the approach with maintainers before implementation.
* Confirm that you have the necessary permissions to contribute any code, assets, documentation, or third-party material you intend to submit.

Never commit or publish:

* Environment files containing secrets, including .env and environment-specific overrides.
* API keys, passwords, access tokens, private keys, session cookies, or production credentials.
* Real user records, application documents, identity documents, payment data, or confidential exports.
* Database dumps, private uploads, logs containing sensitive information, or production backups.
* Generated files, temporary artifacts, or dependency directories unless explicitly required by the repository.

Use synthetic data and appropriately sanitized examples throughout development and testing.

2. Development Environment

Prerequisites

Install the tools required by the repository:

* The Node.js version specified by package.json, .nvmrc, .node-version, or the project’s documented requirements.
* The package manager used by the repository and its committed lockfile.
* MySQL or another explicitly documented database dependency.
* Redis, a browser automation runtime, or other services only when required by the feature being developed.
* Git and any additional tooling documented by the project.

Do not independently upgrade the runtime or package manager as part of an unrelated feature.

Setup workflow

1. Clone the repository and create a dedicated feature branch.
2. Install dependencies using the existing package manager and lockfile.
3. Copy .env.example to the appropriate local environment file if the template exists.
4. Configure local services and required environment variables using development-only credentials.
5. Initialize the development database using the documented schema and migration procedures.
6. Run the configured linting, formatting, and test commands.
7. Start the application using the actual scripts defined in package.json.
8. Verify the relevant functionality locally before submitting changes.

Example commands, subject to the actual repository configuration:

git clone <repository-url>
cd <repository-directory>
npm ci
cp .env.example .env
npm run lint
npm test
npm run dev

These commands are illustrative. A command should only be used when its corresponding script or setup procedure exists. On Windows, use an appropriate file-copy command instead of cp if necessary.

Environment configuration

* Keep local credentials separate from staging and production credentials.
* Use strong, randomly generated development secrets where required.
* Never disable authentication or security controls merely to make a test pass.
* Do not point tests at production services or production databases.
* Document newly required environment variables in .env.example and the relevant setup documentation.
* Use safe placeholder values rather than real credentials in configuration examples.

A variable appearing in .env.example does not mean the application implements or consumes it. New configuration must be connected to the appropriate code, validated, documented, and tested.

3. Repository Structure and Architecture

Follow the existing repository architecture rather than creating competing patterns.

The backend may contain the following responsibilities:

Area	Responsibility
src/routes/	Register HTTP endpoints and connect middleware to controllers.
src/controllers/	Handle HTTP requests, responses, and status codes.
src/services/	Implement business rules and coordinate application workflows.
src/repositories/	Encapsulate database access and persistence operations.
src/models/	Define plain model metadata or domain representations according to existing conventions.
src/validators/	Validate request payloads, parameters, and other untrusted input.
src/middleware/	Implement cross-cutting request processing, authentication, and error handling.
src/policies/	Enforce authorization and resource-access decisions.
src/config/	Load and validate application configuration.
src/integrations/	Encapsulate external services such as payments, email, AI, and storage.
src/jobs/ and src/workers/	Handle scheduled or asynchronous work when configured.
src/utils/	Contain reusable, focused utility functions.
tests/	Contain automated tests organized according to the established test architecture.

This table describes intended responsibilities, not a guarantee that every directory or feature currently exists.

Before adding a new directory, framework, service layer, or abstraction, check whether the project already provides an appropriate implementation.

Prefer a single clear implementation over duplicate helpers, competing database access patterns, or multiple ways to perform the same business operation.

4. Choosing an Issue

Contributors can help with:

* Reproducible bug fixes.
* Documentation and developer-experience improvements.
* Accessibility and responsive-design enhancements.
* Performance and reliability improvements.
* Automated testing and test infrastructure.
* Input validation and error-handling improvements.
* Security and privacy improvements.
* Education, admissions, career, recruitment, and account-management functionality.

For an existing issue, review its acceptance criteria and any maintainer guidance before implementation.

For an issue that has not been discussed, explain the problem and proposed solution before beginning substantial work.

For large features, divide the work into reviewable stages. Each stage should have a clear purpose, defined scope, and appropriate tests.

Do not assume that opening a pull request automatically means a proposed feature will be accepted.

5. Development Principles

Contributions should follow these principles:

Correctness

Implement the documented behavior, handle relevant edge cases, and avoid introducing regressions.

Security by default

Treat client input, uploaded files, webhooks, external responses, and persisted user-controlled values as untrusted.

Maintainability

Prefer readable, modular code with explicit responsibilities and limited unnecessary complexity.

Backward compatibility

Preserve existing interfaces unless a breaking change has been discussed and documented.

Accessibility

Ensure user-facing changes remain usable with keyboards, assistive technologies, and different viewport sizes.

Privacy

Collect, process, log, and retain only the information necessary for the intended function.

Testability

Design changes so important behavior can be verified without depending unnecessarily on live external services.

Consistency

Follow existing naming, error-handling, validation, module-export, and architectural conventions.

Minimal scope

Avoid unrelated refactoring, formatting churn, dependency upgrades, or generated-file changes in focused bug fixes.

6. Coding Standards

JavaScript and Node.js

* Follow the project’s ESLint and Prettier configuration.
* Use the module system already established by the relevant package or directory.
* Prefer const by default and use let when reassignment is necessary.
* Use clear, descriptive names and small functions with well-defined responsibilities.
* Handle rejected promises and asynchronous failures explicitly.
* Avoid synchronous filesystem operations in request handlers unless justified.
* Avoid broad exception handling that hides failures or incorrectly reports success.
* Remove unused imports, debug statements, temporary code, and dead branches.
* Do not introduce global mutable state without a clear need and documented lifecycle.

HTTP and API behavior

* Use appropriate HTTP methods and status codes.
* Validate request bodies, query parameters, and route parameters.
* Return consistent response formats according to existing API conventions.
* Avoid exposing stack traces, internal database errors, secret values, or private implementation details to clients.
* Do not return success responses when an operation has failed or remains unconfirmed.
* Keep authentication separate from authorization: an authenticated user must not automatically gain access to every resource.

HTML, CSS, and browser JavaScript

* Preserve responsive layouts across supported screen sizes.
* Use semantic HTML and accessible form labels.
* Avoid unsafe HTML insertion and unsafe DOM manipulation.
* Escape or safely render untrusted content according to its context.
* Avoid introducing inline scripts or styles when the existing architecture uses external assets and content-security controls.
* Follow the project’s visual design system and established brand conventions.
* Keep loading, empty, error, success, and disabled states understandable.

Formatting

Use the repository’s configured formatter and linter rather than manually imposing a new style.

Run formatting checks before submitting a pull request. Do not combine unrelated formatting changes with functional work unless requested.

7. Backend and API Contributions

Backend changes must preserve the separation between transport, business logic, persistence, and authorization.

Request processing

Where appropriate, use this flow:

1. Route registration.
2. Authentication and request validation.
3. Authorization and resource-level policy checks.
4. Controller request handling.
5. Service-layer business logic.
6. Repository persistence operations.
7. Consistent response or centralized error handling.

The exact sequence depends on the operation, but authorization must occur before protected data is disclosed or modified.

Authorization requirements

* Derive the authenticated identity from trusted server-side authentication state.
* Enforce ownership and role restrictions on the server.
* Never trust client-supplied userId, ownerId, role, account status, payment status, or subscription status without independent verification.
* Apply authorization to individual resources, not only to endpoint access.
* Prevent insecure direct object reference vulnerabilities by checking whether the requester may access the requested resource.
* Fail closed when authorization cannot be established.

Error handling

* Use the project’s established error-handling mechanism.
* Distinguish expected validation failures, authentication failures, authorization failures, conflicts, missing resources, and unexpected server errors.
* Avoid swallowing exceptions or converting every failure into a successful response.
* Log enough information for diagnosis without exposing sensitive data.
* Avoid logging complete request bodies, authorization headers, cookies, identity documents, payment credentials, or other sensitive fields.

External integrations

External service calls should have appropriate timeouts, bounded retries, error handling, and observability.

Retry only operations that are safe to repeat or protected by an appropriate idempotency mechanism. Avoid uncontrolled retry loops and duplicate side effects.

Use mocks or controlled test environments for external services wherever practical.

8. Frontend and Accessibility

User-facing changes should remain consistent with MedOrbits’ design system and accessibility expectations.

Contributors should:

* Use semantic headings, landmarks, buttons, links, and form controls.
* Provide labels and meaningful error messages for form fields.
* Preserve keyboard navigation and visible focus indicators.
* Maintain sufficient text and control contrast.
* Avoid communicating important information through color alone.
* Ensure interactive controls have accessible names.
* Provide meaningful alternative text for informative images.
* Respect reduced-motion preferences when adding animations.
* Avoid horizontal overflow and unintended text clipping on mobile devices.
* Test loading, empty, error, and success states.
* Avoid exposing private information in browser-visible markup, URLs, source maps, or client-side configuration.

Automated accessibility checks are useful, but they do not replace manual keyboard and interaction testing.

9. Database and Migrations

Database changes must be deliberate, reviewable, and compatible with the deployment process.

For schema or data changes:

* Follow the project’s established migration mechanism.
* Include a migration whenever a persistent schema change requires one.
* Use parameterized queries rather than interpolating untrusted values into SQL.
* Use transactions where multiple operations must succeed or fail together.
* Add appropriate indexes and constraints for query patterns and data integrity.
* Consider concurrent requests, duplicate submissions, and transaction isolation.
* Avoid destructive changes without a documented migration strategy.
* Document required backfills, deployment ordering, downtime, and rollback limitations.
* Never run experimental migrations against production without an approved deployment procedure.
* Use synthetic data for automated tests.

Migration compatibility

Where practical, use an expand-and-contract strategy:

1. Introduce backward-compatible schema changes.
2. Deploy application code compatible with both old and new structures.
3. Backfill or migrate data safely.
4. Switch application behavior.
5. Remove obsolete structures only after compatibility has been verified.

A rollback plan must reflect actual data and schema risks. Reversing a migration is not always safe or possible, particularly after destructive data changes.

10. Security and Privacy Requirements

Security is a mandatory part of contribution review.

Authentication and sessions

* Use established authentication mechanisms.
* Validate session and token handling against the project’s security requirements.
* Protect sensitive account changes and privileged operations.
* Do not expose tokens or session identifiers in logs or URLs.
* Avoid weakening password, session, cookie, or authentication controls to accommodate tests.

Input validation and output handling

* Validate untrusted data on the server.
* Apply context-appropriate output encoding.
* Use parameterized database queries.
* Prevent injection, cross-site scripting, cross-site request forgery, and unsafe deserialization where relevant.
* Avoid unsafe redirects, path traversal, and unrestricted file access.

File uploads and private documents

* Enforce file-size and allowed-type limits.
* Do not trust filenames or client-supplied MIME types.
* Generate safe storage identifiers instead of relying on user-supplied paths.
* Store private documents outside publicly served directories or in appropriately private object storage.
* Apply per-request authorization before downloads or document operations.
* Integrate malware scanning or quarantine where required by the deployed architecture.
* Do not expose identity documents, application records, or other private files through predictable public URLs.

Payments and subscriptions

* Verify payment-provider webhook signatures using the provider’s documented method and the exact request bytes required by that method.
* Verify amount, currency, transaction identity, and expected payment state.
* Implement durable idempotency and safe duplicate-event handling.
* Do not mark an order, application, or subscription as paid based solely on a browser redirect or client-supplied status.
* Protect payment credentials and webhook secrets.
* Test duplicate events, invalid signatures, interrupted processing, and retry behavior.

Configuration and secrets

* Never commit production secrets.
* Validate required environment variables during startup.
* Keep example configuration free of real credentials.
* Use least-privilege service accounts and database users.
* Ensure production configuration does not silently fall back to insecure development defaults.
* Review changes to CORS, trusted proxies, rate limits, logging, security headers, and cookie settings carefully.

Security testing

Do not introduce intentional vulnerabilities or weaken security checks merely to make a test pass. Use controlled test environments and synthetic data.

Follow SECURITY.md for vulnerability reporting and disclosure.

11. Testing and Quality Assurance

Every functional change should include appropriate verification.

Choose tests based on the behavior being changed rather than adding tests only to satisfy a checklist.

Unit tests

Use unit tests for isolated business rules, validation, transformations, permissions, and error handling.

Test both expected outcomes and meaningful edge cases.

Integration tests

Use integration tests to verify interactions between actual application components, such as:

* Authentication and authorization middleware.
* Services and repositories.
* Database constraints and transactions.
* Application submission workflows.
* Notification dispatch and retry handling.
* Payment-event processing and idempotency.

Mocks are appropriate for external dependencies, but they must not be mistaken for proof that the real integration works.

End-to-end tests

Use end-to-end tests for important user workflows, where supported by the repository, such as registration, login, application submission, document access, and payment completion.

Test against the actual configured routes and user interface. Do not assume example routes exist without checking the implementation.

Security and regression tests

Where relevant, verify:

* Unauthenticated access is rejected.
* Unauthorized users cannot access another user’s resources.
* Invalid inputs are rejected safely.
* Duplicate requests do not create unintended duplicate operations.
* Sensitive fields are not returned or logged.
* Invalid payment webhooks are rejected.
* Database failures do not produce false success responses.
* Existing behavior remains intact.

Running checks

Use the scripts defined in package.json. Depending on the repository configuration, these may include:

npm test
npm run lint
npm run format:check
npm run test:integration
npm run test:e2e

These are example commands, not a guarantee that every script exists.

Before running database-backed tests, confirm that the test database is separate from development and production data. Do not run destructive setup or cleanup against an unverified database.

For browser tests, install the required browser runtime and configure the test server according to the project’s documentation.

Reporting results

In your pull request, state:

* Which checks you ran.
* Whether they passed or failed.
* Any checks you could not run and why.
* Any required external services or manual verification.
* Known limitations or follow-up work.

Never claim a test passed unless it was actually executed and passed.

12. Branches and Commit Messages

Create a descriptive branch for each independent contribution.

Examples:

feat/application-status
feat/study-abroad-search
fix/payment-webhook-validation
fix/document-access-control
docs/security-policy
test/application-submission
refactor/application-service

Use clear commit messages that describe the change.

Examples:

feat: add application status tracking
fix: reject invalid payment webhook signatures
docs: improve contributor setup instructions
test: cover application authorization rules
refactor: separate application persistence logic

These examples follow a Conventional Commits-inspired style. Follow any stricter convention already established in the repository.

Keep commits focused and avoid including:

* Unrelated modifications.
* Secrets or private data.
* Temporary debugging changes.
* Unnecessary generated artifacts.
* Local environment files.
* Dependency lockfile changes unrelated to the intended update.

Before pushing, inspect the complete change set:

git status
git diff —check
git diff

Review staged changes as well before committing.

13. Pull Request Process

Step 1: Prepare the branch

Create a branch from the appropriate base branch and keep it focused on one coherent change.

Step 2: Implement the change

Follow existing conventions and add or update tests for the changed behavior.

Step 3: Update documentation

Update the README, API documentation, environment examples, migration instructions, and changelog where relevant.

Step 4: Run checks

Run the applicable tests, linting, formatting, build, migration, and security checks supported by the project.

Step 5: Review the complete diff

Check for accidental file changes, secrets, sensitive data, debug code, unsafe defaults, and generated artifacts.

Step 6: Open the pull request

Describe the problem, solution, implementation approach, testing performed, risks, and any trade-offs.

Step 7: Support review

Respond constructively to feedback, clarify design decisions, and make focused follow-up commits.

Step 8: Communicate deployment requirements

Identify environment-variable changes, migrations, dependency changes, feature flags, external-service configuration, and operational considerations.

Do not merge until the applicable review requirements and required status checks have passed.

14. Pull Request Checklist

Before requesting review, confirm the following:

* [ ]	The purpose and scope of the change are clear.
* [ ]	The implementation follows existing architecture and coding conventions.
* [ ]	Relevant tests have been added or updated.
* [ ]	Tests and checks have been executed, and results are accurately reported.
* [ ]	Input validation and resource-level authorization are enforced where required.
* [ ]	Sensitive information and secrets are not included.
* [ ]	Error handling and logging are appropriate.
* [ ]	Database changes include migration and recovery considerations.
* [ ]	Payment and asynchronous workflows handle duplicates and failures safely where applicable.
* [ ]	Documentation and configuration examples have been updated.
* [ ]	New dependencies and runtime requirements are justified.
* [ ]	User-facing changes preserve accessibility and responsive behavior.
* [ ]	Compatibility, deployment, and breaking changes are documented.
* [ ]	The complete diff has been reviewed.
* [ ]	The change complies with the Code of Conduct and relevant project policies.

15. Reporting Bugs

Before opening a bug report, check existing issues and confirm that the behavior is reproducible.

Include as much relevant information as can be shared safely.

Recommended bug report details

* Summary: A concise description of the problem.
* Expected behavior: What should happen.
* Actual behavior: What happened instead.
* Reproduction steps: The smallest reliable sequence that reproduces the problem.
* Environment: Relevant Node.js, database, browser, operating-system, and application versions.
* Impact: Which workflow or users are affected.
* Evidence: Sanitized error messages, screenshots, or logs.
* Frequency: Whether the issue occurs consistently or intermittently.
* Workarounds: Any known temporary mitigation.

Provide a minimal reproduction where practical.

Do not include credentials, access tokens, private user data, identity documents, payment details, session cookies, or unredacted logs.

If the issue may expose a security vulnerability, follow SECURITY.md instead of filing a public bug report.

16. Proposing Features

Feature proposals should explain the problem before prescribing a particular implementation.

Include:

* The user need or operational problem.
* The intended audience and expected benefit.
* The proposed behavior and acceptance criteria.
* Relevant workflows, edge cases, and failure states.
* Accessibility and mobile considerations for user-facing functionality.
* Security, privacy, and authorization implications.
* Database, API, and configuration changes that may be required.
* Alternatives considered and their trade-offs.
* Any dependencies or external services needed.

For substantial changes, seek maintainer feedback before investing in a large implementation.

A proposal may be revised, deferred, or declined based on project priorities, feasibility, security, maintenance costs, and compatibility.

17. Security Vulnerability Reporting

Do not disclose security vulnerabilities through public issues, discussions, or pull requests.

Follow the private reporting procedure documented in SECURITY.md. Use a private contact method explicitly published in the repository’s root README.md or on the official MedOrbits website.

If no private reporting contact is available, ask a maintainer through an appropriate non-public channel to provide one before sharing sensitive technical details.

A useful report may include:

* Affected component and version, if known.
* The security impact and relevant threat scenario.
* Minimal reproduction steps.
* Sanitized logs or proof-of-concept material.
* Suggested mitigations, if known.

Do not include unrelated personal data, production credentials, or unnecessary copies of private records.

Do not access, modify, or exfiltrate data without authorization. Follow the scope, authorization requirements, and disclosure limitations documented in SECURITY.md.

Do not assume that a vulnerability report authorizes testing against production systems or third-party infrastructure.

18. Documentation and Configuration

Documentation is part of the implementation.

When behavior changes, update the relevant documentation, including where applicable:

* Root README.md.
* CHANGELOG.md.
* API references and endpoint examples.
* Environment-variable documentation and .env.example.
* Installation and deployment instructions.
* Database migration and recovery instructions.
* Testing guides and developer workflows.
* Feature-specific documentation and troubleshooting guides.

Configuration requirements

* Keep examples syntactically valid and clearly distinguish placeholders from real values.
* Document required versus optional variables.
* Explain units, allowed values, defaults, and environment-specific behavior.
* Identify variables that require coordinated deployment or secret rotation.
* Never publish real credentials in examples.
* Ensure configuration documentation reflects variables that the application actually reads.

Do not document an unimplemented feature as available or claim that an example command works unless it has been verified against the repository.

19. Dependencies and Third-Party Services

New dependencies increase maintenance, security, and operational costs.

Before adding one:

* Check whether existing dependencies already provide the required functionality.
* Explain why the dependency is necessary.
* Review maintenance status, license compatibility, security history, and transitive dependencies.
* Avoid packages that introduce unnecessary permissions or excessive functionality.
* Pin or constrain versions according to the project’s package-management strategy.
* Update the relevant lockfile using the repository’s package manager.
* Test the integration and document new configuration or runtime requirements.

Do not introduce a new framework or service for a small feature without a clear justification.

For external integrations, document expected availability, authentication, timeouts, failure handling, and any operational dependencies.

Never embed private API credentials in browser-delivered JavaScript or publicly accessible configuration.

20. Review, Approval, and Merging

Pull requests may be reviewed for:

* Functional correctness.
* Maintainability and consistency with the architecture.
* Security, privacy, and authorization.
* Test quality and reproducibility.
* Accessibility and usability.
* Performance and operational reliability.
* Documentation and migration completeness.
* Compatibility with supported runtime and dependency versions.

Reviewers may request changes, clarification, additional tests, or a narrower implementation.

Contributors should respond professionally and explain disagreements with evidence or relevant technical trade-offs.

Maintainers may close or defer contributions that are out of scope, duplicate existing work, introduce unacceptable risks, lack required information, or cannot be maintained.

Do not merge a pull request until the repository’s required approvals and applicable automated checks have passed. Exceptions, if permitted by project policy, should be handled explicitly rather than bypassed informally.

21. Release and Compatibility Considerations

Contributions that affect public APIs, database schemas, configuration, dependencies, or deployment procedures must identify relevant compatibility implications.

Follow the project’s release process and CHANGELOG.md conventions.

When applicable, document:

* Breaking changes.
* Required database migrations.
* Environment-variable additions, removals, or changes.
* Dependency or runtime requirements.
* Deployment ordering and service restarts.
* Data backfills and rollback limitations.
* Feature flags or staged rollout requirements.
* Changes to external integrations or payment workflows.

If Semantic Versioning is used for a release, follow its compatibility rules. Do not assign release versions or claim that a release has been published unless authorized and verified.

22. Code of Conduct

All contributors must follow CODE_OF_CONDUCT.md.

Maintain respectful, professional discussions. Critique technical decisions and work rather than attacking individuals.

Harassment, discrimination, threats, intimidation, disclosure of private information, and retaliation against good-faith reporters are not acceptable.

Maintainers may moderate contributions and restrict participation in accordance with the Code of Conduct.

23. License and Contribution Rights

Before contributing, review the repository’s LICENSE file and any applicable third-party licensing requirements.

By submitting a contribution, you represent that you have the right to submit the material and that doing so is consistent with the applicable license and any relevant agreements.

Do not submit code, images, fonts, documentation, datasets, or other material that you do not have permission to distribute.

Retain applicable copyright notices and license attributions.

If the repository does not contain a license or the rights to a proposed contribution are unclear, ask the maintainers for clarification before submitting the material.

Submitting a contribution does not, by itself, grant the project rights beyond those provided by the applicable license or a separate agreement.

24. Questions and Support

For general contribution questions, use the project contact or discussion channel documented in the root README.md.

For security concerns, follow SECURITY.md.

For behavioral concerns, follow CODE_OF_CONDUCT.md.

When asking for help, provide enough context to understand the problem while keeping credentials, personal information, and confidential material private.

⸻

Thank You

Thank you for helping improve MedOrbits.

Every thoughtful contribution—whether code, testing, documentation, accessibility improvements, or constructive feedback—helps make the project more reliable, secure, maintainable, and useful.

We appreciate your time, care, and commitment to building MedOrbits responsibly.