Admin Panel — MedOrbits

Overview

The admin/ directory contains the administrative interface for managing the MedOrbits education, careers, applications, users, and support platform. These pages are intended for authorized administrators and should be connected to authenticated, permission-checked backend APIs.

Directory Structure

admin/
├── README.md
├── index.html
├── login.html
├── dashboard.html
├── users.html
├── roles.html
├── applications.html
├── courses.html
├── colleges.html
├── jobs.html
├── documents.html
├── payments.html
├── subscriptions.html
├── support.html
├── audit-logs.html
└── settings.html

Page Responsibilities

|File                |Purpose                                                                                                     |
|———————|————————————————————————————————————|
|`index.html`        |Admin entry page; route authorized users to the dashboard or login page.                                    |
|`login.html`        |Administrator sign-in interface, validation feedback, and session initiation through the authentication API.|
|`dashboard.html`    |High-level operational overview, key metrics, recent activity, and pending actions.                         |
|`users.html`        |Search, inspect, and manage user accounts according to assigned permissions.                                |
|`roles.html`        |Configure roles and permission assignments, subject to backend authorization rules.                         |
|`applications.html` |Review and manage education or service applications, statuses, and follow-up actions.                       |
|`courses.html`      |Manage course records, descriptions, visibility, and related metadata.                                      |
|`colleges.html`     |Manage college and institution records, details, and publication status.                                    |
|`jobs.html`         |Manage job listings, employers, application status where supported, and listing visibility.                 |
|`documents.html`    |Review document metadata and verification workflow; protect access to uploaded files.                       |
|`payments.html`     |Review payment records, transaction status, and reconciliation information from the payment provider.       |
|`subscriptions.html`|Manage subscription plans, user subscriptions, renewal status, and cancellation workflows.                  |
|`support.html`      |Track support requests, assign ownership, and update ticket status and responses.                           |
|`audit-logs.html`   |Search and review security-relevant administrative activity and change history.                             |
|`settings.html`     |Manage permitted platform settings, notification preferences, and administrative configuration.             |

Recommended Navigation

Use a consistent sidebar or compact navigation menu across authenticated pages:

1. Dashboard
2. Users & Roles
3. Applications
4. Education — Courses and Colleges
5. Careers — Jobs
6. Documents
7. Payments & Subscriptions
8. Support
9. Audit Logs
10. Settings

Keep login.html separate from authenticated navigation. index.html should act as a lightweight entry point rather than duplicating dashboard logic.

Shared UI and Design

• Follow the main MedOrbits design system and shared CSS/JavaScript conventions used by the rest of the site.
• Use a consistent page shell, sidebar, top bar, breadcrumbs, page title, status badges, data tables, filters, pagination, empty states, and confirmation dialogs.
• Keep layouts responsive for desktop, tablet, and mobile viewports.
• Provide loading, success, empty, and error states for data-driven sections.
• Use accessible labels, keyboard-operable controls, visible focus states, and semantic HTML.
• Avoid embedding secrets, API keys, access tokens, or private configuration in HTML or client-side JavaScript.

Authentication and Authorization

• Require authentication for all protected admin pages and API endpoints.
• Enforce authorization on the server for every read and write operation; hiding a button in the browser is not a security control.
• Apply least-privilege role-based access control. Separate sensitive permissions such as role management, payments, document review, settings changes, and audit-log access.
• Validate sessions and permissions on every request. Use secure, HttpOnly, Secure, and appropriate SameSite cookie settings when cookie-based sessions are used.
• Protect state-changing requests against CSRF where applicable, rate-limit login attempts, and return safe error messages.
• Do not trust role names, user IDs, payment statuses, or document-verification claims supplied by the browser.

Data and Privacy

• Minimize the personal data shown in tables and dashboards.
• Mask sensitive identifiers where full values are not necessary.
• Restrict document previews and downloads to authorized users and use short-lived access links where appropriate.
• Never store raw card details or payment-provider secrets in the admin frontend.
• Keep audit events server-generated and tamper-resistant; record the actor, action, target, timestamp, and outcome where appropriate.
• Define retention and deletion rules for personal data, uploaded documents, support records, and audit logs.

Integration Expectations

Connect each page to the project’s established API client and configuration rather than hard-coding service URLs. Use the existing authentication, permissions, error-handling, formatting, pagination, and notification utilities where available.

Suggested API resource groupings (adapt these to the backend routes that actually exist):

• Authentication and session
• Users and roles
• Applications
• Courses and colleges
• Jobs
• Documents
• Payments and subscriptions
• Support tickets
• Audit logs
• Platform settings

These are organizational suggestions, not confirmation that corresponding endpoints already exist.

Suggested Implementation Order

1. login.html and protected-page access handling
2. index.html and dashboard.html
3. Shared navigation, table, filter, pagination, and status components
4. users.html and roles.html
5. applications.html, courses.html, colleges.html, and jobs.html
6. documents.html, payments.html, and subscriptions.html
7. support.html, audit-logs.html, and settings.html

Testing Checklist

☐ Unauthenticated visitors cannot access protected data or API actions.
☐ Users with limited roles cannot perform unauthorized operations.
☐ Search, filters, pagination, sorting, and empty states work as expected.
☐ Forms validate input and display actionable errors.
☐ Destructive actions require confirmation and are logged.
☐ Payment and subscription status is reconciled with the trusted provider or backend.
☐ Document access is authorized and does not expose public file URLs.
☐ Audit logs accurately represent privileged actions.
☐ Keyboard navigation, focus visibility, and responsive layouts are verified.
☐ No secrets or sensitive personal data are exposed in client-side source.

Important Notes

This README defines the intended responsibilities and implementation guidance for the listed admin pages. It does not assert that backend APIs, database tables, payment-provider integrations, or permission policies are already implemented. Confirm those capabilities in the project’s actual backend before wiring up the interface.