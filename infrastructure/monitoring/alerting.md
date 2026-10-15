# Alerting Policy

## Alert Design

Every alert should identify the symptom, impact, severity, owner, and first response step. Prefer actionable signals tied to service objectives.

## Suggested Signals

- Sustained external health-check failures.
- Elevated HTTP 5xx rate or request latency.
- Database connection failures, connection-pool exhaustion, or low disk space.
- Failed or overdue backups.
- Increasing queue depth, repeated job failures, or dead-letter growth.
- Unexpected restart loops or sustained resource saturation.
- Payment webhook verification failures or abnormal payment-processing errors.

## Severity

- **Critical:** broad user impact, data integrity risk, or suspected security incident; page the on-call owner.
- **High:** major feature or workflow degraded; prompt response required.
- **Medium:** limited degradation with a workaround; investigate during the agreed response window.
- **Low:** informational trend or maintenance reminder.

Set actual thresholds from service objectives and observed baselines rather than copying arbitrary numbers.

## Runbook Requirements

For each alert, document how to confirm the issue, safe mitigation steps, escalation contact, and recovery verification. Review noisy alerts and test notification delivery regularly.
