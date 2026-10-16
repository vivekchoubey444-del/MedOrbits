Local Development

Project: MedOrbits
Purpose: Provide a consistent and secure workflow for setting up, running, and testing the application locally.

1. Prerequisites

Before starting, ensure the following requirements are satisfied:

* Node.js: Use a supported version matching .nvmrc, if present, or the runtime policy documented by the project.
* Package manager: Use the package manager and lockfile committed to the repository.
* Git: Required to clone the repository and manage changes.
* MySQL: Provide a local MySQL instance or isolated development database if required by the current implementation.
* Environment configuration: Use .env.example as a reference for local configuration.
* Development tools: Install any additional tools required by the repository’s scripts, tests, or database workflow.

Check the actual package.json scripts and project documentation before assuming a particular setup command is available.

2. Setup

Step 1 — Clone the Repository

Clone the MedOrbits repository and move into its root directory.

git clone <repository-url>
cd <repository-directory>

Replace the placeholders with the actual repository URL and directory name.

Step 2 — Select the Supported Node.js Version

Check the runtime policy and .nvmrc, if present.

With Node Version Manager (NVM), if the project uses it:

nvm install
nvm use
node —version
npm —version

If .nvmrc is absent, follow the version requirement documented in package.json and the project setup instructions.

Step 3 — Install Dependencies

For an npm project with a committed package-lock.json:

npm ci

This installs dependencies according to the lockfile. If the repository uses another package manager, use its corresponding lockfile-based installation command instead.

Step 4 — Configure the Environment

Create a local environment file based on .env.example, if the application uses one.

For example, on macOS or Linux:

cp .env.example .env

On Windows PowerShell:

Copy-Item .env.example .env

Update the local values required by the implementation, such as database connection settings, application port, session configuration, and external-service sandbox credentials.

Do not copy production secrets into the local environment. Keep .env and other secret-bearing files out of version control.

Step 5 — Prepare the Development Database

If the current implementation requires MySQL:

1. Start a local MySQL instance or provision an isolated development database.
2. Create a database and database user with only the required development privileges.
3. Configure the connection using the environment variables documented by the project.
4. Review the schema and migration instructions.
5. Apply migrations using the repository’s supported migration mechanism.
6. Verify the resulting schema before running database-dependent workflows.

Do not assume that a particular migration command exists. Check package.json, the migration runner, and the database documentation first.

Step 6 — Validate the Environment

Run the environment or configuration validation scripts provided by the repository.

Where no dedicated validation command exists, verify the required configuration using the project’s documented startup checks.

Confirm that:

* Required environment variables are present.
* Database connectivity works when required.
* The database schema is compatible with the application.
* Required external-service configuration is available in sandbox or development mode.
* Writable directories and file-storage paths are configured correctly.

Never print secret values to the terminal or expose them in logs.

Step 7 — Start the Application

Use the development command defined in package.json.

For example, if the project defines a dev script:

npm run dev

If it defines only a start script, use the documented command instead:

npm start

Do not assume that both scripts exist. Confirm the available commands before running them.

Check the terminal output for startup errors, configuration failures, and database connection problems. Confirm the actual local URL and port from the application configuration or startup output.

Step 8 — Run Tests

Run the relevant automated tests using the commands provided by the repository.

For example, if the corresponding npm scripts exist:

npm test

Run additional linting, validation, migration, or build checks when supported.

Before opening a pull request, verify that the tests relevant to your changes pass and document any known failures.

3. Daily Development Workflow

For routine changes:

1. Update your branch from the appropriate upstream branch.
2. Install dependencies if the lockfile or package configuration has changed.
3. Review the affected modules and their dependencies.
4. Make the smallest coherent change.
5. Run relevant tests and validation scripts.
6. Check logs for errors and unintended sensitive-data exposure.
7. Update documentation when behavior, configuration, or architecture changes.
8. Review the final diff before committing.

Commit dependency-lockfile changes when they are required by an intentional dependency update.

4. Database and Migration Safety

* Use an isolated development database.
* Review SQL before applying schema changes.
* Test migrations against a fresh database and a representative staging environment where available.
* Use synthetic data rather than private production records.
* Avoid manually changing schemas in ways that bypass migration history.
* Do not run production migrations from an unreviewed local environment.
* Verify the effects of destructive operations before executing them.

Refer to the database migration documentation for the complete migration and recovery procedure.

5. External Services

Use sandbox credentials and test endpoints for payment providers and other external integrations whenever available.

Verify:

* Required environment variables.
* Sandbox versus production configuration.
* Webhook signature verification.
* Timeout and failure handling.
* Whether an integration can generate real transactions, send real messages, or modify external records.

Do not run tests against production services unless the operation has been explicitly approved and controlled.

6. Security Requirements

* Never commit .env, credentials, API keys, private keys, or session secrets.
* Never copy production secrets into local configuration.
* Never use private production user records for ordinary local development.
* Restrict database privileges to the minimum required.
* Keep private uploads outside unrestricted public directories.
* Do not expose a local development server publicly without appropriate access controls.
* Use synthetic accounts and test credentials.
* Remove temporary files and test data when no longer required.

7. Troubleshooting

Dependency Installation Fails

* Confirm the supported Node.js and package-manager versions.
* Check whether the committed lockfile matches the package configuration.
* Review the full installation error before changing dependencies.
* Avoid deleting or regenerating the lockfile as an initial troubleshooting step.

Application Startup Fails

* Review the startup output and stack trace.
* Confirm the required environment variables are configured.
* Verify that the expected port is available.
* Check module paths and installed dependencies.
* Confirm that required external services and databases are reachable.

Database Connection Fails

* Verify that MySQL is running when required.
* Check the configured host, port, database name, username, and password without exposing the password.
* Confirm the development database exists and the user has the required permissions.
* Check whether migrations have been applied.
* Review database logs for connection or schema errors.

Tests Fail

* Reproduce the failure using the documented test command.
* Check test-specific environment variables and database setup.
* Ensure tests use isolated data and do not modify production resources.
* Determine whether the failure is caused by the code change, configuration, or an existing issue.

8. Before Submitting Changes

* [ ]	The supported runtime is being used.
* [ ]	Dependencies are installed using the committed lockfile.
* [ ]	Local configuration is complete and secrets remain uncommitted.
* [ ]	Required database migrations have been reviewed and applied locally.
* [ ]	Relevant tests and validation checks have been run.
* [ ]	No production data or live credentials have been introduced.
* [ ]	Documentation has been updated where necessary.
* [ ]	The final diff has been reviewed.

9. Related Documentation

* .nvmrc — Node.js version selection, if present.
* package.json — Runtime requirements and available scripts.
* package-lock.json — npm dependency lockfile, if used.
* .env.example — Environment-variable reference, if present.
* docs/database/README.md — Database documentation, if present.
* docs/database/schema.md — Schema design guidance, if present.
* docs/database/migrations.md — Migration procedures, if present.
* docs/architecture/overview.md — Application architecture.
* docs/architecture/data-flow.md — Request and data-processing flows.

Accuracy rule: Follow the commands, scripts, and configuration supported by the current repository. Examples in this document are conditional and must not be interpreted as confirmation that a particular script or integration exists.