MedOrbits — Production Deployment Guide

> **Document:** `README-PRODUCTION.md`  
> **Project:** MedOrbits  
> **Purpose:** Production readiness, deployment, security, operations, and recovery checklist
> 
> This guide is based on the repository structure supplied for MedOrbits. It describes the intended production workflow; it does not confirm that every listed file, route, integration, or automation is already implemented. Verify each item against the current code and hosting configuration before launch.

────────

1. Production objectives

A production deployment should provide:

• A stable, responsive public website for education, admissions, career, and recruitment content.
• A securely configured Node.js application and API.
• Controlled access to accounts, applications, uploaded documents, administration, payments, and subscriptions.
• Reliable database migrations, backups, monitoring, and recovery procedures.
• Secure handling of environment variables, user data, logs, and uploaded files.
• Tested deployment and rollback procedures.

Do not treat the presence of a file or page in the repository as proof that the corresponding feature is production-ready.

2. Repository overview

|Area                                                                                           |Responsibility                                                                     |
|————————————————————————————————|————————————————————————————|
|`index.html`, `pages/`, `education/`, `career/`, `account/`, `admin/`, `legal/`                |Public pages and user-facing interfaces                                            |
|`assets/css/`, `assets/js/`, `assets/data/`, `assets/images/`, `assets/icons/`, `assets/fonts/`|Frontend styling, scripts, public data, and media                                  |
|`server.js`, `src/`                                                                            |Server startup, routes, middleware, controllers, services, models, and integrations|
|`database/`                                                                                    |SQL schema, migrations, seeds, and fixtures                                        |
|`storage/`                                                                                     |Runtime file storage; private files must not be publicly served                    |
|`infrastructure/`                                                                              |Deployment, backup, monitoring, database operations, and queue guidance            |
|`scripts/`                                                                                     |Environment checks, migrations, seeding, data validation, and health checks        |
|`tests/`                                                                                       |Unit, integration, API, database, security, end-to-end, and accessibility tests    |
|`docs/`                                                                                        |Architecture, API, database, security, deployment, and operations documentation    |
|`.github/workflows/`                                                                           |CI, test, security, dependency, secret-scan, and deployment automation             |
|`Dockerfile`, `docker-compose.yml`                                                             |Container build and local/container orchestration                                  |
|`.env.example`, `.nvmrc`, `package.json`, `package-lock.json`                                  |Runtime expectations, configuration template, and dependency management            |

3. Production prerequisites

Before deploying, confirm all of the following:

☐ A production domain and HTTPS certificate are configured.
☐ The supported Node.js version is specified consistently in .nvmrc, package.json, Docker, and the hosting platform.
☐ Dependencies install from the committed lockfile.
☐ Production environment variables are configured in the hosting provider’s secret manager.
☐ The production database exists, is reachable only from approved services, and has a tested backup process.
☐ Database migrations have been reviewed and tested against a staging copy.
☐ Authentication, session management, authorization, password reset, email verification, and optional two-factor authentication have been tested.
☐ Uploads have size/type limits, safe storage paths, access checks, and malware-scanning controls where appropriate.
☐ Payment webhooks are authenticated and idempotent if payments are enabled.
☐ Logs avoid passwords, tokens, payment secrets, and unnecessary personal or document data.
☐ Health checks, alerts, rollback, and restore procedures are documented and tested.
☐ Legal pages and user-facing claims have been reviewed for accuracy.
☐ All critical user journeys work on mobile and desktop.

4. Environment configuration

Use .env.example as a documentation template, not as a production secrets file. Create production values in the deployment platform’s secret manager. Never commit .env or real credentials.

Review the application’s actual configuration code and document every required variable. Depending on implemented features, the configuration may include:

|Configuration area|Production requirement                                                                                                 |
|——————|————————————————————————————————————————|
|Runtime           |`NODE_ENV=production` and the expected port setting for the host                                                       |
|Application URL   |Canonical public origin and allowed origins                                                                            |
|Database          |Connection URL or individual connection settings, least-privilege credentials, TLS where supported                     |
|Sessions          |High-entropy secret, secure cookie settings, expiry, and a suitable shared session store for multi-instance deployments|
|Authentication    |Password hashing configuration, verification/reset token expiry, and rate limits                                       |
|Email             |SMTP or provider credentials stored as secrets; sender domain verified                                                 |
|File storage      |Private storage provider/bucket and access credentials, if file uploads are implemented                                |
|Payments          |Provider credentials, webhook signing secret, currency and environment mode, if payments are enabled                   |
|Queues/workers    |Queue connection and retry/dead-letter configuration, if asynchronous jobs are implemented                             |
|Logging/monitoring|Log level, error-reporting endpoint, and alert configuration without sensitive payloads                                |

The names above are categories, not a guarantee that the application uses those exact environment-variable names. Confirm exact names in src/config/, server.js, .env.example, and scripts/check-env.js.

Secret-handling rules

1. Use separate credentials for development, staging, and production.
2. Grant each credential only the permissions required by its service.
3. Rotate exposed or suspected-compromised credentials immediately.
4. Do not expose server-only secrets in frontend JavaScript or public JSON files.
5. Never log full authorization headers, session cookies, password-reset tokens, uploaded document contents, or payment secrets.

5. Local pre-deployment checks

Run commands from the repository root. Use the package scripts actually defined in package.json; the examples below must be adjusted if script names differ.

node —version
npm —version
npm ci
npm run lint
npm test

If a script is not defined, do not assume the command exists. Inspect package.json first.

Run project-specific checks when implemented:

node scripts/check-env.js
node scripts/validate-data.js
node scripts/health-check.js

Validate public JSON files and confirm pages load the correct paths. Check browser console errors, failed network requests, broken images, missing fonts, and invalid links.

Build and dependency review

• Use npm ci for reproducible installs in CI and deployment.
• Review npm audit output and resolve or document security findings before launch.
• Review dependency updates and lockfile changes before merging.
• Do not run destructive automated dependency upgrades in production without testing.
• Confirm the deployed artifact does not include local .env files, private storage, test fixtures containing real data, or unnecessary development tools.

6. Deployment workflow

Use the same controlled workflow for each release.

Step 1 — Prepare a release

1. Merge reviewed changes into the designated release branch.
2. Confirm CI, automated tests, secret scanning, dependency review, and security checks pass.
3. Update CHANGELOG.md and relevant documentation.
4. Verify package-lock.json is consistent with package.json.
5. Confirm database migrations are backward-compatible where possible.
6. Record the commit hash and release identifier.

Step 2 — Deploy to staging

1. Deploy the release to a staging environment with production-like configuration.
2. Use separate staging credentials and non-production user data.
3. Apply migrations using the approved migration procedure.
4. Test the homepage, navigation, education pages, search, account flows, career pages, admin authorization, uploads, emails, and payment flows that are actually enabled.
5. Review logs and health checks.
6. Obtain release approval before production rollout.

Step 3 — Deploy to production

1. Confirm a recent, successful database backup and verify that restoration is possible.
2. Confirm the rollback release or previous image/artifact is available.
3. Apply the approved deployment for the chosen hosting platform.
4. Run migrations once using the designated migration job or operator—not independently on every app instance unless the migration system explicitly supports it.
5. Verify the application starts and health endpoints return the expected status.
6. Run smoke tests against the production domain.
7. Monitor errors, latency, resource usage, authentication, queues, and database health.
8. Record the release, migration status, and verification results.

Hosting-platform notes

The repository includes infrastructure/deployment/render.md, staging.md, production.md, and rollback.md. Follow the instructions matching the actual host. Do not assume a Render, Docker, or other deployment configuration is correct merely because a related file exists.

7. Database operations

The repository lists database/schema.sql, migrations, seeds, and fixtures. Confirm which database engine the application actually uses before running commands. Do not mix MySQL and PostgreSQL instructions or connection settings.

Production database rules:

• Use a dedicated database and least-privilege application account.
• Restrict network access to approved application and administrative hosts.
• Encrypt connections and backups where supported.
• Apply schema changes through reviewed, version-controlled migrations.
• Keep seeds and fixtures separate from production data.
• Do not run destructive seed scripts against production.
• Define retention, capacity, connection-pool, indexing, and maintenance policies.
• Monitor connection saturation, slow queries, storage capacity, and failed migrations.
• Avoid manual schema edits unless they are documented and reconciled with migration history.

Before a migration, identify its locking, downtime, data-loss, and rollback implications. A down-migration is not always safe; use a tested recovery plan.

8. Uploaded documents and storage

MedOrbits may handle application documents and account-related files. Treat these as private by default.

• Store private files outside the public web root or in a private object-storage bucket.
• Authorize every upload, view, download, replacement, and deletion request on the server.
• Use generated storage keys rather than trusting user-supplied filenames or paths.
• Enforce file size limits and allowlisted formats; validate file content as well as extensions.
• Prevent path traversal, executable uploads, and public directory listing.
• Use short-lived signed URLs only when appropriate and avoid exposing permanent public links to private files.
• Apply malware scanning where required by the risk profile and hosting capabilities.
• Keep temporary files on a scheduled cleanup policy.
• Encrypt backups and restrict access to backup artifacts.
• Define retention and deletion policies, including any legal or audit retention requirements.

The storage/private/, storage/temporary/, and storage/logs/ directories must not be exposed as public static directories. Confirm .gitignore, server static-file configuration, and deployment packaging enforce this.

9. Security requirements

Application and API

• Enforce authentication on private endpoints and authorization on every protected resource.
• Apply server-side input validation and output encoding.
• Use CSRF protection where cookie-based authentication and state-changing requests require it.
• Configure secure headers, an explicit CORS allowlist, and suitable content security policy.
• Apply rate limits to login, registration, password reset, verification, search, upload, and other abuse-prone endpoints.
• Use secure, HttpOnly, and appropriate SameSite cookies; enable Secure in HTTPS production.
• Rotate session identifiers after authentication or privilege changes.
• Prevent user-controlled role assignment and enforce role checks server-side.
• Verify webhook signatures and prevent replay or duplicate processing.
• Return generic client-facing errors while retaining safe diagnostic details in server logs.
• Keep the runtime, operating system image, and dependencies patched.

Administrative access

• Protect /admin/ pages and their backing API routes independently; hiding links is not authorization.
• Require strong authentication for administrators and enable multi-factor authentication where available.
• Apply least privilege and separate duties for sensitive operations.
• Record security-relevant actions in audit logs, while avoiding unnecessary sensitive data.
• Review administrator access periodically and revoke access promptly when no longer needed.

Payments and subscriptions

If payment functionality is enabled:

• Use the payment provider’s supported hosted or tokenized payment flow; do not store raw card data.
• Verify webhook signatures using the provider’s documented method.
• Make webhook processing idempotent and safe for retries.
• Reconcile local payment/subscription states with provider records.
• Keep test and live credentials separate.
• Verify cancellation, refund, failed-payment, renewal, and dispute flows.
• Do not treat a frontend redirect or client-provided status as proof of payment.

Security incident reporting

Follow SECURITY.md and the security contact defined there. Do not publish vulnerability details or secrets in public issue trackers.

10. Privacy and legal readiness

Before public launch, verify that the published legal and privacy content matches the real product behavior and applicable law. In particular, review:

• Privacy policy, terms, cookie policy, consent preferences, data deletion, and grievance handling.
• Job-service, employer, payment, subscription, and refund terms where those services are offered.
• Data collection, purpose, retention, access controls, deletion, and third-party processors.
• Consent and permission for testimonials, photographs, and other personal information.
• Accuracy of claims about admissions, recognition, jobs, salaries, scholarships, loans, and outcomes.

Do not describe a feature as guaranteed, available, or compliant unless the implementation and relevant evidence support that statement. Obtain qualified legal advice where needed.

11. Monitoring, logs, and alerts

Use the documentation in infrastructure/monitoring/ and src/config/logger.js as applicable.

Monitor at minimum:

• Application uptime and health-check failures.
• HTTP 5xx rates, latency, and repeated 4xx abuse patterns.
• Authentication failures and suspicious account activity.
• Database availability, pool saturation, slow queries, and disk capacity.
• Upload failures, storage capacity, and unauthorized access attempts.
• Email delivery failures.
• Payment webhook failures and reconciliation mismatches, if enabled.
• Queue backlog, retries, dead-letter volume, and worker failures, if enabled.
• Backup success and backup age.

Logs should be structured, access-controlled, retained according to policy, and protected from tampering. Redact credentials, tokens, personal data, and document contents. Define alert owners and an escalation path; an alert without an owner is not an operational control.

12. Backups and disaster recovery

Use the procedures under infrastructure/backup/ and docs/operations/backup-recovery.md after verifying they match the selected database and storage systems.

• Set documented recovery point objective (RPO) and recovery time objective (RTO).
• Back up the database and required private object storage.
• Encrypt backups and restrict access independently from application credentials.
• Store recovery copies separately from the primary failure domain where feasible.
• Monitor backup jobs and alert on failures.
• Test restoration on a regular schedule in an isolated environment.
• Document restore order, required secrets, DNS steps, validation checks, and responsible operators.
• Record the result of each restore drill.

A successful backup job is not proof of recoverability. A tested restore is required.

13. Rollback and incident response

For a failed release:

1. Identify the impact and pause further rollout.
2. Use infrastructure/deployment/rollback.md for the hosting platform.
3. Roll back the application artifact if the previous version is compatible with the current schema.
4. Do not blindly reverse a database migration if it could destroy data.
5. Restore from backup only under the approved recovery procedure and after assessing data-loss implications.
6. Verify health checks and critical user flows.
7. Preserve relevant logs and deployment metadata.
8. Document the incident, user impact, root cause, corrective action, and follow-up owner.

For security incidents, follow docs/operations/incident-response.md and SECURITY.md. Revoke or rotate exposed credentials, contain access, preserve evidence, and assess notification obligations.

14. Frontend, accessibility, and SEO checks

Before release:

☐ Confirm the canonical URL and environment-specific origins are correct.
☐ Verify robots.txt, sitemap.xml, manifest.json, and security contact files are accurate.
☐ Ensure staging and preview deployments are not accidentally indexed.
☐ Check page titles, descriptions, headings, canonical links, and internal links.
☐ Verify images, fonts, CSS, JavaScript, JSON data, and videos load from the intended paths.
☐ Test mobile navigation, forms, keyboard access, visible focus, labels, contrast, and reduced-motion behavior.
☐ Check 404, 500, and offline pages where the hosting architecture supports them.
☐ Validate that public JSON contains no secrets or private user data.
☐ Confirm the visual design and opening animation do not prevent access to content or controls.

15. Release smoke-test checklist

Perform checks against the deployed environment after each release:

☐ Homepage loads over HTTPS.
☐ Main navigation, dropdowns, opening animation, and footer work.
☐ Education, course, college, university, admissions, and resource pages load.
☐ Career, job, internship, and employer pages load.
☐ Search and filters behave as expected.
☐ Login, logout, registration, verification, and password reset work if implemented.
☐ Account and admin routes enforce server-side permissions.
☐ Forms show validation errors and safe success/failure messages.
☐ Uploads and downloads enforce access controls.
☐ Email delivery works for enabled workflows.
☐ Payment and subscription flows pass provider test/reconciliation checks if enabled.
☐ Database reads/writes and migration status are healthy.
☐ Health endpoints, logs, alerts, and backups are functioning.
☐ No critical browser-console, server, or accessibility errors remain.

16. Production change management

Every production change should have:

• A reviewed pull request and linked issue or change request.
• Passing CI, tests, lint, security and dependency checks as applicable.
• A migration plan when data or schema changes.
• A staging verification record.
• A release identifier and rollback plan.
• Post-deployment smoke-test results.
• Updated documentation and CHANGELOG.md when relevant.

Emergency changes should be documented retrospectively and reviewed after the incident is contained.

17. Ownership and maintenance

Assign named owners for:

• Application releases and rollback.
• Database administration and migrations.
• Security alerts and vulnerability response.
• Backup monitoring and restore drills.
• Payment and subscription reconciliation, if enabled.
• User support, privacy requests, and incident communication.

Review this guide whenever the deployment platform, database engine, authentication model, storage design, payment provider, or production architecture changes.

────────

Final production gate

Do not declare MedOrbits production-ready until the deployed implementation—not only the repository structure—has passed security review, functional tests, access-control checks, backup restoration, monitoring verification, and a documented rollback rehearsal.