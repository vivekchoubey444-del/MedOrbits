MedOrbits — Integrations

Directory: src/integrations/

Overview

The integrations layer provides provider adapters for AI services, email delivery, payment processing, and file storage.

It isolates vendor-specific SDKs and external API communication behind dedicated interfaces, allowing MedOrbits application services to interact with providers without becoming tightly coupled to individual vendors.

Directory Structure

src/integrations/
├── README.md
├── ai/
│   ├── README.md
│   ├── ai.client.js
│   ├── ai.config.js
│   ├── ai.provider.js
│   ├── index.js
│   └── openai.provider.js
├── email/
│   ├── README.md
│   ├── email.client.js
│   ├── email.provider.js
│   ├── index.js
│   └── smtp.provider.js
├── payment/
│   ├── README.md
│   ├── index.js
│   ├── payment.client.js
│   ├── payment.config.js
│   ├── payment.provider.js
│   ├── razorpay.provider.js
│   ├── stripe.provider.js
│   └── webhook-verifier.js
└── storage/
    ├── README.md
    ├── index.js
    ├── local.provider.js
    ├── s3.provider.js
    ├── storage.client.js
    └── storage.config.js

The structure above reflects the supplied screenshots. Confirm that filenames and exports remain synchronized with the repository.

Core Responsibilities

* Encapsulate provider-specific SDKs and API operations.
* Expose consistent interfaces through module entry points.
* Validate input data before sending requests to external services.
* Enforce request, response, file-size, and payload limits.
* Configure connection timeouts and bounded retry behavior.
* Handle provider errors without exposing sensitive information.
* Keep credentials and signing secrets server-side.
* Initialize only integrations enabled in the deployment environment.
* Support safe resource cleanup and graceful shutdown where required.

Module Responsibilities

Module	Primary responsibility
ai/	AI client configuration and provider communication.
email/	Email delivery through the configured provider.
payment/	Payment operations, provider selection, and webhook verification.
storage/	Local or S3-compatible storage operations for application files.

Each module’s index.js should expose only the intended public interface. Internal provider implementations should not be imported directly throughout the application unless explicitly required by the architecture.

1. Configuration and Secrets

Keep shared configuration in src/config/ and provider-specific implementation in src/integrations/.

Use environment variables or an approved secrets manager for:

* AI provider API keys and model settings.
* SMTP credentials and sender configuration.
* Payment API credentials and webhook signing secrets.
* Object-storage credentials, bucket names, and endpoint settings.

Requirements:

* Never commit real secrets or production .env files.
* Keep .env.example limited to variable names and safe placeholders.
* Validate required settings when an enabled integration initializes.
* Do not require credentials for integrations that are intentionally disabled.
* Avoid duplicating credentials or maintaining conflicting configuration sources.

2. AI Integration

Directory: src/integrations/ai/

The AI integration contains the client, configuration, provider interface, and OpenAI provider adapter.

Security and reliability requirements:

* Validate prompts, input types, and request payload sizes.
* Apply request timeouts and bounded retries.
* Respect provider rate limits and usage limits.
* Handle unavailable providers and malformed responses safely.
* Avoid transmitting unnecessary personal or confidential information.
* Keep API credentials on the server.
* Treat model output as untrusted input and validate it before downstream use.
* Avoid logging sensitive prompts or responses.

Provider-specific configuration must remain separate from application business logic.

3. Email Integration

Directory: src/integrations/email/

The email integration contains the client, provider interface, and SMTP adapter.

Requirements:

* Validate recipient addresses and message inputs.
* Prevent untrusted input from controlling message headers.
* Enforce attachment and message-size limits.
* Use authenticated, encrypted transport where supported and required.
* Configure connection and delivery timeouts.
* Handle provider errors without exposing SMTP credentials.
* Avoid logging sensitive message content.
* Keep sender identities and reply-to addresses under application control.

Delivery success should mean only what the configured provider can actually confirm. Do not represent an accepted message as guaranteed delivery to the recipient’s inbox.

4. Payment Integration

Directory: src/integrations/payment/

The payment integration contains provider configuration, a shared client and interface, Razorpay and Stripe adapters, and webhook verification.

Security requirements

* Keep payment credentials and webhook signing secrets private.
* Validate amounts, currency, payment references, and permitted operations.
* Do not trust client-submitted payment status.
* Verify webhook signatures using the exact raw request bytes required by the provider.
* Use the correct provider-specific signature algorithm and secret.
* Validate event structure and supported event types.
* Process events idempotently to prevent duplicate financial operations.
* Persist payment state transitions through the application’s authoritative data layer.
* Prevent replay or duplicate processing where applicable.
* Never log secrets or sensitive payment metadata.

Payment creation and webhook processing must fail closed until the relevant provider adapter, signature verification, and idempotent event-processing mechanisms are implemented.

The presence of webhook-verifier.js alone does not establish that verification is complete or correct.

5. Storage Integration

Directory: src/integrations/storage/

The storage integration contains shared storage interfaces, configuration, and local and S3-compatible provider implementations.

Storage requirements

* Keep private documents outside publicly served web roots.
* Authorize every download against the authenticated identity, resource ownership, and applicable permissions.
* Validate file size, permitted file types, and file contents.
* Generate safe server-controlled storage identifiers instead of trusting user-provided paths.
* Prevent path traversal and unauthorized overwrites.
* Avoid exposing local filesystem paths, private object keys, or storage credentials.
* Apply least-privilege permissions to storage accounts and buckets.
* Define retention, temporary-file cleanup, and deletion policies.

If signed URLs are used, keep their lifetime limited and restrict their access to the intended object and operation.

Local and S3-compatible storage should implement a consistent interface while retaining provider-specific security controls.

6. Initialization and Lifecycle

Initialize only integrations enabled by the current deployment configuration.

Recommended lifecycle:

1. Load and validate environment configuration.
2. Determine which integrations are enabled.
3. Initialize the required clients and provider adapters.
4. Validate essential credentials and configuration.
5. Expose the intended public interfaces.
6. Handle provider failures through established error handling.
7. Close connections and release resources during graceful shutdown where applicable.

Disabled integrations should not create unnecessary connections or require unrelated credentials.

Avoid initializing the same provider repeatedly when a reusable client is intended.

7. Error Handling and Observability

Integrations should distinguish among:

* Configuration errors.
* Input validation failures.
* Authentication or authorization failures.
* Provider timeouts.
* Rate-limit responses.
* Network failures.
* Invalid provider responses.
* Signature verification failures.
* Duplicate webhook events.

Use the centralized application logger, redact sensitive information, and return safe application-level errors to callers.

Do not expose raw provider responses, credentials, private document paths, or internal stack traces through public endpoints.

8. Testing Requirements

Use mocked providers, sandbox credentials, or isolated test environments as appropriate.

Test at least:

* Valid and invalid inputs.
* Missing or invalid configuration.
* Disabled integration behavior.
* Request timeouts and provider failures.
* Payload and file-size limits.
* Rate limiting and retry behavior.
* Sensitive-data redaction.
* Payment signature verification and duplicate-event handling.
* Unauthorized document downloads.
* Storage path and object-access restrictions.
* Graceful resource cleanup.

Never use live production credentials in routine automated tests.

9. Module Documentation

Maintain a README.md inside each integration directory:

* src/integrations/ai/README.md
* src/integrations/email/README.md
* src/integrations/payment/README.md
* src/integrations/storage/README.md

Each module README should document its supported providers, public interface, required environment variables, initialization behavior, validation rules, security controls, error handling, testing instructions, and known limitations.

10. Implementation Checklist

Before marking an integration production-ready:

* [ ]	Its public interface and exports are documented.
* [ ]	Configuration is validated.
* [ ]	Credentials are stored securely.
* [ ]	Inputs and payload sizes are bounded.
* [ ]	Timeouts and retry limits are configured.
* [ ]	Errors are handled without leaking sensitive information.
* [ ]	Provider-specific security requirements are implemented.
* [ ]	Automated tests cover failure and abuse scenarios.
* [ ]	Startup and shutdown behavior are verified.
* [ ]	Documentation reflects actual implementation status.

⸻

Related documentation

* src/config/README.md — Centralized application configuration.
* src/controllers/README.md — HTTP controller responsibilities.
* docs/security/ — Security policies and implementation guidance.
* infrastructure/monitoring/ — Health checks and alerting.

MedOrbits — Study · Work · Grow

Secure, modular provider integrations for a maintainable application architecture.