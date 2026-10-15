# Worker Scaling

## Signals

Scale workers based on queue depth, oldest-job age, arrival rate, processing rate, execution duration, failure rate, and downstream dependency capacity.

## Scaling Approach

- Start with conservative concurrency and measure throughput.
- Increase workers gradually while observing database connections, provider rate limits, memory, and latency.
- Prefer bounded concurrency over unrestricted parallelism.
- Ensure each job has a timeout and workers shut down gracefully.
- Make jobs idempotent because work may be retried or delivered more than once.
- Avoid scaling workers faster than dependent systems can handle.

## Shutdown and Deployments

On shutdown, stop accepting new work, finish or safely release in-flight jobs within the platform's grace period, and preserve retry semantics. Test deployments while jobs are queued and running.

## Capacity Planning

Estimate throughput from measured job duration and concurrency, then validate under realistic staging load. Document maximum worker count, queue-specific concurrency, provider limits, and the process for scaling back down.

## Alerts

Alert on sustained queue growth, excessive oldest-job age, repeated worker restarts, rising failures, and DLQ accumulation. Thresholds should reflect each job's business urgency.
