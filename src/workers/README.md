# MedOrbits Workers

Workers process asynchronous queue jobs outside Express request handlers. These modules follow the MedOrbits `src/services`, `src/repositories`, and `src/integrations` architecture. They do not start automatically when imported.

Each worker exports a `process...Job`, `create...Worker`, and `start...Worker` function. Supply domain services and a durable queue adapter from application bootstrap.

Queue adapter contract: `reserve({ queueName, visibilityTimeoutMs })` returns a job or `null`; `ack(job)` acknowledges success; `retry(job, error)` retries; optional `deadLetter(job, error)` handles exhausted jobs.

Production requirements: durable distributed queue, idempotent handlers, bounded retries/backoff, dead-letter queue, metrics, alerting, graceful shutdown, and no logging of credentials, document contents, payment data, or personal records. Cleanup must enforce retention rules and legal holds.
