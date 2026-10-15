# Health Checks

## Endpoint Design

Provide separate checks where practical:

- **Liveness:** confirms the process is running and can respond. It should not fail merely because a dependency is temporarily unavailable.
- **Readiness:** confirms the service can accept traffic, including essential dependency checks.
- **Deep diagnostics:** restricted or internal checks for database, queue, storage, and other dependencies.

Use the actual endpoint configured in the MedOrbits application and deployment platform; do not assume a path until it has been verified.

## Response Guidance

Return an appropriate HTTP status, a concise status, and minimal diagnostic information. Do not expose credentials, connection strings, internal stack traces, or sensitive infrastructure details publicly.

## Monitoring

- Probe from outside the service where possible.
- Alert on sustained failures rather than a single transient probe.
- Monitor latency as well as status.
- Verify readiness behavior during database outages and deployments.
- Keep health checks lightweight and bounded by timeouts.

## Verification

Test healthy, dependency-failure, timeout, and recovery scenarios in staging before relying on checks for production routing.
