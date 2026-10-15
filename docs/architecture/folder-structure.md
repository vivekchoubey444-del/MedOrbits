# Repository Folder Structure

## Top-Level Areas

| Path | Responsibility |
|---|---|
| `pages/` | Public informational pages and error/offline pages |
| `account/` | User authentication, profile, dashboard, and account workflows |
| `education/` | Course, college, university, admission, and study-abroad content |
| `career/` | Job, internship, employer, and career-support features |
| `admin/` | Administrative interfaces |
| `legal/` | Legal notices, policies, and consent pages |
| `assets/` | CSS, browser JavaScript, public data, images, icons, and downloadable documents |
| `public/` | Public web metadata and well-known files |
| `src/` | Backend modules, routes, services, middleware, integrations, jobs, and workers |
| `database/` | SQL schema, migrations, seeds, and fixtures |
| `storage/` | Runtime storage conventions; private data must not be publicly served |
| `scripts/` | Maintenance and validation utilities |
| `tests/` | Unit, integration, API, database, security, end-to-end, and accessibility tests |
| `infrastructure/` | Backup, deployment, monitoring, database, and queue operations |
| `docs/` | Technical and operational documentation |

## Conventions

- Keep modules focused on one responsibility.
- Use consistent file naming and documented exports.
- Avoid committing runtime uploads, logs, database dumps, secrets, or generated private data.
- Keep nested README and manifest files synchronized with their directories.
- Verify paths and actual files before describing them as implemented.
