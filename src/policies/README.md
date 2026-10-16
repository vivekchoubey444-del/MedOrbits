# MedOrbits Authorization Policies
**Directory:** `src/policies/`
## 1. Purpose
The policies layer centralizes resource-level authorization decisions for the MedOrbits Express backend.
Policy modules determine whether an authenticated actor may perform a specific action on a resource. Controllers and services invoke these policies after authentication and, where necessary, after loading the resource through a trusted repository.
Policies complement authentication, input validation, business rules, database constraints, and audit logging. They do not replace these controls.
## 2. Policy Modules
| File | Responsibility |
|—|—|
| `admission.policy.js` | Admission-related permissions and protected admission operations |
| `application.policy.js` | Applicant ownership, counsellor access, and application review |
| `auth.policy.js` | Authorization-related authentication and account-operation rules |
| `candidate.policy.js` | Candidate profile privacy and job-application access |
| `college.policy.js` | College resource access and restricted college operations |
| `counselling.policy.js` | Counselling access, assignment scope, and protected counselling operations |
| `courses.policy.js` | Course catalog access and restricted course-management operations |
| `document.policy.js` | Private-document access, ownership, and restricted mutations |
| `employer.policy.js` | Employer account ownership, job management, and permitted applicant access |
| `internship.policy.js` | Internship access, ownership, and application permissions |
| `job.policy.js` | Job visibility, management, and application-related permissions |
| `payment.policy.js` | Payer ownership, administrative access, and payment-operation restrictions |
| `policy-utils.js` | Shared identity helpers and fail-closed authorization primitives |
| `recruitment.policy.js` | Recruitment workflow access and restricted candidate information |
| `subscription.policy.js` | Subscription ownership, employer entitlements, and administrative operations |
| `university.policy.js` | University resource access and restricted management operations |
| `user.policy.js` | User profile privacy, ownership, and privileged account operations |
The inventory reflects the files visible in the supplied screenshots. Confirm the actual exports and behavior of each module before integrating it into a route or service.
## 3. Core Authorization Principles
All policy implementations must follow these principles:
1. **Deny by default:** Access is denied unless explicitly permitted.
2. **Least privilege:** Grant only the permissions necessary for the requested action.
3. **Trusted identity:** Derive the actor from authenticated server-side context.
4. **Trusted ownership:** Resolve ownership from server-side resource records.
5. **Explicit actions:** Evaluate permission for the particular operation being requested.
6. **Minimal disclosure:** Avoid revealing sensitive resource existence or data unnecessarily.
7. **Consistent enforcement:** Apply the same authorization rules across API routes, services, downloads, and background operations.
8. **Auditable decisions:** Record appropriate security-sensitive operations without logging secrets.
A role name alone must not grant unrestricted access to every resource or action.
## 4. Authenticated Actor Contract
Policies receive an authenticated actor, normally derived from `req.user`.
Depending on the application schema, the actor may contain:
- `id` or `userId` — stable user identifier.
- `role` or `roles` — assigned application roles.
- `permissions` — explicit permissions, if supported.
- `candidateId` — associated candidate profile identifier.
- `employerId` — associated employer account identifier.
- `isVerified` — verification state, where required.
These fields are illustrative. Standardize identity mapping in authentication middleware and adapt policies to the actual token, session, and database schemas.
### Recognized role examples
The application may support roles such as:
- `user`
- `student`
- `candidate`
- `employer`
- `counsellor`
- `recruiter`
- `support`
- `admin`
- `superadmin`
Only roles explicitly recognized by the application should influence authorization decisions. Normalize role values consistently where appropriate.
Never trust client-supplied role, ownership, verification, payment-state, or entitlement fields.
## 5. Authorization Flow
The intended request flow is:
**Authentication → Input validation → Trusted resource lookup → Authorization policy → Service operation → Response**
For example:
1. Authenticate the request.
2. Validate the resource identifier and request parameters.
3. Load the resource through the appropriate repository or service.
4. Evaluate the policy using the authenticated actor and trusted resource data.
5. Deny access when permission is not established.
6. Execute the permitted operation.
7. Record required audit events and return only authorized response fields.
For mutations, authorization must cover the actual operation and relevant resource state. Where ownership or state may change concurrently, use appropriate transaction or database-level protections.
## 6. Policy API Contract
Each policy module should expose documented named functions for its authorization decisions.
Boolean policy functions should return `true` only when access is permitted and `false` when access is denied or cannot be established.
Illustrative function names:
```javascript
canViewApplication(actor, application);
canUpdateApplication(actor, application);
canReviewApplication(actor, application);
canViewDocument(actor, document);
canDownloadDocument(actor, document);
canViewPayment(actor, payment);
canManageSubscription(actor, subscription);
canViewCandidate(actor, candidate);
canManageJob(actor, job);

These are proposed examples, not a declaration that the functions already exist.

Where appropriate, a module may also expose assertion helpers that throw the application’s established authorization error. Do not mix incompatible return conventions without documenting them.

Example controller integration

‘use strict’;
const {
  canViewApplication,
} = require(‘../policies/application.policy’);
async function getApplication(req, res, next) {
  try {
    const application =
      await applicationService.getById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: ‘NOT_FOUND’,
          message: ‘Application not found.’,
        },
        requestId: req.id,
      });
    }
    if (!canViewApplication(req.user, application)) {
      return res.status(403).json({
        success: false,
        error: {
          code: ‘FORBIDDEN’,
          message: ‘You cannot access this application.’,
        },
        requestId: req.id,
      });
    }
    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    return next(error);
  }
}
module.exports = {
  getApplication,
};

This example assumes that applicationService, req.user, and req.id are available in the surrounding application and that canViewApplication has the shown signature. Adapt it to the actual controller architecture, response middleware, and exports.

7. Fail-Closed Authorization

Deny access whenever the policy cannot establish permission.

Examples include:

* The actor is missing or malformed.
* The resource is missing or malformed.
* Required identity or ownership fields are absent.
* The role or requested action is unknown.
* Resource ownership cannot be established.
* Required verification or entitlement is absent.
* The resource is in a state that prohibits the requested action.
* The policy cannot reliably determine whether access is permitted.

Avoid permissive fallbacks such as treating missing ownership information as public access.

Policy helpers must not silently authorize an operation when required data or checks fail.

8. Resource-Specific Policy Requirements

8.1 Admissions

admission.policy.js

* Restrict access to protected admission operations.
* Enforce permitted access according to actor role and resource scope.
* Prevent unauthorized changes to admission decisions or privileged workflow fields.
* Keep sensitive applicant information limited to authorized actors.

8.2 Applications

application.policy.js

* Verify applicant ownership using trusted application records.
* Restrict counsellor access to authorized assignments and scopes.
* Restrict review and administrative mutations to explicitly permitted roles.
* Prevent applicants from changing server-controlled review status or ownership fields.

8.3 Authentication and accounts

auth.policy.js and user.policy.js

* Enforce account-operation permissions.
* Protect profile and account information.
* Restrict changes to roles, permissions, and verification state.
* Prevent users from modifying another user’s private account data.
* Keep credential verification separate from authorization decisions.

Authentication establishes who the actor is. Authorization determines what that actor may do.

8.4 Candidates

candidate.policy.js

* Enforce candidate profile ownership.
* Restrict access to private candidate information.
* Permit access to job applications only within authorized scopes.
* Prevent unauthorized modification of candidate identity or verification fields.

8.5 Colleges and universities

college.policy.js and university.policy.js

* Define public catalog access separately from restricted management operations.
* Restrict administrative changes to authorized actors.
* Protect non-public institutional information.
* Validate resource ownership or management scope where applicable.

Public catalog visibility does not automatically grant permission to modify catalog records.

8.6 Counselling

counselling.policy.js

* Restrict counselling records to authorized participants and assigned staff.
* Enforce assignment and ownership rules.
* Protect private notes and communications.
* Restrict reassignment and privileged status changes.

8.7 Courses

courses.policy.js

* Define which course information is publicly readable.
* Restrict course creation, modification, and deletion to authorized actors.
* Prevent unauthorized changes to published course data.
* Keep public catalog access separate from administrative management permissions.

8.8 Documents

document.policy.js

* Verify permission to view, download, replace, or delete each document.
* Load ownership and classification metadata from trusted records.
* Keep private documents in private storage.
* Validate file content and use safe server-generated storage keys.
* Apply appropriate file-size, type, and malware-scanning controls.
* Issue short-lived download URLs only after authorization.
* Never expose storage credentials or unrestricted internal storage paths.

Document authorization must be enforced before the document is delivered, not only when it is uploaded.

8.9 Employers and recruitment

employer.policy.js, internship.policy.js, job.policy.js, and recruitment.policy.js

* Enforce employer account ownership.
* Restrict job and internship management to authorized owners or administrators.
* Limit applicant information to legitimate, authorized recruitment workflows.
* Prevent one employer from managing another employer’s resources.
* Protect candidate data exports and private recruitment notes.
* Restrict privileged recruitment decisions to explicitly authorized actors.

8.10 Payments

payment.policy.js

* Verify access against trusted payer and transaction records.
* Restrict administrative actions to explicitly authorized operations.
* Do not allow clients to determine payment amounts or successful payment status.
* Verify provider webhook signatures against the exact raw request body before processing events.
* Use idempotency and transaction-safe state transitions to prevent duplicate financial effects.

A policy function is not a substitute for payment provider signature verification. Webhook authenticity, replay protection, and payment-state integrity must be enforced in the payment-processing flow.

8.11 Subscriptions

subscription.policy.js

* Verify subscription ownership through trusted database records.
* Derive entitlements from validated server-side subscription state.
* Enforce expiry, cancellation, and applicable status rules.
* Prevent clients from granting themselves premium access using submitted status or entitlement flags.
* Restrict administrative overrides and audit them appropriately.

9. Client-Controlled Fields

Never treat client-supplied values as authoritative for protected properties such as:

* role, roles, permissions, or isAdmin
* ownerId, userId, candidateId, or employerId
* isVerified
* amount, paid, or payment status
* subscriptionStatus or entitlement flags
* Application review status or privileged workflow fields

Derive protected values from trusted server-side state. Update them only through authorized operations.

Use explicit field allowlists for create and update operations. Authorization checks alone do not prevent mass-assignment vulnerabilities.

10. HTTP Status and Resource Enumeration

Use response behavior consistent with the application’s resource-disclosure policy.

* 401 Unauthorized — Authentication is missing or invalid.
* 403 Forbidden — The authenticated actor is not permitted to perform the operation.
* 404 Not Found — The resource does not exist, or its existence is intentionally concealed.
* 400 Bad Request — The request is malformed or contains invalid parameters, where appropriate.

For private documents, payments, and other sensitive resources, returning 404 for unauthorized resource identifiers may reduce resource enumeration.

Apply the chosen policy consistently. Do not reveal protected resource existence through response bodies, overly detailed errors, or exposed logs.

11. Audit Logging

Record appropriate audit events for sensitive operations, including:

* Administrative access to protected records.
* Document views, downloads, replacements, and deletions.
* Payment and subscription state changes.
* Employer access to applicant records and data exports.
* Changes to roles, permissions, ownership, or verification state.
* Privileged admission, counselling, and recruitment decisions.

Where supported, record the actor, action, target resource, outcome, timestamp, and request or correlation ID.

Avoid logging credentials, payment secrets, document contents, or unnecessary personal information.

Audit logging must never turn a denied operation into an authorized one.

12. Testing Requirements

Add unit tests for each exported policy function and its important decision branches.

At minimum, cover:

* Authorized resource owner.
* Non-owner attempting access.
* Missing, anonymous, or malformed actor.
* Supported roles and relevant permissions.
* Missing identity and ownership fields.
* Unknown roles, actions, and resource types.
* Unverified actors where verification is required.
* Restricted document and payment operations.
* Invalid subscription and application states.
* Attempts to escalate privileges through client-controlled fields.
* Administrative exceptions and their limits.

Integration tests must verify that routes and services actually enforce the relevant policies. Unit tests alone do not prove that protected endpoints invoke authorization checks.

13. Production Readiness Checklist

* [ ]	Authentication middleware establishes a trusted actor.
* [ ]	Actor fields match the actual authentication and database schemas.
* [ ]	Every protected action has an explicit authorization check.
* [ ]	Resource ownership is loaded from trusted records.
* [ ]	Policy functions fail closed.
* [ ]	Create and update operations use field allowlists.
* [ ]	Public catalog access is separated from administrative mutations.
* [ ]	Payment webhooks verify provider signatures against the raw request body.
* [ ]	Document storage and download workflows enforce private access.
* [ ]	Sensitive operations generate appropriate audit events.
* [ ]	Unit and route-level integration tests cover authorization boundaries.
* [ ]	Error responses do not unnecessarily disclose resource information.
* [ ]	Concurrent updates and state transitions are protected where necessary.
* [ ]	All documented functions match the actual policy exports.

14. Implementation Boundaries

The policies layer centralizes authorization decisions. It does not independently:

* Authenticate credentials.
* Validate webhook signatures.
* Validate all incoming request data.
* Enforce database constraints.
* Secure file storage.
* Guarantee payment idempotency.
* Replace business rules or transaction handling.

These controls must also be implemented in the relevant middleware, validators, services, repositories, payment handlers, and storage integrations.

Maintenance rule: Update this document whenever policy files, exported functions, actor fields, supported roles, resource permissions, or authorization tests change.