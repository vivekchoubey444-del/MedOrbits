# Authorization

## Default-Deny Model

Authentication establishes identity; authorization determines what that identity may do. Every private route and resource must enforce server-side permissions.

## Requirements

- Apply least privilege to student, employer, staff, and administrator roles.
- Verify resource ownership for applications, documents, payments, and profile data.
- Do not rely on hidden buttons or client-side role checks.
- Deny access when permissions or ownership cannot be established.
- Validate both the requested action and the target resource.
- Protect administrative operations with stronger controls and audit logging.
- Avoid insecure direct object references by checking access for every identifier supplied by a client.

## Testing

Include negative tests for cross-user access, role escalation, missing permissions, manipulated identifiers, and unauthorized administrative actions.
