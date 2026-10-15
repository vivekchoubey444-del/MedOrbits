
# GitHub Issue Templates

This directory contains issue templates for reporting bugs, requesting features,
and documenting suspected security vulnerabilities in the MedOrbits project.

## Available Templates

### 1. Bug Report

File: `bug-report.md`

Use this template to report reproducible problems with the website, backend,
API, database, authentication, payments, documents, or other MedOrbits features.

Include reproduction steps, expected behavior, actual behavior, and sanitized
error logs where possible.

### 2. Feature Request

File: `feature-request.md`

Use this template to propose new features, improvements, and changes to existing
MedOrbits functionality.

Describe the problem, intended users, proposed solution, expected impact, and
acceptance criteria.

### 3. Security Vulnerability Report

File: `security-report.yml`

This GitHub issue form provides a structured way to describe a suspected
security concern.

**Do not submit sensitive vulnerability details in a public issue.**

Check the root `SECURITY.md` file for private reporting instructions. GitHub
issue forms do not automatically make reports private. If no private reporting
channel is available, request one from a maintainer before sharing technical
details.

Never include passwords, API keys, session tokens, payment-card information,
identity documents, or another person’s private data.

## Labels

The templates refer to these suggested labels:

- `bug`
- `enhancement`
- `triage`

Create these labels in the repository if they do not already exist.

## Maintainer Responsibilities

- Keep templates aligned with `CONTRIBUTING.md` and `SECURITY.md`.
- Remove unnecessary questions and keep reporting straightforward.
- Review incoming issues and apply appropriate labels.
- Direct security reports to the configured private reporting channel.

## Adding a Template

Add a Markdown template (`.md`) or a GitHub issue form (`.yml`) to this directory.
Test the template by opening a new issue in the repository.

For more information, see the root `README.md`, `CONTRIBUTING.md`, and
`SECURITY.md` files.
