# MedOrbits Authorization Policies

These policy modules centralize resource-level authorization for the MedOrbits Express backend. They are designed to be called by controllers/services **after authentication** and, where needed, after loading the resource from a trusted repository.

## Files

- `application.policy.js` — applicant ownership, counsellor access, and admin review.
- `document.policy.js` — private-document access and restricted document mutations.
- `candidate.policy.js` — candidate profile and job-application privacy.
- `employer.policy.js` — employer account ownership, job management, and applicant access.
- `payment.policy.js` — payer ownership, administrative access, and server-only webhook processing.
- `subscription.policy.js` — subscription ownership, employer entitlements, and admin operations.
- `policy-utils.js` — shared, fail-closed policy primitives.

## Expected identity shape

Policies accept an authenticated `actor` object, normally `req.user`, with a stable `id` or `userId` and optional `role`/`roles`, `permissions`, `candidateId`, `employerId`, and `isVerified` fields. Adapt the mapping in your authentication middleware if your token/session uses different field names.

Roles recognized by default: `user`, `student`, `candidate`, `employer`, `counsellor`, `recruiter`, `support`, `admin`, `superadmin`. Roles are normalized to lowercase. Do not trust role, owner, status, amount, or entitlement values supplied by the client; load those values from your database.

## API

Each policy exports named functions returning a boolean, plus `assert...` helpers where useful. Authorization should be explicit at every protected route. Example:

```js
const { canViewApplication } = require('../policies/application.policy');

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const application = await applicationService.getById(req.params.id);
    if (!canViewApplication(req.user, application)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot access this application.' },
        requestId: req.id,
      });
    }
    return res.json({ success: true, data: application });
  } catch (error) {
    return next(error);
  }
});
```

For resources that do not exist, return `404` before or alongside authorization according to your anti-enumeration policy. For private documents and payment resources, prefer `404` for unauthorized resource identifiers where revealing existence would be harmful.

## Security requirements

1. **Fail closed:** unknown roles, missing actors, missing resource ownership fields, and unknown actions are denied.
2. **Authentication is separate:** these policies do not authenticate users or verify tokens.
3. **Database-backed authorization:** use trusted database records for owner IDs, employer IDs, payment status, subscription status, and document metadata.
4. **No client-controlled privilege escalation:** never accept `role`, `ownerId`, `employerId`, `isAdmin`, `amount`, `paid`, or `subscriptionStatus` as authoritative from request bodies.
5. **Payment safety:** `canProcessPaymentWebhook` only checks that the caller is on a server-side webhook path; it does **not** validate signatures. Verify the provider signature against the exact raw request body in the payment service/controller before processing.
6. **Document safety:** authorization does not replace MIME/content validation, malware scanning, safe storage keys, expiring download URLs, or private bucket permissions.
7. **Audit privileged actions:** log administrative access, document access, payment changes, subscription changes, and employer/candidate data exports.
8. **Test every action:** add unit tests for owner, non-owner, anonymous actor, each role, missing fields, and invalid state transitions.

These files provide authorization decisions, not a complete production backend by themselves. Wire them into controllers and services and verify the behavior with your actual database schema and authentication model.
