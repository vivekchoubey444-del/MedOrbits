# Database Operations

**Directory:** `infrastructure/database/`

This directory contains planning and maintenance guidance for the MedOrbits MySQL database.

## Documents

- `capacity-planning.md` — Baselines, growth estimates, and capacity triggers.
- `maintenance.md` — Routine maintenance, schema changes, and operational safeguards.

## Principles

- Apply schema changes through reviewed, version-controlled migrations.
- Measure before scaling; use query plans and workload metrics to identify bottlenecks.
- Back up before risky changes and verify restore capability.
- Use least-privilege accounts and encrypted connections where supported.
- Never use real personal data in development or test fixtures unless explicitly authorized and appropriately protected.
