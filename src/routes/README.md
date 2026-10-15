# MedOrbits API Routes

This directory contains the Express routing layer for the MedOrbits backend.

## Mounting

The supplied `server.js` mounts route files individually under `/api/v1`:

- `auth.routes.js` → `/api/v1/auth`
- `user.routes.js` → `/api/v1/users`
- `payment.routes.js` → `/api/v1/payments`
- and so on.

`index.js` also exports a combined router for projects that prefer one mount point.
Do not mount both the combined router and the individual routes in `server.js`, or
the same endpoints may be registered twice.

## Expected controller convention

Routes attempt to load controller modules from `src/controllers/`. Each controller
should export named handler functions, for example:

```js
module.exports = {
  list: async (req, res, next) => {},
  getById: async (req, res, next) => {},
  create: async (req, res, next) => {},
  update: async (req, res, next) => {},
  remove: async (req, res, next) => {}
};
```

The route layer uses a safe `notImplemented` response if a controller file or
handler is not yet present. This prevents false success responses, but it does
not replace implementation of business logic, database access, authentication,
authorization, validation, or audit logging.

## Important production requirements

Before public launch, implement and test:

1. Database-backed controllers and migrations/schema.
2. Authentication and role-based authorization for protected routes.
3. Input validation and output minimization.
4. Rate limits appropriate to login, password reset, uploads and public search.
5. CSRF protection if cookie-based sessions are used.
6. Secure file storage, file type/content validation and malware scanning.
7. Payment-provider webhook signature verification using the exact raw request body.
8. Automated tests, backups, monitoring and error reporting.

Never treat a route being mounted as proof that the feature is production-ready.
