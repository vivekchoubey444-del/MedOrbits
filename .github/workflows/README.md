
# GitHub Actions Workflows

This directory contains the GitHub Actions workflows used to validate, test, secure, release, and deploy the MedOrbits project.

## Workflow Directory

| File | Purpose |
|—|—|
| `ci.yml` | Runs continuous integration checks, including dependency installation, linting, formatting, and tests. |
| `dependency-review.yml` | Reviews dependency changes in pull requests for security vulnerabilities and license policy violations. |
| `deploy.yml` | Defines the deployment workflow and production deployment gate. |
| `release.yml` | Validates version tags and publishes GitHub Releases. |
| `secret-scan.yml` | Scans repository history for accidentally committed secrets. |
| `security.yml` | Runs dependency auditing, CodeQL analysis, and secret scanning. |
| `tests.yml` | Runs automated tests and uploads available test artifacts. |
| `validate-config.yml` | Validates required project files and JSON/YAML configuration syntax. |

## Triggers

Depending on the individual workflow, automation may run when:

- Code is pushed to `main` or `develop`.
- A pull request targets a configured branch.
- A release tag is pushed.
- A scheduled scan runs.
- A maintainer manually starts a workflow through GitHub Actions.

Refer to each workflow file for its exact triggers and conditions.

## Required Repository Configuration

Before relying on these workflows, maintainers should verify:

- [ ] The `main` and `develop` branches exist if both are used.
- [ ] `package.json` and `package-lock.json` are committed and synchronized.
- [ ] Required npm scripts are configured and tested.
- [ ] The Node.js version matches the project’s supported runtime.
- [ ] GitHub Actions permissions are restricted to the minimum required.
- [ ] Required repository labels exist, including `bug`, `enhancement`, and `triage`.
- [ ] The `production` GitHub Environment is configured before production deployment.
- [ ] Deployment credentials are stored as GitHub secrets or environment secrets.
- [ ] Dependency graph and security features are enabled where required.
- [ ] Release tags follow the project’s versioning policy.

## Security Guidelines

- Never store credentials, API keys, passwords, or tokens directly in workflow files.
- Use GitHub secrets for sensitive deployment credentials.
- Review third-party actions before use and pin them to verified full commit SHAs where practical.
- Review security findings and rotate exposed credentials immediately.
- Do not expose sensitive vulnerability details in public issues or workflow logs.
- Use protected branches and required status checks to enforce review and validation policies.

## Deployment and Releases

The deployment workflow is a template until provider-specific deployment commands and credentials have been configured.

The release workflow expects version tags such as `v1.0.0`. Confirm that release validation and testing pass before publishing a release.

## Troubleshooting

### Dependency installation fails

Check that `package-lock.json` matches `package.json` and that required registry credentials are configured securely.

### Tests fail

Run the relevant test command locally and verify required environment variables and test services.

### Configuration validation fails

Review the error output for malformed JSON/YAML or missing required files.

### Security workflow fails

Inspect the relevant audit or scanner findings, verify their accuracy, and remediate genuine vulnerabilities before rerunning the workflow.

### Deployment fails

Verify the production environment, deployment provider configuration, credentials, permissions, and application health checks.

## Maintainer Checklist

- [ ] Keep workflow documentation synchronized with the actual YAML files.
- [ ] Review failed runs and security findings.
- [ ] Test workflow changes in a safe branch before merging.
- [ ] Configure required branch protection and code-owner reviews.
- [ ] Remove obsolete workflows when their responsibilities are replaced.
