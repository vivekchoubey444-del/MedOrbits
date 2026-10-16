
# MedOrbits Policy Tests

## Overview

The `tests/unit/policies/` directory contains unit tests for MedOrbits authorization policies, access-control rules, and other policy-level decisions.

These tests help verify that application operations enforce the intended permissions, protect restricted resources, and handle unauthorized or invalid access consistently.

Policy tests should remain focused on policy behavior rather than HTTP routing, database implementation, or unrelated business-service logic.

## Directory Structure

```text
tests/
└── unit/
    └── policies/
        ├── admission.policy.test.js
        ├── application.policy.test.js
        ├── auth.policy.test.js
        ├── candidate.policy.test.js
        ├── college.policy.test.js
        ├── counselling.policy.test.js
        ├── course.policy.test.js
        ├── document.policy.test.js
        ├── employer.policy.test.js
        ├── internship.policy.test.js
        ├── job.policy.test.js
        ├── payment.policy.test.js
        ├── policy-utils.test.js
        ├── subscription.policy.test.js
        ├── university.policy.test.js
        ├── user.policy.test.js
        └── README.md
```

The listed files represent the current test-directory organization. Their presence alone does not establish that every test is implemented or passing.

## Policy Test Inventory

| Test file | Primary responsibility |
|—|—|
| `admission.policy.test.js` | Admission-related authorization and access decisions |
| `application.policy.test.js` | Application ownership, access permissions, and protected operations |
| `auth.policy.test.js` | Authentication-related policy decisions and identity requirements |
| `candidate.policy.test.js` | Candidate access, ownership, and permitted actions |
| `college.policy.test.js` | College-related access and authorization rules |
| `counselling.policy.test.js` | Counselling records, access permissions, and role restrictions |
| `course.policy.test.js` | Course access and policy enforcement |
| `document.policy.test.js` | Document ownership, access restrictions, and protected document operations |
| `employer.policy.test.js` | Employer permissions and access to employer-related resources |
| `internship.policy.test.js` | Internship access and authorization decisions |
| `job.policy.test.js` | Job-related permissions and access control |
| `payment.policy.test.js` | Payment access, ownership, and restricted operations |
| `policy-utils.test.js` | Shared policy utility behavior |
| `subscription.policy.test.js` | Subscription ownership, administrative access, and protected subscription actions |
| `university.policy.test.js` | University-related access and authorization rules |
| `user.policy.test.js` | User access, ownership, and administrative permissions |

Actual test coverage must be confirmed by inspecting each test file and its corresponding policy implementation.

## Testing Objectives

Policy tests should cover the following areas wherever applicable.

### 1. Authentication and Identity

- Reject protected operations when the required identity is missing.
- Handle malformed or incomplete actor information.
- Distinguish authenticated users from unauthenticated requests when the policy supports that distinction.
- Avoid granting permissions solely because an untrusted request supplies an identity or role.

### 2. Authorization and Roles

- Allow explicitly authorized operations.
- Reject operations that exceed the actor’s permissions.
- Verify administrative privileges using the application’s established role model.
- Ensure ordinary users cannot obtain administrative access by modifying request data.

### 3. Resource Ownership

- Allow users to access resources they are authorized to own or manage.
- Deny access to resources belonging to other users when ownership is required.
- Test ownership comparisons using the identifier formats supported by the implementation.
- Verify that missing resources and inaccessible resources are handled according to the established security policy.

### 4. Resource-Specific Rules

- Test permissions for the relevant domain entity.
- Verify restrictions on protected operations such as modification, deletion, cancellation, or document access.
- Check that domain-specific restrictions are enforced independently of unrelated policies.
- Avoid assuming that every resource uses the same permissions or ownership rules.

### 5. Failure Handling

- Test invalid, missing, or incomplete policy inputs.
- Verify expected error types or authorization results.
- Ensure policy failures do not accidentally grant access.
- Confirm that unexpected errors are handled consistently with the policy contract.

## Test Design Principles

### Isolate Policy Behavior

Use small, deterministic inputs that represent the actor, resource, and requested operation.

Mock external dependencies when necessary. Policy unit tests should not require a live database, payment gateway, email provider, or external API unless a test explicitly belongs to an integration suite.

### Follow the Existing Contract

Use the actual policy exports, function signatures, return values, error codes, and role definitions from the implementation.

Do not invent permissions or assume that every policy returns a boolean. A policy may return a decision, throw an error, or use another established project convention.

### Keep Tests Independent

Each test should establish its own relevant inputs and expected outcome. Avoid relying on execution order, shared mutable state, network availability, or data left behind by another test.

### Test Both Allowed and Denied Paths

Where applicable, include:

- Authorized access.
- Unauthorized access.
- Missing identity.
- Missing resource.
- Incorrect ownership.
- Administrative access.
- Invalid input.
- Boundary conditions and unexpected failures.

Only include scenarios that apply to the actual policy contract.

## Running Tests

Run all policy unit tests from the repository root:

```bash
node —test tests/unit/policies/*.test.js
```

Run an individual policy test:

```bash
node —test tests/unit/policies/user.policy.test.js
```

Run the shared policy utility tests:

```bash
node —test tests/unit/policies/policy-utils.test.js
```

Run the complete unit-test suite, assuming the project uses Node.js’s built-in test runner:

```bash
node —test tests/unit/**/*.test.js
```

**Note:** Shell glob expansion differs between environments. If the recursive command does not discover all tests, use the project’s configured test script or a test-discovery command compatible with its supported Node.js version.

## Relationship to Other Test Layers

| Test layer | Responsibility |
|—|—|
| Policy unit tests | Verify authorization decisions and policy rules |
| Service unit tests | Verify business operations and dependency interactions |
| Controller tests | Verify request handling and response behavior |
| Route or middleware tests | Verify request routing and enforcement integration |
| Integration tests | Verify interactions across application components |
| End-to-end tests | Verify complete user workflows |

Policy tests complement service and controller tests; they do not replace them.

## Security Requirements

- Follow the principle of least privilege.
- Deny access when authorization cannot be established, where required by the policy contract.
- Do not trust client-supplied role or ownership claims without appropriate verification.
- Do not expose sensitive personal information, document contents, payment details, credentials, or internal implementation details in errors.
- Keep test fixtures synthetic and avoid real user records or production secrets.
- Do not weaken production authorization rules merely to make tests pass.

## Completion Checklist

Before considering a policy test file complete:

- [ ] The corresponding policy implementation has been inspected.
- [ ] Tests use the real exported API and established project conventions.
- [ ] Applicable authorized and unauthorized paths are covered.
- [ ] Ownership and role checks are tested where relevant.
- [ ] Invalid inputs and applicable failure cases are covered.
- [ ] Tests are deterministic and isolated.
- [ ] No production credentials or sensitive personal data are included.
- [ ] The individual test file passes.
- [ ] The complete policy test suite passes.

## Maintenance

Update this README whenever policy test files are added, renamed, or removed, or when the policy architecture changes.

Keep the inventory synchronized with the repository. Document implemented behavior rather than treating a filename or planned test scenario as proof of coverage.

—

**Directory:** `tests/unit/policies/`

**Purpose:** Verify MedOrbits policy and authorization behavior through isolated, repeatable unit tests.
