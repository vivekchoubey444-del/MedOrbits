Authorization

Project: MedOrbits
Purpose: Define server-side access-control requirements for users, roles, permissions, and protected resources.

1. Overview

Authentication establishes a user’s identity. Authorization determines which actions that identity is permitted to perform on a specific resource.

MedOrbits must enforce authorization on the server for every private route, API operation, and protected resource. Client-side interface restrictions may improve usability but must never replace server-side access checks.

This document defines the intended security requirements. The actual roles, permissions, middleware, and enforcement mechanisms must be verified against the implementation.

2. Default-Deny Model

Use a default-deny authorization model:

* Allow access only when the user’s identity, requested action, and access to the target resource have been established.
* Deny access when authentication, permissions, ownership, or resource context cannot be verified.
* Require explicit authorization for privileged operations.
* Apply authorization consistently across web pages, APIs, background operations, and file-access mechanisms.
* Do not grant access merely because a resource identifier is difficult to guess.

A valid login does not automatically authorize access to every resource.

3. Roles and Least Privilege

Apply the principle of least privilege to each role supported by the application.

Potential role categories include:

Role category	Intended access boundary
Student or candidate	Own profile, applications, documents, and other explicitly permitted personal resources.
Employer	Employer-owned records, authorized recruitment functions, and permitted candidate information.
Staff	Assigned operational functions and resources within the staff member’s approved responsibilities.
Administrator	Explicitly authorized administrative operations, subject to additional safeguards and auditing.

These categories describe intended access boundaries, not confirmation that every role exists in the current implementation.

Requirements:

* Grant only the permissions necessary for each role.
* Separate administrative capabilities from ordinary user permissions.
* Avoid broad permissions when narrower actions can be defined.
* Verify role assignments and permission changes on the server.
* Prevent users from changing their own privileges through ordinary profile or account operations.
* Reassess permissions when roles, responsibilities, or account status change.

Do not rely exclusively on role names when a decision also depends on resource ownership, record status, or the requested operation.

4. Resource-Level Authorization

Authorization must consider both the requested action and the target resource.

For each protected operation, establish:

1. Who is making the request.
2. What action is being requested.
3. Which resource is being accessed or changed.
4. Whether the user is permitted to perform that action on that resource.
5. Whether the resource’s current state permits the operation.

4.1 Applications

Verify that a user can access or modify only applications they own or are explicitly authorized to manage.

Employer, staff, and administrative access must follow defined business rules and permissions. Do not assume that a user can access an application simply because its identifier is known.

4.2 Documents

Verify access before returning, downloading, modifying, or deleting a private document.

Check document ownership or an explicit authorization grant. Apply the same restrictions to direct file URLs, download endpoints, preview endpoints, and storage-provider access.

4.3 Payments and Subscriptions

Restrict payment and subscription records to their authorized users and operational roles.

Verify access to the underlying transaction or subscription rather than trusting a client-supplied user identifier or transaction reference. Sensitive payment-state changes must follow the application’s trusted server-side workflow.

4.4 Profiles and Account Data

Prevent users from reading or modifying another user’s private profile information without explicit authorization.

Validate sensitive profile changes and prevent unauthorized changes to account ownership, roles, permissions, or authentication settings.

4.5 Administrative Operations

Require explicit server-side authorization for administrative functions, including user management, permission changes, document administration, payment administration, and other privileged operations that exist in the application.

Apply stronger controls and audit logging to sensitive administrative actions.

5. Insecure Direct Object References

Prevent insecure direct object reference (IDOR) vulnerabilities by checking authorization for every client-supplied resource identifier.

Examples include identifiers for:

* Applications.
* Documents.
* User profiles.
* Payments and subscriptions.
* Job or employer records.
* Administrative resources.

Never assume that a resource is authorized merely because the client submits a valid numeric ID, UUID, reference number, or URL.

Requirements:

* Scope resource lookups to the authorized user’s access where practical.
* Verify ownership or an explicit permission grant before returning data or applying changes.
* Apply checks to reads, updates, downloads, and deletions.
* Repeat authorization checks for every relevant request, including requests to nested resources.
* Avoid relying on previously rendered pages or client-side state as proof of permission.

Unpredictable identifiers can reduce opportunistic guessing but do not replace authorization.

6. Server-Side Enforcement

Enforce authorization in the backend using the application’s established routing, middleware, controller, service, or data-access mechanisms.

The precise implementation may vary, but the following requirements apply:

* Protected routes must reject unauthenticated requests when authentication is required.
* Authenticated requests must still undergo authorization checks.
* Resource access must be checked against trusted server-side identity and permission information.
* Client-supplied role names, ownership fields, and permission flags must not be trusted without server-side verification.
* Authorization must apply to API endpoints even when the associated interface hides or disables controls.
* File storage and background operations must respect the same security boundaries where applicable.

Avoid scattering inconsistent permission checks across unrelated modules. Use shared, testable authorization mechanisms where supported by the architecture.

7. Denial and Error Handling

Deny requests when the application cannot establish the required permission.

Use consistent error responses that do not disclose sensitive resource information. Depending on the endpoint and security design, return an appropriate unauthorized or forbidden response.

Where revealing whether a resource exists could expose sensitive information, use a consistent response strategy that avoids unnecessary disclosure.

Record relevant authorization failures when appropriate, but do not log secrets or excessive personal data.

8. Administrative Security and Auditing

Administrative operations require explicit authorization and appropriate accountability.

Where supported by the implementation, record:

* The authenticated actor.
* The action attempted or completed.
* The affected resource.
* The event timestamp.
* The outcome.
* A relevant request or correlation identifier.

Audit records must not contain passwords, session tokens, recovery secrets, or unnecessary sensitive data.

Protect audit records against unauthorized access and modification. Define retention requirements according to the organization’s policies and applicable obligations.

9. Authorization Testing

Include positive and negative tests for all important protected workflows.

Required Negative Tests

* [ ]	A user cannot access another user’s private resource by changing an identifier.
* [ ]	A user cannot modify or delete another user’s application or document.
* [ ]	A user cannot retrieve another user’s payment or subscription records.
* [ ]	A user cannot escalate privileges by manipulating request fields.
* [ ]	A user cannot access staff-only or administrator-only operations without permission.
* [ ]	Missing authentication is rejected where required.
* [ ]	Missing or ambiguous ownership information results in denial.
* [ ]	Unauthorized nested-resource access is rejected.
* [ ]	Direct file access does not bypass document authorization.
* [ ]	Permission revocation takes effect according to the implemented authorization model.
* [ ]	Unauthorized administrative actions are rejected and appropriately recorded.

Required Positive Tests

* [ ]	Authorized users can access their own permitted resources.
* [ ]	Authorized staff can perform only their assigned functions.
* [ ]	Authorized administrators can perform explicitly permitted operations.
* [ ]	Resource-state restrictions are enforced.
* [ ]	Legitimate workflows continue to function after permission checks are applied.

Run authorization tests in an isolated environment using synthetic accounts and test data.

10. Implementation Verification

Before declaring authorization controls operational:

1. Identify the implemented roles and permission model.
2. Inspect authentication and authorization middleware.
3. Review every private route and sensitive API operation.
4. Verify ownership checks for applications, documents, payments, and profiles.
5. Inspect direct file-serving and storage-access paths.
6. Review administrative routes and privilege-changing operations.
7. Confirm that client-supplied identifiers and role fields cannot bypass checks.
8. Run cross-user and role-escalation tests.
9. Verify audit logging for sensitive operations.
10. Record any missing controls as remediation tasks.

A role displayed in the user interface or a permission documented in this file is not evidence that backend enforcement exists.

11. Related Documentation

* docs/security/authentication.md — Identity verification and session security.
* docs/operations/incident-response.md — Security incident handling.
* docs/operations/troubleshooting.md — Diagnostic procedures.
* docs/architecture/overview.md — Application components and security boundaries.
* docs/architecture/data-flow.md — Request and data-processing flows.
* Database schema documentation — Ownership relationships and permission-related data, where implemented.

Verify all paths against the current repository.

Accuracy rule: Authorization requirements describe the expected security model. The backend implementation and negative authorization tests determine whether access controls are actually enforced.