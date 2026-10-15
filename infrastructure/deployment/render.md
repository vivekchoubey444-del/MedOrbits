# Render Deployment Guide

## Service Setup

Configure the Render service to match the repository and `package.json`:

- Select the correct repository and deployment branch.
- Set the Node.js version according to `.nvmrc` and the supported runtime.
- Configure the build command from the actual package scripts.
- Configure the start command to launch the intended server entry point.
- Set required environment variables in Render's environment settings.
- Configure health checks using a verified endpoint implemented by the application.

Do not copy a command from this document without confirming that the corresponding script and entry point exist.

## Environment Variables

Set production secrets in Render, not in committed files. Common configuration may include database connection settings, session secrets, email credentials, payment provider credentials, and AI provider keys if those integrations are enabled. Use the exact names expected by the application.

## Database Connectivity

Confirm network access, TLS requirements, credentials, migrations, and connection limits. Use a dedicated database user with least privilege.

## Deployment Verification

1. Review build and startup logs.
2. Confirm the service becomes healthy.
3. Test authentication, a representative read-only workflow, and critical integrations.
4. Check error rates, latency, database connectivity, and queue processing.
5. Keep the release identifier and rollback instructions available.

## Operational Notes

Render features and dashboard labels may change. Confirm current platform settings in the Render dashboard and official documentation before production changes.
