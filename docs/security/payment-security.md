# Payment Security

## Core Rules

- Use the selected provider's official SDK and secure checkout flow.
- Keep secret keys in managed environment configuration.
- Never store full card numbers, CVV values, or other prohibited payment authentication data.
- Treat browser redirects and client-submitted payment status as untrusted.
- Verify webhook signatures using the provider's required raw request body and algorithm.
- Validate event identity, order reference, amount, currency, and expected state.
- Process events idempotently to handle retries and duplicate delivery.
- Use transactions or equivalent safeguards for consistent payment state changes.
- Restrict access to payment records and audit sensitive administrative actions.

## Testing and Operations

Use sandbox credentials for development and staging. Test invalid signatures, duplicate events, out-of-order events, failed payments, and provider timeouts. Redact secrets and sensitive payloads from logs.

Provider-specific requirements must be checked against current official documentation and the integration actually configured in MedOrbits.
