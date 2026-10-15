MedOrbits Repository Hardening Guide

Project: MedOrbits
Purpose: Improve repository security, protect source code, reduce credential exposure, and strengthen CI/CD controls.

⸻

1. Repository Access and Account Security

* [ ]	Confirm the GitHub repository visibility is set to Private.
* [ ]	Enable two-factor authentication (2FA) or a passkey on the GitHub account.
* [ ]	Review collaborators and remove users who no longer require access.
* [ ]	Review organization and team permissions, if applicable.
* [ ]	Audit GitHub Apps, OAuth authorizations, personal access tokens, deploy keys, and SSH keys.
* [ ]	Revoke unused credentials and authorizations.
* [ ]	Use a separate account or deployment identity for automated production access where practical.
* [ ]	Never share private SSH keys, recovery codes, access tokens, or passwords.

Important: A private repository prevents public browsing but does not prevent authorized users from cloning or copying its contents.

2. Protect the Main Branch

Open:

https://github.com/vivekchoubey444-del/MedOrbits/settings/rules

Create a branch ruleset targeting main.

* [ ]	Require pull requests before merging changes.
* [ ]	Require at least one approval when a trusted reviewer is available.
* [ ]	Dismiss stale approvals when new commits materially change the reviewed code.
* [ ]	Require conversation resolution before merging.
* [ ]	Require applicable CI and security status checks.
* [ ]	Block force pushes.
* [ ]	Prevent branch deletion.
* [ ]	Restrict bypass permissions to trusted administrators.
* [ ]	Protect develop similarly if it is used for ongoing development.

Do not make a status check mandatory until it has run successfully and its exact check name has been verified.

3. Secrets and Environment Variables

* [ ]	Keep production credentials outside the Git repository.
* [ ]	Add .env and real environment-specific files to .gitignore.
* [ ]	Commit only sanitized examples such as .env.example.
* [ ]	Never commit API keys, database passwords, payment-provider secrets, private keys, or session-signing secrets.
* [ ]	Store production secrets in the deployment platform’s secret manager.
* [ ]	Use GitHub Actions secrets or environment secrets only when workflows need them.
* [ ]	Apply least-privilege access to each credential.
* [ ]	Rotate credentials immediately if they are exposed.
* [ ]	Review Git history if a secret was committed; removing the latest copy does not invalidate it.
* [ ]	Never print secrets in CI logs or error responses.

4. GitHub Actions Security

* [ ]	Set workflow permissions to read-only by default.
* [ ]	Grant write permissions only to jobs that require them.
* [ ]	Avoid executing untrusted pull-request code with privileged secrets.
* [ ]	Review third-party actions before using them.
* [ ]	Pin third-party actions to full commit SHAs where practical.
* [ ]	Keep persist-credentials: false on checkout steps that do not need authenticated Git operations.
* [ ]	Use supported Node.js versions consistent with the project and deployment platform.
* [ ]	Set job timeouts and avoid unnecessary workflow privileges.
* [ ]	Review workflow changes before merging them.
* [ ]	Keep CI checks focused, maintainable, and free from duplicate jobs where possible.

5. Dependency Security

Open:

https://github.com/vivekchoubey444-del/MedOrbits/settings/security_analysis

Enable the features available to the repository:

* [ ]	Dependency graph.
* [ ]	Dependabot alerts.
* [ ]	Dependabot security updates.
* [ ]	Secret scanning and push protection, if available.
* [ ]	Code scanning and CodeQL, if available.
* [ ]	Dependency Review, if supported by the repository and plan.

Additional checks:

* [ ]	Commit the correct lockfile for the package manager in use.
* [ ]	Use npm ci in CI when package-lock.json is maintained.
* [ ]	Review dependency audit results and assess the actual impact of vulnerabilities.
* [ ]	Review major-version updates separately.
* [ ]	Remove unused dependencies.
* [ ]	Do not automatically merge dependency updates without suitable tests and review.

6. Secret Scanning

* [ ]	Run Gitleaks or an equivalent secret scanner in CI.
* [ ]	Scan repository history when investigating possible previously committed secrets.
* [ ]	Review suspected findings manually to distinguish real credentials from examples and false positives.
* [ ]	Revoke or rotate confirmed exposed credentials immediately.
* [ ]	Remove exposed secrets from repository history when necessary, coordinating with collaborators.
* [ ]	Do not rely solely on regular expressions or a custom security-check script.

Secret scanning detects potential exposure; it does not prevent authorized copying.

7. Application Security

* [ ]	Validate untrusted input on the server.
* [ ]	Enforce authorization on every protected API operation.
* [ ]	Apply authentication and session-management controls appropriate to the application.
* [ ]	Use secure password hashing and safe authentication practices.
* [ ]	Configure rate limits for sensitive endpoints.
* [ ]	Prevent injection vulnerabilities using parameterized database queries and safe output handling.
* [ ]	Apply appropriate security headers and a restrictive Content Security Policy where practical.
* [ ]	Avoid exposing stack traces, internal paths, credentials, or sensitive records to clients.
* [ ]	Keep administrative operations restricted to authorized roles.
* [ ]	Test access-control boundaries and failure cases.

8. File Uploads and Documents

* [ ]	Authenticate users before protected uploads or downloads.
* [ ]	Verify authorization for each document operation.
* [ ]	Validate file size, type, and content rather than trusting the supplied filename or MIME type alone.
* [ ]	Generate safe server-side storage names.
* [ ]	Store private documents outside publicly served directories.
* [ ]	Prevent path traversal and unsafe file execution.
* [ ]	Consider malware scanning for uploaded files.
* [ ]	Apply retention and deletion rules to sensitive documents.
* [ ]	Avoid placing real user documents in source control or test fixtures.

9. Payments and Financial Data

* [ ]	Verify payment-provider webhook signatures.
* [ ]	Implement idempotency to prevent duplicate processing.
* [ ]	Validate payment amounts and transaction states on the server.
* [ ]	Do not trust payment success messages supplied by the browser.
* [ ]	Keep provider secrets on the server.
* [ ]	Avoid storing card security codes or unnecessary payment information.
* [ ]	Log transaction references and status changes without exposing sensitive payment data.
* [ ]	Test webhook retries, duplicate events, and failure recovery.

10. Database and Production Deployment

* [ ]	Store database credentials in deployment secrets.
* [ ]	Use a restricted database account for application operations.
* [ ]	Use separate development, testing, and production environments.
* [ ]	Review database migrations before deployment.
* [ ]	Plan rollback or recovery procedures for schema changes.
* [ ]	Back up critical data and test restoration procedures.
* [ ]	Apply appropriate database network access restrictions.
* [ ]	Keep production debug mode disabled.
* [ ]	Configure HTTPS and secure cookie settings for production.
* [ ]	Monitor application errors and security-relevant events without logging sensitive data.

11. Frontend Source-Code Limitations

* [ ]	Never embed API secrets or private credentials in browser-delivered JavaScript.
* [ ]	Move proprietary business logic requiring confidentiality to server-side services.
* [ ]	Enforce access control on the backend rather than hiding UI elements.
* [ ]	Remove source maps from public deployment when they are not intentionally published.
* [ ]	Minification and obfuscation may increase copying effort but do not prevent copying.
* [ ]	Review public assets and frontend bundles for accidentally exposed configuration or data.

HTML, CSS, JavaScript, images, and other assets delivered to a browser can be inspected or copied. Repository privacy does not change that.

12. Incident Response

If a credential or sensitive file is exposed:

1. Revoke or rotate the affected credential immediately.
2. Determine which systems and data may have been affected.
3. Review relevant access logs and audit events.
4. Remove the exposed material from the repository and history where appropriate.
5. Update deployment secrets and affected services.
6. Notify impacted parties when legally or operationally required.
7. Document the cause and preventive actions.

Do not assume that deleting a file or making a repository private invalidates a leaked credential.

13. Ongoing Maintenance

* [ ]	Review collaborators and access permissions regularly.
* [ ]	Review Dependabot pull requests and security alerts.
* [ ]	Investigate failed CI and security workflows.
* [ ]	Update supported runtimes and dependencies.
* [ ]	Review the security policy and supported-version policy.
* [ ]	Test backup recovery and incident-response procedures.
* [ ]	Reassess this checklist after significant architecture or deployment changes.

⸻

Completion Record

Use this section to record implementation progress.

Area	Status
Repository privacy and access	Pending verification
Branch protection	Pending verification
Secret management	Pending verification
CI/CD permissions	Pending verification
Dependency security	Pending verification
Secret scanning	Pending verification
Application security	Pending verification
Production deployment	Pending verification

Security statement: This guide provides hardening recommendations, not a guarantee that MedOrbits is secure or that its source code cannot be copied. Verify each control in the actual repository and deployment environment before marking it complete.