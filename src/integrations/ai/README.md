MedOrbits AI Integration

Directory: src/integrations/ai/

Purpose: Provide a reusable, provider-based AI text-generation integration for approved MedOrbits application features, including educational guidance, career assistance, content drafting, and administrative support.

⸻

1. Overview

The AI integration separates application logic from the underlying AI provider.

Application services use createAiClient() to initialize the configured provider and call generateText() to request text generation.

The current implementation uses an OpenAI-compatible Chat Completions endpoint. It requires server-side API credentials and supports configurable endpoint, model, timeout, input-size, and output-token settings.

AI-generated content is advisory and may be inaccurate, incomplete, outdated, biased, or misleading. Validate outputs before displaying them, storing them as authoritative information, or using them to trigger application actions.

The AI integration does not automatically provide retrieval-augmented generation (RAG), document indexing, agent execution, tool calling, automated fact-checking, moderation, or persistent conversation memory.

2. Directory structure

src/integrations/ai/
├── README.md
├── ai.client.js
├── ai.config.js
├── ai.provider.js
├── index.js
└── openai.provider.js

File	Responsibility
README.md	Documents setup, usage, security, and operational requirements.
ai.client.js	Validates requests and delegates generation to the provider.
ai.config.js	Loads and validates AI environment configuration.
ai.provider.js	Defines the abstract AI provider contract.
index.js	Exports the integration and creates configured AI clients.
openai.provider.js	Sends requests to an OpenAI-compatible Chat Completions endpoint.

3. Requirements

* Node.js 20 or later.
* Built-in fetch and AbortController.
* An API key for the selected AI service.
* Network access to the configured API endpoint.
* Server-side environment-variable management.

The current provider uses Node.js built-in fetch; it does not require the official OpenAI SDK.

No additional AI SDK installation is necessary for this implementation.

4. Environment configuration

Configure the following variables in the server environment or deployment secret manager.

AI_API_KEY=
AI_API_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=20000
AI_MAX_OUTPUT_TOKENS=800
AI_MAX_INPUT_CHARS=12000

Configuration reference

Variable	Required	Default	Purpose
AI_API_KEY	Yes for generation	None	Server-side API credential.
AI_API_URL	No	https://api.openai.com/v1	Base URL for an OpenAI-compatible API.
AI_MODEL	No	gpt-4o-mini	Default model identifier.
AI_TIMEOUT_MS	No	20000	Request timeout in milliseconds.
AI_MAX_OUTPUT_TOKENS	No	800	Configured maximum output-token budget.
AI_MAX_INPUT_CHARS	No	12000	Maximum prompt length in characters.

The exact defaults and validation ranges are defined in ai.config.js. Keep this documentation synchronized with the implementation whenever configuration changes.

Never expose AI_API_KEY through browser JavaScript, frontend build variables, public API responses, source control, or client-visible error messages.

5. Creating an AI client

Use the integration factory:

‘use strict’;
const {
  createAiClient,
} = require(‘./src/integrations/ai’);
const aiClient = createAiClient();

Create the client in the server-side application composition layer and reuse it where appropriate.

Do not initialize a new provider for every request unless the provider’s lifecycle explicitly requires it.

6. Generating text

The primary interface is:

const result = await aiClient.generateText({
  system: ‘You are a helpful educational guidance assistant.’,
  prompt: ‘Explain the difference between MBBS and BDS.’,
});
console.log(result.text);

The current provider accepts:

* system — optional system instructions.
* prompt — required non-empty user prompt.

The provider returns an object containing:

* text — generated text.
* model — the model identifier reported by the provider or the configured model.
* usage — usage metadata when supplied by the API.

The exact response structure is determined by openai.provider.js and should remain consistent with ai.client.js.

Additional request options

The current provider implementation also supports optional model, maxOutputTokens, and temperature request fields.

These options should be exposed to trusted application services only when needed. Public clients must not be allowed to bypass model restrictions, output budgets, or cost policies.

7. OpenAI-compatible endpoint

The provider sends a POST request to:

{AI_API_URL}/chat/completions

It sends the configured model, system and user messages, output-token limit, and temperature.

The endpoint must support the expected Chat Completions request and response format. A service that only supports another API format may require a separate provider adapter.

Before using a custom endpoint, verify its authentication mechanism, TLS configuration, request schema, response schema, rate limits, logging policy, data retention, and model capabilities.

Do not assume that every OpenAI-compatible service behaves identically to OpenAI.

8. AI output is untrusted

AI-generated content must not be treated as verified fact or trusted application input.

Before using generated output:

* Validate the response structure and expected data types.
* Apply length and content constraints.
* Verify factual claims when accuracy matters.
* Check generated URLs before linking or opening them.
* Escape output when rendering HTML.
* Sanitize permitted rich HTML with a suitable sanitizer.
* Validate generated structured data against a schema.
* Require authorization and explicit business rules before performing consequential actions.
* Use human review for high-impact educational, financial, legal, medical, recruitment, or administrative decisions.

Do not execute generated code, SQL, shell commands, or arbitrary tool instructions without a separately designed and authorized execution system.

Prompt instructions are not a substitute for server-side access control.

9. Privacy and data protection

Do not send personal, financial, medical, educational-record, identity-document, application-document, credential, or other sensitive information to an external AI service without the required authorization, appropriate disclosure, and review of applicable policies.

Before processing user data, determine:

* The purpose and legal basis for processing.
* Whether the data is necessary for the request.
* Whether the user has received the required disclosure.
* Whether the provider’s data handling and retention terms are acceptable.
* Whether the request can be fulfilled with redacted or minimized data.
* Whether retention, deletion, or audit requirements apply.

Prefer anonymized or minimized prompts where practical.

Do not include API keys, authentication tokens, passwords, database credentials, or private storage URLs in prompts.

10. Application integration

Use the AI integration from authorized application services rather than directly from public controllers.

Suitable integration points may include:

* Educational explanations and study assistance.
* Career-content drafting.
* General-purpose content assistance.
* Administrative drafting and summarization.
* Structured suggestions subject to application validation.

For MedOrbits education, admissions, recruitment, and consultancy workflows, AI output must not independently make admission decisions, guarantee admission outcomes, determine eligibility, approve payments, or alter authoritative student records.

Use trusted database records and explicit application rules for consequential decisions.

11. Input validation and resource limits

The provider should enforce the configured prompt-size and output-token limits.

Additional application-level controls should include:

* Authentication and authorization.
* Per-user and per-IP rate limits where appropriate.
* Request-size limits.
* Allowed-model restrictions.
* Usage and cost budgets.
* Request deadlines.
* Abuse detection.
* Appropriate concurrency limits.

Character limits do not equal token limits. A prompt within the configured character limit can still exceed the model’s context window when system instructions and other request data are included.

12. Error handling

Handle failures according to their category:

* Validation errors: Reject malformed requests before contacting the provider.
* Authentication errors: Correct credentials or permissions.
* Rate limits: Apply bounded retries and backoff where appropriate.
* Timeouts: Return a controlled error and avoid assuming the provider completed no work.
* Network failures: Retry only when appropriate and within a bounded policy.
* Invalid responses: Reject unexpected response structures.
* Provider errors: Log safe diagnostic metadata without exposing credentials or raw sensitive payloads.

Use stable application error codes where clients need predictable behavior. Do not return raw provider error bodies or stack traces to public clients.

If retries are added, account for cost implications and the possibility of repeated provider requests.

13. Logging and observability

Capture operational metadata such as:

* Request correlation ID.
* Selected model.
* Request duration.
* Success or failure category.
* Input and output token usage when available.
* Rate-limit and timeout counts.
* Estimated usage cost when reliable pricing data is available.

Avoid logging full prompts, generated content, personal records, documents, or API credentials by default.

Use appropriate retention limits and access controls for operational logs.

14. Testing checklist

Configuration

* [ ]	Missing API credentials are rejected before generation.
* [ ]	Invalid timeout and limit values are rejected.
* [ ]	The configured endpoint and model are applied correctly.
* [ ]	Secrets never appear in logs or client responses.

Request handling

* [ ]	Empty prompts are rejected.
* [ ]	Oversized prompts are rejected.
* [ ]	Invalid model and temperature options are rejected.
* [ ]	Output-token limits are enforced.
* [ ]	Request timeouts are handled safely.

Response handling

* [ ]	Valid responses produce the documented result structure.
* [ ]	Invalid JSON and unexpected response formats are rejected.
* [ ]	Provider authentication, rate-limit, and server errors are handled safely.
* [ ]	Generated HTML and URLs are validated before use.

Privacy and operations

* [ ]	Sensitive data is minimized and processed only under approved conditions.
* [ ]	Public endpoints enforce authentication, authorization, and rate limits.
* [ ]	Usage and cost controls are in place.
* [ ]	High-impact outputs receive appropriate review.
* [ ]	Provider shutdown and application shutdown behave correctly.

15. Operational boundaries

This integration provides a configurable text-generation client and an OpenAI-compatible provider adapter.

It does not automatically implement:

* Persistent chat history or memory.
* Document retrieval or RAG.
* Embeddings or vector databases.
* Automated fact verification.
* Content moderation.
* AI agents or unrestricted tool execution.
* A durable request queue.
* Per-user billing or quota persistence.
* Human review workflows.
* Guaranteed accuracy or deterministic output.

Implement these features in separate modules with explicit security, privacy, and operational controls.

16. Maintenance

Periodically review model availability, API pricing, provider compatibility, timeout behavior, request limits, data-handling terms, and error rates.

Update configuration defaults only after confirming compatibility with the selected provider and testing the integration.

Implementation status: This README describes the expected interface and recommended safeguards. Verify each feature against the actual source code and deployment settings before treating it as implemented or production-ready.