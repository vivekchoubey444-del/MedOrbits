# Database Maintenance

## Routine Checks

- Review database availability, error logs, slow queries, disk space, connections, and backup results.
- Verify that scheduled migrations and jobs completed successfully.
- Inspect indexes and query plans when performance degrades.
- Review database users and remove unnecessary privileges.
- Confirm backup retention and restore-drill results.

## Schema Changes

1. Create a reviewed, version-controlled migration.
2. Assess locking, table size, runtime, compatibility, and rollback limitations.
3. Test against staging data representative of production.
4. Back up before high-risk changes.
5. Prefer backward-compatible expand-and-contract changes for deployments that overlap versions.
6. Monitor errors and latency during rollout.
7. Document completion and any follow-up migration.

## Data Integrity and Security

Use transactions where appropriate, enforce constraints, validate imports, and avoid logging secrets or sensitive personal data. Apply security updates through a tested change process.

## Maintenance Windows

Schedule disruptive operations during an approved low-traffic window. Communicate expected impact and confirm an owner and rollback or recovery plan before beginning.
