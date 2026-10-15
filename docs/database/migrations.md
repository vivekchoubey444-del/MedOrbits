# Database Migrations

## Requirements

- Store migrations in version control and apply them in a deterministic order.
- Give each migration a unique, ordered identifier.
- Review generated SQL before execution.
- Test migrations against an empty database and a representative staging copy.
- Make deployments compatible with overlapping application versions where possible.
- Record migration status and fail clearly when a migration fails.

## Safe Change Pattern

For changes that span releases, prefer an expand-and-contract approach:

1. Add compatible schema elements.
2. Deploy code that can work with old and new structures.
3. Backfill or migrate data in controlled batches.
4. Verify the new behavior.
5. Remove obsolete schema only in a later reviewed release.

## Production Safeguards

- Take and verify a backup before high-risk changes.
- Assess locks, runtime, table size, and available disk space.
- Do not assume every migration can be reversed safely.
- Obtain approval for destructive changes.
- Keep application rollback and database recovery plans separate.
- Never run migrations against production from an unreviewed local environment.
