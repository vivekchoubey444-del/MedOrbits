  MedOrbits Database Models

Directory: src/models/

1. Purpose

The models directory defines the database entity metadata and field allowlists used by MedOrbits repositories.

These model definitions use plain CommonJS modules rather than an ORM. They provide a consistent reference for permitted table names, column names, primary keys, and database field conventions.

Models describe the intended database structure; they do not independently create tables, enforce application authorization, or guarantee that the production schema matches the definitions.

2. Database Standards

Setting	Convention
Database engine	MySQL 8+
Character set	utf8mb4
Primary keys	Auto-incrementing integer IDs
Creation timestamp	created_at
Update timestamp	updated_at
JSON payload columns	Names ending in _json
Module format	CommonJS

Repository implementations must follow the actual database schema. If an existing table uses a different primary key, timestamp convention, or column type, document and handle that difference explicitly rather than assuming every entity follows the defaults.

3. Model Responsibilities

Model definitions should specify the fields and identifiers permitted for repository operations.

Depending on the project’s existing model contract, definitions may include:

* Trusted database table names.
* Primary key columns.
* Permitted database columns.
* Insertable and updateable field allowlists.
* Field metadata required by repository operations.
* JSON column conventions.
* Timestamp and database type information, where supported.

Keep table and column identifiers under server-side control. Never construct SQL identifiers directly from request parameters.

4. Repository Integration

The intended data-access flow is:

Controller → Service → Repository → Model allowlist → MySQL

Repositories use model definitions to determine which database identifiers are valid for an operation. Services apply business rules, while controllers and services enforce the relevant authorization requirements.

The generic CRUD repository must not permit callers to bypass model allowlists by supplying arbitrary table names, column names, sort expressions, or SQL fragments.

Example CommonJS convention:

const userModel = require(‘../models/user.model’);
// Use only if these exports exist in the actual model contract.
const tableName = userModel.tableName;
const allowedColumns = userModel.allowedColumns;

This is an illustrative integration pattern, not a guarantee that the current model files export these exact properties. Preserve the established export shape when implementing or modifying individual models.

5. JSON Column Handling

JSON payload columns use names ending in _json.

Unless the database driver and repository explicitly support another approach, pass serialized JSON strings when writing JSON payloads.

Example:

const preferences = {
  language: ‘en’,
  notifications: true,
};
const preferencesJson = JSON.stringify(preferences);

When reading JSON data, handle parsing errors and unexpected database values safely. Validate the structure of incoming JSON before persistence, and do not assume that syntactically valid JSON is valid application data.

Where supported by the actual schema and driver, native MySQL JSON columns may be preferable to unvalidated text storage.

6. Sensitive Fields and Data Exposure

Model allowlists are not public API response schemas. A field being available to a repository does not mean it is safe to return to a client.

Never expose the following through public APIs or ordinary serialized model responses:

* password_hash
* Access-token hashes, refresh-token hashes, or other authentication secrets.
* Private document contents, private storage keys, or internal file paths.
* Payment provider secrets or sensitive provider metadata.
* Session secrets and other confidential authentication data.

Use explicit response serializers or DTOs that return only the fields required by the caller. Apply field-level authorization where sensitive information is conditionally accessible.

Do not rely on removing sensitive fields only in the frontend.

7. Schema Integrity

Model definitions must remain consistent with the actual MySQL schema.

Review and document:

* Column names and data types.
* Nullability and default values.
* Primary and foreign keys.
* Unique constraints.
* Indexes for frequently queried fields.
* Timestamp behavior.
* JSON column types and serialization requirements.
* Referential integrity and deletion behavior.

Add foreign keys and indexes based on verified relationships and query patterns. For high-volume tables, review query plans and index selectivity rather than adding indexes indiscriminately.

8. Migrations and Deployment

Use version-controlled database migrations to create and modify production schemas.

Do not blindly execute a development schema file against a production database.

A production migration process should include:

1. Review the proposed schema change.
2. Test the migration against a representative database.
3. Back up critical data and verify the recovery procedure.
4. Apply changes through a controlled deployment process.
5. Verify schema compatibility with the deployed application.
6. Define rollback or forward-recovery procedures.
7. Monitor database errors after deployment.

Avoid destructive schema changes until dependent code and data migration requirements have been reviewed.

9. Testing Requirements

Model and repository tests should cover:

* Valid and invalid table and column identifiers.
* Insert and update field allowlists.
* Attempts to inject SQL through identifiers or values.
* JSON serialization and parsing behavior.
* Missing and nullable fields.
* Primary-key and unique-constraint behavior.
* Foreign-key relationships and deletion rules.
* Compatibility between model definitions and migrations.
* Exclusion of sensitive fields from public response serializers.

Integration tests should use a controlled MySQL environment to verify actual schema and query behavior.

10. Production Readiness Checklist

* [ ]	Model definitions match the approved database schema.
* [ ]	Table and column identifiers use trusted allowlists.
* [ ]	Insertable and updateable fields are explicitly restricted.
* [ ]	JSON fields follow documented serialization rules.
* [ ]	Foreign keys, unique constraints, and indexes are reviewed.
* [ ]	Database migrations are version-controlled and tested.
* [ ]	Sensitive fields are excluded from public API responses.
* [ ]	Repositories use parameterized queries.
* [ ]	Services and controllers enforce resource-level authorization.
* [ ]	Integration tests verify model, repository, and schema compatibility.
* [ ]	Backup, recovery, and deployment procedures are documented.

Important: Model definitions describe permitted database access; they are not a substitute for migrations, database constraints, repository validation, authorization policies, or API response filtering.