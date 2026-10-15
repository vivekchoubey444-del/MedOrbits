# MySQL Capacity Planning

## Metrics to Track

Establish baselines and review trends for:

- CPU, memory, disk utilization, disk I/O, and available storage.
- Database size and daily/weekly growth.
- Active and peak connections, connection errors, and connection-pool saturation.
- Query latency (p50, p95, p99), slow-query volume, and lock waits.
- Transaction rate, replication lag if applicable, and backup duration.
- Application errors and request latency correlated with database load.

## Planning Process

1. Capture a representative baseline across normal and peak periods.
2. Estimate growth using observed data rather than a single snapshot.
3. Forecast storage and connection needs over the next planning horizon.
4. Set warning and critical thresholds based on provider limits and the application's service objectives.
5. Test likely bottlenecks in staging with representative, non-sensitive data.
6. Review capacity after major features, imports, campaigns, or traffic changes.

## Scaling Options

Evaluate query/index optimization, pagination, connection pooling, caching, archival, vertical scaling, and read replicas where appropriate. Confirm that added complexity is justified by measured workload.

## Safeguards

- Avoid unbounded queries and unbounded result sets.
- Set connection and query timeouts.
- Review indexes for both read benefit and write overhead.
- Monitor disk headroom and backup storage separately.
- Do not apply production configuration changes without a rollback plan.
