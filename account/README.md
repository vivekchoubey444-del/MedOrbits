MedOrbits Account Module

The account/ directory contains the user-facing account,
authentication, security, application-tracking, document, payment, and
support pages for MedOrbits.

> **Implementation note:** This README documents the intended purpose
> and integration expectations for each page. A page existing in the
> frontend does not, by itself, mean its API, authentication, payment
> processing, email delivery, or security controls are implemented.
> Verify each feature against the deployed backend before production
> use.

Directory structure

account/
├── README.md
├── login.html
├── register.html
├── logout.html
├── forgot-password.html
├── reset-password.html
├── verify-email.html
├── resend-verification.html
├── change-password.html
├── two-factor.html
├── security.html
├── delete-account.html
├── dashboard.html
├── profile.html
├── settings.html
├── applications.html
├── counselling.html
├── documents.html
├── notifications.html
├── payments.html
├── subscriptions.html
├── saved-jobs.html
├── internships.html
├── support.html
└── activity.html

Page guide

────────

Page                                Intended responsibility

────────

login.html                        Sign in using the account’s
accepted credentials. Include clear
validation and safe error messages.

register.html                     Create a new account and collect
only the information required to
register.

logout.html                       End the current session and return
the user to a safe public page.
Prefer a backend logout endpoint
that invalidates the session.

forgot-password.html              Request a password-reset email
without revealing whether an email
address is registered.

reset-password.html               Set a new password using a valid,
single-use, expiring reset token.

verify-email.html                 Verify an email address using a
token or verification link.

resend-verification.html          Request another verification email,
with rate limiting and
privacy-preserving responses.

change-password.html              Change the signed-in user’s
password; require current-password
verification or an equivalent
secure re-authentication step.

two-factor.html                   Enrol, verify, manage, or use
multi-factor authentication,
according to the implemented flow.

security.html                     Review account-security options,
active sessions, authentication
methods, and relevant security
controls.

delete-account.html               Request account deletion and
explain consequences, confirmation
requirements, retention
obligations, and any recovery
window.

dashboard.html                    Provide an overview of the user’s
account, recent activity,
applications, counselling,
documents, payments, and
notifications.

profile.html                      View and edit personal and contact
details permitted by the
application.

settings.html                     Manage preferences such as
communication choices, display
options, and account preferences.

applications.html                 View and track submitted education,
admission, or service applications.

counselling.html                  Review counselling requests,
appointments, status, and related
guidance information.

documents.html                    Upload, list, view, or manage
account documents according to
access permissions and
file-validation rules.

notifications.html                View account notifications and
manage read/unread state or
supported notification preferences.

payments.html                     Review payment records, receipts,
and transaction status returned by
the payment backend.

subscriptions.html                View or manage subscription plans,
billing state, renewals, and
cancellation options if supported.

saved-jobs.html                   View jobs saved by the signed-in
user.

internships.html                  Review internship opportunities,
saved items, or internship
applications supported by the
platform.

support.html                      Submit support requests and view
the user’s own support cases or
replies.

activity.html                     Show the signed-in user’s account activity, such as sign-ins, security events, enquiries, and account changes, when recorded by the backend.

Recommended user journeys

Account access

1. A new user opens register.html and submits registration details.
2. The backend creates the account and sends a verification message if
email verification is required.
3. The user opens verify-email.html from the verification link.
4. The user signs in through login.html.
5. The user is redirected to dashboard.html or another authorized
destination.

Password recovery

1. The user submits an email address on forgot-password.html.
2. The backend sends a reset link when appropriate and returns a
non-enumerating response.
3. The user opens reset-password.html with a valid token and chooses
a new password.
4. The backend invalidates the reset token and applies the configured
session-revocation policy.

Account and security management

1. Signed-in users manage their details in profile.html and
preferences in settings.html.
2. They manage password and authentication controls through
change-password.html, two-factor.html, and security.html.
3. They review recorded events in activity.html.
4. Account deletion is initiated through delete-account.html and must
be confirmed and processed by the backend.

Education and career services

The dashboard can link to applications.html, counselling.html,
documents.html, notifications.html, payments.html,
subscriptions.html, saved-jobs.html, internships.html, and
support.html. Each page must retrieve data for the authenticated user
only.

Integration expectations

Shared frontend conventions

• Use the existing MedOrbits visual system and responsive layout
conventions.
• Keep the account area consistent with its royal midnight-blue and
platinum theme where that theme is used by the account pages.
• Reuse the shared assets and scripts where appropriate, including
files under /assets/css/, /assets/js/, and /assets/images/.
• Use root-relative URLs consistently when the site is deployed at the
domain root.
• Provide visible loading, empty, success, and failure states for
data-driven pages.
• Label inputs, associate validation messages with their fields,
preserve keyboard navigation, and support reduced-motion
preferences.
• Do not put passwords, authentication tokens, payment secrets, or
private document contents in browser logs or URLs unless a
short-lived token is specifically required for a secure verification
flow.

Backend and API

The frontend should call documented backend endpoints rather than
treating client-side state as authoritative. Confirm the exact routes
and request/response formats in the backend before connecting pages.

Expected API capabilities may include:

• Authentication: register, login, logout, current-user/session
lookup.
• Verification: send and verify email-verification tokens.
• Password recovery: request reset and redeem reset tokens.
• Security: change password, manage multi-factor authentication,
review/revoke sessions.
• Profile and settings: read and update permitted account fields and
preferences.
• Account data: applications, counselling requests, documents,
notifications, saved jobs, internships, and support tickets.
• Billing: payment history, receipts, subscription status, and plan
changes.
• Activity: retrieve a user’s own recorded account events.
• Account deletion: submit, confirm, and track deletion requests.

The current application may use different endpoint names. Treat examples
or expectations in this README as integration guidance, not proof that a
specific endpoint exists.

Security requirements

Before production release, verify the following:

• Enforce authentication and authorization on the server for every
private endpoint and resource.
• Check ownership on every application, counselling record, document,
payment, subscription, saved job, support ticket, and activity
record.
• Store passwords using a modern, purpose-built password-hashing
algorithm; never store plaintext passwords.
• Use HTTPS and secure session or token handling. If cookies are used,
configure Secure, HttpOnly, and an appropriate SameSite
policy.
• Apply CSRF protection where relevant, rate-limit authentication and
recovery endpoints, and use generic responses for login and
password-recovery failures.
• Make verification and password-reset tokens random, short-lived,
single-use, and stored safely.
• Validate uploaded files by type, size, content, and authorization.
Store private documents outside a publicly browsable directory and
use controlled access for downloads.
• Verify payment status server-side with the payment provider. Never
trust a client-side success message as proof of payment.
• Require re-authentication or strong confirmation for sensitive
changes and account deletion.
• Record security-relevant events without logging passwords, full
tokens, or unnecessary sensitive data.
• Apply a documented retention and deletion policy, including any
legally required records.
• Test authorization boundaries, expired sessions, invalid tokens,
duplicate submissions, and failure states.

Accessibility and usability checklist

☐ Each page has a meaningful title and one clear primary heading.
☐ Every input has a visible or programmatic label.
☐ Keyboard users can reach all controls and see focus indicators.
☐ Validation errors explain how to correct the problem.
☐ Loading and empty states are understandable without color alone.
☐ Sensitive actions have clear consequences and confirmation
steps.
☐ Layouts work on small screens and at increased text sizes.
☐ Motion respects prefers-reduced-motion.
☐ Authentication failures do not disclose whether another user’s
account exists.

Testing checklist

☐ Test registration, sign-in, sign-out, and session expiry.
☐ Test email verification, expired tokens, reused tokens, and
resend throttling.
☐ Test password reset, password-change validation, and session
revocation.
☐ Test multi-factor enrolment, challenge, recovery, and removal if
implemented.
☐ Confirm unauthenticated visitors cannot access account data.
☐ Confirm one user cannot read or modify another user’s records.
☐ Test document upload/download restrictions and invalid files.
☐ Test payment pending, failed, successful, refunded, and
duplicate-callback scenarios where applicable.
☐ Test subscription cancellation and renewal states where
applicable.
☐ Test activity filters, pagination, empty results, and API
failures.
☐ Test mobile navigation, keyboard operation, and reduced-motion
behavior.

Maintenance

When adding or changing an account page:

1. Update this directory tree and page guide.
2. Document the backend endpoint(s), required authentication, and
expected response.
3. Add loading, empty, success, and error states.
4. Verify access control and sensitive-data handling.
5. Test desktop and mobile layouts.
6. Update relevant automated tests and deployment documentation.

────────

Ownership: MedOrbits
Scope: Frontend account pages and their integration expectations
Production readiness: Confirm backend routes, security controls, and
actual page behavior before launch.