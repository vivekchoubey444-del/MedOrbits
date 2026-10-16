Production Release Checklist

Project: MedOrbits
Purpose: Standardize production releases, reduce deployment risk, and verify critical application workflows.

1. Before Deployment

* [ ]	Release commit reviewed and approved.
* [ ]	CI pipeline, automated tests, linting, and security checks pass.
* [ ]	Required environment variables and secrets are present and valid.
* [ ]	Database backup is current, and the recovery procedure is understood.
* [ ]	Database migrations are reviewed for backward compatibility, locking risk, execution time, and rollback implications.
* [ ]	External provider credentials, callback URLs, and webhook endpoints are verified.
* [ ]	Monitoring, logging, health checks, and alert notifications are operational.
* [ ]	Release owner and rollback decision-maker are identified.
* [ ]	Deployment and recovery instructions are accessible.
* [ ]	Known issues and expected service impact are documented.

2. Deployment

1. Deploy the approved commit using the documented production hosting workflow.
2. Monitor build output, application startup, database migrations, and health-check results.
3. Confirm the deployed application is running the expected release identifier.
4. Run smoke tests for critical user journeys, including authentication, course discovery, application submission, document access, and payment workflows where applicable.
5. Verify background workers, scheduled jobs, queues, and external integrations.
6. Inspect application error rates, response latency, database health, resource utilization, and queue backlog.
7. Compare observed behavior against established service objectives and release acceptance criteria.
8. Pause or halt the rollout if errors, availability issues, or user impact exceed agreed limits.
9. If recovery is required, follow the documented rollback or mitigation procedure.

3. After Deployment

* [ ]	Confirm critical user workflows complete successfully.
* [ ]	Confirm background workers and scheduled jobs are healthy.
* [ ]	Verify payment and webhook processing where applicable.
* [ ]	Review application logs for unexpected errors or warnings.
* [ ]	Confirm database connectivity and migration results.
* [ ]	Verify monitoring dashboards and alert notifications.
* [ ]	Record the release identifier, deployment time, outcome, and responsible owner.
* [ ]	Document incidents, deviations, and follow-up actions.
* [ ]	Keep the previous known-good release reference available.
* [ ]	Notify relevant stakeholders of the release outcome.

4. Rollback and Recovery

A code rollback may not reverse database changes, sent emails, payment actions, document processing, or other external side effects.

Before initiating a rollback:

1. Assess the impact and identify the immediate failure.
2. Decide whether to roll back, pause the rollout, or apply a targeted mitigation.
3. Confirm whether database migrations are compatible with the previous release.
4. Determine whether data restoration or a forward-fix migration is required.
5. Coordinate recovery of external side effects with the responsible service or provider.
6. Verify critical workflows after recovery.
7. Record the decision, actions taken, and final outcome.

Important: Restoring the previous application version does not necessarily restore the database to its previous state. Database recovery must follow the approved recovery procedure.

5. Release Record

Complete this record for every production deployment.

Field	Record
Release identifier / commit	
Deployment date and time	
Release owner	
Approval reference	
Database migration version	
Backup reference	
Deployment outcome	
Smoke-test outcome	
Rollback or mitigation required	
Incidents and follow-up actions	

6. Release Completion Criteria

A release is complete when:

* All required checks have been completed or formally waived by an authorized owner.
* Critical workflows pass their smoke tests.
* Monitoring shows no unacceptable release-related degradation.
* Incidents have an assigned owner and documented next steps.
* The release record has been updated.

7. Maintenance

Keep this checklist aligned with the actual hosting workflow, CI pipeline, migration process, monitoring configuration, and recovery procedures used by MedOrbits.