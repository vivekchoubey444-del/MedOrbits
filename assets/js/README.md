MedOrbits JavaScript Assets

Directory: assets/js/
Project: MedOrbits
Brand identity: Royal Burgundy and Champagne Gold
Purpose: Shared frontend utilities, application modules, account workflows, education services, API integration, and reusable user-interface functionality.

⸻

1. Overview

The assets/js/ directory contains the reusable JavaScript modules that power the MedOrbits website and its connected user experiences.

The directory is organized around shared application infrastructure, security, authentication, data access, interface components, and feature-specific functionality.

The JavaScript layer supports:

* Application initialization and shared core utilities.
* API configuration, HTTP requests, and error handling.
* Authentication, verification, permissions, and role-aware interfaces.
* User profiles, dashboards, applications, and account activity.
* Courses, colleges, search, comparison, and filtering.
* Document uploads, storage, and document-management interfaces.
* Payments, subscriptions, notifications, and support workflows.
* Forms, validation, pagination, formatting, and UI components.
* Accessibility, animations, navigation, and user feedback.
* Career opportunities, visits, and other platform services.

The frontend must use the configured backend APIs and existing shared utilities. Protected operations and sensitive business decisions must remain under server-side control.

2. Directory Structure

The following inventory is based on the supplied directory screenshots. It includes the visible JavaScript files and the existing README.md.

assets/js/
├── README.md
├── main/
│   ├── accessibility.js
│   ├── animations.js
│   ├── api.js
│   ├── app.js
│   ├── applications.js
│   ├── auth.js
│   ├── colleges.js
│   ├── compare.js
│   ├── config.js
│   ├── constants.js
│   ├── core.js
│   ├── courses.js
│   ├── dashboard.js
│   ├── documents.js
│   ├── error-handler.js
│   ├── filters.js
│   ├── formatters.js
│   ├── forms.js
│   ├── main.js
│   ├── messages.js
│   ├── modal.js
│   ├── navigation.js
│   ├── notifications.js
│   ├── pagination.js
│   ├── payments.js
│   ├── permissions.js
│   ├── profile.js
│   ├── README.md
│   ├── role.js
│   ├── search.js
│   ├── storage.js
│   ├── subscription.js
│   ├── support.js
│   ├── toast.js
│   ├── uploader.js
│   ├── user.model.js
│   ├── utils.js
│   ├── validation.js
│   ├── verification.js
│   └── visits.js

Inventory note: The screenshots show the files listed above, but do not establish the complete contents of the directory. Verify the repository before using this list as an exhaustive inventory.

3. Module Responsibilities

3.1 Application infrastructure

File	Responsibility
app.js	Initialize shared application behaviour and common frontend functionality.
main.js	Coordinate application startup and module initialization according to the existing architecture.
core.js	Provide shared core functionality used by other modules.
config.js	Read and expose approved frontend configuration.
constants.js	Centralize shared constant values and stable identifiers.
utils.js	Provide reusable utility functions that do not belong to a more specific module.
error-handler.js	Normalize and handle application errors consistently.

Keep initialization predictable. Avoid initializing the same component or registering the same event listener multiple times.

Configuration files must not contain private API keys, database credentials, signing secrets, or other server-only configuration.

3.2 API and data access

File	Responsibility
api.js	Centralize API communication, request handling, and response processing.
storage.js	Manage approved client-side storage operations and non-sensitive preferences.
user.model.js	Define or normalize user data structures used by the frontend.
formatters.js	Format dates, currency, numbers, labels, and other display values.

The API layer should be the consistent entry point for backend requests where supported by the existing architecture.

It should handle applicable concerns such as:

* Configured API base URLs.
* Request headers and response parsing.
* Session credentials and CSRF protection where required.
* Network failures and HTTP errors.
* Unauthorized and forbidden responses.
* Request cancellation and duplicate-request prevention where appropriate.
* Safe error messages for the user interface.

Do not introduce a second API client if api.js already provides the required functionality.

The storage.js module must not be used to persist plaintext passwords, private keys, payment secrets, or sensitive authentication tokens. Authentication storage must follow the backend’s established session design.

3.3 Authentication, verification, and permissions

File	Responsibility
auth.js	Coordinate frontend authentication workflows and session-aware behaviour.
verification.js	Support email or other configured account-verification workflows.
permissions.js	Support permission-aware frontend presentation and interactions.
role.js	Represent or interpret user roles for interface behaviour.

These modules may support:

* Registration and login.
* Logout and session-expiration handling.
* Password recovery and verification workflows.
* Role-aware navigation.
* Permission-aware UI controls.
* Account-security workflows.
* Authentication state updates.

Security boundary: Client-side role checks and permission checks are not authorization controls. The backend must independently authorize every protected operation and resource.

3.4 Education, search, and discovery

File	Responsibility
courses.js	Support course listings, course details, and related course interactions.
colleges.js	Support college discovery and college-related interfaces.
search.js	Provide search interactions and result presentation.
filters.js	Apply supported filters to displayed datasets.
compare.js	Support comparisons between courses, colleges, or other supported entities.
pagination.js	Provide reusable pagination controls and page-state handling.

These modules should use the platform’s approved data sources and API contracts.

Requirements:

* Handle loading, empty, and error states.
* Validate search and filter parameters.
* Keep filter and pagination state consistent.
* Avoid rendering untrusted content as executable HTML.
* Use backend pagination and filtering when supported and appropriate.
* Do not treat client-side filtering as access control.

3.5 Account and user workflows

File	Responsibility
dashboard.js	Coordinate dashboard data and summary interfaces.
profile.js	Support profile display and editing workflows.
applications.js	Display and track admission or other supported applications.
documents.js	Manage document-related frontend interactions.
visits.js	Support visit-related interfaces and API workflows.
subscription.js	Display and manage supported subscription workflows.
payments.js	Support payment interfaces and transaction-status presentation.
support.js	Support customer-service requests and ticket interfaces.
notifications.js	Retrieve and display notifications and account alerts.
messages.js	Support messaging interfaces where implemented.

These modules must retrieve private account data only through authorized backend endpoints.

They should not assume that a record belongs to the current user merely because the browser supplies a matching identifier.

3.6 Forms, documents, and validation

File	Responsibility
forms.js	Provide reusable form-submission behaviour.
validation.js	Provide client-side validation and accessible error presentation.
uploader.js	Manage file selection, upload interactions, and upload progress.
documents.js	Support document listing, preview, upload, and related interactions.

Responsibilities include:

* Accessible field-level validation.
* Loading and disabled states during submission.
* Duplicate-submission prevention.
* Server-side validation error presentation.
* Upload progress and failure handling.
* File-selection guidance.
* Clear confirmation of server-reported results.

The server must independently validate submitted fields and uploaded file content, type, size, ownership, and permissions. Client-side validation alone is not a security control.

3.7 User-interface components

File	Responsibility
navigation.js	Shared navigation and menu interactions.
accessibility.js	Accessibility helpers and supported interaction enhancements.
animations.js	Reusable animation and transition behaviour.
modal.js	Modal-dialog behaviour, focus management, and dismissal.
toast.js	Temporary success, error, warning, and informational messages.

Use these modules to keep common UI behaviour consistent across MedOrbits pages.

Requirements:

* Maintain visible keyboard focus.
* Support keyboard interaction and appropriate focus management.
* Respect reduced-motion preferences.
* Avoid inaccessible custom controls.
* Ensure modal dialogs have accessible names and appropriate focus handling.
* Keep toast messages concise and prevent them from obscuring essential controls.

3.8 Messaging and feedback

File	Responsibility
messages.js	Handle supported messaging interfaces and message presentation.
notifications.js	Present account alerts and notification states.
toast.js	Display temporary user feedback.
error-handler.js	Normalize errors for consistent handling by the application.

These modules serve different purposes and should not duplicate each other’s responsibilities.

Use persistent inline messages for important form errors and confirmation steps. Toasts should supplement, rather than replace, essential information.

4. Integration with the Account Module

The JavaScript modules may be consumed by the pages in the account/ directory.

Account workflow	Relevant modules
Login and registration	auth.js, api.js, forms.js, validation.js, toast.js
Password recovery and verification	auth.js, verification.js, forms.js, validation.js, toast.js
Security and permissions	auth.js, permissions.js, role.js, api.js
Dashboard and profile	dashboard.js, profile.js, auth.js, api.js
Admission applications	applications.js, courses.js, colleges.js, api.js
Document management	documents.js, uploader.js, validation.js, api.js
Payments and subscriptions	payments.js, subscription.js, api.js
Notifications and messaging	notifications.js, messages.js, api.js, toast.js
Saved opportunities and career features	Relevant feature module, api.js, auth.js
Support requests	support.js, forms.js, validation.js, api.js

This table is a dependency guide, not a requirement to load every listed file on every page. Use the actual exports, imports, and dependencies defined by the implementation.

5. Script Loading and Module Conventions

Follow the module system already established in the repository.

For classic scripts, an HTML page may use:

<script src=“../assets/js/main/app.js” defer></script>

For ES modules, the page may instead use:

<script type=“module” src=“../assets/js/main/main.js”></script>

These paths are illustrative and must be adjusted to match the actual project layout.

Before adding a script reference:

1. Confirm that the file exists.
2. Confirm whether it uses classic scripts or ES modules.
3. Check its imports and exports.
4. Confirm that dependencies load in the required order.
5. Avoid loading the same functionality twice.
6. Ensure the page initializes only the modules it needs.

Do not mix incompatible module-loading conventions or create duplicate startup logic.

6. API Configuration and Backend Integration

All backend requests should use the configured API infrastructure, preferably through api.js when that is the established shared API client.

Avoid hardcoding environment-specific URLs throughout individual feature modules.

Example of an illustrative API-client integration:

async function loadApplications(apiClient) {
  try {
    const response = await apiClient.get(“/applications”);
    return response.data;
  } catch (error) {
    // Delegate safe error presentation to the shared error-handling layer.
    throw error;
  }
}

The route and API-client method above are examples only. Use the actual backend endpoint and method contract defined by MedOrbits.

The API integration must:

* Follow the backend’s request and response formats.
* Handle authentication and authorization failures.
* Display safe, user-friendly error messages.
* Respect rate limits.
* Avoid blindly retrying sensitive state-changing requests.
* Use idempotency mechanisms for supported financial operations.
* Avoid exposing internal server details.
* Prevent private data from being included unnecessarily in URLs or logs.

7. Security Requirements

Authentication and session management

* Never store plaintext passwords in browser storage.
* Never include private credentials or server secrets in frontend JavaScript.
* Use the configured authentication and session strategy.
* Handle expired sessions and unauthorized API responses consistently.
* Clear sensitive in-memory state after logout where appropriate.
* Do not rely on hidden buttons or client-side role checks to protect operations.

API and DOM security

* Use HTTPS in production.
* Apply the backend’s CSRF protection strategy where applicable.
* Treat API responses, user input, filenames, and external content as untrusted.
* Prefer safe DOM APIs such as textContent when displaying plain text.
* Avoid inserting untrusted values through innerHTML.
* Validate redirect destinations.
* Do not expose stack traces, internal errors, or secrets to users.

Payments and subscriptions

* Treat the backend as the authority for payment and subscription status.
* Do not mark a transaction as successful solely because a checkout interface reports success.
* Require trusted server-side payment-provider confirmation.
* Never embed payment-provider secret keys in frontend files.
* Avoid storing card details or other unnecessary payment-sensitive data.

Documents and personal information

* Validate uploaded content on the server.
* Enforce authorization for document access and downloads.
* Do not expose private document URLs or personal information publicly.
* Avoid unnecessary logging of educational records, contact details, or other personal data.

Destructive and security-sensitive operations

Operations such as account deletion, password changes, security-setting changes, and subscription cancellation must be protected by backend authorization and appropriate confirmation or re-authentication.

8. Design and Accessibility Standards

All JavaScript-driven components must follow the MedOrbits design system.

Brand direction: Royal Burgundy and Champagne Gold, complemented by dark, premium colour palettes.

Requirements:

* Avoid pure-white page sections.
* Maintain readable foreground and background contrast.
* Use consistent button, modal, form, alert, and navigation behaviour.
* Provide visible keyboard focus indicators.
* Use accessible labels and semantic HTML.
* Announce important dynamic status updates to assistive technologies.
* Respect reduced-motion preferences.
* Support mobile, tablet, and desktop layouts.
* Provide understandable validation and error messages.
* Avoid communicating important information through colour or animation alone.

9. Loading, Error, and Empty States

Every API-driven interface should handle its relevant asynchronous states.

State	Expected behaviour
Loading	Display progress and prevent inappropriate duplicate actions.
Success	Confirm the operation using the actual server response.
Validation failure	Identify the fields that require correction.
Unauthorized	Guide the user through session recovery or sign-in where appropriate.
Forbidden	Explain that access is unavailable without revealing protected information.
Network failure	Display a safe message and offer retry where appropriate.
Empty results	Explain that no records are currently available.
Pending payment	Make clear that the transaction is not yet confirmed.
Upload failure	Explain the failure and allow a safe retry where possible.

Never present a payment, upload, account deletion, or other state-changing operation as successful before receiving the required server confirmation.

10. Performance and Maintainability

* Keep modules focused on clearly defined responsibilities.
* Reuse shared utilities rather than duplicating logic.
* Avoid unnecessary global variables.
* Prevent duplicate event listeners and repeated initialization.
* Avoid unnecessary network requests.
* Use pagination for large datasets when supported.
* Keep third-party dependencies minimal and maintained.
* Document exported functions and non-obvious behaviour.
* Remove obsolete code only after checking its consumers.
* Keep module names and import paths consistent.
* Follow the project’s established formatting, linting, and testing conventions.

11. Testing and Validation

Before releasing JavaScript changes, verify:

* [ ]	All referenced files exist.
* [ ]	Imports and exports resolve correctly.
* [ ]	No duplicate initialization occurs.
* [ ]	API requests use the configured API client.
* [ ]	Unauthenticated and unauthorized states are handled correctly.
* [ ]	Form validation and server errors are displayed accessibly.
* [ ]	Uploads handle invalid and oversized files.
* [ ]	Payments distinguish pending, failed, and confirmed states.
* [ ]	Sensitive operations require appropriate confirmation and server authorization.
* [ ]	Keyboard navigation and focus management work correctly.
* [ ]	Reduced-motion preferences are respected.
* [ ]	Responsive layouts remain usable on small screens.
* [ ]	No secrets or sensitive data are exposed in frontend code or logs.
* [ ]	Existing application functionality remains intact.

Run the checks defined in the repository’s actual package.json and test configuration. Do not assume that a particular lint, test, or build command exists without verifying it.

12. Adding a New Module

When adding a JavaScript file:

1. Define its purpose and public interface.
2. Check whether an existing module already provides the required functionality.
3. Reuse the shared API, error-handling, validation, and notification utilities.
4. Follow the repository’s existing module convention.
5. Update the relevant page imports or script references.
6. Document the module in this README.
7. Add tests where supported.
8. Verify security, accessibility, performance, and error handling.
9. Confirm that no secrets or sensitive data are exposed.
10. Update related documentation when dependencies or API contracts change.

13. Maintenance

Keep this README aligned with the actual files and their responsibilities.

When modules are renamed, moved, added, or removed, review:

* HTML script references.
* JavaScript imports and exports.
* Feature-module dependencies.
* API integration.
* Account-page workflows.
* Automated tests and build configuration.
* Related documentation.

Avoid documenting planned functionality as implemented until its code and required backend support are present.

⸻

Module objective: Provide a cohesive, secure, accessible, and maintainable JavaScript foundation for MedOrbits, supporting education discovery, account management, admissions, counselling, documents, payments, subscriptions, notifications, and career services.

Core principle: The frontend manages user interaction and presentation; the backend remains responsible for authentication, authorization, data integrity, and trusted business operations.