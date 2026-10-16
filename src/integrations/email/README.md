MedOrbits Email Integration

Directory: src/integrations/email/

Purpose: Provide a reusable server-side email service for MedOrbits authentication, admissions enquiries, application updates, career services, employer communications, notifications, and transactional messages.

⸻

1. Overview

The email integration separates application-level email delivery from the underlying SMTP transport.

Application services should use createEmailClient() and send validated messages through the shared email client. SMTP connection management, authentication, and delivery are handled by the configured provider.

The integration supports:

* Transactional and notification emails.
* Plain-text and HTML messages.
* Multiple recipients, CC, and BCC where authorized.
* Configured sender and reply-to addresses.
* Pooled SMTP connections.
* Graceful provider shutdown.

The integration does not automatically provide email templates, a durable delivery queue, retry persistence, bounce processing, delivery analytics, or email verification workflows. Implement these separately when required.

2. Directory structure

src/integrations/email/
├── README.md
├── index.js
├── email.client.js
├── email.provider.js
└── smtp.provider.js

File	Responsibility
index.js	Exports the email client, provider contract, SMTP adapter, and factory.
email.client.js	Validates messages and delegates sending to the provider.
email.provider.js	Defines the abstract email provider interface.
smtp.provider.js	Configures Nodemailer and sends messages through SMTP.

Keep transport-specific configuration inside the SMTP adapter. Controllers and business services should not create Nodemailer transports directly.

3. Requirements

* Node.js 20 or later.
* npm.
* An SMTP account or authorized SMTP relay.
* Environment-variable configuration for SMTP credentials.
* A verified sender address or domain where required by the provider.

Install Nodemailer:

npm install nodemailer

Confirm that nodemailer is recorded in package.json and included in the production deployment.

4. Environment configuration

Configure the following variables in your local environment or deployment secret manager.

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
EMAIL_FROM=notifications@example.com

Replace the example host and sender with values supplied by your email provider.

Configuration reference

Variable	Required	Description
SMTP_HOST	Yes	SMTP server hostname.
SMTP_PORT	Yes	SMTP port, commonly 587 or 465 depending on the provider.
SMTP_USER	Yes	SMTP authentication username.
SMTP_PASS	Yes	SMTP authentication password or application-specific credential.
SMTP_SECURE	No	Whether to use TLS immediately when connecting. Defaults depend on the provider implementation.
EMAIL_FROM	Yes	Trusted sender email address.

For port 465, SMTP commonly uses implicit TLS with SMTP_SECURE=true. For port 587, STARTTLS is commonly used with SMTP_SECURE=false. Follow your SMTP provider’s instructions and ensure encryption is required where appropriate.

Never commit real SMTP credentials to Git. Rotate exposed credentials immediately.

Implementation alignment: The SMTP adapter currently reads SMTP_PASS and EMAIL_FROM. If src/config/env.js or src/config/email.js uses different names, standardize those files before deployment.

5. Creating an email client

Use the exported factory:

‘use strict’;
const {
  createEmailClient,
} = require(‘./src/integrations/email’);
const emailClient = createEmailClient();

Create a shared application-level client when the SMTP provider uses connection pooling. Avoid constructing a new transport for every request.

For testing, inject a provider that implements send(message) instead of connecting to a real SMTP server.

6. Sending an email

The supported basic message format is:

await emailClient.send({
  to: ‘student@example.com’,
  subject: ‘Your MedOrbits enquiry’,
  text: ‘We have received your enquiry.’,
  html: ‘<p>We have received your enquiry.</p>’,
});

Use text, html, or both.

Prefer both formats for transactional messages so recipients can read the plain-text alternative when HTML rendering is unavailable.

The client returns a delivery-submission result containing the provider message ID and accepted or rejected recipient information, depending on the SMTP response.

A successful SMTP submission is not proof that the message reached the inbox. Delivery can still fail later because of filtering, bounces, recipient-server policies, or other delivery issues.

7. HTML templates and rendering security

Render HTML email using trusted templates and an autoescaping template engine.

Recommended rules:

* Escape user-provided values before inserting them into HTML.
* Never insert user-supplied HTML directly into a template.
* Do not allow arbitrary template source or template filenames to be supplied by users.
* Validate URLs before placing them in links.
* Restrict links to approved schemes, normally HTTPS, and approved domains where appropriate.
* Reject javascript:, unexpected data: URLs, and other unsafe schemes.
* Avoid interpolating untrusted values into CSS, HTML attributes, or raw template blocks.
* Keep email templates separate from controllers and business logic.
* Provide a meaningful plain-text alternative.
* Test templates with HTML injection payloads and malformed input.

Example of safe conceptual template rendering:

const html = renderTrustedTemplate(‘enquiry-received’, {
  studentName: validatedStudentName,
  enquiryReference: validatedReference,
});
await emailClient.send({
  to: validatedRecipient,
  subject: ‘We received your MedOrbits enquiry’,
  text: plainTextMessage,
  html,
});

renderTrustedTemplate() represents your application’s template-rendering service; it is not provided by this email integration unless implemented separately.

HTML escaping alone is not sufficient for validating URLs or preventing unsafe link destinations.

8. Authentication and account-enumeration protection

Authentication-related email workflows must not reveal whether an account exists.

Use generic responses for:

* Password-reset requests.
* Login and account-recovery assistance.
* Email-verification resend requests.
* Registration attempts where account existence could otherwise be disclosed.

For example, a password-reset endpoint can return a message such as:

If an account matches the supplied details, instructions will be sent to the registered email address.

Apply rate limiting and abuse detection to email-triggering endpoints. Use cryptographically secure, short-lived tokens for verification and password resets, store only token hashes when appropriate, and invalidate tokens after successful use or expiration.

Do not include passwords, session tokens, unrestricted account data, or sensitive documents in email messages or URLs.

9. Message validation

The email client should validate message structure before delegating to the SMTP provider.

At minimum, validate:

* Recipient addresses and recipient counts.
* Subject presence and header-injection characters.
* HTML or plain-text body presence.
* Optional CC, BCC, and reply-to addresses.
* Custom header names and values.
* Body size and other operational limits.

Use a trusted configured sender address rather than allowing arbitrary callers to override the sender.

Address syntax validation does not prove that an email address exists or belongs to the intended user.

10. Application integration

Use the email service from the appropriate application layer.

Examples include:

* Authentication service — verification and password-reset messages.
* Admissions service — enquiry acknowledgements and application updates.
* Career service — relevant application and recruitment notifications.
* Employer service — approved recruitment-related notifications.
* Support service — case acknowledgements and status updates.
* Notification service — approved transactional and account messages.

Controllers should validate the request, authorize the operation, and delegate email work to the appropriate service.

Do not let public clients submit arbitrary email content, choose privileged sender identities, or use the SMTP integration as an unrestricted email relay.

11. Error handling and reliability

Handle email errors according to their type.

* Validation failures: Reject invalid messages before calling the provider.
* Configuration failures: Fail startup or disable the affected capability safely when required credentials are missing.
* Authentication failures: Alert operators and correct the SMTP credentials.
* Transient failures: Retry only under a bounded retry policy.
* Permanent recipient failures: Record the rejection and avoid endless retries.
* Ambiguous network failures: Account for the possibility that the SMTP server accepted the message before the connection failed.

For important messages, use a durable queue or transactional outbox. Record a unique application message ID and processing status so retries do not cause unnecessary duplicate sends.

Email delivery is not inherently exactly-once. Design for at-least-once attempts with duplicate-resistant business workflows where appropriate.

Do not block a database transaction while waiting for an external SMTP request.

12. Logging and privacy

Log operational metadata such as:

* Application message ID.
* Message category or template name.
* Processing outcome.
* Provider message ID, when available.
* Error category and retry count.
* Timestamps and correlation IDs.

Avoid logging:

* SMTP passwords or credentials.
* Password-reset and verification tokens.
* Full authentication URLs containing secrets.
* Unnecessary message bodies.
* Sensitive personal or application information.

Protect email logs with access controls and a defined retention policy.

13. Graceful shutdown

Close the shared email client during application shutdown:

await emailClient.close();

Use graceful shutdown hooks to stop accepting new work, allow in-flight work to finish within a bounded deadline, and then close the email provider.

The SMTP adapter’s close() method releases the Nodemailer transport. If shutdown fails, record a sanitized operational error and ensure the process still follows the application’s shutdown policy.

14. Testing checklist

Configuration

* [ ]	Missing SMTP variables are detected.
* [ ]	Invalid ports and TLS settings are rejected.
* [ ]	Credentials are not exposed in logs or responses.
* [ ]	Production uses the approved SMTP endpoint.

Message validation

* [ ]	Invalid recipient addresses are rejected.
* [ ]	Empty subjects and bodies are rejected.
* [ ]	Header-injection attempts are rejected.
* [ ]	CC, BCC, and reply-to values are validated.
* [ ]	Oversized messages are rejected.
* [ ]	Sender identity remains controlled by configuration.

Security

* [ ]	HTML templates autoescape untrusted values.
* [ ]	Unsafe URLs are rejected.
* [ ]	Authentication responses remain generic.
* [ ]	Email-triggering endpoints are rate-limited.
* [ ]	Verification and reset tokens expire and cannot be reused.

Reliability

* [ ]	SMTP failures are handled without exposing secrets.
* [ ]	Retry behavior is bounded.
* [ ]	Duplicate processing is controlled for queued messages.
* [ ]	Provider resources close during shutdown.
* [ ]	Important messages can be recovered after a process restart.

15. Operational boundaries

This integration provides an email client and SMTP transport adapter. It does not automatically implement:

* A template engine or template directory.
* A durable email queue.
* Scheduled reminders.
* Bounce, complaint, or delivery-event processing.
* Email verification or password-reset workflows.
* Exactly-once delivery.
* A provider-independent delivery analytics system.

Implement these capabilities in dedicated modules and document their actual behavior.

16. Maintenance

Review SMTP credentials, TLS configuration, sender-domain authentication, message templates, rate limits, delivery failures, and log retention periodically.

For production email delivery, configure the appropriate domain authentication records, such as SPF, DKIM, and DMARC, according to the sending provider’s instructions.

Implementation status: This document describes the integration contract and recommended safeguards. Verify each feature against the actual source code and deployment configuration before treating it as implemented or production-ready.