Husky Git Hooks

This directory contains Git hooks managed by Husky for the MedOrbits project.

These hooks provide local quality checks, commit-message validation, and pre-push testing to help maintain consistent development practices.

Hooks

File	Purpose	When It Runs
pre-commit	Runs ESLint and Prettier checks when the corresponding npm scripts exist. Runs automated tests if configured.	Before creating a commit.
commit-msg	Validates the first line of the commit message against the project’s Conventional Commit pattern.	After the commit message is prepared.
pre-push	Runs ESLint when configured and requires the project’s test script to pass.	Before pushing commits to a remote.

The hook behavior is defined by the scripts in these files. Keep this documentation synchronized with the actual hooks.

Requirements

* Node.js and npm must be installed.
* Project dependencies must be installed using npm ci or the repository’s documented installation command.
* package.json should define the scripts required by the hooks:
    * lint for ESLint.
    * format:check for Prettier validation.
    * test for automated tests.
* Husky must be installed and initialized according to the version used by the project.
* Git must be installed and the project must be a Git repository.

Setup

1. Install Husky

If Husky is not already installed, run:

npm install —save-dev husky

Initialize Husky using the setup appropriate for the installed version:

npx husky init

Important: Preserve existing hook files when initializing Husky. Review any generated files and confirm that your pre-commit, commit-msg, and pre-push hooks remain intact.

Check the installed Husky version’s documentation if its setup procedure differs from these instructions.

2. Install project dependencies

For a project with a committed package-lock.json, use:

npm ci

3. Check hook files

Confirm that the following files exist:

.husky/
├── README.md
├── pre-commit
├── commit-msg
└── pre-push

On environments that require executable hook files, run:

chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push

Ensure Git is configured to invoke Husky hooks using the mechanism supported by the installed Husky version.

Expected Commit Message Format

The commit-msg hook expects the first line to follow this general pattern:

type(scope): short description

The scope is optional if the actual hook allows it to be omitted.

Examples

feat(auth): add email verification
fix(api): handle missing application ID
docs: update installation guide
chore(deps): update dependencies

Use one of the commit types accepted by the actual hook:

* feat
* fix
* docs
* style
* refactor
* perf
* test
* build
* ci
* chore
* revert

The current validator also supports an optional breaking-change marker (!) before the colon.

Keep commit descriptions concise and meaningful. Confirm the exact scope, punctuation, and description-length rules in .husky/commit-msg.

Running Checks Manually

Run the project’s configured checks locally before committing or pushing:

npm run lint
npm run format:check
npm test

Run only commands whose scripts are configured in package.json.

The current hook behavior is:

* Pre-commit: Runs linting and formatting checks when the respective scripts exist. It also runs tests if the installed version of the hook includes the optional test check.
* Commit message: Validates the commit subject against the accepted Conventional Commit pattern.
* Pre-push: Runs linting when configured and requires the test script to exist and pass.

A missing optional script may be skipped by a hook. A missing test script causes the described pre-push hook to reject the push.

Troubleshooting

A hook does not run

* Confirm Husky is installed and configured.
* Confirm the hook is in .husky/ and named correctly.
* Check executable permissions where required.
* Verify Git’s configured hooks path and the Husky setup for the installed version.
* Confirm that the hook file contains the expected script and has no syntax errors.
* Check that the hook has not been disabled by the local environment or Git configuration.

A commit is rejected

Read the hook output, correct the lint, formatting, or commit-message issue, and retry the commit.

For a rejected commit message, ensure that:

* The type is supported.
* The scope, if present, uses permitted characters.
* A colon and space separate the header from the description.
* The description is not empty.
* The subject follows the configured length restriction.

A push is rejected

Run the configured lint and test scripts locally:

npm run lint
npm test

Fix failures and retry the push. If the test script is missing, configure a working test command in package.json before pushing.

A check is skipped

Check whether the corresponding script exists in package.json.

For example:

{
  “scripts”: {
    “lint”: “eslint .”,
    “format:check”: “prettier —check .”,
    “test”: “node —test”
  }
}

These commands are examples, not assumptions about MedOrbits’ actual tooling. Adjust them to match the installed dependencies, test framework, and project configuration.

Dependencies are missing

Install the project’s dependencies:

npm ci

If installation fails, review the npm error output, the lockfile, and the Node.js version requirements before retrying.

GitHub Actions and Branch Protection

Local Git hooks improve development quality but can be bypassed, for example, with git commit —no-verify or git push —no-verify.

For stronger enforcement:

* Run linting, formatting validation, and automated tests in GitHub Actions.
* Configure required status checks for protected branches.
* Require pull requests and reviews where appropriate.
* Ensure CI uses the project’s supported Node.js version and lockfile.
* Keep local hooks and CI validation aligned.

Do not rely exclusively on local hooks for security-critical or deployment-critical checks.

Security Guidelines

* Never place passwords, API keys, tokens, or other secrets in hook files.
* Avoid printing sensitive environment variables in hook output.
* Do not disable authorization or validation to make tests pass.
* Keep hook scripts version-controlled and review changes to them.
* Use CI and server-side controls for policies that must not be bypassed locally.

Maintenance

When hook behavior changes:

1. Update the affected hook script.
2. Update this README.
3. Verify that the documented npm scripts exist.
4. Test successful and failing hook scenarios.
5. Confirm that commit-message examples match the actual validator.
6. Run the hooks locally and verify the GitHub Actions workflow.
7. Review changes before merging them into the main branch.

Important Notes

* Hook behavior is determined by the actual scripts, not by this README alone.
* Husky initialization may differ between versions; follow the version installed in the project.
* Optional checks can be skipped when their npm scripts are absent.
* The pre-push hook requires a configured test script.
* CI and required branch-protection checks should enforce important repository policies.

Maintenance principle: Keep MedOrbits Git hooks consistent, predictable, and fast enough for routine development while enforcing critical quality checks through continuous integration.