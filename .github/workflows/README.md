MedOrbits GitHub Actions Workflows

Directory: .github/workflows/
Project: MedOrbits
Purpose: Continuous integration, automated testing, dependency and lockfile validation, security checks, release management, and deployment orchestration.

⸻

1. Overview

The .github/workflows/ directory contains GitHub Actions workflow definitions used to automate repository checks and supported development operations.

Workflows may run automatically on pushes, pull requests, scheduled events, or manual dispatch, depending on their configured triggers.

This document describes the intended responsibilities and operating standards of the workflows. Actual behavior is determined by the corresponding YAML files.

2. Workflow Inventory

Workflow	Primary responsibility
ci.yml	Runs configured continuous integration checks for repository changes.
codeql.yml	Performs CodeQL static analysis for supported source code.
dependency-review.yml	Reviews dependency changes in eligible pull requests.
deploy.yml	Defines deployment orchestration and production safeguards.
lockfile.yml	Validates npm lockfile presence, metadata, placeholder integrity values, synchronization, and clean dependency installation.
release.yml	Validates release tags and publishes GitHub Releases.
secret-scan.yml	Scans configured repository content or history for potential secrets.
security.yml	Coordinates explicitly configured dependency, code, or repository security checks.
tests.yml	Runs automated tests and manages supported test artifacts.
validate-config.yml	Validates required configuration files and supported JSON/YAML syntax.

Maintenance requirement: Update this inventory whenever a workflow is added, removed, renamed, or materially changed. Confirm that each listed workflow file actually exists before describing it as active.

3. Workflow Design Standards

3.1 Triggers

* Use explicit branch and path filters where appropriate.
* Support workflow_dispatch when manual execution is useful.
* Schedule checks that benefit from periodic execution.
* Avoid unnecessary duplicate workflow runs.
* Verify the repository’s default branch and protected release branches.
* Ensure pull-request checks run for the intended contribution model.

3.2 Permissions

Use the minimum required permissions. The default baseline should generally be:

permissions:
  contents: read

Additional permissions should be granted only to the relevant workflow or job:

* security-events: write for supported security-analysis uploads.
* pull-requests: write when a workflow must post pull-request comments.
* contents: write when publishing releases or modifying repository content.

Do not grant write permissions to every workflow for convenience.

3.3 Dependencies and runtime

* Use a supported Node.js version consistent with the project’s runtime policy.
* Use npm ci in CI when a committed lockfile is required.
* Keep package.json and package-lock.json synchronized.
* Validate commands against the scripts actually defined in package.json.
* Review third-party actions before adopting updates.
* Consider pinning third-party actions to verified full commit SHAs.
* Avoid exposing credentials to untrusted pull-request code.

3.4 Concurrency and artifacts

* Use concurrency groups where overlapping runs could waste resources or conflict.
* Cancel superseded CI runs only when safe.
* Do not cancel active deployments unless the deployment design supports cancellation.
* Upload useful test reports and diagnostic artifacts only.
* Set appropriate artifact retention periods.
* Never upload .env files, private keys, production credentials, or unredacted sensitive logs.

4. Workflow Responsibilities

4.1 ci.yml

Runs the configured continuous integration checks, which may include:

* Dependency installation.
* JavaScript syntax checks.
* Configuration and data validation.
* Linting and formatting checks.
* Automated tests.
* Coverage generation.

Every referenced script must exist and be compatible with the repository’s tooling.

4.2 codeql.yml

Runs CodeQL analysis for supported languages and reports findings through GitHub’s security interface when repository configuration, permissions, and available features support it.

Review findings and distinguish genuine vulnerabilities from false positives before remediation.

4.3 dependency-review.yml

Reviews dependency changes introduced by pull requests where the required GitHub functionality and repository configuration are available.

Review severity thresholds, license policies, and exclusions before enforcing merge-blocking rules.

4.4 deploy.yml

Defines deployment checks and safeguards.

Before enabling production deployment, verify that:

* The deployment provider and deployment mechanism are configured.
* Only approved branches or release tags can deploy.
* Production credentials are stored in GitHub Secrets or an appropriate environment.
* Production environment approvals are configured where required.
* The workflow verifies the intended commit and deployment target.
* Failures are reported accurately.

A workflow that only validates deployment prerequisites must not be described as performing a successful deployment.

4.5 lockfile.yml

Validates the npm dependency lockfile for the MedOrbits project.

The configured workflow is intended to:

* Run when relevant package files change, on eligible pull requests, or through manual dispatch.
* Confirm that package.json and package-lock.json exist.
* Validate their JSON syntax.
* Check lockfile version and root package metadata.
* Reject detected placeholder integrity hashes.
* Check whether npm can synchronize the package metadata and lockfile without changing tracked files.
* Run a clean dependency installation using npm ci.
* Fail when its required validation checks fail.

The workflow’s exact behavior depends on its current YAML implementation.

Operational requirements:

1. Generate the lockfile with npm rather than fabricating dependency metadata or integrity hashes.
2. Commit package.json and package-lock.json together.
3. Investigate lockfile synchronization failures instead of bypassing the check.
4. Review npm installation and dependency errors before merging.
5. Do not treat a successful lockfile validation as proof that the application is secure or fully functional.

The workflow may use npm install —package-lock-only to check synchronization and npm ci to verify clean installation. These commands require the appropriate npm registry access and a compatible Node.js/npm environment.

4.6 release.yml

Validates the configured release version and publishes GitHub Releases according to the workflow implementation.

Before publishing, verify that:

* The release tag follows the documented versioning policy.
* The tag points to the intended commit.
* The package version matches the release policy.
* Required validation and test jobs have succeeded.
* Existing releases are handled safely.
* Release notes do not expose secrets or sensitive operational details.

Publishing a GitHub Release does not automatically deploy the application to a hosting provider unless a separate deployment mechanism is configured.

4.7 secret-scan.yml

Scans configured repository content or Git history for potential credentials and other sensitive values.

If a real secret is discovered:

1. Revoke or rotate the exposed credential immediately.
2. Investigate potential unauthorized access.
3. Remove the secret from source and history where appropriate.
4. Review logs and access records.
5. Add preventive controls to reduce recurrence.

Deleting a secret from the latest commit does not invalidate the credential or necessarily remove it from Git history.

4.8 security.yml

Runs the security checks explicitly configured in the workflow.

Avoid unnecessary duplication of CodeQL, dependency auditing, or secret scanning already handled by dedicated workflows. Document intentional overlap and the expected coverage.

4.9 tests.yml

Runs configured automated tests and publishes supported test artifacts.

Ensure that:

* The test runner and required scripts exist.
* Assertion failures cause the workflow to fail.
* Coverage thresholds, if enforced, are documented.
* Reports contain no credentials or sensitive user data.
* Artifact retention is appropriate for diagnostic needs.

4.10 validate-config.yml

Validates required configuration files and supported JSON/YAML syntax.

Validation should confirm that:

* Required files exist.
* JSON files parse successfully.
* YAML files parse with an appropriate parser.
* Required keys are present where schema rules are defined.
* Environment-variable names and documented configuration conventions are consistent.

Syntax validation alone does not prove that credentials, URLs, database settings, or deployment configuration are correct.

5. Repository Setup Checklist

Complete this checklist before treating the workflows as production controls.

* [ ]	All documented workflow files exist and contain valid YAML.
* [ ]	Workflow triggers and branch filters match repository policy.
* [ ]	Node.js and npm versions match the project’s supported runtime.
* [ ]	package.json and package-lock.json are committed and synchronized.
* [ ]	The lockfile contains no fabricated placeholder integrity hashes.
* [ ]	lockfile.yml validates the actual lockfile used by the project.
* [ ]	All referenced npm scripts exist.
* [ ]	CI, configuration validation, and automated tests pass.
* [ ]	GitHub Actions permissions follow least privilege.
* [ ]	Required repository security features are enabled where available.
* [ ]	Branch protection or repository rules require appropriate status checks.
* [ ]	CODEOWNERS assigns review responsibility for sensitive workflow changes.
* [ ]	Production environments and approval rules are configured.
* [ ]	Deployment secrets are configured only when deployment is implemented.
* [ ]	Third-party actions and dependency updates are reviewed.
* [ ]	Artifact contents and retention periods are appropriate.
* [ ]	Failure notifications and remediation ownership are documented.

6. Security Requirements

1. Never commit API keys, passwords, access tokens, private keys, or production credentials.
2. Use the minimum permissions required by each job.
3. Avoid exposing secrets to untrusted pull-request code.
4. Review changes to .github/workflows/ before merging.
5. Protect production deployment environments and credentials.
6. Investigate and remediate security alerts promptly.
7. Rotate exposed credentials immediately.
8. Avoid printing secret values or sensitive application data in logs.
9. Review third-party actions, maintainers, permissions, and version changes.
10. Do not treat a passing scan as proof that the repository or application is completely secure.
11. Do not disable lockfile validation merely to make a failed workflow pass.
12. Keep dependency installation and release operations reproducible.

7. Troubleshooting

When a workflow fails:

1. Open the repository’s Actions tab.
2. Select the failed workflow run.
3. Open the failed job and identify the first relevant error.
4. Check YAML syntax, triggers, permissions, secrets, runtime versions, and dependencies.
5. Confirm the referenced scripts and files exist.
6. Reproduce the failure locally or in Codespaces where practical.
7. Correct the root cause before rerunning the workflow.
8. Review the final run and any generated artifacts.

For lockfile failures:

* Confirm that package.json and package-lock.json are both present.
* Check that the lockfile is generated by npm.
* Remove fabricated placeholder integrity values by regenerating the lockfile.
* Run npm install to synchronize the files.
* Review the resulting changes to both files.
* Run npm ci to verify clean installation.
* Commit the updated lockfile with the matching package.json.

For deployment failures, verify the target environment, provider configuration, credentials, and deployment logs without exposing sensitive values.

8. Related Documentation

* README.md — Root project overview and setup instructions.
* .github/README.md — GitHub configuration documentation, if present.
* .github/CODEOWNERS — Code ownership configuration, if present at this path.
* .github/dependabot.yml — Dependency update configuration, if present.
* CONTRIBUTING.md — Contribution guidelines.
* SECURITY.md — Vulnerability reporting instructions.
* package.json — Runtime requirements and available npm scripts.
* package-lock.json — Locked npm dependency tree.
* database/ — Database schema and related documentation.

Verify each referenced path exists before treating it as an active project document.

9. Maintenance Policy

Review this documentation whenever workflow behavior, permissions, triggers, security controls, deployment configuration, lockfile validation, or artifact handling changes.

Keep the documentation factual. Describe only the checks and actions implemented by the current workflow files. Document planned capabilities as planned rather than completed.

Important: This README documents workflow responsibilities and operating standards. It does not configure GitHub Actions, enable repository security features, establish branch protection, or implement deployment by itself.