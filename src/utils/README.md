
# MedOrbits — Utilities

**Directory:** `src/utils/`

## 1. Purpose

The `src/utils/` directory contains reusable, framework-aware and framework-independent helper modules used throughout the MedOrbits application.

Utilities provide common technical functionality so that controllers, services, middleware, routes, and other modules can follow consistent implementation patterns.

Utilities should be focused, predictable, independently testable, and free from unnecessary business logic.

Core responsibilities include:

- Application error construction.
- Asynchronous Express handler wrapping.
- Standardized HTTP response helpers.
- Pagination calculations and metadata.
- Cryptographic token generation and password hashing.
- Input validation helpers.
- Input normalization and context-specific output escaping.

This document defines the intended architecture. The files listed below must be verified against the actual repository before they are considered implemented.

## 2. Architecture

```text
HTTP Request
    |
    v
Routes and Middleware
    |
    v
Validators
    |
    v
Controllers
    |
    v
Services
    |
    v
Repositories
    |
    v
Database
```

Shared utilities support these layers without replacing their responsibilities.

| Layer | Responsibility |
|—|—|
| Utilities | Reusable technical helpers and shared primitives. |
| Validators | Validate request structure, types, and field constraints. |
| Middleware | Authentication, authorization, rate limiting, and request processing. |
| Controllers | Coordinate HTTP requests and responses. |
| Services | Business rules and application workflows. |
| Repositories | Data access and persistence. |

Utilities must not become a substitute for services, repositories, or authorization middleware.

## 3. Directory Structure

Recommended structure:

```text
src/
└── utils/
    ├── README.md
    ├── app-error.js
    ├── async-handler.js
    ├── http.js
    ├── api-response.js
    ├── crypto.js
    ├── pagination.js
    ├── sanitize.js
    └── validation.js
```

This is a reference inventory based on the utility modules discussed during development. Confirm filenames and exports against the current source code before importing them.

Do not create duplicate modules merely because they appear in this document.

## 4. Utility Responsibilities

### 4.1 `app-error.js`

**Purpose:** Construct standardized application errors.

The discussed implementation exports an `AppError` class.

Expected capabilities include:

- HTTP status codes.
- Machine-readable error codes.
- Operational error classification.
- Optional error details.
- Common factory methods for standard HTTP errors.

Example:

```js
const AppError = require(‘./app-error’);

throw AppError.notFound(‘Resource not found.’);
```

For an unimplemented operation:

```js
throw AppError.notImplemented(
  ‘This operation is not implemented.’,
  {
    code: ‘NOT_IMPLEMENTED’,
  }
);
```

Errors are not HTTP responses. Centralized Express error middleware must convert them into safe client responses.

Never expose stack traces, database errors, secrets, tokens, or internal configuration details to clients.

### 4.2 `async-handler.js`

**Purpose:** Forward asynchronous and synchronous route-handler errors to Express error middleware.

Expected import:

```js
const asyncHandler = require(‘../utils/async-handler’);
```

Example:

```js
router.get(
  ‘/example’,
  asyncHandler(async (req, res) => {
    const result = await someOperation();

    return res.json({
      success: true,
      data: result,
    });
  })
);
```

The wrapper must forward rejected promises and synchronous exceptions through `next(error)`.

It must not silently swallow errors or create successful responses after failures.

### 4.3 `http.js`

**Purpose:** Provide shared HTTP-related helpers.

The discussed version exports:

```js
asyncHandler
sendSuccess
httpError
getPagination
```

Example:

```js
const {
  sendSuccess,
  httpError,
} = require(‘../utils/http’);

if (!resource) {
  throw httpError(
    404,
    ‘NOT_FOUND’,
    ‘Resource not found.’
  );
}

return sendSuccess(res, resource);
```

`httpError()` should remain compatible with the centralized error middleware and the application’s error class.

**Compatibility requirement:** Keep the `http.js` and `app-error.js` contracts synchronized. If `httpError()` returns an `AppError`, middleware must read `statusCode`; if another error format is used, support it explicitly rather than relying on accidental property compatibility.

### 4.4 `api-response.js`

**Purpose:** Standardize JSON response structures.

The discussed response utility exports:

```js
success
created
noContent
paginated
error
```

Successful response example:

```json
{
  “success”: true,
  “message”: “Records retrieved successfully.”,
  “data”: []
}
```

Error response example:

```json
{
  “success”: false,
  “error”: {
    “code”: “NOT_FOUND”,
    “message”: “Resource not found.”
  }
}
```

A request identifier may be included when available.

Pagination responses should include metadata under the agreed `meta.pagination` contract.

**Important:** `api-response.js` and `http.js` may have different response signatures and payload shapes. Do not interchange their functions without adapting the caller.

### 4.5 `crypto.js`

**Purpose:** Provide cryptographic primitives using Node.js built-in modules.

The discussed implementation exports:

```js
randomToken
sha256
hmacSha256
safeEqual
hashPassword
verifyPassword
```

Example:

```js
const {
  randomToken,
  hashPassword,
  verifyPassword,
} = require(‘../utils/crypto’);

const token = randomToken();
const passwordHash = await hashPassword(password);

const valid = await verifyPassword(
  password,
  passwordHash
);
```

Security requirements:

- Use cryptographically secure randomness.
- Never store plaintext passwords.
- Never log passwords or sensitive tokens.
- Use password hashing rather than a fast general-purpose hash for password storage.
- Keep HMAC secrets outside source control.
- Use constant-time comparisons for equal-length secret-derived values.
- Apply rate limiting to authentication and password verification.
- Version password-hash formats if parameters may change.

The current discussed password-hashing implementation uses scrypt. Verification must only accept explicitly supported parameters and must not blindly allocate resources based on untrusted hash contents.

### 4.6 `pagination.js`

**Purpose:** Calculate pagination values and metadata.

The discussed implementation exports:

```js
DEFAULT_PAGE
DEFAULT_LIMIT
MAX_LIMIT
getPagination
getPaginationMeta
```

Example:

```js
const {
  getPagination,
  getPaginationMeta,
} = require(‘../utils/pagination’);

const pagination = getPagination(req.query);

const rows = await repository.findMany({
  limit: pagination.limit,
  offset: pagination.offset,
});

const totalItems = await repository.count();

const metadata = getPaginationMeta(
  totalItems,
  pagination
);
```

Expected pagination values:

- `page`
- `limit`
- `offset`
- `totalItems`
- `totalPages`
- `hasPreviousPage`
- `hasNextPage`
- `previousPage`
- `nextPage`

Apply the maximum page size consistently across endpoints.

Validate query parameters strictly when malformed input must return HTTP 400. Do not let fallback defaults conceal invalid input where strict rejection is required.

### 4.7 `sanitize.js`

**Purpose:** Normalize selected input and perform context-specific escaping.

The discussed implementation exports:

```js
DANGEROUS_KEYS
sanitizeString
sanitizeObject
sanitizeSearchTerm
escapeHtml
```

Example:

```js
const {
  sanitizeSearchTerm,
} = require(‘../utils/sanitize’);

const term = sanitizeSearchTerm(
  req.query.search
);
```

Security requirements:

- Reject circular objects and unsupported object types where appropriate.
- Apply maximum depth, string length, array length, and object-key limits.
- Avoid unsafe object-key handling.
- Do not silently truncate meaningful values unless the field’s contract explicitly permits it.

`escapeHtml()` is intended for HTML text contexts. It is not a universal sanitizer for SQL, JavaScript, CSS, URLs, or rich HTML.

Use parameterized database queries, proper URL validation, and framework output encoding as appropriate.

### 4.8 `validation.js`

**Purpose:** Provide basic reusable input-validation helpers.

The discussed implementation exports:

```js
objectBody
requiredString
optionalString
email
positiveId
```

Example:

```js
const {
  objectBody,
  requiredString,
  email,
} = require(‘../utils/validation’);

const body = objectBody(req.body);

const name = requiredString(
  body.name,
  ‘name’,
  120
);

const normalizedEmail = email(body.email);
```

These helpers do not replace domain-specific validators.

Use `src/validators/` for endpoint schemas, field allowlists, nested structures, enums, and domain-specific constraints.

Validation should reject unsupported values rather than silently changing them to make them pass.

## 5. Error-Handling Contract

All application layers should follow a consistent error-handling strategy.

1. Validators reject invalid request input.
2. Controllers and services throw application errors for expected failures.
3. `async-handler.js` forwards asynchronous and synchronous exceptions.
4. Centralized Express error middleware determines the HTTP response.
5. Response utilities format the response consistently.

Recommended mapping:

| Condition | HTTP status |
|—|—:|
| Invalid request | 400 |
| Missing authentication | 401 |
| Insufficient permissions | 403 |
| Resource not found | 404 |
| Duplicate or conflicting operation | 409 |
| Invalid entity according to the chosen validation contract | 400 or 422 |
| Rate limit exceeded | 429 |
| Unimplemented operation | 501 |
| Temporary service outage | 503 |
| Unexpected internal failure | 500 |

Use one documented validation-error convention throughout the API.

Do not return HTTP 200 for failed operations or expose internal errors to clients.

## 6. Import and Export Conventions

MedOrbits uses CommonJS.

Use direct imports for default exports:

```js
const AppError = require(‘../utils/app-error’);
const asyncHandler = require(‘../utils/async-handler’);
```

Use destructured imports for named exports:

```js
const {
  sendSuccess,
  httpError,
} = require(‘../utils/http’);
```

Ensure that the import style matches the module’s actual `module.exports` contract.

Do not destructure a class exported directly as `module.exports = AppError`.

When changing utility exports:

1. Search for all existing imports.
2. Check route, controller, service, middleware, and test dependencies.
3. Preserve existing public exports where possible.
4. Update dependent code in a coordinated change.
5. Run the relevant automated tests.

## 7. Security Requirements

Every utility must follow these principles:

- Use Node.js built-in cryptographic functions for security-sensitive randomness.
- Never hard-code secrets or credentials.
- Avoid logging sensitive user information.
- Validate configuration and resource limits.
- Do not trust client-supplied role, price, payment status, or ownership information.
- Keep authorization decisions outside generic sanitization and validation helpers.
- Avoid unsafe object mutation and prototype-related hazards.
- Use parameterized SQL queries.
- Return safe, consistent error messages.
- Avoid unnecessary global mutable state.
- Document security-sensitive assumptions and limitations.

Utilities should not automatically grant permissions, mark payments as successful, approve applications, or bypass service-level policies.

## 8. Performance and Reliability

Utilities should be small, deterministic, and easy to test.

- Avoid unnecessary dependencies.
- Avoid expensive work for malformed input.
- Bound recursion, array lengths, string lengths, and request sizes.
- Avoid unbounded cryptographic operations driven by user-controlled parameters.
- Avoid swallowing errors and returning misleading fallback values.
- Keep asynchronous behavior explicit.
- Preserve existing contracts unless a migration is planned.

Password verification and cryptographic operations can consume significant CPU and memory. Apply appropriate concurrency controls and rate limits at the application layer.

## 9. Testing Requirements

Each utility should have unit tests covering its documented behavior.

### Error utilities

- Correct status codes and error codes.
- Default values.
- Optional details.
- Malformed arguments.
- Centralized middleware compatibility.

### Async handler

- Successful synchronous handlers.
- Successful asynchronous handlers.
- Synchronous exceptions.
- Rejected promises.
- Invalid handler arguments.

### HTTP responses

- Correct status codes.
- Expected response shape.
- Optional metadata.
- Request identifier handling.
- Invalid response arguments.

### Cryptographic utilities

- Random token length and uniqueness checks.
- Stable SHA-256 output.
- HMAC behavior.
- Equal and unequal comparison results.
- Password hash and verification round trips.
- Wrong-password rejection.
- Malformed hash rejection.

### Pagination

- Default values.
- Minimum and maximum limits.
- Invalid input handling.
- Safe offsets.
- Empty result sets.
- Correct next and previous page metadata.

### Sanitization and validation

- Plain strings and objects.
- Unknown and dangerous keys.
- Excessive nesting.
- Circular references.
- Invalid types.
- Maximum lengths.
- Malformed email addresses.
- Invalid identifiers.

Do not claim a utility is tested until the relevant tests have actually run.

## 10. Definition of Done

A utility is ready for production integration when:

- Its responsibility is clearly defined.
- Its exports and import paths are stable.
- Input and output contracts are documented.
- Invalid input is handled predictably.
- Security-sensitive behavior has been reviewed.
- Unit tests cover expected and failure cases.
- Existing consumers remain compatible.
- Errors integrate with centralized middleware.
- No unsupported business capability is implied.
- Documentation matches the implementation.

## 11. Maintenance Policy

This README documents the intended utility architecture, not a verified inventory of the current repository.

When adding or modifying a utility:

1. Inspect the actual implementation and its consumers.
2. Preserve established contracts unless a migration is intentional.
3. Update affected imports, tests, and documentation.
4. Avoid duplicate helpers with conflicting behavior.
5. Verify response and error conventions across modules.
6. Review security and resource limits.
7. Test compatibility before enabling dependent endpoints.

**Core rule:** Utilities provide shared technical building blocks. Validators validate input, middleware enforces cross-cutting controls, services implement business rules, repositories handle persistence, and centralized error middleware determines safe HTTP error responses.
