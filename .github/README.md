MedOrbits — GitHub Repository Configuration

Directory: .github/
Project: MedOrbits
Purpose: Repository governance, contribution management, dependency maintenance, automated validation, security monitoring, and release coordination.

⸻

1. Overview

The .github/ directory contains the GitHub-specific configuration, templates, and automation used to maintain the MedOrbits project.

It establishes a consistent process for code review, issue reporting, dependency updates, continuous integration, security checks, and release management.

Configuration files define intended behavior; enforcement depends on their implementation, repository settings, permissions, and branch protection rules.

2. Directory Structure

.github/
├── README.md
├── CODEOWNERS
├── dependabot.yml
├── PULL_REQUEST_TEMPLATE.md
├── ISSUE_TEMPLATE/
│   ├── README.md
│   ├── bug-report.md
│   ├── feature-request.md
│   └── security-report.yml
└── workflows/
    ├── README.md
    ├── ci.yml
    ├── codeql.yml
    ├── dependency-review.yml
    ├── deploy.yml
    ├── release.yml
    ├── secret-scan.yml
    ├── security.yml
    ├── tests.yml
    └── validate-config.yml

Inventory note: codeql.yml is included because it is part of the documented MedOrbits workflow configuration. Keep this tree synchronized with the actual repository.

3. Configuration Inventory

File or directory	Responsibility
CODEOWNERS	Defines file and directory review ownership.
dependabot.yml	Configures automated dependency update pull requests.
PULL_REQUEST_TEMPLATE.md	Standardizes change descriptions and review checklists.
ISSUE_TEMPLATE/	Provides structured bug reports, feature requests, and security-report intake.
workflows/	Contains CI, testing, security, validation, release, and deployment automation.

3.1 Code ownership

File: CODEOWNERS

Defines the GitHub usernames or organization teams responsible for reviewing changes to specified paths.

Requirements:

* Replace all placeholder owners with valid GitHub usernames or teams.
* Assign ownership for application code, database changes, security-sensitive configuration, and deployment workflows.
* Ensure the file is placed at a GitHub-supported location.
* Configure repository rules separately to require code-owner approval where appropriate.

A CODEOWNERS file alone does not enforce mandatory reviews.

3.2 Dependency management

File: dependabot.yml

Configures automated dependency update pull requests for supported package ecosystems.

Maintenance requirements:

* Keep npm dependencies synchronized with package.json and package-lock.json.
* Review major-version changes individually where practical.
* Evaluate dependency security advisories promptly.
* Review grouped updates through CI before merging.
* Verify that ecosystem entries correspond to files actually maintained by the repository.
* Review dependency licenses against the project’s licensing policy.

Dependabot configuration does not, by itself, enable every repository security feature.

3.3 Pull request management

File: PULL_REQUEST_TEMPLATE.md

Provides a consistent structure for documenting proposed changes.

The template should cover, where applicable:

* Change summary and motivation.
* Related issues.
* Tests performed and results.
* Database schema changes and migration requirements.
* Security, privacy, and access-control implications.
* Environment variable or configuration changes.
* Deployment, rollback, and compatibility considerations.
* Documentation updates.

Contributors must not claim tests passed unless they actually ran successfully.

3.4 Issue templates

Directory: ISSUE_TEMPLATE/

File	Responsibility
README.md	Documents available issue templates.
bug-report.md	Collects reproducible defects and relevant diagnostic details.
feature-request.md	Collects feature proposals and expected outcomes.
security-report.yml	Provides structured security-report intake, subject to its actual form configuration.

Do not use public issue templates to collect passwords, API keys, access tokens, personal documents, or confidential vulnerability details.

A public issue is not made private by labeling it as security-related. Use GitHub’s private vulnerability reporting feature or another verified private reporting channel when available.

4. GitHub Actions Workflows

Directory: workflows/

Workflow	Responsibility
ci.yml	Performs continuous integration checks.
codeql.yml	Analyzes supported source code for potential vulnerabilities.
dependency-review.yml	Reviews dependency changes in eligible pull requests.
deploy.yml	Defines deployment orchestration and production safeguards.
release.yml	Validates release tags and publishes GitHub Releases.
secret-scan.yml	Scans configured repository content or history for potential secrets.
security.yml	Runs the security checks explicitly configured in the workflow.
tests.yml	Executes automated tests and manages configured artifacts.
validate-config.yml	Validates required configuration and supported file syntax.
README.md	Documents workflow behavior and repository setup requirements.

Consult each workflow for its actual triggers, permissions, branch filters, conditions, secrets, and execution steps.

Avoid duplicating expensive security checks across workflows unless the overlap is intentional and documented.

5. Repository Governance

5.1 Branch protection and review

Configure GitHub repository rules to:

* Require pull requests before merging protected branches.
* Require appropriate code-owner approval for sensitive paths.
* Require the relevant CI and test status checks.
* Prevent force pushes and deletion of protected branches where appropriate.
* Restrict production deployment permissions.
* Apply additional review requirements to security-sensitive changes.

Use the exact status-check names produced by the configured workflows.

5.2 Least-privilege permissions

Workflows should receive only the permissions necessary for their tasks.

* Use read-only repository permissions by default.
* Grant security-event permissions only to jobs that publish security results.
* Grant pull-request write access only when a job needs to comment on a PR.
* Grant contents write access only to trusted release or repository-modification jobs.
* Do not expose production credentials to untrusted pull-request code.

5.3 Secrets and environments

Store credentials in GitHub Secrets or protected environment secrets rather than workflow files.

For production deployment:

* Restrict deployment to approved branches or tags.
* Configure a protected production environment where supported.
* Require approvals when appropriate.
* Limit access to production secrets.
* Review deployment logs for accidental sensitive-data exposure.
* Rotate credentials immediately if they are exposed.

A deployment workflow must not be considered operational until its provider-specific deployment steps are configured and verified.

6. Required Repository Setup

Use this checklist when establishing or reviewing the repository configuration.

* [ ]	Confirm all documented files exist at the expected paths.
* [ ]	Replace placeholder code owners.
* [ ]	Verify issue and pull-request labels exist or are created through automation.
* [ ]	Confirm the Dependabot policy matches the maintained ecosystems.
* [ ]	Validate all workflow YAML files.
* [ ]	Verify Node.js versions and npm commands against package.json.
* [ ]	Confirm npm ci works with the committed lockfile.
* [ ]	Run the configured automated tests.
* [ ]	Verify CI status checks before making them mandatory.
* [ ]	Configure branch protection or repository rules.
* [ ]	Enable applicable GitHub security features.
* [ ]	Verify private vulnerability reporting.
* [ ]	Configure production environments and deployment credentials only when needed.
* [ ]	Review third-party GitHub Actions and their permissions.
* [ ]	Confirm generated artifacts do not contain credentials or sensitive data.

7. Validation and Quality Controls

Before merging changes to .github/:

1. Validate workflow YAML syntax.
2. Check referenced scripts, files, and npm commands exist.
3. Verify workflow permissions and trigger conditions.
4. Review changes to secrets access, deployment gates, and release permissions.
5. Confirm dependency update groups and labels match repository policy.
6. Test changes on a non-production branch where practical.
7. Inspect the resulting GitHub Actions run.
8. Update the relevant documentation.

Syntax validation does not prove that a workflow can authenticate, deploy, access repository features, or successfully complete every job.

8. Security Incident Handling

If a credential or sensitive value is exposed:

1. Revoke or rotate the credential immediately.
2. Investigate whether it was accessed or misused.
3. Remove the exposed value from source files and relevant history where appropriate.
4. Review workflow logs, deployment logs, and access records.
5. Update the secret-scanning or prevention controls.
6. Report the incident through the appropriate private channel.

Do not rely on deleting a secret from the latest commit alone; the credential may remain usable or exist in repository history.

9. Troubleshooting

Workflow failure

* Open the repository’s Actions tab.
* Select the failed run and inspect the first relevant error.
* Check permissions, branch filters, environment variables, dependencies, and referenced scripts.
* Fix the underlying cause before rerunning the workflow.

Dependabot failure

* Review the Dependabot update logs.
* Verify the ecosystem and directory configuration.
* Check lockfile consistency and package-manager compatibility.
* Review registry authentication and dependency constraints if applicable.

Code-owner or branch-protection issue

* Verify the CODEOWNERS path and owner syntax.
* Confirm the referenced accounts have repository access.
* Check that required status checks match actual workflow job names.
* Review repository rules and bypass permissions.

10. Related Documentation

* ../README.md — Root project overview and setup instructions.
* ../CONTRIBUTING.md — Contribution guidelines, if present.
* ../SECURITY.md — Vulnerability reporting policy, if present.
* ../package.json — Runtime requirements and available npm scripts.
* ../package-lock.json — Locked npm dependency tree.
* workflows/README.md — Workflow responsibilities and setup.
* ../database/ — Database schema and migration documentation, if present.

Verify referenced paths against the actual repository before relying on them.

11. Maintenance Policy

Review this directory whenever repository governance, dependency policies, security controls, workflow permissions, release procedures, or deployment behavior changes.

Keep documentation aligned with implemented configuration. Clearly distinguish active functionality from planned functionality.

Important: These files provide configuration and documentation. GitHub repository settings, required status checks, environment protections, and provider-specific deployment setup must be configured separately.