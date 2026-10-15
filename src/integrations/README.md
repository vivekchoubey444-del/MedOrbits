# MedOrbits Integrations
Provider adapters for email, AI, private storage, and payments. Keep vendor SDKs behind these interfaces.
- Store credentials in environment variables; never commit secrets.
- Validate inputs, bound payload sizes, use timeouts, and avoid logging sensitive data.
- Verify payment webhooks against exact raw request bytes and process events idempotently.
- Keep private documents outside public web roots; authorize every download.
- Instantiate only integrations enabled in the deployment environment.
See each module README for configuration and security requirements.
