# Monitoring and Observability

**Directory:** `infrastructure/monitoring/`

## Documents

- `health-checks.md` — Health endpoint semantics and monitoring.
- `alerting.md` — Actionable alert design and incident escalation.

## Minimum Observability

Monitor availability, request latency, error rates, resource utilization, database connectivity, backup completion, queue depth, and job failures. Use structured logs with request/correlation IDs, while excluding passwords, tokens, payment secrets, and unnecessary personal data.

Define service objectives and alert thresholds from observed behavior and business impact. Test alert delivery periodically.
