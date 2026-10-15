MedOrbits

Education · Admissions · Careers · Recruitment

MedOrbits is a web platform structure for organizing education discovery, admissions guidance, study-abroad information, career resources, recruitment services, user accounts, and administrative workflows. This repository combines a public-facing HTML/CSS/JavaScript frontend with a Node.js/Express backend, data files, database resources, tests, deployment documentation, and operational tooling.

> **Implementation note:** A directory or filename in this repository describes intended organization; it does not by itself mean that the feature, endpoint, integration, or workflow is implemented. Confirm actual behavior in the source code and configuration before relying on it.

Contents

• Project goals
• Technology and architecture
• Repository structure
• Getting started
• Environment configuration
• Running and testing
• Frontend conventions
• Backend conventions
• Data and database
• Security and privacy
• Deployment and operations
• Contribution workflow
• Troubleshooting
• Documentation map

Project goals

The planned platform brings together:

• Education discovery: courses, colleges, universities, education pathways, and study destinations.
• Admissions support: eligibility information, entrance examinations, counselling resources, document checklists, and admission-process guidance.
• Education planning: fee information, scholarships, hostels, student loans, guides, and FAQs.
• Career services: job listings, internships, resume support, interview preparation, sector pages, and location-based discovery.
• Recruitment: employer services, job posting, applicant management, candidate sourcing, and recruitment coordination.
• User accounts: registration, authentication, verification, profile management, applications, documents, notifications, payments, subscriptions, and support.
• Administration: management interfaces for users, roles, applications, education records, jobs, documents, payments, subscriptions, support, and audit logs.
• Platform operations: API services, database migrations, data validation, tests, security checks, monitoring, backups, and deployment guidance.

The availability of each capability depends on its implementation, configuration, external providers, and deployment environment.

Technology and architecture

The repository is organized around these components:

|Component                 |Location                                                      |Responsibility                                                                 |
|—————————|—————————————————————|-——————————————————————————|
|Public website            |Root `index.html`, `pages/`, `education/`, `career/`, `legal/`|Public pages and information architecture                                      |
|Account interfaces        |`account/`                                                    |User-facing account and dashboard pages                                        |
|Administration UI         |`admin/`                                                      |Administrative interfaces                                                      |
|Static assets             |`assets/`                                                     |CSS, JavaScript, images, icons, fonts, and public JSON data                    |
|HTTP server               |`server.js` and `src/`                                        |Node.js/Express application and API organization                               |
|Data model and persistence|`database/`, `src/models/`, `src/repositories/`               |Database schema, migrations, models, and data access                           |
|Tests                     |`tests/`                                                      |Unit, integration, API, database, security, end-to-end, and accessibility tests|
|Operations                |`infrastructure/`, `scripts/`                                 |Deployment, monitoring, backups, validation, and maintenance                   |
|Project documentation     |`docs/` and directory-level `README.md` files                 |Architecture, API, security, deployment, and operations guides                 |

The project includes a package.json and package-lock.json. Use the package scripts actually defined in package.json; do not assume a script exists merely because it is mentioned in this README.

Repository structure

medorbits/
├── index.html                  # Public homepage
├── README.md                   # This guide
├── README-PRODUCTION.md        # Production-specific guidance
├── package.json                # Node.js package metadata and scripts
├── package-lock.json           # Locked npm dependency tree
├── server.js                   # Server entry point, if configured as such
├── .nvmrc                      # Preferred Node.js version
├── .env.example                # Environment-variable template; no real secrets
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── LICENSE
├── NOTICE
├── SECURITY.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── SUPPORT.md
├── .editorconfig
├── .prettierrc.json
├── .eslintrc.json
├── .github/                    # CI, security, dependency and deployment workflows
├── .husky/                     # Optional Git hooks
├── pages/                      # About, services, contact, forms and system pages
├── account/                    # Login, registration, profile and account workflows
├── education/                  # Courses, institutions, admissions and study destinations
├── career/                     # Jobs, internships, employer tools and career resources
├── admin/                      # Administrative interfaces
├── legal/                      # Privacy, terms, refunds and other legal pages
├── assets/
│   ├── css/                    # Design system and page/component styles
│   ├── js/                     # Frontend modules and utilities
│   ├── data/                   # Public JSON catalogues and content
│   ├── images/                 # Logos, hero images, course and destination imagery
│   ├── icons/                  # Education, career and social icons
│   ├── fonts/                  # Local font assets and usage notes
│   └── documents/              # Public document assets and documentation
├── public/                     # Public metadata, manifest and crawler files
├── database/
│   ├── schema.sql
│   ├── migrations/
│   ├── seeds/
│   └── fixtures/
├── storage/                    # Runtime storage; keep private files out of public web roots
├── src/
│   ├── app.js
│   ├── config/                 # Environment, database, CORS, security and integrations
│   ├── routes/                 # HTTP route definitions
│   ├── controllers/             # Request handling
│   ├── middleware/              # Authentication, authorization, validation and security
│   ├── services/                # Business logic and external-service orchestration
│   ├── models/                  # Domain models
│   ├── repositories/             # Data access
│   ├── validators/               # Input validation
│   ├── policies/                 # Resource-level authorization policies
│   ├── utils/                    # Shared server utilities
│   ├── integrations/             # Email, payment, storage and AI provider adapters
│   ├── templates/                # Email and document templates
│   ├── workers/                  # Background workers
│   └── jobs/                     # Scheduled or queued job definitions
├── infrastructure/              # Backup, database, monitoring, deployment and queue runbooks
├── scripts/                     # Environment checks, migration, seed and validation scripts
├── tests/                       # Automated test suites
└── docs/                        # Architecture, API, database, security, deployment and operations

For the complete file-by-file inventory, use the repository tree and the README files inside each directory. Keep this overview synchronized with the actual repository.

Getting started

Prerequisites

• Git.
• A Node.js version compatible with package.json and .nvmrc.
• npm.
• Any database, email, payment, storage, queue, or other provider required by the features you intend to run.
• Environment values for enabled integrations.

Check the required Node.js version:

cat .nvmrc
node —version
npm —version

If you use nvm, switch to the version specified by the project:

nvm install
nvm use

Install dependencies

From the repository root:

npm ci

Use npm install only when intentionally updating the dependency lockfile or when no compatible lockfile is available.

Configure environment variables

Create a local environment file from the template:

cp .env.example .env

On Windows PowerShell:

Copy-Item .env.example .env

Edit .env with values appropriate for your local environment. Never commit .env, production credentials, API keys, payment secrets, private keys, or real user data.

Inspect available commands

Before starting the application, inspect the scripts and server entry points:

npm run

Then use the appropriate command defined by the repository. Common script names in Node projects include dev, start, test, lint, and build, but their presence is not guaranteed. Do not run a command that is not listed in package.json.

If a database is required, configure it and apply the project’s documented migrations before testing database-backed features.

Environment configuration

.env.example should document the variable names required by the application without containing real credentials. Keep configuration centralized and validate required variables at startup.

Depending on enabled functionality, configuration may include:

• Application environment and listening port.
• Database connection settings.
• Session and authentication secrets.
• CORS allowed origins.
• Email provider configuration.
• File/object storage settings.
• Payment provider keys and webhook secrets.
• Queue or worker configuration.
• AI provider endpoint and key, if an AI integration is implemented.
• Logging and monitoring settings.

Use the names and formats actually expected by src/config/ and server.js. Do not invent production values. A missing required variable should be reported clearly without exposing secret values in logs.

Running and testing

Use only commands defined by the repository’s package.json and CI configuration. A typical workflow is:

1. Install dependencies.
2. Configure environment variables.
3. Start required local services.
4. Apply database migrations and seed only non-sensitive development data.
5. Start the application using the documented development command.
6. Run relevant tests and quality checks.
7. Verify the health endpoint and key user flows.

Test coverage is organized under tests/:

• unit/ — isolated functions and business logic.
• integration/ — interactions between application components.
• api/ — HTTP endpoints and response behavior.
• database/ — schema, queries, migrations and persistence.
• security/ — authentication, authorization, validation and abuse controls.
• e2e/ — complete browser or application workflows.
• accessibility/ — keyboard, semantic and accessibility checks.
• fixtures/ — controlled test data.

Do not use production credentials or real personal documents in automated tests.

Frontend conventions

Shared structure

• Keep shared styling in assets/css/ and reusable browser logic in assets/js/.
• Use the shared navigation, footer, opening animation, typography, and design tokens consistently across pages.
• Keep page-specific changes isolated when possible; do not unintentionally alter the established homepage or shared layout when adding a new page.
• Use root-relative asset URLs only when the site is deployed at the domain root. If deployed under a subpath, review path handling.
• Ensure navigation targets correspond to files or routes that actually exist.

Visual design

The existing MedOrbits design direction uses premium dark surfaces, carefully controlled accent colours, readable contrast, responsive layouts, and a polished opening animation. Follow the relevant page’s established theme when extending the site. Do not replace shared header/footer/animation behavior without an explicit design decision.

Accessibility and performance

• Use semantic landmarks and a logical heading hierarchy.
• Provide meaningful alternative text for informative images.
• Ensure interactive controls work with a keyboard and expose visible focus states.
• Label form fields and associate validation messages with their controls.
• Respect prefers-reduced-motion.
• Lazy-load below-the-fold images where appropriate.
• Avoid loading large media or scripts unnecessarily.
• Test at mobile, tablet and desktop widths.

Public JSON data

Files under assets/data/ are delivered to the browser and must be treated as public. Do not place secrets, private user records, payment data, access-controlled records, or uploaded identity documents there. Validate JSON and preserve consistent IDs between related catalogues.

Backend conventions

The src/ tree separates application responsibilities. Preserve the separation where it exists:

1. Routes define HTTP paths and middleware composition.
2. Controllers translate HTTP requests into service calls and responses.
3. Services implement business rules and coordinate integrations.
4. Repositories isolate persistence and data-access logic.
5. Models represent domain entities or database records.
6. Validators check untrusted input.
7. Policies enforce resource-specific access rules.
8. Middleware provides cross-cutting concerns such as authentication, rate limiting, request IDs and error handling.

Use consistent error responses, validate inputs on the server, authorize every protected operation, and avoid returning internal errors or sensitive fields to clients. Route definitions should reference real exported controller functions; check imports and exports when a route fails to mount.

Data and database

The repository includes database/schema.sql, migrations, seeds, fixtures, and server-side model/repository folders.

• Treat migrations as versioned changes to the database schema.
• Review migration effects before running them against a shared or production database.
• Back up important data before destructive changes.
• Keep seed data synthetic and non-sensitive.
• Use parameterized queries or a safe data-access library.
• Apply least-privilege database credentials.
• Document rollback and recovery steps.
• Do not assume a database engine or schema is active until verified from configuration and code.

Public catalogue data in assets/data/ is separate from private application data. Account records, identity documents, payment events and audit records should use appropriate backend storage and access controls.

Security and privacy

Read SECURITY.md and docs/security/ before changing authentication, authorization, file handling, payments, or administrative features.

Minimum expectations:

• Keep secrets outside source control and rotate any credential that may have been exposed.
• Enforce server-side authentication and authorization; hiding a frontend link is not access control.
• Use secure session and cookie settings appropriate to the deployment.
• Validate and sanitize all untrusted input.
• Apply rate limits to authentication, verification, password reset, upload and other abuse-prone endpoints.
• Protect state-changing requests against CSRF where applicable.
• Check file type, size and content; store private uploads outside public web roots.
• Verify payment webhooks cryptographically and make payment processing idempotent.
• Avoid logging passwords, tokens, payment credentials, or document contents.
• Maintain audit trails for sensitive administrative actions.
• Keep dependencies updated and review security alerts.
• Provide clear retention and deletion behavior for personal data.

Never claim a control is implemented solely because a related file exists. Verify the actual code and deployment configuration.

Deployment and operations

Deployment-related files include Dockerfile, docker-compose.yml, .dockerignore, infrastructure/deployment/, monitoring runbooks, backup scripts, and GitHub Actions workflows.

Before deploying:

1. Confirm the Node.js version and dependency lockfile.
2. Set production environment variables in the hosting platform’s secret manager.
3. Confirm database connectivity, migrations and backups.
4. Configure HTTPS, allowed origins, session cookies and security headers.
5. Confirm private storage is not publicly served.
6. Verify health checks and logs.
7. Run tests and security checks.
8. Deploy to staging and smoke-test critical flows.
9. Document the release and rollback plan.
10. Monitor errors and service health after release.

Use infrastructure/deployment/rollback.md or the relevant runbook if a release needs to be reverted. Do not run destructive database commands as a routine deployment step.

Contribution workflow

1. Read CONTRIBUTING.md and CODE_OF_CONDUCT.md.
2. Create a focused branch for the change.
3. Keep changes small and avoid unrelated formatting or design modifications.
4. Add or update tests for behavior changes.
5. Update the relevant README or technical documentation.
6. Run available lint, test, validation and security checks.
7. Open a pull request using .github/PULL_REQUEST_TEMPLATE.md.
8. Never include secrets, production exports, or private user documents in a commit.

Git hooks under .husky/ may run local checks. CI workflows under .github/workflows/ define automated checks; confirm their actual configuration before relying on them.

Troubleshooting

The server does not start

• Confirm the Node.js version.
• Run npm ci.
• Inspect the startup command in package.json.
• Check required environment variables.
• Review the server log for the first actionable error.
• Confirm all imported route/controller modules exist and export the expected functions.

A page or asset returns 404

• Verify the file exists at the referenced path.
• Check capitalization and file extensions.
• Confirm static-file middleware and deployment root configuration.
• Review whether root-relative URLs match the deployment path.

API requests fail

• Confirm the server is running and the API route is mounted.
• Check CORS configuration, request method, URL, payload and authentication state.
• Inspect server logs without exposing secrets.
• Confirm the database and required integrations are available.

JSON data does not load

• Validate the file with a JSON parser.
• Check the URL in the browser network panel.
• Confirm the expected top-level key matches the frontend code.
• Ensure the file is in a publicly served location and contains no private data.

Deployment fails

• Review the hosting build and runtime logs.
• Confirm the configured start command and Node.js version.
• Verify environment variables and service connectivity.
• Check health-check paths and the deployment runbook.

Documentation map

|Topic                   |Documentation                                   |
|————————|————————————————|
|Security reporting      |`SECURITY.md`, `docs/security/`                 |
|Contribution standards  |`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`         |
|Release history         |`CHANGELOG.md`                                  |
|Support                 |`SUPPORT.md`                                    |
|Architecture            |`docs/architecture/`                            |
|API                     |`docs/api/`                                     |
|Database                |`docs/database/`, `database/`                   |
|Deployment              |`docs/deployment/`, `infrastructure/deployment/`|
|Operations and incidents|`docs/operations/`, `infrastructure/monitoring/`|
|Tests                   |`tests/`                                        |
|Public data             |`assets/data/README.md`                         |

License and notices

Review LICENSE and NOTICE for the terms that apply to this repository and its included materials. Third-party assets and dependencies may have separate license requirements.

────────

MedOrbits — Study · Work · Grow

Keep this README accurate as the repository evolves. Document implemented behavior, required configuration, and operational procedures based on the current source code rather than assumed functionality.