# Production Deployment

## Pre-Release

- Confirm code review, automated tests, dependency checks, and security review.
- Verify secrets and service configuration in the hosting platform.
- Confirm a recent backup and a tested recovery procedure.
- Review migration compatibility, locking risk, and rollback limitations.
- Confirm monitoring, alert ownership, and incident contacts.
- Identify the release owner and previous known-good version.

## Release

1. Deploy the approved commit through the documented platform workflow.
2. Inspect build and startup logs.
3. Verify readiness and critical user workflows.
4. Monitor errors, latency, database health, and queue depth.
5. Pause or roll back if agreed release criteria are breached.

## Post-Release

Record the commit, deployment time, outcome, and any incidents. A code rollback does not automatically reverse database changes, payments, emails, or other external side effects.
