
# GitHub Repository Configuration

This directory contains the GitHub-specific configuration and automation used to maintain the MedOrbits project.

## Directory Structure

```text
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
    ├── dependency-review.yml
    ├── deploy.yml
    ├── release.yml
    ├── secret-scan.yml
    ├── security.yml
    ├── tests.yml
    └── validate-config.yml
```

## Code Ownership

**File:** `CODEOWNERS`

Defines the users or teams responsible for reviewing changes to specific files and directories.

Maintainers must replace example usernames with valid GitHub usernames or organization teams. Configure branch protection or repository rules separately to require code-owner approval.

## Dependency Updates

**File:** `dependabot.yml`

Configures automated dependency update pull requests for supported ecosystems, such as npm, GitHub Actions, and Docker.

Review dependency changes before merging them, particularly major version upgrades and security-sensitive packages.

## Pull Request Template

**File:** `PULL_REQUEST_TEMPLATE.md`

Provides contributors with a consistent structure for documenting changes, related issues, tests, security considerations, database migrations, and deployment requirements.

## Issue Templates

Directory: `ISSUE_TEMPLATE/`

| File | Purpose |
|—|—|
| `README.md` | Explains available issue templates and their usage. |
| `bug-report.md` | Collects reproducible bug reports. |
| `feature-request.md` | Collects proposed features and improvements. |
| `security-report.yml` | Provides a structured form for suspected security concerns. |

Security reporting must use a verified private channel for sensitive technical details. Public GitHub issues are not automatically private.

## GitHub Actions Workflows

Directory: `workflows/`

| Workflow | Responsibility |
|—|—|
| `ci.yml` | Continuous integration checks. |
| `dependency-review.yml` | Reviews dependency changes in pull requests. |
| `deploy.yml` | Defines the deployment process and production gate. |
| `release.yml` | Validates version tags and publishes GitHub Releases. |
| `secret-scan.yml` | Scans repository history for potential secrets. |
| `security.yml` | Runs dependency auditing, CodeQL, and secret scanning. |
| `tests.yml` | Runs automated tests and uploads available test artifacts. |
| `validate-config.yml` | Checks required files and JSON/YAML syntax. |
| `README.md` | Documents workflow responsibilities and setup requirements. |

Refer to each workflow file for its actual triggers, permissions, conditions, and required configuration.

## Required Setup

Before relying on these configurations, maintainers should:

- [ ] Replace placeholder code owners with valid GitHub accounts or teams.
- [ ] Create the labels used by issue templates.
- [ ] Confirm the dependency update policy matches project licensing requirements.
- [ ] Configure required branch protection and status checks.
- [ ] Verify all workflow commands against the actual `package.json` scripts.
- [ ] Configure GitHub security features where available.
- [ ] Set up a protected `production` environment before enabling production deployment.
- [ ] Store deployment credentials in GitHub secrets or environment secrets.
- [ ] Verify the private vulnerability reporting process.
- [ ] Keep third-party GitHub Actions updated and review their permissions.

## Security Guidelines

- Never commit passwords, API keys, tokens, or other secrets.
- Grant workflows only the permissions they require.
- Review dependency updates before merging.
- Pin third-party actions to verified full commit SHAs where practical.
- Do not expose sensitive vulnerability details in public issues or logs.
- Rotate credentials immediately if they are exposed.
- Review security alerts and failed workflow runs regularly.

## Maintenance

Keep this directory’s documentation synchronized with the actual configuration files. Test changes to workflows in a safe branch before merging them into the default branch.

For project contribution guidance, see the root `CONTRIBUTING.md`. For vulnerability reporting, see the root `SECURITY.md`.
