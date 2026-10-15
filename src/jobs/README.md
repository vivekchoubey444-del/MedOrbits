# MedOrbits Scheduled Jobs

Jobs discover eligible work and enqueue it; workers execute it. Each job exports a `run...Job(dependencies, options)` function and is deliberately not scheduled on import.

Required injected adapters:
- `queue.add(queueName, payload, options)` for durable enqueueing.
- Domain services/repositories to query eligible notifications, reminders, or cleanup plans.
- Optional structured logger.

Use UTC, bounded batches, idempotency keys, distributed scheduling/locking, retries, dead-letter handling, monitoring, and graceful shutdown. The included modules do not select a scheduler or queue vendor.
