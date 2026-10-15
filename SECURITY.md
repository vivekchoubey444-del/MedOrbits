Contributing to MedOrbits

Thank you for your interest in contributing to MedOrbits. This guide explains the expected workflow for proposing changes to the project.

Before You Start

• Read the root README.md to understand the project and its setup.
• Review SECURITY.md before reporting or investigating security issues. Do not disclose vulnerabilities in public issues or pull requests.
• Check existing issues and pull requests to avoid duplicating work.
• For significant changes, open an issue or discuss the proposed approach with the maintainers before implementation.
• Do not commit secrets, credentials, private user data, uploaded documents, production data, or local environment files.

Development Setup

1. Install the Node.js version required by package.json.
2. Install project dependencies using the package manager and lockfile used by the repository.
3. Create a local environment file based on .env.example, if provided.
4. Configure local services and environment variables required for the feature you are working on.
5. Run the available tests and confirm the application starts locally before making changes.

Never use production credentials or real personal, application, identity, or payment data in local development or tests.

Making Changes

• Keep changes focused and consistent with the existing project structure.
• Follow the naming, formatting, error-handling, validation, and module-export conventions used by nearby files.
• Prefer small, reviewable changes over unrelated refactors.
• Validate untrusted input on the server, enforce authorization on protected operations, and avoid logging secrets or sensitive personal data.
• For payment-related changes, preserve provider signature verification, idempotency, and safe handling of retries.
• For file uploads and document handling, enforce authorization, file-type and size limits, and safe storage practices.
• Update relevant documentation, configuration examples, and tests when behavior changes.
• Do not add a dependency without a clear reason; document new runtime requirements.

Tests and Quality Checks

Before submitting a change, run the checks available in the repository. Depending on the change, these may include:

• Unit tests and integration tests.
• API or end-to-end tests.
• Linting, formatting, and static analysis.
• Database migration checks.
• Accessibility checks for user-facing pages.
• Security checks for authentication, authorization, validation, file handling, and payment webhooks.

Use the actual scripts defined in package.json; do not assume a command exists if it is not configured. Include the commands you ran and the results in your pull request. If a check cannot be run, explain why.

Pull Request Process

1. Create a branch with a clear, descriptive name, such as feat/application-status or fix/payment-webhook-validation.
2. Make focused commits with clear messages.
3. Confirm that no secrets, generated artifacts, temporary files, or unrelated changes are included.
4. Update documentation and tests where appropriate.
5. Open a pull request describing the problem, the solution, and any relevant trade-offs.
6. Link related issues and include screenshots or API examples when they help reviewers.
7. Document any required environment-variable, database-schema, deployment, or migration changes.
8. Respond constructively to review feedback and update the pull request as needed.

Pull Request Checklist

Before requesting review, confirm that:

☐ The change has a clear purpose and limited scope.
☐ Relevant tests and checks have been run, with results recorded.
☐ New behavior and configuration are documented.
☐ Input validation and authorization are handled where required.
☐ No secrets or sensitive personal data are committed.
☐ Database changes include appropriate migrations and rollback considerations.
☐ Breaking changes and deployment steps are clearly identified.
☐ User-facing changes preserve responsive behavior and accessibility.

Bug Reports and Feature Requests

When opening an issue, provide enough detail to reproduce or evaluate the request:

• Bug report: expected behavior, actual behavior, reproduction steps, environment, and relevant sanitized logs.
• Feature request: the problem to solve, intended users, proposed behavior, and any constraints or alternatives considered.

Do not include credentials, access tokens, payment details, identity documents, or unredacted personal data in issues.

Security Issues

Do not report vulnerabilities through public issues or pull requests. Follow the private reporting instructions in SECURITY.md. If a private reporting contact has not been published yet, ask a maintainer for a private channel before sending sensitive details.

Code of Conduct

Be respectful, constructive, and professional. Critique ideas and code rather than people. Harassment, discrimination, threats, and abusive behavior are not acceptable in project discussions or reviews. Maintainers may moderate contributions that violate these expectations.

License

By submitting a contribution, you agree that your contribution may be distributed under the license stated in the repository’s LICENSE file, subject to your right to contribute the submitted material. Do not submit code, assets, or text that you do not have permission to license or distribute.

Questions

For general contribution questions, use the project contact or discussion channel documented in the root README.md.