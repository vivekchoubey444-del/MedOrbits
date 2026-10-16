Retry Policy

Project: MedOrbits
Directory: infrastructure/queues/
Purpose: Define consistent retry behavior for failed background jobs, including retry eligibility, backoff, failure handling, and safe recovery.

1. Purpose and Scope

Retries allow temporary failures to recover without unnecessary manual intervention. However, uncontrolled retries can increase system load, delay processing, duplicate side effects, and conceal persistent failures.

This policy defines operational requirements for retryable jobs. The actual queue technology, retry configuration, persistence mechanism, and worker implementation must be verified against the MedOrbits codebase.

2. Retry Eligibility

Classify failures before retrying a job.

Failure category	Recommended behavior
Temporary network failure	Retry when the operation is safe to repeat.
External provider timeout	Check whether the original request may have succeeded before retrying.
Rate limit response	Respect the provider’s retry guidance and rate limits.
Temporary database connectivity failure	Retry within configured limits after connectivity is restored.
Invalid input or missing required data	Do not repeatedly retry without correcting the underlying data.
Authentication or configuration failure	Pause or fail the job until the underlying issue is corrected.
Permanent business-rule failure	Mark the job as failed when retrying cannot change the outcome.
Suspected security issue	Escalate for investigation before replaying the job.

A job should be retried only when another attempt has a reasonable chance of succeeding and repeating the operation is safe.

3. Retry Limits and Backoff

Configure a finite retry limit for each job type according to its business impact, execution cost, and expected recovery time.

* Use exponential backoff where appropriate to reduce pressure on failing dependencies.
* Add jitter where supported to avoid synchronized retry bursts.
* Respect external provider rate limits and retry instructions.
* Apply an upper bound to retry delays.
* Set execution timeouts so individual attempts cannot run indefinitely.
* Avoid immediate, unlimited retry loops.
* Ensure retry settings are consistent with job deadlines and service objectives.

Document the actual attempt limits, delays, timeout values, and backoff configuration used by each important job type. Do not assume specific numeric defaults without checking the implementation.

4. Idempotency and Duplicate Prevention

Retries can repeat an operation whose original outcome is uncertain.

* Use idempotency keys or equivalent safeguards for operations that support them.
* Check the current state of an operation before repeating potentially successful work.
* Prevent duplicate application submissions, payment actions, notifications, and other sensitive side effects where applicable.
* Use transactional or deduplication controls when appropriate.
* Ensure retry behavior is safe when a worker crashes after completing an operation but before acknowledging the job.

Important: A timeout does not prove that an operation failed. Confirm its outcome before retrying operations that may have already succeeded.

5. Retry Exhaustion and Dead-Letter Handling

When a job reaches its configured retry limit:

1. Stop automatic retries unless an explicitly approved policy permits further attempts.
2. Record the final failure category and a sanitized error summary.
3. Preserve the job identifier, attempt count, timestamps, and correlation information where supported.
4. Move the job to a dead-letter queue or another documented failure-handling mechanism if implemented.
5. Notify the responsible owner when intervention is required.
6. Follow dead-letter-policy.md for investigation, recovery, replay, and retention.

Do not assume a dead-letter queue exists until its implementation has been verified.

6. Monitoring and Alerting

Monitor retry behavior using the capabilities available in the queue and worker infrastructure.

Recommended signals include:

* Retry attempts by job type.
* Retry exhaustion and terminal failure counts.
* Repeated failures from a specific dependency.
* Processing delays caused by backoff.
* Queue depth and oldest-job age.
* Dead-letter volume, where supported.
* Duplicate-processing or idempotency conflicts.

Alert when retry activity indicates meaningful service degradation, sustained dependency failures, or a growing backlog that threatens critical workflows.

7. Operational Recovery

When repeated failures occur:

1. Identify the affected job types and dependencies.
2. Review sanitized logs, correlation identifiers, and recent configuration or code changes.
3. Determine whether the cause is transient, data-related, configuration-related, or code-related.
4. Fix the underlying problem before initiating bulk retries.
5. Confirm the target dependency can safely handle resumed traffic.
6. Replay failed jobs in controlled batches with appropriate rate limits.
7. Verify successful processing and check for duplicate side effects.
8. Record the recovery outcome and any corrective actions.

Avoid bulk replay during an active outage or while the underlying cause remains unresolved.

8. Security and Data Handling

* Exclude passwords, authentication tokens, payment secrets, and unnecessary personal data from retry logs.
* Restrict access to failed-job records and replay controls.
* Sanitize error messages before storing or displaying them.
* Avoid copying complete sensitive payloads into retry metadata.
* Record administrative replay actions where supported.
* Apply the relevant retention policy to retry and failure records.

9. Operational Review Checklist

* [ ]	Retry eligibility is defined for important job types.
* [ ]	Retry limits and backoff behavior are finite and documented.
* [ ]	Job execution timeouts are configured where appropriate.
* [ ]	Idempotency and duplicate-prevention safeguards are implemented where needed.
* [ ]	Permanent failures do not enter endless retry loops.
* [ ]	Retry exhaustion has a documented failure-handling path.
* [ ]	Dead-letter handling is documented where implemented.
* [ ]	Retry failures and queue backlogs are monitored.
* [ ]	Recovery and replay procedures are tested in staging.
* [ ]	Sensitive information is excluded from logs and failure metadata.

10. Related Documentation

* dead-letter-policy.md — Dead-letter queue investigation, replay, and retention.
* ../monitoring/alerting.md — Alerting policy and escalation.
* ../monitoring/health-checks.md — Health-check design and verification.
* ../deployment/staging.md — Staging validation.
* ../deployment/rollback.md — Rollback and recovery procedures.

Maintenance

Review this policy whenever queue infrastructure, worker behavior, retry configuration, external integrations, or business-critical processing workflows change.

Implementation note: This document defines the intended operational policy. Verify retry limits, backoff algorithms, queue persistence, and dead-letter behavior against the actual MedOrbits implementation before treating them as configured features.