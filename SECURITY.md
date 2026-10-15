Security Policy — MedOrbits

Supported Versions

Security fixes are prioritized for the current maintained version of MedOrbits. Check the repository’s release notes or contact the maintainers to confirm support for a specific version.

Reporting a Vulnerability

Do not disclose vulnerabilities in public GitHub issues, discussions, or pull requests.

If private vulnerability reporting is enabled, use the repository’s private reporting feature:

https://github.com/vivekchoubey444-del/MedOrbits/security/advisories/new

If private reporting is unavailable, contact a repository maintainer through an established private channel. Do not send sensitive details until a private channel is confirmed.

Include, where possible:

* A concise description of the vulnerability and its potential impact.
* Affected files, components, versions, or endpoints.
* Reproduction steps or a minimal proof of concept.
* Suggested mitigation, if known.

Do not include real user data, passwords, access tokens, payment details, or active credentials in a report.

Response Process

The maintainers should acknowledge reports, assess severity and impact, coordinate remediation, and communicate relevant updates to the reporter where possible. Response times depend on severity and available resources.

Please allow maintainers a reasonable opportunity to investigate and address a vulnerability before public disclosure.

Secret and Credential Handling

* Never commit API keys, passwords, access tokens, private keys, production database credentials, or real .env files.
* Use environment variables and approved secret-management services.
* If a credential is exposed, revoke or rotate it immediately. Removing it from the latest commit does not invalidate it or remove it from Git history.
* Do not use production credentials or real personal, identity, application, or payment data in development and tests.

Security Controls

MedOrbits uses or may use automated dependency audits, secret scanning, static analysis, and code review. These controls reduce risk but do not guarantee that all vulnerabilities will be detected.

Report suspected security weaknesses even if automated checks pass.

Scope

Reports may cover authentication, authorization, data exposure, injection, file uploads, session management, payment processing, dependency vulnerabilities, and other security weaknesses in MedOrbits.

Do not conduct destructive testing, access other users’ data, or disrupt production services without explicit authorization.