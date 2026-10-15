Configuration Module — MedOrbits

Path: src/config/

Overview

The configuration module centralizes application environment settings, database connectivity, email delivery, logging, payment processing, queue management, security policies, and file storage configuration.

It provides a consistent configuration layer for the MedOrbits Node.js/Express backend.

Implementation note: The presence of a configuration file does not guarantee that its settings are validated, secure, or used by the application. Verify each module’s implementation and its imports before relying on it.

Directory Structure

src/config/
├── README.md
├── cors.js
├── database.js
├── email.js
├── env.js
├── logger.js
├── payment.js
├── queue.js
├── security.js
└── storage.js

Module Responsibilities

File	Responsibility
cors.js	Configures permitted cross-origin requests and allowed origins.
database.js	Configures database connections, connection pools, and database options.
email.js	Provides application-level email configuration and delivery settings.
env.js	Loads, validates, and exposes environment variables.
logger.js	Configures application logging, log levels, and output formats.
payment.js	Defines application-level payment settings and provider selection.
queue.js	Configures background job queues, concurrency, and processing options.
security.js	Centralizes security-related application settings.
storage.js	Configures file storage options and the selected storage provider.

Configuration Principles

1. Environment Variables

Use environment variables for deployment-specific values, credentials, and secrets.

Typical configuration categories include:

* Application environment and port.
* Database connection settings.
* Session and authentication secrets.
* CORS allowed origins.
* SMTP credentials and email sender information.
* Payment provider keys and webhook secrets.
* Queue and worker settings.
* File storage credentials and locations.
* Logging and monitoring settings.
* AI provider credentials, when applicable.

Document the required variable names in .env.example, without including real credentials.

2. Centralized Validation

Validate required environment variables during application startup.

Configuration validation should:

* Identify missing required variables.
* Validate expected types and formats.
* Reject invalid production settings.
* Avoid logging secret values.
* Fail clearly when essential configuration is unavailable.

Do not silently substitute insecure production defaults.

3. Separate Configuration from Integrations

Keep application-wide configuration in src/config/ and provider-specific implementation in src/integrations/.

For example:

src/
├── config/
│   ├── payment.js
│   ├── email.js
│   └── storage.js
│
└── integrations/
    ├── email/
    ├── payment/
    ├── ai/
    └── storage/

The configuration layer defines settings; the integration layer implements communication with external providers.

Avoid duplicating provider credentials or maintaining conflicting configuration sources.

Security Requirements

* Never commit .env files containing secrets.
* Use a secret manager or hosting-platform environment settings in production.
* Restrict CORS to trusted origins.
* Use least-privilege database credentials.
* Keep payment secrets and webhook signing keys private.
* Redact credentials, tokens, and sensitive personal information from logs.
* Store private uploads outside publicly served directories.
* Use secure session and cookie settings appropriate to the deployment.
* Validate configuration before starting production services.

Integration with the Application

The application startup process should load and validate configuration before initializing dependent services.

Recommended startup sequence:

1. Load environment variables.
2. Validate required configuration.
3. Initialize logging.
4. Initialize database connectivity.
5. Configure middleware and routes.
6. Initialize required integrations and background workers.
7. Start listening for HTTP requests.

Adapt this sequence to the actual initialization requirements of server.js and src/app.js.

Development and Production

Development

* Use a local .env file excluded from version control.
* Use isolated development databases and test credentials.
* Enable useful diagnostic logging without exposing secrets.

Production

* Supply secrets through the hosting platform’s secure configuration.
* Validate required settings before accepting requests.
* Restrict database and storage access.
* Use production-appropriate logging and error handling.
* Test configuration changes in staging before deployment.

Troubleshooting

Application fails during startup

Check missing environment variables, configuration validation errors, and module imports.

Database connection fails

Verify the database engine, connection settings, credentials, network access, and connection-pool options.

Email delivery fails

Check SMTP settings, provider authentication, sender configuration, and connectivity.

Payment integration fails

Verify provider configuration, API credentials, webhook signing secrets, and sandbox versus production settings.

Queue processing fails

Check queue connectivity, worker initialization, concurrency, retry settings, and job error logs.

CORS errors occur

Verify the frontend origin, allowed methods, allowed headers, credentials policy, and middleware order.

Maintenance

When modifying configuration:

1. Update the relevant module.
2. Update .env.example if new variables are introduced.
3. Update tests and configuration documentation.
4. Verify local and staging startup.
5. Review security implications before production deployment.

Keep this README synchronized with the actual implementation.

⸻

MedOrbits — Study · Work · Grow

Centralized configuration for a maintainable, secure, and deployment-ready application.