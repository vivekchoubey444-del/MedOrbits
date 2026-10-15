# MedOrbits Middleware

CommonJS Express middleware for the `server.js` bootstrap provided with this project.

## Files

- `authenticate.js` — verifies bearer JWTs using `jsonwebtoken`; fails closed.
- `authorize.js` — role, permission, and ownership authorization helpers.
- `validate.js` — validates body, params, query, or the full request using Zod-compatible schemas or custom validators.
- `rate-limit.js` — production-configurable `express-rate-limit` factories.
- `csrf.js` — signed double-submit CSRF cookie/token middleware for cookie-authenticated state-changing requests.
- `error-handler.js` — normalized JSON error responses, safe production messages, and request IDs.
- `not-found.js` — API-friendly 404 middleware.
- `request-id.js` — validates or creates request IDs.
- `request-logger.js` — structured request logs without secrets or query strings.
- `security-headers.js` — Helmet configuration with conservative defaults.
- `upload-limits.js` — Multer configuration and upload error normalization.
- `verify-webhook.js` — raw-body HMAC signature verification helper.
- `maintenance.js` — maintenance-mode middleware with health-route exemptions.

## Required packages

Install the packages used by the middleware you enable:

```bash
npm install jsonwebtoken express-rate-limit helmet cookie-parser multer
```

`cookie-parser` is required for the CSRF cookie middleware. Use a shared, persistent rate-limit store (for example Redis) when deploying multiple instances.

## Integration notes

1. Middleware exports are functions/factories; mount them explicitly in `server.js` or route files.
2. `authenticate` expects `process.env.JWT_SECRET` or an explicit secret and a bearer token. If your app uses opaque sessions, replace it with your session-store verifier rather than treating a session ID as a JWT.
3. CSRF middleware is for cookie-based authentication. Bearer-token-only APIs generally do not need CSRF protection, but still need authentication and authorization.
4. Webhook verification requires the provider's exact signature scheme, header name, timestamp rules, and raw request bytes. Configure each payment provider according to its official specification; do not use a generic HMAC unless it matches the provider's scheme.
5. Uploads are stored in memory by default and must be streamed to approved object storage or moved to a controlled location after validation. Avoid persistent public uploads and never trust the original filename or client-supplied MIME type.
6. Add database-backed health/readiness checks, durable rate limiting, audit events, email delivery, and storage integration before production launch.
7. Do not log tokens, cookies, passwords, document contents, payment details, or raw webhook bodies.

## Typical usage

```js
const authenticate = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');
const { validate } = require('./middleware/validate');

router.get('/me', authenticate(), (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post(
  '/admin-task',
  authenticate(),
  authorize({ roles: ['admin'] }),
  handler
);
```

This directory supplies middleware building blocks; it does not by itself make the application production-ready. Configure secrets, database/session revocation, provider-specific webhook validation, storage, monitoring, and deployment controls before processing real user data or payments.
