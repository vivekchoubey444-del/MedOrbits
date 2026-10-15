# Deployment Operations

**Directory:** `infrastructure/deployment/`

## Documents

- `render.md` — Render service configuration and deployment workflow.
- `staging.md` — Pre-production validation.
- `production.md` — Production release checklist.
- `rollback.md` — Rollback decision and recovery process.

## Release Principles

- Keep configuration separate from source code.
- Store secrets in the hosting platform's secret/environment settings.
- Deploy a reviewed commit and retain the previous known-good release reference.
- Run tests and health checks before and after deployment.
- Use backward-compatible database migrations where possible.
- Do not assume a rollback reverses database migrations or external side effects.
