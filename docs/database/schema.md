Database Schema Overview

Project: MedOrbits
Purpose: Document the intended data domains, database design standards, security requirements, and schema-verification process.

1. Overview

The MedOrbits repository anticipates data for education consultancy, admissions guidance, career services, user accounts, payments, and related platform operations.

The domains below describe the intended data model. They do not establish that every table, column, constraint, or relationship has already been implemented.

The authoritative schema must be verified against database/schema.sql, all applicable database migrations, and the deployed database structure.

2. Intended Data Domains

2.1 Identity and Access Management

Potential entities include:

* Users and account profiles.
* Roles and permissions.
* Sessions and authentication-related records.
* Account verification and recovery records.

Design considerations: Enforce appropriate access controls, protect authentication data, and ensure that privileged operations are authorized server-side.

2.2 Education and Admissions

Potential entities include:

* Courses and course categories.
* Colleges and universities.
* Admissions information and eligibility criteria.
* Student enquiries and applications.

Design considerations: Define stable identifiers, maintain relationships between institutions and courses where applicable, and validate admission-related data before persistence.

2.3 Applications and Documents

Potential entities include:

* Application records and statuses.
* Application-to-user relationships.
* Private document metadata.
* Document ownership, access permissions, and processing status.

Design considerations: Keep private document metadata separate from public website assets. Restrict document access and establish appropriate retention, deletion, and audit procedures.

2.4 Careers and Recruitment

Potential entities include:

* Job listings and employers.
* Candidate profiles and applications.
* Internships and internship applications.
* Recruitment or career-service records.

Design considerations: Define ownership and authorization rules, preserve application status history where required, and prevent unauthorized access to candidate information.

2.5 Payments and Subscriptions

Potential entities include:

* Payment attempts and transaction references.
* Subscription records and status.
* Payment-provider references.
* Refund or reconciliation records, where supported.

Design considerations: Store currency and monetary values precisely, validate payment status through trusted server-side mechanisms, and protect provider references and transaction data.

Do not store full payment-card data unless the system has a specifically reviewed and compliant requirement to do so. Prefer a suitable payment provider for card-data handling.

2.6 Notifications and Audit Records

Potential entities include:

* Notification records and delivery status.
* User notification preferences.
* Audit events for security-sensitive operations.
* Operational event references.

Design considerations: Limit the collection of sensitive data, define retention periods, and restrict access to audit records. Audit logs should not expose passwords, session tokens, or other authentication secrets.

3. Relational Design Requirements

3.1 Primary Keys

Every persistent entity should have a clearly defined primary key.

Choose key types consistently and document any externally exposed identifiers separately from internal database keys.

3.2 Foreign Keys and Referential Integrity

Use foreign keys where appropriate to enforce valid relationships between records.

For each relationship, document:

* Referencing and referenced columns.
* Required or optional participation.
* Expected deletion and update behavior.
* Whether cascading operations are permitted.

Do not use cascading deletion where it could unintentionally remove legally required, financial, or audit records.

3.3 Unique Constraints

Add unique constraints for values that must not be duplicated, such as a verified account identifier or a provider transaction reference, where appropriate.

Account for case sensitivity, normalization, nullable values, and database-engine-specific uniqueness behavior.

Application-level validation is useful but does not replace database constraints where database-level uniqueness is required.

3.4 Indexing

Create indexes based on measured query patterns and expected workload.

Review:

* Frequent lookup conditions.
* Join columns.
* Sorting and pagination paths.
* Foreign-key access patterns.
* Unique constraints.
* Query plans and index-maintenance costs.

Avoid adding indexes without considering write overhead, storage requirements, and the query’s actual execution plan.

3.5 Transactions and Concurrency

Use transactions for related database changes that must succeed or fail together, where supported by the database engine.

For concurrent operations, consider unique constraints, locking, isolation levels, and idempotency requirements. Payment callbacks and other repeatable operations should be safe to process more than once.

4. Data Types and Consistency

Monetary Values

Use integer minor units or an appropriate exact decimal type for currency. Never use floating-point values for financial calculations.

Document the currency, scale, rounding rules, and representation used by each monetary field.

Timestamps and Time Zones

Store timestamps consistently and document timezone assumptions.

For example, an application may store UTC timestamps and convert them to a user’s local timezone for display. Confirm the actual database and application conventions before adopting this as a project-wide rule.

Distinguish event timestamps, dates without a time component, and scheduled local times where necessary.

Status Fields

Use documented, constrained values for important lifecycle states, such as application, payment, subscription, and document-processing statuses.

Ensure application validation and database constraints agree where both are used. Document valid transitions for workflows that have multiple stages.

Personal Data

Collect only the personal information needed for a defined business purpose. Document ownership, access, retention, deletion, and any applicable legal obligations.

Use synthetic data for development and automated tests wherever possible.

5. Security and Privacy

* Store password hashes produced by an appropriate password-hashing algorithm; never store plaintext passwords.
* Protect session identifiers, access tokens, recovery tokens, and other authentication secrets.
* Avoid storing full payment-card data.
* Keep private document metadata and storage locations protected by authorization controls.
* Restrict access to personal, financial, application, and audit records.
* Use parameterized database queries or an equivalent safe data-access mechanism.
* Keep database credentials outside committed source code.
* Apply appropriate retention and deletion rules to personal data.
* Avoid including secrets or unnecessary personal information in logs and error messages.
* Ensure administrative data access is authorized on the server.

Document the controls that are actually implemented separately from recommended improvements.

6. Schema Changes and Migrations

Manage schema changes through reviewed, version-controlled migrations.

Each migration should have a unique identifier and a deterministic execution order. Review generated SQL and test changes against an empty database and a representative staging environment.

For changes spanning releases, prefer an expand-and-contract strategy where practical:

1. Add compatible schema elements.
2. Deploy code that supports the transition.
3. Backfill or transform data in controlled batches.
4. Verify the new behavior.
5. Remove obsolete schema in a later reviewed release.

Assess locking, execution time, disk capacity, backup requirements, and recovery options before high-risk production changes.

See the project’s database migration documentation for the complete migration and recovery procedure.

7. Schema Verification

Before relying on a table, column, index, constraint, or relationship:

1. Inspect database/schema.sql, if present.
2. Review all relevant migration files in their execution order.
3. Check seed files and fixtures for test-only or initial data.
4. Confirm the configured database engine and version.
5. Inspect the deployed schema using an approved read-only or controlled verification process.
6. Compare the expected schema with the actual schema.
7. Update this document if the verified design has changed.

Do not infer that a database object exists solely because it is mentioned in documentation, application code, or a proposed migration.

8. Testing and Data Quality

Use synthetic data in development and automated tests.

Test important constraints and workflows, including:

* Duplicate identifiers and unique-constraint violations.
* Invalid foreign-key references.
* Missing or malformed required values.
* Monetary precision and rounding.
* Timestamp and timezone handling.
* Unauthorized access to private records.
* Transaction rollback and partial-failure scenarios.
* Repeated payment callbacks or other retryable operations.
* Retention and deletion behavior.

Use appropriately protected staging data only when synthetic data cannot adequately represent the scenario.

9. Documentation Maintenance

Update this document when verified changes affect:

* Entity definitions or relationships.
* Primary keys, foreign keys, or unique constraints.
* Indexes and query patterns.
* Monetary or timestamp conventions.
* Personal-data handling.
* Migration and recovery procedures.
* Retention or deletion requirements.

Record important relationships and constraints in a schema diagram or data dictionary when this materially improves maintainability.

10. Related Documentation

* database/schema.sql — Schema definition, if present.
* Database migration files — Versioned schema changes.
* docs/database-migrations.md — Migration policy, if present.
* docs/architecture/overview.md — System components and boundaries.
* docs/architecture/data-flow.md — Request and data-processing flows.

Accuracy rule: The verified schema and applied migrations are authoritative. Intended domains and illustrative entities in this document must not be treated as confirmation that corresponding database objects already exist.