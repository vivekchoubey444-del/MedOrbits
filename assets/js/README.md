MedOrbits Account Module

The account/ directory contains all user authentication, account management, security, dashboard, application tracking, counselling, document management, payments, subscriptions, career opportunities, and support pages for the MedOrbits platform.

Directory Structure

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

Page Descriptions

1. Authentication

File	Purpose
login.html	Sign in to an existing MedOrbits account.
register.html	Create a new user account.
logout.html	Sign out and terminate the active session.
forgot-password.html	Request a password-reset link.
reset-password.html	Set a new password using a valid reset token.
verify-email.html	Verify the user’s registered email address.
resend-verification.html	Request another email verification link.

2. Account Security

File	Purpose
change-password.html	Change the current account password.
two-factor.html	Configure and manage two-factor authentication.
security.html	Review account security settings and available security controls.
delete-account.html	Request permanent account deletion and review its consequences.

3. Account Management

File	Purpose
dashboard.html	Display account overview, activity, and important updates.
profile.html	View and update personal and educational information.
settings.html	Manage preferences, communication settings, and account options.
activity.html	Display a history of account activity and relevant events.

4. Admissions and Counselling

File	Purpose
applications.html	View and track course, college, and admission applications.
counselling.html	Manage counselling requests, appointments, and guidance updates.
documents.html	Upload, view, and manage admission-related documents.

5. Payments and Subscriptions

File	Purpose
payments.html	View payment history, transaction details, and payment status.
subscriptions.html	Review subscription plans, billing information, renewals, and cancellations.

6. Career and Support

File	Purpose
saved-jobs.html	View and manage saved job opportunities.
internships.html	Browse and track internship opportunities and applications.
support.html	Submit support requests and follow up on existing tickets.
notifications.html	View account alerts, application updates, and service notifications.

Recommended Shared Assets

Use the existing MedOrbits shared assets and scripts wherever available.

assets/
├── css/
│   ├── main.css
│   ├── components.css
│   ├── forms.css
│   └── account.css
└── js/
    ├── app.js
    ├── auth.js
    ├── validation.js
    ├── forms.js
    ├── notifications.js
    ├── payments.js
    ├── documents.js
    └── toast.js

Adjust asset paths according to the actual project directory structure.

Design Requirements

All account pages should follow the MedOrbits design system:

* Use a premium dark visual theme with burgundy, champagne gold, and complementary dark colours.
* Avoid pure-white page sections and maintain readable text contrast.
* Keep layouts responsive across mobile, tablet, and desktop screens.
* Use consistent navigation, form controls, buttons, cards, alerts, and footer components.
* Provide clear loading, success, error, empty, and validation states.
* Use accessible labels, keyboard navigation, focus indicators, and semantic HTML.
* Keep authentication and security pages simple, focused, and easy to use.

Authentication and API Integration

Account pages should integrate with the configured MedOrbits backend through the shared authentication and API utilities.

Expected capabilities include:

* User registration and authentication.
* Email verification and password recovery.
* Secure session management and logout.
* Password updates and two-factor authentication.
* Profile and preference management.
* Application, counselling, and document tracking.
* Payment and subscription history.
* Notifications, saved jobs, internships, and support requests.

Use the API endpoints configured by the application rather than hardcoding environment-specific URLs. Protect private account data through server-side authentication and authorization.

Security Requirements

1. Never store plaintext passwords or sensitive authentication secrets in browser storage.
2. Validate and authorize all protected operations on the server.
3. Enforce HTTPS in production.
4. Apply rate limiting to login, registration, password recovery, and verification endpoints.
5. Use short-lived, single-use tokens for password resets and email verification.
6. Protect state-changing requests against CSRF where applicable.
7. Validate uploaded files by type, size, and content on the server.
8. Verify payment status through trusted server-side payment-provider confirmation.
9. Require appropriate re-authentication before sensitive actions such as changing security settings or deleting an account.
10. Record relevant security events without logging passwords, access tokens, or other secrets.

Implementation Notes

* README.md documents the purpose, structure, and integration requirements of the account module.
* Every HTML page should load only the shared scripts and styles it requires.
* Use relative links consistently and verify navigation between all account pages.
* Handle expired sessions and unauthorized API responses consistently.
* Show clear confirmation before destructive actions.
* Account deletion, payments, subscriptions, and security changes must be backed by working server-side functionality; a frontend page alone does not implement these operations.

Maintenance

When adding a new account page:

1. Follow the existing MedOrbits layout and design conventions.
2. Reuse shared components, validation, authentication, and notification utilities.
3. Add the page to this README.
4. Verify responsive behaviour, accessibility, API integration, and authorization.
5. Test success, failure, loading, and empty states before deployment.

Module objective: Provide a consistent, secure, and user-friendly account experience for MedOrbits users across admissions, counselling, education services, payments, and career support.