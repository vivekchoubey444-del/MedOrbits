GitHub Issue Templates

This directory contains issue templates for reporting bugs, requesting features, and directing suspected security vulnerabilities to the appropriate reporting channel for MedOrbits.

Available Templates

1. Bug Report

File: bug-report.md

Use this template to report reproducible problems with the MedOrbits website, backend, APIs, database, authentication, payments, document handling, or other application features.

Include reproduction steps, expected behavior, actual behavior, environment details, and sanitized error logs where possible.

Do not include credentials, access tokens, private user information, or production data.

2. Feature Request

File: feature-request.md

Use this template to propose new features, improvements, and changes to existing MedOrbits functionality.

Describe the problem, intended users, proposed solution, expected impact, and acceptance criteria.

3. Security Vulnerability Report

File: security-report.yml

This GitHub issue form provides a structured way to direct suspected security concerns toward the appropriate reporting process.

Important: GitHub issue forms create public issues unless a separate private reporting mechanism is used.

* Read the root SECURITY.md file before reporting a suspected vulnerability.
* Do not publish exploit steps, proof-of-concept code, credentials, session tokens, or sensitive technical details in a public issue.
* If a private reporting channel is available, use that channel.
* If no private reporting channel is available, ask a maintainer privately to provide one before sharing sensitive details.

Never include passwords, API keys, payment-card information, identity documents, or another person’s private data.

Labels

The templates may use these labels:

* bug
* enhancement
* triage

Create these labels in the repository if they do not already exist. Ensure the labels referenced by individual templates match the labels configured in GitHub.

Maintainer Responsibilities

* Keep issue templates aligned with CONTRIBUTING.md and SECURITY.md.
* Keep questions relevant and reporting straightforward.
* Review incoming issues and apply appropriate labels.
* Avoid requesting sensitive personal data or credentials.
* Direct security concerns to the configured private reporting channel.
* Update this documentation whenever template filenames or reporting procedures change.

Adding a Template

Add a Markdown template (.md) or a GitHub Issue Form (.yml) to this directory.

After adding a template:

1. Verify that its filename matches the documentation.
2. Check YAML syntax for Issue Forms.
3. Confirm that referenced labels exist.
4. Open a test issue when appropriate and verify the template appears correctly.
5. Confirm that security-reporting instructions do not encourage disclosure of sensitive details publicly.

For additional guidance, see the root README.md, CONTRIBUTING.md, and SECURITY.md.

⸻

Security reminder: Issue templates improve consistency; they do not protect source code, restrict repository cloning, or make public issues private.