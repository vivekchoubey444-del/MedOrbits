Deployment Documentation

Project: MedOrbits
Purpose: Provide a central reference for local development, staging validation, and production deployment procedures.

1. Overview

This section documents the deployment lifecycle for MedOrbits, from local development through pre-production validation to production release.

Deployment instructions must reflect the actual repository configuration, package.json scripts, environment variables, database migration process, and configured Render service.

Examples in documentation must not be treated as confirmation that a particular command, health endpoint, or deployment capability exists.

2. Documentation Index

Document	Purpose
local-development.md	Developer setup, dependency installation, environment configuration, database preparation, and local validation.
staging.md	Pre-production deployment, integration testing, security checks, and release approval.
production.md	Production release preparation, deployment, post-release verification, monitoring, and recovery.

3. Local Development

Use local-development.md to configure a safe development environment.

Before following its commands:

* Verify the supported Node.js version.
* Confirm the package manager and committed lockfile.
* Inspect available scripts in package.json.
* Review .env.example and required environment variables.
* Confirm whether MySQL and other external services are required.
* Use isolated development resources and synthetic data.

Never copy production credentials or private user records into local development.

4. Staging Validation

Use staging.md to validate the intended release before production.

Staging should use isolated resources and test credentials. Validation should cover the workflows affected by the release, including relevant authentication, database, application, document, search, notification, and payment operations.

Payment testing must use sandbox mode. Prevent staging from modifying production records or sending unintended live communications.

Record the tested commit, migration status, results, known issues, and release approval.

5. Production Deployment

Use production.md for the approved production release process.

Before deployment:

* Complete required code review and automated checks.
* Verify Render service configuration and environment variables.
* Review database migration compatibility and recovery requirements.
* Confirm backup and recovery arrangements appropriate to the release.
* Identify the release owner and previous known-good version.

After deployment, verify startup and critical workflows, review logs, and monitor the available application and dependency metrics. Follow the documented recovery procedure if release acceptance criteria are breached.

6. Render Configuration

MedOrbits uses Render as its deployment platform. The instructions in this section must match the actual configured Render service.

Verify the following before documenting exact commands or behavior:

* Service type: Confirm the configured service type.
* Runtime: Match the deployed Node.js version to the repository’s runtime policy.
* Build command: Use the command configured in Render and supported by the project.
* Start command: Use the actual configured command and corresponding package.json script, if applicable.
* Environment variables: Document variable names and purposes without recording secret values.
* Database connectivity: Confirm the deployed database engine, connection configuration, and network access.
* Health checks: Document an endpoint only after verifying that it exists and is configured in Render.
* Deployment triggers: Confirm the connected branch, automatic deployment settings, and any required approval process.
* Logs and recovery: Document the available log access, deployment history, and supported rollback or recovery options.

Do not assume Render automatically handles database migrations, creates a health endpoint, or provides database rollback.

7. Release Consistency

Maintain traceability throughout the deployment lifecycle.

1. Identify the reviewed commit or immutable artifact.
2. Deploy that version to staging.
3. Record test and migration results.
4. Approve the release.
5. Deploy the approved version to production through the configured workflow.
6. Verify the deployed version and critical workflows.
7. Record the final outcome and any incidents.

Where the deployment platform rebuilds from source rather than promoting the same artifact, verify that the production build corresponds to the approved commit and dependency lockfile.

8. Failure and Recovery

Deployment recovery must account for both application and data state.

* Identify the last known-good application version.
* Assess database compatibility before rolling back application code.
* Determine whether migrations are reversible or require a forward fix.
* Consider external side effects such as payments, emails, and third-party updates.
* Verify application health and data integrity after recovery.
* Record the incident, mitigation, and follow-up actions.

An application rollback does not automatically reverse database changes or external transactions.

9. Documentation Maintenance

Update this section when any of the following changes:

* Node.js or package-manager requirements.
* Available package scripts.
* Environment-variable requirements.
* Render service configuration.
* Database migration or recovery procedures.
* Staging validation requirements.
* Production deployment or monitoring procedures.
* Release approval or incident-handling processes.

Review all linked paths whenever documentation files are moved or renamed.

10. Related Documentation

* ../development/local-development.md — Local setup, if maintained at this path.
* ../database/README.md — Database documentation, if present.
* ../database/migrations.md — Migration safeguards, if present.
* ../architecture/overview.md — Application architecture.
* ../architecture/data-flow.md — Request and processing flows.

Ensure the relative paths match the actual repository structure.

Accuracy rule: The repository configuration and deployed Render service are authoritative. Document verified commands, endpoints, and deployment behavior rather than inferred defaults.