# Background Queues and Workers

**Directory:** `infrastructure/queues/`

## Documents

- `retry-policy.md` — Retry limits, backoff, and idempotency.
- `dead-letter-policy.md` — Handling jobs that exhaust retries.
- `worker-scaling.md` — Safe concurrency and scaling practices.

## Principles

- Jobs should be idempotent or use explicit deduplication.
- Bound retries and use exponential backoff with jitter.
- Set timeouts and define how graceful shutdown handles in-flight work.
- Monitor queue depth, oldest-job age, execution duration, failures, and dead-letter volume.
- Keep secrets and sensitive payloads out of logs.
- Do not acknowledge a job before its work has been durably completed.
