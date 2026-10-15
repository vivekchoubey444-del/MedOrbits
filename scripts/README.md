# MedOrbits Scripts

**Directory:** `scripts/`

## Purpose

Project maintenance scripts for environment checks, database migrations, seed data, data validation, and service health checks.

## Scripts

- `check-env.js` — Validates required environment variables without printing secret values.
- `migrate.js` — Runs database migrations using the project's configured migration mechanism.
- `seed.js` — Loads approved seed data into an explicitly selected database.
- `validate-data.js` — Validates JSON datasets and their basic structure.
- `health-check.js` — Checks a configured service health endpoint.

## Safety

- Run scripts from the repository root unless the script says otherwise.
- Test database changes in development or staging before production.
- Do not run seed scripts against production unless specifically designed, reviewed, and approved for that purpose.
- Never print credentials, tokens, or connection strings.
- Confirm the actual package scripts, database driver, and environment variable names before using these utilities.
