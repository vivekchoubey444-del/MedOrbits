  MedOrbits — GitHub Issue Templates

This directory contains standardized GitHub issue templates for reporting bugs, proposing features, and directing suspected security vulnerabilities to the appropriate reporting channel.

The templates help maintain consistent issue reports, improve triage, and reduce unnecessary back-and-forth between contributors and maintainers.

Available Templates

1. Bug Report

File: bug_report.yml or bug-report.md

Use this template to report reproducible problems affecting MedOrbits, including:

* Website and user interface
* Authentication and account management
* Education and admissions
* Applications and document handling
* Careers, jobs, and recruitment
* Payments and subscriptions
* Notifications and email
* Administration dashboard
* APIs, backend services, and databases
* Deployment and infrastructure

Include reproduction steps, expected behavior, actual behavior, environment details, and sanitized error logs wherever possible.

Do not include passwords, access tokens, private user information, confidential documents, or production data.

2. Feature Request

File: feature_request.yml or feature-request.md

Use this template to propose new capabilities, improvements, or changes to existing MedOrbits functionality.

Describe:

* The problem or opportunity
* The intended users and use case
* The proposed solution
* Expected behavior and impact
* Acceptance criteria
* Relevant security, privacy, and accessibility considerations

Requests should describe the intended outcome clearly enough for maintainers to evaluate scope, feasibility, and completion criteria.

3. Security Vulnerability Reporting

File: security_vulnerability_report.yml or security-report.yml

This template provides a warning and directs reporters to the project’s documented security reporting process.

Important: A GitHub Issue Form normally creates a public issue. This template does not make a report private or provide a secure disclosure channel.

Before reporting a suspected vulnerability:

1. Read the root SECURITY.md.
2. Use a private reporting channel explicitly documented by the project, if available.
3. If no private reporting channel is documented, request secure reporting instructions from a maintainer through a non-public channel before sharing sensitive details.
4. Do not disclose exploit instructions, proof-of-concept code, credentials, session tokens, exposed secrets, or sensitive technical details in a public issue.

Never include passwords, API keys, payment-card information, identity documents, confidential production data, or another person’s private information.

For security concerns, prioritize confidentiality over completing a public issue form.

Labels

Templates may reference the following GitHub issue labels:

Label	Purpose
bug	Reports a defect or unexpected behavior
enhancement	Proposes a new feature or improvement
triage	Indicates that an issue requires initial review

Create these labels in the repository if they do not already exist. Confirm that every label referenced by a template matches a label configured in GitHub.

Templates that use no labels should not be assigned labels automatically unless that behavior is explicitly configured.

Maintainer Responsibilities

Maintainers are responsible for keeping issue templates accurate, useful, and consistent with the repository’s contribution and security policies.

* Keep templates aligned with CONTRIBUTING.md and SECURITY.md.
* Keep questions relevant and reporting straightforward.
* Review incoming issues and apply appropriate labels.
* Avoid requesting sensitive personal information or credentials.
* Direct vulnerability reports to the configured private reporting channel.
* Close or redirect public security disclosures according to the project’s security response procedure.
* Update this documentation whenever filenames, template behavior, or reporting procedures change.
* Periodically verify that the templates remain compatible with GitHub’s issue template configuration.

Adding or Updating a Template

Add a Markdown issue template (.md) or a GitHub Issue Form (.yml) to this directory.

After adding or updating a template:

1. Verify that the filename matches this documentation.
2. Validate YAML syntax for Issue Forms.
3. Confirm that all referenced labels exist in the repository.
4. Check required fields, dropdown options, and validation rules.
5. Open a test issue when appropriate and verify that the template appears correctly.
6. Confirm that security instructions do not encourage public disclosure of sensitive details.
7. Update this README if a filename, purpose, label, or reporting procedure changes.

GitHub Configuration

GitHub supports Markdown issue templates and structured YAML Issue Forms. To configure the available templates, maintain the repository’s issue template files under:

.github/ISSUE_TEMPLATE/

An optional config.yml in this directory can control issue blank-creation behavior and provide links to external resources.

Keep any external reporting links accurate and ensure that a private security reporting mechanism is actually available before directing reporters to it.

Related Documentation

For additional guidance, consult:

* README.md — Repository overview and setup
* CONTRIBUTING.md — Contribution workflow and standards
* SECURITY.md — Vulnerability disclosure and security policies
* CODE_OF_CONDUCT.md — Community participation standards
* SUPPORT.md — General support and troubleshooting

Security Reminder

Issue templates improve reporting consistency; they do not protect source code, restrict repository cloning, grant repository permissions, or make public issues private.

Use repository access controls, branch protection or rulesets, and a properly configured private vulnerability reporting process for their respective purposes.