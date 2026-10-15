# Production Release Checklist

## Before Deployment

- [ ] Release commit reviewed and approved.
- [ ] CI, tests, linting, and security checks pass.
- [ ] Required environment variables and secrets are present.
- [ ] Database backup is current and recovery procedure is understood.
- [ ] Migrations are reviewed for compatibility and locking risk.
- [ ] External provider credentials and webhook URLs are verified.
- [ ] Monitoring and alert notifications are working.
- [ ] Rollback decision-maker and release owner are identified.

## Deployment

1. Deploy the approved commit using the documented hosting workflow.
2. Monitor build, startup, migration, and health-check results.
3. Run smoke tests for critical user journeys.
4. Inspect error rates, latency, database health, and queue backlog.
5. Pause rollout if errors or user impact exceed agreed limits.

## After Deployment

- [ ] Confirm critical workflows succeed.
- [ ] Confirm background workers and scheduled jobs are healthy.
- [ ] Record release identifier, time, outcome, and any incidents.
- [ ] Keep the previous known-good release reference available.

A code rollback may not reverse data migrations, sent emails, payment actions, or other external side effects. Coordinate those separately.
