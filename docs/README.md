# MedOrbits Documentation

**Directory:** `docs/`

## Purpose

This directory contains the technical documentation for the MedOrbits platform. It describes the architecture, API conventions, database practices, security controls, deployment workflow, and operational response procedures.

## Documentation Map

- `architecture/` — System overview, repository structure, and data flow.
- `api/` — API conventions and the OpenAPI contract.
- `database/` — Schema guidance and migration practices.
- `security/` — Authentication, authorization, document protection, and payment security.
- `deployment/` — Local development, staging, and production deployment.
- `operations/` — Incident response, backup recovery, and troubleshooting.

## Source of Truth

Documentation should describe implemented behavior, not aspirational behavior as if it already exists. Confirm route names, environment variables, schema details, health endpoints, and deployment commands against the current code before relying on them.

## Maintenance

- Update documentation with relevant code, schema, or configuration changes.
- Keep examples free of credentials and real personal data.
- Use synthetic identifiers and test payment credentials in examples.
- Link to authoritative provider documentation for external services.
- Record material operational decisions and review date-sensitive guidance.
