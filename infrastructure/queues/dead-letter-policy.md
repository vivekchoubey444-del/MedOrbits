# Dead-Letter Queue Policy

## Purpose

A dead-letter queue (DLQ) isolates jobs that cannot complete after the configured retry policy. The actual queue technology and persistence mechanism must be documented by the application team.

## Required Metadata

Store only what is needed to investigate and replay safely:

- Job identifier and type.
- Creation time, last attempt time, and attempt count.
- Sanitized failure category and error summary.
- Correlation or idempotency identifier.
- A reference to the source record where possible, instead of copying sensitive payloads.

## Operations

1. Alert when DLQ volume or oldest-item age exceeds agreed thresholds.
2. Inspect failures and classify them as transient, data-related, configuration-related, or code-related.
3. Fix the cause before replaying jobs.
4. Replay in controlled batches with rate limits and idempotency safeguards.
5. Verify outcomes and retain an audit trail.
6. Delete or archive records according to the retention policy.

## Security

Restrict DLQ access because job payloads may contain personal or business-sensitive data. Never expose queue dashboards or payloads publicly.
