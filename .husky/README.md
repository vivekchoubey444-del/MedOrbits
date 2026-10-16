MedOrbits Husky Git Hooks

Directory: .husky/

Purpose

This directory contains Git hooks managed by Husky for the MedOrbits project. The hooks automate local code-quality checks, validate commit messages, and run automated tests before code is pushed to a remote repository.

The hook scripts are the source of truth for actual behavior. Keep this README synchronized with the committed scripts and package.json.

Hooks Overview

File	Purpose	When It Runs
pre-commit	Runs configured ESLint, Prettier formatting checks, and automated tests. Missing scripts are skipped with warnings.	Before a commit is created.
commit-msg	Validates the first non-empty, non-comment line against the supported Conventional Commit format.	After the commit message is prepared.
pre-push	Runs ESLint when configured and requires the automated test script to exist and pass.	Before pushing commits to a remote.

Important: The pre-commit hook may allow a commit when optional scripts are missing. The pre-push hook requires a configured test script. Any configured check that fails should block the operation.

Requirements

* Git installed and the project checked out as a Git repository.
* Node.js meeting the version specified by MedOrbits.
* npm compatible with the project.
* A committed package-lock.json when using npm ci.
* Husky installed and configured for the project’s version.
* Required project dependencies installed.

The following npm scripts are expected by the hooks:

Script	Purpose	Requirement
lint	ESLint validation	Optional in the current hooks
format:check	Prettier formatting validation	Optional in pre-commit
test	Automated tests	Optional in pre-commit; required in pre-push

Setup

1. Install project dependencies

From the repository root, run:

npm ci

Use npm install instead if the project does not have a committed lockfile or if you are intentionally updating dependencies.

2. Install Husky if necessary

If Husky is not already installed, add it as a development dependency:

npm install —save-dev husky

Initialize Husky using the procedure supported by the installed version:

npx husky init

Caution: Review any files generated during initialization. Preserve the existing MedOrbits hook scripts and verify that Husky is configured to execute them correctly.

Husky setup commands and hook conventions can vary by major version. Follow the installed version’s documentation rather than replacing existing configuration blindly.

3. Verify the hook files

The expected structure is:

.husky/
├── README.md
├── pre-commit
├── commit-msg
└── pre-push

Check the files and permissions:

git status —short
git config —get core.hooksPath

For environments that require executable permissions:

chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push

Verify that the Git hooks path and Husky configuration match the installed version. Do not assume that executable permissions alone are sufficient.

Commit Message Convention

The commit-msg hook validates the first non-empty, non-comment line of the commit message.

General format:

type(scope): short description

The scope is optional. The supported types are:

* feat — New functionality
* fix — Bug fixes
* docs — Documentation changes
* style — Formatting or style-only changes
* refactor — Code restructuring
* perf — Performance improvements
* test — Test-related changes
* build — Build system or dependency changes
* ci — Continuous integration changes
* chore — Maintenance tasks
* revert — Reverting earlier changes

Examples:

feat(auth): add email verification
fix(api): handle missing application ID
docs: update installation guide
chore(deps): update dependencies
feat(api)!: remove deprecated endpoint

The ! marker indicates a breaking change.

Validation rules

The current validator requires:

* A supported commit type.
* An optional, non-empty scope using permitted characters.
* A colon followed by a single space.
* A non-empty description.
* A description of 1–100 characters under the current regular expression.

The validator checks the first qualifying line rather than the entire commit body. Confirm any changes to the exact regular expression in .husky/commit-msg.

Running Checks Manually

Run the project’s configured checks from the repository root:

npm run lint
npm run format:check
npm test

Only run commands whose scripts exist in package.json.

You can inspect the available scripts with:

npm run

Pre-commit behavior

The pre-commit hook:

1. Locates the repository root.
2. Verifies package.json, Node.js, and npm.
3. Runs npm run lint if lint exists.
4. Runs npm run format:check if format:check exists.
5. Runs npm test if test exists.
6. Stops when a configured command fails.

Missing optional scripts generate warnings and are skipped.

Commit-message behavior

The commit-msg hook:

1. Verifies that a commit-message file is supplied.
2. Reads the first non-empty, non-comment line.
3. Validates the line against the supported Conventional Commit pattern.
4. Rejects messages that do not match.

Pre-push behavior

The pre-push hook:

1. Locates the repository root.
2. Verifies the required project files and tools.
3. Runs ESLint when lint is configured.
4. Requires a configured test script.
5. Runs npm test and blocks the push if it fails.

A missing lint script produces a warning. A missing test script or failed test run blocks the push.

Package Scripts

The following is an illustrative configuration, not a claim about the current MedOrbits package.json:

{
  “scripts”: {
    “lint”: “eslint .”,
    “format:check”: “prettier —check .”,
    “test”: “node —test”
  }
}

Adapt these commands to the actual dependencies, ESLint configuration, Prettier configuration, test framework, and project structure. Do not add placeholder commands that report success without performing real checks.

Before making hooks mandatory, confirm that all required scripts work locally and in CI.

Troubleshooting

A hook does not run

* Confirm Husky is installed and configured.
* Verify the hook filename and location under .husky/.
* Check the configured Git hooks path.
* Review the initialization procedure for the installed Husky version.
* Inspect the hook for shell syntax errors or invalid quotation marks.
* Confirm the hooks have not been disabled or bypassed in the local environment.

A commit is rejected

Read the hook output, fix the reported issue, and retry.

For a commit-message rejection, verify the type, optional scope, colon and space, description length, and punctuation against .husky/commit-msg.

A push is rejected

Run the checks locally:

npm run lint
npm test

Fix any failures and retry. If the test script is missing, configure a real test command in package.json before pushing.

A check is skipped

Inspect the configured scripts:

npm run

A missing optional script may explain the warning. A missing test script is not acceptable for the pre-push hook.

Dependencies are missing

Install the locked dependencies:

npm ci

If installation fails, inspect the npm output, lockfile, registry configuration, and supported Node.js version before retrying.

GitHub Actions and Branch Protection

Local Git hooks improve development practices, but they are not a security boundary. They can be bypassed, for example, with:

git -c core.hooksPath=/dev/null commit

or by deliberately skipping hooks with supported Git options.

For stronger enforcement:

* Run linting, formatting validation, and automated tests in GitHub Actions.
* Configure required status checks for protected branches.
* Require pull requests and reviews where appropriate.
* Use the supported Node.js version and lockfile in CI.
* Keep local checks and CI checks aligned.
* Enforce security-sensitive policies on the server rather than relying on local hooks.

Security Guidelines

* Never store passwords, API keys, access tokens, or other secrets in hook files.
* Avoid printing sensitive environment variables in command output.
* Do not disable authorization, validation, or security tests merely to make a hook pass.
* Keep hook changes version-controlled and reviewed.
* Use server-side validation and CI for policies that must not be bypassed locally.

Maintenance Checklist

When hook behavior changes:

1. Update the affected hook script.
2. Update this README.
3. Verify the relevant npm scripts in package.json.
4. Test both successful and failing hook scenarios.
5. Confirm commit-message examples match the actual validator.
6. Run the checks locally and in GitHub Actions.
7. Review the changes before merging them.

Final Notes

* The hook scripts, not this README, determine actual behavior.
* Optional scripts may be skipped by the current hooks.
* Automated tests are required before pushing.
* Husky initialization and hook conventions depend on the installed version.
* CI and branch protection should enforce important repository policies.

Maintenance principle: Keep MedOrbits Git hooks consistent, predictable, and efficient while enforcing critical quality checks through continuous integration.