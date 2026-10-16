
# MedOrbits Email Templates

**Directory:** `src/templates/email/`

**Brand direction:** Deep Plum, Royal Plum, and Champagne Gold

## 1. Purpose

This directory contains reusable HTML and plain-text templates for transactional and service-related emails across the MedOrbits platform.

Templates support account notifications, application updates, payment communications, subscription notifications, job alerts, and interview invitations.

HTML templates use a centered, table-based layout with inline CSS for broad email-client compatibility. The shared base provides the MedOrbits wordmark and common presentation structure without website navigation or the website footer.

**Implementation note:** Templates define presentation and expected data placeholders. Rendering, delivery, tracking, scheduling, and provider integration depend on the application services and infrastructure actually implemented in the repository.

## 2. Directory Structure

The intended directory structure is:

```text
src/templates/email/
├── README.md
├── base.html
├── base.text
├── welcome.html
├── verification.html
├── password-reset.html
├── password-change.html
├── application-received.html
├── application-status.html
├── payment-success.html
├── payment-failed.html
├── job-alert.html
├── subscription-renewal.html
└── interview-invitation.html
```

Keep this structure aligned with the actual repository.

Do not assume that a listed template, shared partial, renderer, or integration exists until it has been verified.

## 3. Shared Visual Design

Use the MedOrbits premium email palette consistently across HTML templates.

| Color | Hex | Intended use |
|—|—|—|
| Deep Plum | `#100a17` | Outer background and primary dark surfaces |
| Royal Plum | `#191023` | Main email content container |
| Burgundy Plum | `#21172b` | Secondary panels and highlighted sections |
| Champagne Gold | `#c9a96e` | Borders, dividers, restrained accents |
| Light Champagne | `#e4d0a1` | Headings and emphasized text |
| Soft Lavender | `#d9cce4` | Supporting accents |
| Muted Text | `#b7acbf` | Secondary text where contrast is sufficient |

### Layout standards

- Use a centered, table-based layout with a defined maximum content width.
- Use inline CSS for critical layout, typography, backgrounds, and call-to-action styling.
- Include the MedOrbits wordmark in the shared base.
- Do not include website navigation, the website header, or the website footer.
- Use readable typography, appropriate spacing, and a clear content hierarchy.
- Make calls to action prominent and descriptive.
- Provide meaningful alternative text for informative images.
- Keep essential information understandable when images or CSS are unavailable.
- Avoid JavaScript, interactive browser controls, and animation dependencies.
- Minimize external assets and font dependencies.
- Use email-client-safe HTML and CSS.
- Test foreground/background combinations for adequate contrast.

The prohibition on the website footer does not prevent a template from displaying a compact email-specific sign-off or copyright notice when required by the approved design.

### Shared shell

`base.html` should define the reusable HTML email shell when the rendering engine supports template inheritance or partials.

The shell should establish:

- Document metadata and responsive viewport settings.
- The outer Deep Plum background.
- The centered Royal Plum content container.
- The MedOrbits wordmark.
- Shared typography, spacing, and accent styling.
- A clearly defined content insertion point.
- Optional preheader support, if compatible with the chosen rendering approach.

Do not assume that a template engine supports inheritance, includes, blocks, or partials without checking its implementation and configuration.

## 4. Template Catalogue

| Template | Purpose |
|—|—|
| `base.html` | Shared HTML email shell and reusable visual structure |
| `base.text` | Shared plain-text conventions or reusable text content |
| `welcome.html` | Welcome message after registration |
| `verification.html` | Email verification instructions |
| `password-reset.html` | Password reset instructions and secure reset link |
| `password-change.html` | Confirmation of a completed password change |
| `application-received.html` | Application submission confirmation |
| `application-status.html` | Application status notification |
| `payment-success.html` | Confirmed successful payment notification |
| `payment-failed.html` | Confirmed payment failure notification |
| `job-alert.html` | Relevant job opportunity notification |
| `subscription-renewal.html` | Subscription renewal reminder or confirmation |
| `interview-invitation.html` | Interview invitation and scheduling details |

Each template must have a documented purpose, expected variables, triggering conditions, and corresponding plain-text content where required.

Do not use a payment-success template for pending transactions or treat a renewal reminder as a renewal confirmation.

## 5. Placeholder and Rendering Contract

The `{{variableName}}` notation is a placeholder convention. It is not, by itself, a template engine.

Use the rendering engine and APIs actually implemented by MedOrbits. If no renderer has been configured, establish and document one before integrating these templates into production workflows.

### Requirements

- Define the required and optional variables for each template.
- Validate required variables before rendering.
- Use consistent, documented variable names.
- Pass only data required by the specific template.
- Enable automatic escaping where supported.
- Escape untrusted values according to their output context.
- Do not concatenate untrusted values into raw HTML.
- Validate URLs independently of HTML escaping.
- Reject unexpected schemes and unauthorized redirect destinations.
- Keep formatting logic in shared helpers or services.
- Fail safely when required values are missing or invalid.
- Do not silently substitute misleading values for transaction states, amounts, dates, or application statuses.

### Context-specific handling

**HTML text:** Escape special HTML characters before inserting untrusted values into text nodes.

**HTML attributes:** Apply appropriate attribute-context escaping. Validate attribute values, especially URLs.

**URLs:** Parse and validate URLs against explicit permitted schemes, hosts, and application routes. Use trusted HTTPS destinations in production.

**Amounts and dates:** Format values using validated, authoritative data and shared formatting helpers.

**Rich HTML fragments:** Accept only explicitly trusted or appropriately sanitized HTML. Ordinary text escaping is not a substitute for a sanitization policy.

**Preheaders and subjects:** Keep content concise and avoid unnecessary personal or confidential information.

## 6. Plain-Text Alternatives

Important transactional emails should have a corresponding plain-text alternative.

Plain-text messages should:

- Communicate the same essential information as their HTML counterparts.
- Include meaningful links in readable form.
- Preserve important dates, amounts, references, and next steps.
- Avoid unnecessary decorative characters and layout-specific content.
- Remain understandable in text-only email clients.
- Exclude sensitive credentials and unnecessary personal information.

Use `base.text` according to the rendering engine’s actual capabilities.

A file named `base.text` does not automatically become the plain-text alternative to an HTML email. The integration must explicitly render and attach the text body, or use a verified provider capability that does so.

Keep the HTML and plain-text versions consistent when templates are updated.

## 7. Security and Privacy

### Account verification

- Generate verification tokens using a cryptographically secure random generator.
- Enforce token expiry and single-use semantics.
- Invalidate tokens after successful verification.
- Build verification URLs from a configured, trusted HTTPS application origin.
- Never log verification tokens or complete verification URLs.
- Mark an email as verified only after successful server-side token validation.
- Avoid account enumeration through public registration and resend responses.

### Password reset and password change

- Use securely generated, appropriately expiring reset tokens.
- Store token hashes where practical rather than reusable raw tokens.
- Invalidate tokens after successful use.
- Never include passwords, password hashes, reset secrets, or authentication credentials in emails.
- Do not send a password-change confirmation before the password change has succeeded.
- Use a generic public response when account existence must remain confidential.
- Apply session invalidation or refresh-token revocation according to the authentication policy.

### Applications and career communications

- Send application notifications only to authorized recipients.
- Minimize personal information in subjects and preheaders.
- Validate recipient addresses and link destinations.
- Protect private documents with appropriate authorization and, where applicable, expiring links.
- Avoid embedding sensitive application documents directly in email unless explicitly approved by the security and privacy requirements.

### Payments and subscriptions

- Use authoritative transaction and subscription records.
- Do not trust client-supplied payment states, amounts, or subscription periods.
- Distinguish successful, pending, failed, cancelled, and reversed transactions accurately.
- Verify provider events according to the payment integration’s authentication and reconciliation requirements.
- Make notification retries idempotent or deduplicated.
- Do not include card credentials, CVV, PINs, payment API keys, or webhook secrets.
- Do not imply that a payment receipt is a compliant tax invoice unless the applicable requirements are satisfied.

### General requirements

- Do not render untrusted raw HTML without an explicit sanitization policy.
- Validate links before rendering and before sending.
- Avoid unnecessary external resources and tracking.
- Do not log complete rendered messages or confidential payloads.
- Restrict access to notification records and provider responses.
- Apply applicable retention and privacy requirements to delivery records.

## 8. Integration Boundaries

| Module | Responsibility |
|—|—|
| `src/services/` | Prepare validated template data and coordinate notification workflows |
| `src/integrations/email/` | Send rendered messages through the configured email provider |
| `src/jobs/` | Discover eligible scheduled notifications and reminders |
| `src/workers/` | Process queued notification delivery tasks |
| `src/controllers/` | Handle authorized requests that initiate supported communication workflows |

These paths describe intended architectural boundaries. Confirm the actual repository structure before relying on them.

Templates must not:

- Access the database directly.
- Send email messages directly.
- Contain payment, authentication, or application business rules.
- Generate security tokens independently of the authentication workflow.
- Determine transaction success from untrusted input.
- Perform network requests or provider API calls.

Keep business decisions in services and other appropriate application layers.

## 9. Delivery, Retries, and Observability

Where supported by the application architecture:

- Use a consistent notification service interface.
- Record a stable notification or event identifier for deduplication.
- Distinguish queued, sent, delivered, bounced, deferred, and failed states when the provider exposes them.
- Retry transient delivery failures with bounded backoff.
- Avoid retrying permanent failures indefinitely.
- Avoid duplicating transactional emails after repeated events or worker restarts.
- Track provider message IDs without logging message bodies or secrets.
- Apply rate limits and abuse protections to verification and reset requests.
- Keep delivery status separate from the underlying business transaction status.

A successful provider API response does not necessarily mean the recipient’s mailbox accepted or displayed the message.

Do not claim delivery tracking, queue processing, or retry support unless the corresponding functionality exists.

## 10. Email-Client Compatibility and Testing

Before production release, test the rendered output in representative email clients and on mobile devices.

- [ ] The HTML uses a centered, table-based layout.
- [ ] The shared shell includes the MedOrbits wordmark.
- [ ] Website navigation and the website footer are absent.
- [ ] The Deep Plum, Royal Plum, and Champagne Gold palette is applied consistently.
- [ ] Critical styles render correctly across target email clients.
- [ ] The layout remains usable on narrow screens.
- [ ] The email remains understandable when images or styles are disabled.
- [ ] Foreground/background contrast has been checked.
- [ ] Plain-text alternatives contain the essential information.
- [ ] Required variables are validated.
- [ ] Untrusted text and attributes are escaped correctly.
- [ ] URLs are validated against the permitted destination policy.
- [ ] Missing or invalid values fail safely.
- [ ] Links and calls to action work as intended.
- [ ] Password-reset and verification links follow security requirements.
- [ ] Payment messages use authoritative transaction states.
- [ ] Subscription dates and billing amounts are accurate.
- [ ] Unauthorized recipients cannot access private application or receipt details.
- [ ] Duplicate events and delivery retries are tested.
- [ ] Sensitive information is absent from logs.
- [ ] Accessibility and text-only rendering are reviewed.

## 11. Maintenance and Implementation Status

Keep this README synchronized with:

- The actual template files.
- The documented variable contracts.
- The configured rendering engine.
- The HTML and plain-text generation workflow.
- The email provider integration.
- The notification service and triggering events.
- The implemented security and testing controls.

When adding a template:

1. Define its purpose and triggering conditions.
2. Document required and optional placeholders.
3. Follow the shared visual system.
4. Add a plain-text alternative.
5. Validate text, attribute, and URL contexts.
6. Integrate it through the appropriate service.
7. Add rendering and workflow tests.
8. Test representative email-client output.
9. Update this README and any relevant template catalogue.

The presence of a template file does not prove that it is connected to a notification workflow or ready for production.

—

**MedOrbits — Study · Work · Grow**

Premium, secure, and accessible transactional email communications.
