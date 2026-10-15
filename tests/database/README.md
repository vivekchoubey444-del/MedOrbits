# Database Tests

Run against a dedicated disposable MySQL test database configured specifically for tests.

- Verify connection configuration and failure handling.
- Apply migrations to an empty database and confirm repeatability policy.
- Test repository filtering, ordering, pagination, and authorization assumptions.
- Verify transactions commit or roll back correctly.
- Clean up test records reliably.
- Never run migration or transaction tests against production.
