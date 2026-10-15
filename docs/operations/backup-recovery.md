# Backup and Recovery

## Backup Requirements

- Define recovery point objective (RPO) and recovery time objective (RTO).
- Automate database backups and monitor success and freshness.
- Store backups separately from the primary system with appropriate access controls.
- Encrypt backups and protect credentials.
- Apply retention and deletion policies.
- Include required schema, routines, events, and supporting configuration in recovery planning.

## Recovery Procedure

1. Declare the recovery event and identify the decision-maker.
2. Select a known-good backup and verify integrity.
3. Provision an isolated or approved recovery database.
4. Restore using the documented MySQL recovery script or approved process.
5. Validate schema, record counts, relationships, and critical application workflows.
6. Reconcile data created after the backup where possible.
7. Switch traffic only after authorization and verification.
8. Monitor the restored system and document the outcome.

## Drills

Run periodic restore drills in a non-production environment. A backup is not considered reliable until restoration has been tested. Never perform a drill against production.
