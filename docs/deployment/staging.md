# Staging Deployment

## Purpose

Staging validates a release before production using isolated infrastructure and synthetic or properly anonymized data.

## Checklist

- Deploy the intended reviewed commit.
- Confirm environment variables and secret configuration.
- Apply compatible migrations using the approved process.
- Verify health checks and logs.
- Test authentication, permissions, applications, uploads, search, notifications, and critical workflows.
- Use payment provider sandbox mode.
- Verify queue retry and worker shutdown behavior.
- Check accessibility and responsive layouts.
- Confirm monitoring and alert delivery.
- Record test results and release approval.

Staging must not send real payments or expose production personal data.
