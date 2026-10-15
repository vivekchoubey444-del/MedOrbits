Templates Module — MedOrbits

Directory: src/templates/

Overview

The templates module contains reusable server-side HTML and plain-text templates used to generate transactional emails and downloadable documents across the MedOrbits platform.

It supports consistent formatting for account notifications, admissions workflows, payments, subscriptions, job alerts, interview invitations, and document generation.

Implementation note: Template files describe intended functionality. Actual delivery and document generation depend on the application’s rendering engine, integration providers, and service implementations.

Directory Structure

src/templates/
├── README.md
├── email/
│   ├── README.md
│   ├── base.html
│   ├── base.text
│   ├── welcome.html
│   ├── verification.html
│   ├── password-reset.html
│   ├── password-change.html
│   ├── application-received.html
│   ├── application-status.html
│   ├── payment-success.html
│   ├── payment-failed.html
│   ├── job-alert.html
│   ├── subscription-renewal.html
│   └── interview-invitation.html
└── documents/
    ├── README.md
    ├── application-summary.html
    ├── payment-receipt.html
    ├── counselling-summary.html
    ├── resume.html
    └── document-checklist.html

Directory Responsibilities

1. Email Templates

Path: src/templates/email/

Email templates provide reusable layouts for account-related and transactional communications.

Template	Purpose
base.html	Shared HTML email layout
base.text	Plain-text email layout or reusable text template
welcome.html	Welcome message after registration
verification.html	Email address verification
password-reset.html	Password reset instructions
password-change.html	Password change confirmation
application-received.html	Application submission confirmation
application-status.html	Application status updates
payment-success.html	Successful payment confirmation
payment-failed.html	Payment failure notification
job-alert.html	Relevant job opportunity notifications
subscription-renewal.html	Subscription renewal reminders or confirmations
interview-invitation.html	Interview invitations and scheduling details

Email templates should support readable typography, mobile-friendly layouts, meaningful links, and a plain-text alternative where appropriate.

2. Document Templates

Path: src/templates/documents/

Document templates provide layouts for generating application summaries, receipts, counselling summaries, resumes, and document checklists.

Template	Purpose
application-summary.html	Summarizes an education or career application
payment-receipt.html	Formats payment receipt information
counselling-summary.html	Summarizes counselling details and next steps
resume.html	Formats candidate resume information
document-checklist.html	Lists required and submitted documents

Generated documents may be rendered as HTML or converted to PDF when a supported document-generation service is configured.

Template Rendering

The backend should render templates through an established template engine or a controlled rendering service.

A typical workflow is:

1. A controller or service identifies the required communication or document.
2. The service retrieves the relevant template.
3. Validated application data is passed to the rendering layer.
4. The template engine generates HTML or plain text.
5. Email integrations deliver messages, or a document service generates the requested file.
6. Errors are logged without exposing credentials or sensitive document contents.

Use the actual rendering engine and function names implemented in the project.

Integration with Other Modules

Templates may be used by:

* src/services/ — business workflows and notification orchestration.
* src/integrations/email/ — email delivery providers.
* src/integrations/payment/ — payment confirmations and receipt workflows.
* src/workers/ — asynchronous notifications and document tasks.
* src/jobs/ — scheduled reminders and subscription notifications.
* src/controllers/ — request handling where document generation is required.

Keep template rendering separate from business logic and external-provider communication.

Security and Privacy

* Escape untrusted values before inserting them into HTML.
* Use context-appropriate escaping for HTML attributes, URLs and text.
* Never interpolate raw user-supplied HTML without a deliberate sanitization policy.
* Do not embed passwords, API keys, session tokens or payment credentials in templates.
* Use short-lived, securely generated links for verification and password resets.
* Restrict access to generated receipts, resumes, application summaries and counselling documents.
* Avoid exposing private application or identity information through email subject lines and notification previews.
* Validate document ownership and authorization before generation or download.
* Store private generated files outside public web roots.
* Avoid logging complete rendered messages or confidential document contents.

Accessibility and Compatibility

* Use semantic HTML and readable text.
* Maintain sufficient contrast and legible font sizes.
* Provide descriptive link text.
* Avoid relying exclusively on images to convey important information.
* Test email rendering in common email clients.
* Ensure important information remains available when styles or images are disabled.

Naming and Maintenance

* Use descriptive, lowercase filenames with hyphens.
* Keep email and document templates in their respective directories.
* Reuse shared layouts where supported by the rendering engine.
* Keep template variables consistent with the service data contracts.
* Update related tests when changing placeholders or rendering behavior.
* Remove obsolete templates only after checking all references.

Testing Checklist

* [ ]	Every referenced template exists.
* [ ]	Required variables are validated before rendering.
* [ ]	HTML output escapes untrusted input correctly.
* [ ]	Email HTML and plain-text output are consistent.
* [ ]	Missing variables and rendering failures are handled safely.
* [ ]	Private documents cannot be accessed without authorization.
* [ ]	Links and calls to action point to valid destinations.
* [ ]	Email layouts work on mobile devices and common email clients.
* [ ]	Generated documents are tested with representative synthetic data.

⸻

MedOrbits — Study · Work · Grow

Reusable templates for consistent, accessible, and secure platform communications and documents.