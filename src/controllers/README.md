# MedOrbits controllers

Controllers translate HTTP requests into repository operations and standardized JSON responses.

## Important integration requirements

- Controllers are not automatically mounted by `server.js`; route modules in `src/routes/` must explicitly map HTTP methods to these exported functions.
- Add authentication and authorization middleware to every private route. CRUD methods are not safe to expose publicly.
- Add ownership checks for users, applications, documents, candidates, employers and subscriptions.
- Payment creation and webhook processing intentionally fail closed until provider-specific integration and signature verification are implemented.
- Verification, password reset, admin overview, counselling, recruitment, service catalogue, search, notifications, uploads and FAQ endpoints are explicit unconfigured stubs until their storage/provider design is added.
- Do not return password hashes, session token hashes, private document storage keys or sensitive payment metadata from public endpoints.
