Contributing to MedOrbits

Thank you for your interest in contributing to MedOrbits. This guide explains how to propose changes, prepare your development environment, and submit contributions for review.

Before You Start

* Read the root README.md to understand the project, architecture, and setup.
* Read SECURITY.md before reporting or investigating security issues. Do not disclose vulnerabilities publicly.
* Review existing issues and pull requests to avoid duplicating work.
* For significant changes, discuss the proposed approach with the maintainers before implementation.
* Never commit secrets, credentials, private user data, uploaded documents, production data, or local environment files.

Development Setup

1. Install the Node.js version specified by package.json or the project’s documented requirements.
2. Install dependencies using the package manager and lockfile used by the repository.
3. Create a local environment file from .env.example, if provided.
4. Configure the local services and environment variables required for your work.
5. Run the available tests and confirm the application starts locally before submitting changes.

Never use production credentials or real personal, application, identity, or payment data in development or tests.

Making Changes

* Keep changes focused and consistent with the existing project structure.
* Follow the naming, formatting, validation, error-handling, and module-export conventions of nearby files.
* Prefer small, reviewable changes over unrelated refactoring.
* Validate untrusted input on the server and enforce authorization on protected operations.
* Avoid logging secrets, credentials, payment details, or sensitive personal information.
* Preserve payment-provider signature verification, idempotency, and safe retry handling.
* For file uploads, enforce authorization, file-type and size limits, and safe storage practices.
* Update relevant documentation, configuration examples, and tests when behavior changes.
* Explain the need for new dependencies and any additional runtime requirements.

Tests and Quality Checks

Run the checks available in the repository before submitting a change. Depending on the work, these may include:

* Unit and integration tests.
* API and end-to-end tests.
* Linting, formatting, and static analysis.
* Database migration checks.
* Accessibility checks for user-facing pages.
* Security checks for authentication, authorization, input validation, file handling, and payment webhooks.
* Dependency and secret scanning.

Use the actual scripts defined in package.json; do not assume a command exists if it is not configured. Include the commands you ran and their results in your pull request. If a check cannot be run, explain why.

Branch and Commit Guidelines

Create a descriptive branch name, for example:

* feat/application-status
* fix/payment-webhook-validation
* docs/security-policy

Use clear commit messages that describe the purpose of each change. Avoid committing generated artifacts, temporary files, secrets, or unrelated changes.

Pull Request Process

1. Create a branch for your changes.
2. Implement the change and add or update relevant tests.
3. Update documentation and configuration examples where needed.
4. Review the complete diff and confirm that no secrets or sensitive data are included.
5. Open a pull request describing the problem, solution, testing performed, and relevant trade-offs.
6. Link related issues and include screenshots or API examples where useful.
7. Document required environment-variable, database-schema, deployment, or migration changes.
8. Respond constructively to review feedback.

Do not merge a pull request until required reviews and applicable status checks have passed.

Pull Request Checklist

Before requesting review, confirm that:

* [ ]	The change has a clear purpose and limited scope.
* [ ]	Relevant tests and checks have been run, with results recorded.
* [ ]	New behavior and configuration are documented.
* [ ]	Input validation and authorization are handled where required.
* [ ]	No secrets or sensitive personal data are committed.
* [ ]	Database changes include appropriate migrations and rollback considerations.
* [ ]	Breaking changes and deployment steps are identified.
* [ ]	User-facing changes preserve responsive behavior and accessibility.
* [ ]	Security implications and dependency changes have been reviewed.

Bug Reports and Feature Requests

When opening an issue, provide enough information to reproduce or evaluate the request.

Bug reports should include:

* Expected and actual behavior.
* Reproduction steps.
* Relevant environment details.
* Sanitized logs or error messages.

Feature requests should include:

* The problem to solve.
* Intended users and expected behavior.
* Relevant constraints and alternatives considered.

Never include credentials, access tokens, payment details, identity documents, or unredacted personal data in an issue.

Security Issues

Do not report vulnerabilities through public issues, discussions, or pull requests.

Follow the private reporting instructions in SECURITY.md. Use a private contact method explicitly published in the repository’s README.md or on the official MedOrbits website. If no private contact method is available, ask a maintainer through a non-public channel to provide one before sharing sensitive technical details.

Do not assume a security contact exists unless it has been published. Follow the scope and safe-harbor limitations described in SECURITY.md.

Code of Conduct

Be respectful, constructive, and professional. Critique ideas and code rather than people. Harassment, discrimination, threats, and abusive behavior are not acceptable in project discussions or reviews.

Maintainers may moderate contributions that violate these expectations.

License

By submitting a contribution, you confirm that you have the right to submit the material and that its distribution is consistent with the license stated in the repository’s LICENSE file.

Do not submit code, assets, documentation, or other material that you do not have permission to license or distribute. If the repository does not yet contain a LICENSE file, clarify the project’s licensing terms with the maintainers before contributing.

Questions

For general contribution questions, use the project contact or discussion channel documented in the root README.md.

Thank you for helping improve MedOrbits.