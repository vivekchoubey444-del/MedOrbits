# Troubleshooting Guide

## Application Does Not Start

- Confirm the supported Node.js version.
- Install dependencies from the lockfile.
- Check required environment variable names without exposing their values.
- Verify the configured entry point and start command.
- Inspect logs for the first actionable error.

## Database Connection Failures

- Verify host, port, database name, user permissions, network access, and TLS requirements.
- Confirm the database is available and connection limits have not been reached.
- Check whether migrations are pending.
- Do not paste credentials into tickets or logs.

## API Errors

- Check status codes, request IDs, application logs, and recent releases.
- Verify route mounting, validation, authentication, and authorization.
- Reproduce with synthetic test data in staging.

## Upload Failures

- Check size and type restrictions, storage permissions, available capacity, and provider status.
- Verify that private files are stored outside public static directories.
- Avoid logging file contents or sensitive metadata.

## Payment Issues

- Verify provider status, event signatures, idempotency records, and transaction state.
- Use sandbox events for diagnosis where possible.
- Never mark a payment successful based solely on a browser redirect.

## Background Job Delays

- Inspect queue depth, oldest-job age, worker health, retries, and dead-letter volume.
- Check downstream database and provider limits before increasing concurrency.

Record the symptoms, scope, recent changes, investigation steps, and verified resolution. Escalate when the issue risks data integrity, privacy, security, or prolonged user impact.
