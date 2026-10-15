# Queue Retry Policy

## Retryable Failures

Retry transient failures such as temporary network errors, rate limits, and short-lived dependency outages. Do not repeatedly retry invalid payloads, authorization failures, or deterministic validation errors without remediation.

## Recommended Behavior

- Configure a finite maximum attempt count.
- Use exponential backoff with random jitter.
- Respect provider `Retry-After` instructions when applicable.
- Apply per-job timeouts and an overall retry horizon.
- Ensure retries cannot create duplicate payments, emails, applications, or other side effects.
- Use idempotency keys or deduplication for operations that may be repeated.
- Limit concurrency when a dependency is unhealthy to avoid retry storms.

## Observability

Record job type, safe job identifier, attempt number, outcome, duration, and correlation ID. Do not log credentials or full sensitive payloads.

## Recovery

After retries are exhausted, route the job according to `dead-letter-policy.md`. Alert on sustained failure rates and inspect whether the underlying dependency or data issue has been corrected before replay.
