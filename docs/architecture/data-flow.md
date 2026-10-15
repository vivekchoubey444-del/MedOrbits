# Application Data Flow

## Typical HTTP Request

1. A browser requests a public page or calls an API endpoint.
2. The server applies request parsing, security headers, request identification, and rate limiting as configured.
3. Authentication middleware identifies the user for protected routes.
4. Validation checks request parameters and payloads.
5. Authorization verifies the requested action and resource ownership.
6. A controller coordinates the request and calls a service.
7. The service applies business rules and uses repositories or integrations.
8. The server returns a documented response and records safe operational logs.

The exact middleware order and module names must be verified against the running application.

## Document Upload Flow

1. Authenticate the user and authorize the upload purpose.
2. Enforce size limits, allowed formats, and content validation.
3. Store the file in private storage with a non-guessable identifier.
4. Persist metadata and ownership information.
5. Serve downloads only after server-side authorization.
6. Audit sensitive access and apply retention/deletion policies.

Do not place private documents in publicly served asset directories.

## Payment Flow

1. The server creates a payment request using the configured provider.
2. The browser completes the provider's checkout flow.
3. The server verifies provider callbacks or webhook signatures.
4. The server validates amount, currency, order reference, and event state.
5. An idempotent transaction records the verified result.
6. The user-facing status is derived from trusted server-side records.

Never trust a browser redirect alone as proof of payment.

## Background Jobs

A request or scheduled trigger enqueues work. A worker validates the job, performs an idempotent operation, records success or failure, and retries transient failures according to policy. Exhausted jobs should follow the documented dead-letter process.
