Dead-Letter Queue Policy

Project: MedOrbits
Directory: infrastructure/queues/
Purpose: Define how failed background jobs are isolated, investigated, safely replayed, and retained for operational accountability.

1. Purpose

A dead-letter queue (DLQ) isolates jobs that cannot complete after the configured retry policy has been exhausted or the job has been classified as non-retryable.

The application team must document the actual queue technology, retry mechanism, persistence model, and dead-letter handling implemented by MedOrbits. Do not assume that a dedicated DLQ exists unless it has been implemented.

2. Required Metadata

Store only the information necessary to investigate failures and replay jobs safely.

Where supported by the queue implementation, retain:

* Job identifier and type: Identifies the failed operation.
* Creation time: Records when the job was originally created.
* Last attempt time: Records the most recent processing attempt.
* Attempt count: Indicates how many attempts have occurred.
* Failure category: A sanitized classification of the failure.
* Error summary: A concise diagnostic message without secrets or sensitive payload data.
* Correlation or idempotency identifier: Helps trace execution and prevent duplicate processing.
* Source record reference: References the originating record where possible instead of duplicating sensitive payloads.
* Replay history: Records replay attempts and their outcomes where supported.

Avoid storing complete job payloads when a reference to the source record is sufficient.

3. Failure Classification

Classify dead-lettered jobs before taking recovery action.

Category	Examples	Recommended response
Transient	Temporary network failure or provider timeout	Verify service recovery before retrying.
Data-related	Missing, invalid, or inconsistent source data	Correct or reconcile the data before replay.
Configuration-related	Missing credentials or invalid service configuration	Correct the configuration and verify connectivity.
Code-related	Unhandled exception or application defect	Fix and test the defect before replay.
Security-related	Authorization failure or suspected malicious input	Investigate and obtain appropriate approval before replay.

A failure should not be classified as safe to retry solely because it is temporary-looking. Assess whether the operation may already have succeeded.

4. Monitoring and Alerting

* Alert when DLQ volume exceeds an agreed threshold.
* Alert when the oldest unprocessed item exceeds its acceptable age.
* Monitor repeated job failures and retry exhaustion.
* Track replay success rates and recurring failure categories.
* Notify the responsible owner when intervention is required.
* Link alerts to the relevant operational runbook where available.

Set thresholds using observed workload, business impact, and service objectives rather than arbitrary values.

5. Investigation and Replay Procedure

1. Inspect the failure. Review job metadata, sanitized error details, correlation identifiers, and relevant logs.
2. Classify the cause. Determine whether the failure is transient, data-related, configuration-related, code-related, or security-related.
3. Assess side effects. Establish whether the original operation may already have completed partially or fully.
4. Correct the cause. Fix the underlying issue before replaying the job.
5. Approve the replay. Obtain the required operational approval for sensitive or high-impact jobs.
6. Replay in controlled batches. Apply rate limits and monitor system capacity.
7. Prevent duplicate processing. Use idempotency safeguards and verify the job’s current state.
8. Validate outcomes. Confirm successful processing and check for unintended side effects.
9. Record the result. Maintain an audit trail of the replay decision, operator, time, and outcome.

Do not repeatedly replay jobs without understanding the cause of failure.

6. Security and Access Control

DLQ records and queue dashboards may contain personal or business-sensitive information.

* Restrict access according to least privilege.
* Require authorized access for inspecting, modifying, or replaying jobs.
* Never expose queue dashboards or payloads publicly.
* Exclude passwords, access tokens, payment secrets, and unnecessary personal data from stored error details.
* Sanitize untrusted content before displaying or logging it.
* Protect DLQ storage and access credentials.
* Record administrative actions and replay operations where supported.

7. Retention and Cleanup

Define a retention period based on operational requirements, applicable obligations, and the sensitivity of stored metadata.

* Delete or archive records according to the approved retention policy.
* Preserve records needed for active investigations or required audits.
* Restrict access to archived records.
* Avoid retaining sensitive payloads longer than necessary.
* Verify that cleanup operations do not remove jobs still under investigation.

Document the retention period and the mechanism responsible for enforcing it.

8. Operational Review Checklist

* [ ]	Queue technology and persistence mechanism are documented.
* [ ]	Retry limits and dead-letter conditions are defined.
* [ ]	Required job metadata is retained safely.
* [ ]	Failure categories support consistent investigation.
* [ ]	DLQ volume and oldest-item age are monitored where supported.
* [ ]	Replay procedures include rate limits and idempotency safeguards.
* [ ]	Access to DLQ records and dashboards is restricted.
* [ ]	Retention and cleanup policies are documented.
* [ ]	Replay operations are auditable where supported.
* [ ]	Recovery procedures are tested in a non-production environment.

9. Implementation Notes

This policy defines operational expectations, not a specific queue implementation. Before applying it, verify which queue technology, retry behavior, persistence mechanism, monitoring capabilities, and replay controls are actually implemented in MedOrbits.

Maintenance note: Review this policy whenever queue infrastructure, background workers, retry configuration, data-retention requirements, or job-processing behavior changes.