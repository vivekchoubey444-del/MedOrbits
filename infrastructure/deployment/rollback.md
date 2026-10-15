# Rollback Procedure

## Triggers

Consider rollback when a release causes sustained user-facing errors, failed critical workflows, severe latency, data-integrity concerns, or an unsafe security regression.

## Procedure

1. Declare the incident and identify the incident lead.
2. Stop further rollout and preserve relevant logs and release identifiers.
3. Assess whether the problem is in application code, configuration, schema, infrastructure, or an external provider.
4. If appropriate, redeploy the last known-good application version using the hosting platform's supported procedure.
5. Verify health checks and critical user workflows.
6. Monitor error rates, latency, database behavior, and queue processing.
7. Communicate status to affected stakeholders and document the timeline.

## Database Changes

Do not automatically run a reverse migration. Determine whether the migration is backward-compatible and whether rollback could destroy new data. Prefer a tested forward fix or a reviewed recovery plan when reversing a schema change is unsafe.

## External Side Effects

Review pending jobs, payment events, webhook retries, and notifications to avoid duplicate processing. Use idempotency controls where available.

## After the Incident

Capture root cause, impact, recovery time, corrective actions, owners, and deadlines. Update tests, runbooks, and release safeguards.
