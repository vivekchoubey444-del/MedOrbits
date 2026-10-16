Troubleshooting Guide

Project: MedOrbits
Purpose: Help developers and operators diagnose application, database, API, file-storage, payment, and background-processing issues safely.

1. General Diagnostic Procedure

Before changing configuration or restarting services:

1. Record the symptoms, affected functionality, first observed time, and scope.
2. Identify the deployed version or most recent change.
3. Inspect relevant logs and available health information.
4. Reproduce the issue using synthetic data in a local or staging environment where possible.
5. Apply the smallest appropriate corrective action.
6. Verify the affected workflow and check for recurrence.
7. Record the root cause, resolution, and any follow-up actions.

Preserve useful evidence while protecting credentials, personal information, payment data, and private documents.

2. Application Does Not Start

Symptoms

The application exits during startup, fails to bind to its configured port, or cannot become ready.

Checks

* Confirm the supported Node.js version.
* Install dependencies using the committed lockfile.
* Verify required environment-variable names without exposing their values.
* Check the configured application entry point and start command.
* Inspect startup logs for the first actionable error.
* Confirm the configured port is available and compatible with the hosting platform.
* Check module imports, route mounting, and configuration initialization.
* Verify required dependencies, including the database, are reachable.

Resolution

Address the earliest confirmed failure before investigating secondary errors.

If a route fails to mount, check whether the referenced handler or controller is exported correctly. If startup fails during database initialization, investigate connectivity and schema requirements separately.

Avoid changing multiple unrelated components at once, because this makes the original failure harder to isolate.

3. Database Connection Failures

Symptoms

The application cannot connect to MySQL, queries fail, or database-dependent workflows return errors.

Checks

* Verify the configured host, port, database name, and username.
* Confirm the database user has the required privileges.
* Check network access, firewall rules, and TLS requirements.
* Confirm the database service is available.
* Check connection limits and connection-pool saturation, where applicable.
* Inspect the database and application logs.
* Determine whether required migrations are pending or the schema is incompatible with the deployed application.

Resolution

Correct the verified configuration or connectivity issue and retry using an authorized test.

Do not expose database passwords in terminal output, support tickets, screenshots, or logs. Do not apply production migrations simply to test whether a connection works.

If data integrity may be affected, preserve evidence and follow the database recovery procedure.

4. API Errors

Symptoms

Requests return unexpected HTTP status codes, malformed responses, timeouts, or server errors.

Checks

* Record the endpoint, HTTP method, status code, timestamp, and request or correlation ID, if available.
* Inspect application logs for the corresponding request.
* Check whether the route is mounted and the expected handler is available.
* Verify request validation and required parameters.
* Confirm authentication and authorization behavior.
* Check database queries and external-service calls used by the endpoint.
* Review recent releases and configuration changes.
* Compare the actual response with the documented API contract, where one exists.

Resolution

Reproduce the issue using synthetic test data in staging.

Correct the underlying routing, validation, authorization, persistence, or integration issue. Add a regression test when practical.

Do not disable authentication or authorization to make a failing request succeed.

5. Upload Failures

Symptoms

Uploads are rejected unexpectedly, fail partway through, or cannot be retrieved afterward.

Checks

* Verify file-size and file-type restrictions.
* Check request-body limits and multipart parsing configuration, if applicable.
* Confirm storage permissions and available capacity.
* Verify the configured storage path or provider is available.
* Check provider status and upload-related error logs.
* Confirm that metadata persistence and file storage remain consistent.
* Check whether access controls prevent an authorized user from retrieving the file.

Resolution

Correct the relevant limit, permission, or storage configuration after verifying the cause.

Validate file contents and type according to the application’s security requirements. Keep private documents outside unrestricted public static directories and serve them through an authorized access mechanism.

Do not log file contents, credentials, or unnecessary sensitive metadata.

6. Payment Issues

Symptoms

A payment remains pending, a callback fails, or the application displays a payment status that differs from the provider’s record.

Checks

* Confirm the configured payment provider and environment.
* Check provider availability and relevant error responses.
* Verify webhook signatures using the provider’s documented mechanism.
* Inspect transaction references and idempotency records.
* Compare the local transaction state with the provider’s authoritative status.
* Check for duplicate, delayed, or out-of-order events.
* Review recent integration or configuration changes.

Resolution

Use sandbox events where possible to reproduce the problem.

Reconcile transaction state using verified provider records and the application’s payment history. Handle repeated events safely and avoid applying the same financial operation more than once.

Never mark a payment successful solely because a browser redirect indicates success. Verify the payment using a trusted server-side mechanism.

Do not repeat a live payment merely to test an uncertain transaction.

7. Background Job Delays

Symptoms

Notifications, reminders, cleanup tasks, or other asynchronous operations are delayed or remain incomplete.

Checks

Where the application uses queues or workers:

* Inspect queue depth and the age of the oldest pending job.
* Check worker health and recent restarts.
* Review retry counts and dead-letter volume, if supported.
* Inspect job failures and relevant application logs.
* Check database availability and downstream provider limits.
* Look for tasks that are repeatedly failing or taking unusually long.
* Verify scheduler activity where scheduled jobs are used.

Resolution

Identify whether the bottleneck is the worker, queue, database, or downstream service.

Correct the underlying issue before increasing concurrency. Increasing worker count without understanding database or provider capacity may worsen the problem.

Retry failed tasks only when the operation is safe to repeat. Verify idempotency and duplicate-notification safeguards before replaying jobs.

8. Authentication and Permission Problems

Symptoms

Users cannot log in, sessions expire unexpectedly, or authorized users receive access-denied responses.

Checks

* Verify account status and submitted credentials through approved diagnostic procedures.
* Check session or token configuration and expiration behavior.
* Inspect authentication errors without logging passwords or tokens.
* Confirm role and permission assignments.
* Check cookie, HTTPS, allowed-origin, and proxy configuration where relevant.
* Verify account verification and recovery workflows if implemented.
* Determine whether the problem began after a deployment or configuration change.

Resolution

Correct the verified authentication or authorization issue.

Do not bypass permission checks, expose session identifiers, or manually grant elevated privileges without authorization. If credential compromise is suspected, follow the incident-response procedure.

9. Search and Slow Requests

Symptoms

Search results are missing, filters behave unexpectedly, or requests take longer than expected.

Checks

* Verify query parameters, filters, and pagination inputs.
* Check whether expected records exist in the relevant environment.
* Inspect database query performance and execution plans.
* Review relevant indexes and sorting behavior.
* Check timeouts, connection-pool usage, and external dependencies.
* Compare response time and error rate against the normal baseline.

Resolution

Confirm whether the issue is caused by request validation, data quality, query behavior, or resource saturation.

Add or modify indexes only after reviewing actual query patterns and performance evidence. Avoid production schema changes as an untested first response to slow queries.

10. Deployment and Configuration Problems

Symptoms

The application works locally but fails in staging or production, or a deployment introduces new errors.

Checks

* Verify the deployed commit or artifact.
* Inspect build and startup logs.
* Compare required configuration across environments without revealing secret values.
* Confirm the actual hosting-platform build and start commands.
* Check runtime compatibility and dependency installation.
* Verify database compatibility and migration status.
* Check service connectivity, storage permissions, and configured health checks where available.

Resolution

Use the documented deployment process and confirm the actual hosting-platform configuration.

If the release causes significant user impact, pause further rollout and follow the approved mitigation or recovery procedure. Check database compatibility before rolling back application code.

11. Environment and Secret Problems

Symptoms

A service rejects credentials, an integration cannot authenticate, or configuration works in one environment but not another.

Checks

* Verify that required variable names are configured.
* Confirm values are assigned to the correct environment.
* Check credential validity and permissions using approved methods.
* Confirm sandbox and production settings are not mixed.
* Review secret rotation history and dependent services.
* Check for accidental whitespace, incorrect URLs, or incompatible configuration formats.

Resolution

Correct the affected configuration through the approved secret-management or hosting-platform process.

If a secret may have been exposed, treat it as a potential security incident: restrict access, rotate the affected credential, review relevant access logs, and follow the incident-response procedure.

12. Logging and Evidence

When investigating an issue, collect enough information to reproduce and diagnose it.

Useful evidence may include:

* Timestamp and timezone.
* Environment and deployed version.
* Affected route or workflow.
* HTTP status and request identifier.
* Sanitized error messages.
* Relevant database or worker error information.
* Recent changes and attempted remediation.
* Observed result after remediation.

Do not include passwords, access tokens, session identifiers, full payment-card data, private document contents, or unnecessary personal information in logs or tickets.

13. Escalation Criteria

Escalate promptly when an issue:

* Risks data corruption or loss.
* May expose personal information or credentials.
* Affects payment integrity or financial reconciliation.
* Causes prolonged disruption to critical workflows.
* Cannot be contained using approved procedures.
* Requires a destructive database operation or untested recovery action.
* Appears to involve unauthorized access or system compromise.

Follow docs/operations/incident-response.md for incident coordination and security escalation, if that document is present.

For suspected data loss or database corruption, consult the approved backup-and-recovery procedure before attempting restoration.

14. Troubleshooting Record

For significant issues, record:

Field	Information
Issue reference	Ticket or incident identifier
First observed	Timestamp and timezone
Environment	Local, staging, or production
Affected component	Service, route, workflow, or dependency
Symptoms and scope	Observed behavior and impact
Recent changes	Relevant deployment or configuration changes
Investigation	Checks performed and findings
Resolution	Verified corrective action
Verification	Tests and workflows that passed
Follow-up	Owner and due date for remaining work

15. Related Documentation

* docs/development/local-development.md — Local development setup, if present.
* docs/deployment/staging.md — Staging deployment, if present.
* docs/deployment/production.md — Production deployment, if present.
* docs/operations/incident-response.md — Incident handling, if present.
* docs/operations/backup-and-recovery.md — Database recovery, if present.
* docs/database/migrations.md — Migration safeguards, if present.
* docs/architecture/overview.md — System components and boundaries.
* docs/architecture/data-flow.md — Request and processing flows.

Verify all paths against the current repository.

Accuracy rule: Diagnose from observed logs, configuration, and reproducible behavior. Do not assume that a health endpoint, queue, worker, integration, or recovery script exists until it has been verified.