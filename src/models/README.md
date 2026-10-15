# MedOrbits database models

These model definitions are the allowlists used by repositories. They are intentionally plain CommonJS modules, not an ORM.

- Database engine: MySQL 8+
- Charset: `utf8mb4`
- IDs: auto-incrementing integer primary keys
- Timestamps: `created_at` and `updated_at`
- JSON payload columns use names ending in `_json`; pass serialized JSON strings unless you adapt the repository.

Before production:
1. Review the fields against the actual business requirements.
2. Add foreign keys and indexes.
3. Use migrations; do not create production tables by blindly running the schema file.
4. Never expose `password_hash`, token hashes, private documents or payment provider metadata through public APIs.
