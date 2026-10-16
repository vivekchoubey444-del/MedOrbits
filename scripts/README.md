MedOrbits — Scripts Documentation

Directory: scripts/
Project: MedOrbits
Runtime: Node.js 20+
Python: Required only for Python-based utilities
Status: Repository operational documentation
Primary purpose: Environment validation, database connectivity checks, health monitoring, security configuration checks, migration and seed safeguards, and structured data validation.

⸻

1. Overview

The scripts/ directory contains command-line utilities that support MedOrbits development, testing, deployment preparation, and data quality assurance.

These scripts help maintainers:

* Validate required environment configuration.
* Check selected security-related settings.
* Verify database connectivity through the configured database adapter.
* Check application health endpoints.
* Validate JSON datasets and selected structural requirements.
* Validate data using Python-based tooling where implemented.
* Control access to database migration and seed operations.
* Support repeatable validation in local development and CI/CD workflows.

Important: Documentation describes the intended responsibilities of these utilities. Before using a script in production, verify its actual implementation, dependencies, argument handling, exit codes, and integration with the current MedOrbits application.

Migration and seed scripts must remain non-operational until their approved adapters, authorization controls, and recovery procedures have been implemented and tested.

2. Directory Structure

scripts/
├── README.md
├── check-db.js
├── check-env.js
├── health-check.js
├── migrate.js
├── security-check.js
├── seed.js
├── validate-data.py
└── validate-json.js

Script responsibilities

File	Responsibility
check-db.js	Checks database connectivity using the configured database adapter.
check-env.js	Validates required environment variables and selected configuration combinations.
health-check.js	Sends an HTTP request to a configured application health endpoint.
migrate.js	Provides a safety-controlled entry point for approved database migrations.
security-check.js	Checks selected security-related environment settings.
seed.js	Provides a safety-controlled entry point for approved seed data.
validate-data.py	Python-based data validation utility; confirm its actual validation rules and dependencies before use.
validate-json.js	Validates JSON syntax, duplicate keys, configured files, and selected structural conditions.

The README.md documents usage and operational expectations for the directory.

3. Requirements and Setup

3.1 Runtime requirements

* Node.js 20 or later.
* Project dependencies installed from the repository root.
* Python 3 if running validate-data.py.
* A configured .env file for applicable local workflows.
* Database configuration for database connectivity checks.
* A reachable application health endpoint for HTTP health checks.
* Required datasets in assets/data/ for JSON validation.

Check the installed runtimes:

node —version
npm —version
python3 —version

Install project dependencies:

npm install

Use the repository’s committed lockfile and preferred package-manager workflow in CI/CD. When using npm with a committed package-lock.json, use npm ci in clean automated environments.

3.2 Run from the project root

Unless a script explicitly supports another working directory, execute commands from the MedOrbits repository root.

This helps ensure relative paths, configuration files, and data directories resolve consistently.

4. Script Usage

4.1 Environment validation

node scripts/check-env.js

Purpose:

* Check required environment variables.
* Validate selected configuration combinations.
* Identify selected production configuration issues.

This check does not establish that the database is reachable or that every external service is operational.

4.2 Security configuration check

node scripts/security-check.js

Purpose:

* Inspect selected security-related environment settings.
* Check session-secret configuration where supported.
* Identify selected insecure or incomplete configuration.

This utility is not a substitute for a comprehensive application security audit, dependency audit, penetration test, or review of authentication and authorization logic.

Never print secret values in diagnostic output.

4.3 Database connectivity check

node scripts/check-db.js

Purpose:

* Verify database connectivity using the configured adapter.
* Report connection failures without exposing credentials.
* Close database resources after checking, where supported.

The adapter must implement the interface expected by the script. The documented interface includes checkConnection() and close(), but the actual adapter implementation is authoritative.

Before running the check, verify:

* Database service availability.
* Host, port, database name, and authentication configuration.
* Network and firewall permissions.
* Database adapter compatibility.
* Required environment variables.

MedOrbits may use discrete MySQL settings or a database URL, depending on the active adapter. Do not assume both configurations are supported simultaneously.

4.4 Application health check

Example using a POSIX-compatible shell:

HEALTH_CHECK_URL=“https://your-domain.example/health” \
HEALTH_CHECK_TIMEOUT_MS=5000 \
node scripts/health-check.js

Replace the example URL with the actual deployed MedOrbits health endpoint.

The utility should verify the expected HTTP response and apply a bounded request timeout.

Additional configuration, if implemented:

HEALTH_CHECK_EXPECT_STATUS=200

Confirm the accepted status-code configuration and default behavior in health-check.js.

A successful HTTP health check does not automatically prove that every database, background worker, external API, or business workflow is functioning correctly.

4.5 JSON data validation

Run the default validation:

node scripts/validate-json.js

Validate configured datasets strictly:

node scripts/validate-json.js —strict

Specify a data directory:

node scripts/validate-json.js —dir=assets/data

Generate machine-readable output:

node scripts/validate-json.js —json

Combine strict validation and JSON output:

node scripts/validate-json.js —strict —json

Verify supported arguments in the implementation. These commands are valid documentation targets only if the current script recognizes the corresponding options.

The validator may check:

* JSON syntax.
* Duplicate object keys.
* Expected top-level value types.
* Missing or inaccessible configured files.
* Selected structural requirements.
* Strict-mode conditions.

It does not necessarily validate every application-specific schema, identifier relationship, foreign reference, business rule, or cross-dataset dependency.

4.6 Python data validation

Run the Python validator when its dependencies and invocation contract have been confirmed:

python3 scripts/validate-data.py

Before using this command in CI/CD, verify:

* Supported command-line arguments.
* Required Python version and packages.
* Input directory and file-selection rules.
* Validation rules and report format.
* Error handling and exit-code behavior.

Do not assume that validate-data.py duplicates or replaces validate-json.js. Keep their responsibilities distinct and documented according to the actual implementation.

4.7 Database migration runner

Example development invocation:

NODE_ENV=development \
ALLOW_MIGRATIONS=true \
node scripts/migrate.js

Current operational status: The migration runner remains a safety scaffold until the approved migration library, database adapter, migration history, and recovery procedures are implemented and reviewed.

Before enabling migrations, establish:

* Reviewed, version-controlled migration files.
* Migration ordering and execution tracking.
* Transaction and rollback or recovery strategies.
* Database backup and restoration procedures.
* Environment-specific authorization.
* Protection against concurrent migration execution.
* Clear failure reporting and audit logging.

Production migrations must require explicit authorization and additional confirmation supported by the implementation. An environment variable alone is not sufficient authorization.

Do not execute migrations against a production database until the complete workflow has been tested against staging.

4.8 Database seed runner

Example development invocation:

NODE_ENV=development \
ALLOW_SEEDING=true \
node scripts/seed.js

Current operational status: The seed runner remains a safety scaffold until approved seed files, database adapters, and execution safeguards are implemented.

Before enabling seeding, verify:

* The intended target database.
* The approved seed-file allowlist.
* Idempotency and duplicate-record handling.
* Transaction and failure-recovery behavior.
* Protection against overwriting real data.
* Production execution restrictions.
* Audit logging and authorization.

Use synthetic fixtures for development and testing. Never load unreviewed fixtures or real user data into an environment without appropriate authorization and safeguards.

5. Recommended Execution Order

For local development and deployment preparation, run the applicable checks in this order:

1. Validate environment configuration.
2. Check selected security settings.
3. Validate JSON datasets.
4. Run Python data validation if applicable.
5. Verify database connectivity.
6. Start the application and check its health endpoint.
7. Run approved migrations only when required.
8. Run approved seed operations only when explicitly needed.

Example pre-deployment validation:

node scripts/check-env.js &&
node scripts/security-check.js &&
node scripts/validate-json.js —strict &&
node scripts/check-db.js

This sequence stops when a command returns a non-zero exit code.

If Python validation is part of the approved workflow, add it explicitly:

python3 scripts/validate-data.py

Run the HTTP health check separately after the application has started or has been deployed.

This sequence is an example workflow, not an existing orchestration system. Confirm that each command is compatible with the current environment before incorporating it into deployment automation.

6. Environment Variables

The exact requirements depend on the implementation of each script and the active application configuration.

Variable	Intended purpose
NODE_ENV	Identifies the application environment.
SESSION_SECRET	Secret used by the application’s session mechanism.
DATABASE_URL	Database connection URL, if supported by the adapter.
MYSQL_HOST	MySQL server hostname, if discrete MySQL configuration is supported.
MYSQL_DATABASE	MySQL database name.
MYSQL_USER	MySQL database username.
MYSQL_PASSWORD	MySQL database password, if required by the adapter.
HEALTH_CHECK_URL	HTTP endpoint used by the health-check script.
HEALTH_CHECK_TIMEOUT_MS	HTTP request timeout in milliseconds, if supported.
HEALTH_CHECK_EXPECT_STATUS	Expected HTTP response status, if supported.
ALLOW_MIGRATIONS	Explicit migration permission flag.
CONFIRM_PRODUCTION_MIGRATION	Additional production migration confirmation, if implemented.
ALLOW_SEEDING	Explicit seed-operation permission flag.

This table describes intended configuration, not a declaration that every variable is required or consumed by every script.

Inspect the following before finalizing deployment configuration:

* scripts/check-env.js
* scripts/security-check.js
* scripts/check-db.js
* scripts/health-check.js
* scripts/migrate.js
* scripts/seed.js
* src/config/database.js, if present

Do not place real credentials, session secrets, private keys, or production connection strings in source control.

For hosted deployments, configure secrets through the hosting platform’s environment-variable management.

7. Exit Codes and Error Handling

Command-line validation scripts should follow a consistent exit-code convention:

Exit code	Meaning
0	The requested checks completed successfully.
Non-zero	Validation failed, required configuration is missing, a connection failed, or another blocking error occurred.

The implementation is authoritative. Confirm that each script actually follows this convention before relying on it in automated pipelines.

Recommended behavior:

* Report actionable errors to standard error.
* Keep normal results concise.
* Never expose secret values.
* Use non-zero exit codes for blocking failures.
* Close database connections and other resources.
* Avoid swallowing unexpected exceptions.
* Produce machine-readable output only when explicitly requested.
* Ensure logs do not contain authentication tokens, sensitive headers, personal data, or database credentials.

8. CI/CD Integration

Validation scripts can be incorporated into a continuous integration workflow after their behavior has been verified.

Example shell step:

set -eu
node scripts/check-env.js
node scripts/security-check.js
node scripts/validate-json.js —strict

Add database and Python checks only when the CI environment provides the required configuration and dependencies.

CI/CD safeguards

* Use a supported Node.js version.
* Install dependencies reproducibly.
* Supply test-only credentials through secure CI variables.
* Validate datasets before packaging or deployment.
* Keep production secrets out of build logs and artifacts.
* Separate validation from database-changing operations.
* Restrict migration permissions to approved deployment workflows.
* Do not run seed scripts automatically against production.
* Preserve actionable failure logs without exposing sensitive data.

Never add migration or seed execution to a deployment pipeline while the corresponding scaffold remains non-operational or insufficiently tested.

9. Security and Operational Guidelines

Follow these rules when maintaining or executing scripts:

1. Never commit .env files or real credentials.
2. Never log passwords, access tokens, session secrets, or complete database connection strings.
3. Apply least-privilege operating-system and database permissions.
4. Verify the target database before every schema-changing or data-changing operation.
5. Keep migration and seed operations disabled until reviewed and approved.
6. Back up production data before approved schema changes.
7. Test migrations and recovery procedures in staging.
8. Use bounded network timeouts for HTTP and database checks.
9. Validate external inputs and command-line arguments.
10. Avoid destructive defaults and implicit production execution.
11. Review dependency vulnerabilities and update unsupported packages.
12. Test both successful and unsuccessful execution paths.
13. Keep CI/CD permissions narrowly scoped.
14. Ensure error messages remain useful without disclosing sensitive information.

A successful script exit code confirms only the checks implemented by that script. It does not establish that the entire MedOrbits platform is secure or production-ready.

10. Troubleshooting

Missing environment variables

Run:

node scripts/check-env.js

Review the reported variable names and configure missing values in the appropriate local or hosting environment.

Database connection failure

Run:

node scripts/check-db.js

Check service availability, credentials, network access, adapter configuration, and database permissions.

Avoid printing secrets while debugging.

Health check failure

Verify:

* HEALTH_CHECK_URL.
* Expected HTTP status.
* DNS resolution and network connectivity.
* TLS certificate validity.
* Endpoint availability.
* Configured timeout.
* Application startup and health-route configuration.

Invalid JSON data

Run:

node scripts/validate-json.js —strict

Review the reported file paths, syntax errors, duplicate keys, missing files, and structural failures.

Python validator failure

Check the Python runtime and script requirements:

python3 —version
python3 scripts/validate-data.py

Install only the documented dependencies and confirm the expected input files and command-line options.

Migration or seed operation stops

This may be expected while the runner remains an unconfigured safety scaffold.

Do not bypass safety checks. Review the implementation, configure the approved adapter, and complete the required authorization, testing, backup, and recovery procedures.

Script is missing or an argument is rejected

Confirm the repository path, filename, supported command-line options, runtime version, and current implementation before changing deployment commands.

11. Testing and Maintenance

When adding or modifying a script:

1. Document its purpose, inputs, and supported arguments.
2. Identify required and optional environment variables.
3. Test valid and invalid configurations.
4. Test missing files, unavailable services, and malformed inputs.
5. Verify exit codes and error messages.
6. Ensure sensitive information is never written to logs.
7. Add automated tests for success and failure cases.
8. Verify compatibility with Node.js 20+ or the applicable Python runtime.
9. Update the relevant CI/CD workflow only after review.
10. Update this README whenever implementation behavior changes.

For migration and seed tooling, also test duplicate execution, partial failures, concurrency, authorization, and recovery against a non-production database.

12. Implementation Status

The scripts directory contains both operational utilities and potentially incomplete scaffolds.

Component	Documentation status
Environment validation	Verify implementation and required-variable rules.
Security configuration checks	Verify coverage and production requirements.
Database connectivity	Verify adapter interface and connection cleanup.
HTTP health check	Verify endpoint, timeout, and status handling.
JSON validation	Verify arguments, file selection, and validation rules.
Python data validation	Inspect validate-data.py before defining its supported workflow.
Migration runner	Not operational until the approved migration integration is completed.
Seed runner	Not operational until the approved seeding integration is completed.

Do not mark a script as production-ready solely because it exists or its documentation has been completed.

13. Related Project Components

Where applicable, coordinate these scripts with:

* assets/data/ — structured application datasets.
* src/config/database.js — database configuration and adapter.
* src/ — application services, controllers, routes, and supporting modules.
* package.json — runtime requirements, dependencies, and npm scripts.
* package-lock.json — reproducible npm dependency installation.
* .github/workflows/ — CI/CD automation and validation workflows.
* Deployment environment configuration — runtime settings and secrets.

Verify that referenced paths exist in the current repository before relying on them.

14. Ownership and Documentation Policy

Owner: MedOrbits project maintainers
Location: scripts/README.md
Supported Node.js runtime: Node.js 20+
Documentation purpose: Development, validation, deployment preparation, and operational safety.

This document provides repository-level guidance. The current source code, approved deployment configuration, security requirements, and database procedures take precedence whenever they differ from the examples above.