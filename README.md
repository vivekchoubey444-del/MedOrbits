MedOrbits

Education · Admissions · Careers · Recruitment

Study · Work · Grow

MedOrbits is a web platform designed to bring education discovery, admissions guidance, study-abroad resources, career development, and recruitment services together in one organized digital experience.

The repository combines a public-facing HTML, CSS, and JavaScript frontend with a Node.js and Express backend, data resources, database components, automated tests, deployment configuration, and operational documentation.

> **Implementation status:** This README describes the intended platform architecture and repository organization. A directory, filename, configuration variable, test, or documentation page does not independently prove that a feature or integration is implemented or operational. Verify behavior against the current source code, package scripts, environment configuration, and deployment before relying on it.

────────

Contents

• Project Overview
• Platform Capabilities
• Technology and Architecture
• Repository Structure
• Getting Started
• Environment Configuration
• Development and Testing
• Frontend Standards
• Backend Architecture
• Data and Database Management
• Security and Privacy
• Deployment and Operations
• Contribution Guidelines
• Troubleshooting
• Documentation Directory
• License and Third-Party Notices

────────

Project Overview

MedOrbits aims to connect students, education seekers, job candidates, employers, recruiters, and administrators through a unified platform.

The platform’s intended goals are to:

• Make education and career information easier to discover.
• Organize admissions guidance and educational resources.
• Provide information about studying in India and abroad.
• Connect career development resources with employment opportunities.
• Support recruitment-related workflows for employers and candidates.
• Provide structured account, application, document, and administrative workflows.
• Maintain a modular, maintainable, secure, and responsive web architecture.

The availability of individual features depends on their implementation, configuration, external service dependencies, and deployment environment.

Platform Capabilities

Education and Admissions

• Courses, colleges, universities, and education pathways.
• Undergraduate and postgraduate education information.
• Medical, dental, AYUSH, nursing, pharmacy, paramedical, engineering, management, law, and other course categories.
• Admission procedures, eligibility information, entrance examinations, and counselling resources.
• Study-abroad destinations and international education guidance.
• Fee information, scholarships, accommodation resources, and education-planning guides.
• Document checklists, frequently asked questions, and admission-related support.

Careers and Employment

• Job listings, job categories, and job-detail pages.
• Internship opportunities and career resources.
• Resume preparation and interview guidance.
• Career exploration and sector-specific information.
• Employer services and recruitment resources.
• Candidate discovery and applicant-management workflows.

Accounts and Applications

• Registration, authentication, and profile management.
• Account verification and application tracking.
• Document submission and access-controlled document management.
• Notifications, support requests, and account dashboards.
• Payment and subscription workflows where implemented.

Administration and Operations

• User and role management.
• Education catalogue and content management.
• Application, document, job, payment, and subscription administration.
• Support workflows and administrative audit trails.
• Database migrations, validation, automated tests, deployment tooling, and operational runbooks.

These are platform objectives, not a guarantee that every listed capability is available in the current deployment.

Technology and Architecture

MedOrbits uses a modular web application structure.

|Component         |Location                                                 |Responsibility                                            |
|——————|———————————————————|-———————————————————|
|Public website    |`index.html`, `pages/`, `education/`, `career/`, `legal/`|Public-facing pages and navigation                        |
|Account interfaces|`account/`                                               |User account and dashboard interfaces                     |
|Administration    |`admin/`                                                 |Administrative interfaces                                 |
|Static assets     |`assets/`                                                |CSS, JavaScript, images, icons, fonts, and public data    |
|Application server|`server.js`, `src/`                                      |Node.js and Express application                           |
|Configuration     |`src/config/`                                            |Environment and integration configuration                 |
|Persistence       |`database/`, `src/models/`, `src/repositories/`          |Database schemas, migrations, models, and data access     |
|Automated tests   |`tests/`                                                 |Application, integration, API, security, and browser tests|
|Infrastructure    |`infrastructure/`, `scripts/`                            |Deployment, validation, backups, and operational tooling  |
|Documentation     |`docs/` and directory-level `README.md` files            |Technical and operational guidance                        |

Architecture principles

• Separation of concerns: Keep presentation, HTTP handling, business logic, and persistence responsibilities distinct.
• Modularity: Prefer focused modules with clear interfaces.
• Server-side enforcement: Enforce authorization, validation, and business rules on the server.
• Configuration-driven operation: Keep environment-specific settings outside application source code.
• Data integrity: Validate inputs and maintain consistent identifiers across related data sources.
• Accessibility: Build interfaces that support keyboard navigation, semantic structure, and readable contrast.
• Operational reliability: Document deployment prerequisites, migrations, backups, health checks, and recovery procedures.

Repository Structure

The following tree is an architectural reference. Confirm that each path exists in the current checkout before treating it as implemented.

medorbits/
├── index.html
├── README.md
├── README-PRODUCTION.md
├── package.json
├── package-lock.json
├── server.js
├── .nvmrc
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── LICENSE
├── NOTICE
├── SECURITY.md
├── SUPPORT.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── .editorconfig
├── .prettierrc.json
├── .eslintrc.json
├── .github/
├── .husky/
├── pages/
├── account/
├── education/
├── career/
├── admin/
├── legal/
├── assets/
│   ├── css/
│   ├── js/
│   ├── data/
│   ├── images/
│   ├── icons/
│   ├── fonts/
│   └── documents/
├── public/
├── database/
│   ├── schema.sql
│   ├── migrations/
│   ├── seeds/
│   └── fixtures/
├── storage/
├── src/
│   ├── app.js
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── services/
│   ├── models/
│   ├── repositories/
│   ├── validators/
│   ├── policies/
│   ├── utils/
│   ├── integrations/
│   ├── templates/
│   ├── workers/
│   └── jobs/
├── infrastructure/
├── scripts/
├── tests/
└── docs/

Important directory conventions

• assets/data/ contains public-facing catalogue or reference data. Anything served to the browser must be treated as public.
• storage/ is intended for runtime files. Private uploads must not be exposed through public static-file serving.
• database/migrations/ contains versioned schema changes where the migration system is implemented.
• src/repositories/ isolates persistence logic where that architecture is used.
• src/policies/ is intended for resource-level authorization rules.
• tests/ contains automated test suites and their supporting fixtures.
• infrastructure/ and docs/ contain operational guidance and deployment resources.

For a complete file-level inventory, inspect the actual repository tree and the README files within individual directories.

Getting Started

Prerequisites

Install the tools required by the current application configuration:

• Git.
• A Node.js version compatible with package.json and .nvmrc.
• npm.
• Any required database service.
• Additional providers required by enabled features, such as email, payments, object storage, or background queues.

Check installed versions:

node —version
npm —version
git —version

Inspect the project’s preferred Node.js version:

cat .nvmrc

If the project uses nvm, install and select the configured version:

nvm install
nvm use

If .nvmrc is missing or unsupported, select a Node.js version compatible with the project’s declared engine and deployment environment.

1. Obtain the repository

If you have not already cloned the project:

git clone <YOUR_REPOSITORY_URL>
cd medorbits

Replace the placeholder with the actual repository URL.

2. Install dependencies

From the repository root:

npm ci

npm ci installs dependencies from the lockfile and is preferred for reproducible installations when a compatible package-lock.json is present.

Use npm install when intentionally changing dependencies or regenerating the lockfile.

3. Configure local environment variables

Create a local environment file from the template.

macOS or Linux:

cp .env.example .env

Windows PowerShell:

Copy-Item .env.example .env

Update .env with values suitable for your local environment. Do not commit this file or place production credentials in it.

4. Inspect available npm scripts

npm run

Review the scripts in package.json before starting the application. Use the documented command for the actual entry point and runtime configuration.

Common names include dev, start, test, lint, and build, but these scripts must not be assumed to exist.

5. Start required services

If the application requires a database, cache, queue, or external provider, configure that dependency before running the related feature.

Apply the project’s documented database migrations and use only synthetic development seed data.

6. Start the application

Run the start or development command defined in package.json and confirm that the application starts without configuration, module-loading, or database errors.

Verify the configured local URL and health endpoint against the actual server implementation.

Environment Configuration

.env.example should document configuration names and safe example formats without containing actual credentials.

Configuration may include the following categories, depending on implemented features:

|Category             |Typical purpose                                         |
|———————|———————————————————|
|Application          |Runtime environment, port, public URL                   |
|Database             |Connection URL or host, database, user, and password    |
|Authentication       |Session secrets, token configuration, cookie settings   |
|Browser security     |CORS origins and trusted proxy configuration            |
|Email                |SMTP or email-provider credentials                      |
|File storage         |Local storage or object-storage configuration           |
|Payments             |Provider keys, webhook secrets, and supported currencies|
|Background processing|Queue connections and worker settings                   |
|AI services          |Provider endpoint, model, and API key                   |
|Monitoring           |Log levels, error reporting, and health checks          |

Use the exact names and formats expected by server.js, src/config/, and the relevant integration modules.

Configuration requirements

• Validate required environment variables during startup.
• Fail clearly when essential configuration is missing or invalid.
• Never print secret values in startup errors or diagnostic logs.
• Keep development, testing, staging, and production configuration separate.
• Use the hosting platform’s secret-management facility for production credentials.
• Ensure that every documented variable is actually consumed by the code before relying on it.

Development and Testing

Use the scripts and test configuration present in the repository.

A recommended workflow is:

1. Install dependencies.
2. Configure environment variables.
3. Start the required local services.
4. Apply the appropriate database migrations.
5. Run the application.
6. Execute relevant automated tests.
7. Check formatting, linting, and configuration validation.
8. Verify important user flows manually or through end-to-end tests.

Test organization

The repository may organize tests using directories such as:

|Directory             |Intended coverage                                |
|-———————|-————————————————|
|`tests/unit/`         |Isolated functions and business rules            |
|`tests/integration/`  |Interactions between application components      |
|`tests/api/`          |HTTP routes, validation, and response contracts  |
|`tests/database/`     |Queries, schema, migrations, and persistence     |
|`tests/security/`     |Authentication, authorization, and abuse controls|
|`tests/e2e/`          |End-to-end user workflows                        |
|`tests/accessibility/`|Accessibility and keyboard interaction           |
|`tests/fixtures/`     |Controlled test data                             |

Use the directories and test runner that actually exist in the checkout.

Test safety

• Never use production credentials in automated tests.
• Do not upload real identity documents or sensitive personal data as fixtures.
• Use an isolated test database.
• Confirm the target database before running reset, truncation, or destructive migration commands.
• Ensure tests do not send real emails, charge payment methods, or trigger production webhooks.
• Treat passing tests as evidence for the behavior covered, not proof that the entire application is production-ready.

Frontend Standards

Shared interface conventions

• Keep reusable styles in assets/css/.
• Keep reusable browser-side functionality in assets/js/.
• Reuse established navigation, footer, typography, design tokens, and animation behavior.
• Keep page-specific styling isolated when practical.
• Confirm that links, forms, buttons, and navigation targets correspond to real files or server routes.
• Avoid unrelated redesigns when adding a page or fixing a functional issue.

MedOrbits visual direction

Follow the design system established by the relevant page. The platform’s design direction includes premium dark surfaces, carefully controlled accent colours, readable contrast, responsive layouts, and polished opening animations.

When extending the interface:

• Preserve the established brand identity.
• Maintain consistent spacing, typography, buttons, cards, and navigation.
• Use colour combinations with sufficient contrast.
• Keep shared header and footer changes deliberate and consistent.
• Avoid introducing conflicting page-level design systems.

Accessibility

• Use semantic HTML landmarks and a logical heading hierarchy.
• Provide meaningful alternative text for informative images.
• Associate form labels, hints, and validation errors with their controls.
• Ensure keyboard access and visible focus indicators.
• Use appropriate accessible names for icon-only controls.
• Respect the prefers-reduced-motion media preference.
• Do not communicate important information through colour alone.

Performance and responsive behaviour

• Test mobile, tablet, and desktop layouts.
• Avoid horizontal overflow and clipped interactive controls.
• Lazy-load appropriate below-the-fold images.
• Optimize image dimensions and media formats.
• Avoid loading unused JavaScript and large resources unnecessarily.
• Use caching and compression where supported by the deployment architecture.
• Check network requests and browser-console errors before release.

Public assets and URLs

Root-relative paths such as /assets/css/main.css assume deployment at the domain root. Review asset paths if the application is hosted under a subpath or behind a reverse proxy.

Anything delivered through public static-file serving must be considered accessible to visitors unless a separate access-control mechanism prevents access.

Backend Architecture

Preserve the separation of responsibilities established in the source code.

|Layer           |Responsibility                                                         |
|-—————|————————————————————————|
|Routes          |Define HTTP paths and compose middleware                               |
|Controllers     |Translate HTTP requests into application calls and responses           |
|Services        |Implement business rules and coordinate workflows                      |
|Repositories    |Encapsulate database access                                            |
|Models          |Represent domain entities or database records                          |
|Validators      |Validate untrusted input and request schemas                           |
|Policies        |Enforce resource-specific authorization                                |
|Middleware      |Handle cross-cutting concerns such as authentication and error handling|
|Integrations    |Encapsulate external services such as email, payments, and storage     |
|Workers and jobs|Process background or scheduled work where implemented                 |

Backend development rules

• Validate all untrusted input on the server.
• Enforce authorization for every protected operation.
• Check ownership and resource-level permissions on individual records.
• Use parameterized SQL queries or a safe data-access library.
• Return consistent, appropriately sanitized error responses.
• Avoid exposing stack traces, secrets, internal paths, or sensitive database details.
• Keep external-service calls isolated behind suitable integration modules.
• Confirm that route imports reference real exported functions.
• Avoid duplicating business rules across controllers and routes.
• Make retries and background processing safe for operations that may run more than once.

Frontend visibility is not an authorization mechanism. A hidden navigation link does not prevent direct access to an API endpoint.

Data and Database Management

The repository may contain SQL schema files, migration scripts, seed data, fixtures, and server-side models or repositories.

Database practices

• Treat migrations as versioned, reviewable changes.
• Review schema changes before applying them to shared environments.
• Back up important data before potentially destructive changes.
• Use least-privilege database accounts.
• Keep test and production databases isolated.
• Use synthetic, non-sensitive development fixtures.
• Document recovery and rollback procedures.
• Validate migration results before releasing dependent application code.

Do not assume a database engine is active merely because a schema file or database directory exists. Confirm the configured driver, connection settings, schema, and migration mechanism.

Public and private data

Keep public education catalogues separate from private user and operational records.

Public data may include:

• Course and institution catalogues.
• Public education reference material.
• Published career categories.
• Public FAQs and destination information.

Private or restricted data may include:

• Account and contact details.
• Applications and application status.
• Identity documents and uploaded files.
• Payment events and transaction references.
• Internal support messages.
• Administrative audit records.

Do not place private data in assets/data/ or another publicly served directory.

Security and Privacy

Read SECURITY.md and the relevant security documentation before changing authentication, authorization, file handling, payments, or administration.

Minimum security expectations

• Keep credentials and secrets outside version control.
• Rotate any credential that may have been exposed.
• Enforce server-side authentication and resource-level authorization.
• Configure secure cookies, HTTPS, and trusted proxies appropriately.
• Validate inputs and use context-appropriate output encoding.
• Apply suitable rate limits to login, verification, password-reset, upload, and other abuse-prone endpoints.
• Protect state-changing requests against CSRF where applicable.
• Store private uploads outside public web roots.
• Restrict document access by user, role, purpose, and resource ownership.
• Validate uploaded file size, type, and content; consider malware scanning.
• Verify payment webhooks using the provider’s required signature-verification method.
• Make payment-event processing idempotent and reconcile transactions with the payment provider.
• Avoid logging passwords, authentication tokens, payment secrets, and document contents.
• Audit sensitive administrative operations.
• Define personal-data retention, access, and deletion procedures.
• Review dependency vulnerabilities and security updates regularly.

Security verification

A configuration file, middleware filename, or security-related dependency does not prove that the associated control is correctly enforced. Review the implementation and test both allowed and denied access paths.

Never expose private files or unrestricted administrative functionality merely to simplify frontend development.

Deployment and Operations

Deployment resources may include Dockerfile, docker-compose.yml, .dockerignore, CI workflows, scripts, and operational runbooks.

Pre-deployment checklist

☐ Confirm the supported Node.js version and dependency lockfile.
☐ Review production dependencies and security alerts.
☐ Configure production secrets through the hosting platform.
☐ Verify database connectivity and migration status.
☐ Confirm that backups exist and recovery procedures are documented.
☐ Configure HTTPS, CORS, cookies, and security headers.
☐ Verify private storage and document access controls.
☐ Confirm health checks, structured logs, and error reporting.
☐ Run relevant tests and validation checks.
☐ Deploy to staging and test critical user journeys.
☐ Document the release version and rollback plan.
☐ Monitor application health after deployment.

Docker and container operation

Before using the supplied Docker configuration, verify:

• The Dockerfile uses the correct application entry point.
• Required runtime files are included in the build context.
• Secrets are not copied into the image.
• Storage directories have suitable ownership and permissions.
• Health-check paths match actual server endpoints.
• Persistent data uses appropriate volumes or managed services.
• Network exposure is limited to the services that require it.
• Resource limits and read-only filesystem settings are compatible with the application.

Do not assume that a Compose service, health check, or environment variable works simply because it appears in the configuration.

Database releases

1. Review the migration.
2. Back up affected data when appropriate.
3. Confirm the target environment.
4. Apply the approved migration using the project’s documented process.
5. Verify schema and application compatibility.
6. Monitor errors and data integrity.

Avoid routine production resets or destructive schema operations.

Incident response

If a release causes failures:

1. Identify the affected service and user workflows.
2. Preserve relevant logs without exposing personal data or secrets.
3. Follow the documented incident and rollback procedures.
4. Determine whether the issue affects application code, configuration, dependencies, or data.
5. Validate the recovery before declaring the incident resolved.
6. Document the cause, remediation, and preventive action.

See README-PRODUCTION.md and the relevant operational runbooks for environment-specific procedures.

Contribution Guidelines

Before contributing, read:

• CONTRIBUTING.md
• CODE_OF_CONDUCT.md
• SECURITY.md, when the change affects security-sensitive behavior

Recommended workflow

1. Create a focused branch.
2. Make the smallest coherent change.
3. Follow existing architecture and design conventions.
4. Add or update tests for behavior changes.
5. Update relevant documentation.
6. Run the available quality checks.
7. Review the diff for accidental changes and sensitive information.
8. Submit a pull request using the repository’s actual template, if configured.

Pull request expectations

A pull request should explain:

• The problem being addressed.
• The approach and important implementation decisions.
• Any configuration or database changes.
• Tests performed and their results.
• Security, privacy, accessibility, and compatibility implications.
• Any required deployment or migration steps.

Do not include credentials, production exports, private documents, or unrelated generated files in commits.

Git hooks and CI workflows may provide additional checks. Confirm their actual configuration before relying on them.

Troubleshooting

The server does not start

• Check the Node.js version.
• Run npm ci.
• Inspect available npm scripts.
• Validate required environment variables.
• Review the first actionable startup error.
• Confirm imports and exports for routes, controllers, and configuration modules.
• Check connectivity to required services.

A page or asset returns 404

• Verify the target file and exact filename capitalization.
• Check the requested URL in the browser’s network panel.
• Confirm static-file middleware and the deployment root.
• Review root-relative URLs and any subpath configuration.

An API request fails

• Confirm the server is running.
• Verify the endpoint, method, request payload, and content type.
• Check authentication and resource permissions.
• Review CORS and CSRF configuration as applicable.
• Inspect server logs without exposing secrets.
• Confirm the database and required integrations are available.

Public JSON data fails to load

• Validate the JSON syntax.
• Check the requested URL and HTTP response.
• Confirm the frontend expects the actual top-level data structure.
• Verify that the asset is publicly served.
• Ensure no private data has been placed in the file.

A route fails to mount

• Confirm the route module exists.
• Check its exported handlers.
• Verify that every registered route receives a valid callback.
• Inspect middleware ordering and error output.

A deployment fails

• Review build and runtime logs.
• Verify the start command and Node.js version.
• Check environment configuration and service connectivity.
• Confirm health-check paths and container permissions.
• Follow the relevant deployment runbook.

Documentation Directory

|Topic                   |Reference                                       |
|————————|————————————————|
|Production operations   |`README-PRODUCTION.md`                          |
|Security reporting      |`SECURITY.md`, `docs/security/`                 |
|Contribution standards  |`CONTRIBUTING.md`                               |
|Community standards     |`CODE_OF_CONDUCT.md`                            |
|Release history         |`CHANGELOG.md`                                  |
|Support                 |`SUPPORT.md`                                    |
|Architecture            |`docs/architecture/`                            |
|API                     |`docs/api/`                                     |
|Database                |`docs/database/`, `database/`                   |
|Deployment              |`docs/deployment/`, `infrastructure/deployment/`|
|Operations and incidents|`docs/operations/`, `infrastructure/monitoring/`|
|Automated tests         |`tests/`                                        |
|Public data             |`assets/data/README.md`                         |

This table is a navigation guide. Confirm each referenced file or directory exists before treating it as the authoritative documentation source.

License and Third-Party Notices

Review LICENSE and NOTICE for the repository’s licensing terms and supplementary notices.

Third-party libraries, fonts, images, datasets, and other included materials may have separate licensing, attribution, or usage requirements. Verify those requirements before redistribution or commercial use.

Keeping This README Accurate

Update this document when significant changes affect:

• Repository organization.
• Supported runtime versions.
• Installation or startup procedures.
• Environment configuration.
• Database setup and migrations.
• Security requirements.
• Testing and release workflows.
• Deployment and operational procedures.

Prefer instructions verified against the current codebase over assumptions based on filenames or planned features.

────────

MedOrbits — Study · Work · Grow

Education discovery. Admissions guidance. Career opportunities. Recruitment services.