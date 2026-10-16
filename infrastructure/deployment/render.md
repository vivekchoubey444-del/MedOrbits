Render Deployment Guide

Project: MedOrbits
Platform: Render
Purpose: Document the configuration, deployment, and verification process for hosting MedOrbits on Render.

1. Service Setup

Configure the Render service to match the repository structure, package.json, and supported Node.js runtime.

* [ ]	Select the correct GitHub repository and deployment branch.
* [ ]	Configure the Node.js version according to .nvmrc, package.json, and the supported runtime.
* [ ]	Set the build command using the actual scripts defined in package.json.
* [ ]	Set the start command to launch the intended server entry point.
* [ ]	Configure required environment variables through Render’s environment settings.
* [ ]	Configure the health-check path using an endpoint verified to exist in the application.
* [ ]	Confirm the service type and deployment settings are appropriate for the application.
* [ ]	Review build and deployment settings before the first production release.

Important: Do not copy a build command, start command, script name, or health-check path into the Render dashboard without confirming that it exists and is appropriate for the current codebase.

2. Environment Variables and Secrets

Configure production secrets through Render’s environment settings rather than committing them to the repository.

Depending on the integrations enabled, the application may require:

* Database connection settings.
* Session and authentication secrets.
* Email service credentials.
* Payment provider credentials and webhook secrets.
* AI provider credentials and endpoint configuration.
* External API keys and service-specific configuration.
* Application environment and port settings expected by the server.

Use the exact environment variable names read by the application. Confirm required variables against the current configuration files, server entry point, and deployment requirements.

Secret-handling requirements

* Never commit production secrets to Git.
* Do not print credentials or sensitive environment values in deployment logs.
* Rotate exposed credentials promptly.
* Restrict access to production environment settings.
* Keep development, staging, and production credentials separate.

3. Database Connectivity

Before deploying, verify that the production application can connect to its configured database.

* [ ]	Confirm the database host, port, database name, username, and connection settings.
* [ ]	Verify network access between Render and the database provider.
* [ ]	Confirm TLS requirements and certificate validation where applicable.
* [ ]	Use a dedicated database account with least-privilege permissions.
* [ ]	Confirm migrations are reviewed and compatible with the application release.
* [ ]	Check connection limits, connection pooling, and expected workload.
* [ ]	Confirm a current backup and documented recovery procedure are available.
* [ ]	Verify that database credentials are stored securely.

Do not assume that a database is reachable merely because the application builds successfully.

4. Deployment Procedure

1. Review and approve the release commit.
2. Confirm automated tests, linting, and security checks have passed.
3. Verify the required environment variables and database settings.
4. Confirm that migrations and startup behavior have been reviewed.
5. Push or merge the approved commit into the configured deployment branch.
6. Monitor the Render deployment process and build logs.
7. Review startup logs for configuration errors, database failures, or missing dependencies.
8. Confirm that the configured health check succeeds.
9. Run the deployment verification steps below.
10. Record the release identifier, deployment time, and outcome.

Follow the repository’s approved release procedure when deploying production changes.

5. Deployment Verification

* [ ]	Review build and startup logs for errors.
* [ ]	Confirm the service reaches a healthy state.
* [ ]	Verify that the expected release is running.
* [ ]	Test authentication and session handling.
* [ ]	Test a representative read-only workflow.
* [ ]	Verify database connectivity and expected query behavior.
* [ ]	Test critical integrations enabled in the deployment.
* [ ]	Verify background workers and scheduled jobs, if configured.
* [ ]	Check application error rates, response latency, and resource usage.
* [ ]	Inspect queue processing and retry behavior, if applicable.
* [ ]	Confirm monitoring and alert notifications are operational.
* [ ]	Keep the release identifier and rollback instructions available.

If critical workflows fail or service health degrades, pause further rollout and follow production.md and rollback.md.

6. Troubleshooting

Build failure

* Review the build logs for the first actionable error.
* Confirm the configured Node.js version is supported.
* Verify that the build command matches an existing package script.
* Check dependency installation and lockfile consistency.

Application fails to start

* Confirm the start command points to the correct server entry point.
* Check startup logs for missing modules, invalid configuration, or runtime errors.
* Verify required environment variables are present without exposing their values.
* Confirm that the server listens on the port expected by the hosting environment.

Health check fails

* Verify that the configured endpoint exists and returns the expected response.
* Check whether the application has completed startup.
* Inspect database connectivity and other dependencies required by the endpoint.
* Review logs for repeated crashes or initialization failures.

Database connection fails

* Verify connection settings and credentials.
* Confirm network access, TLS requirements, and database availability.
* Check connection limits and permissions.
* Review application logs without exposing credentials or connection secrets.

7. Operational Notes

* Render features, service settings, and dashboard labels may change.
* Verify current configuration options against the Render dashboard and official documentation before production changes.
* Keep deployment instructions aligned with the repository’s actual scripts, server entry point, runtime requirements, and health-check implementation.
* Maintain a tested rollback procedure and a documented database recovery process.
* Reassess resource requirements as traffic, database usage, and background processing increase.

8. Related Documentation

* production.md — Production release checklist.
* rollback.md — Rollback procedure.
* ../backup/README.md — Backup and restore operations, if maintained at that location.
* ../database/README.md — Database operations, if maintained at that location.

Maintenance note: Review this guide whenever the deployment branch, Node.js runtime, package scripts, server entry point, environment configuration, database provider, or Render service settings change.