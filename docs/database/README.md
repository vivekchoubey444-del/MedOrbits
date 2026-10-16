Database Documentation

Project: MedOrbits
Database: MySQL
Purpose: Provide an entry point to database schema documentation, migration procedures, and persistence-layer conventions.

1. Overview

This section documents the intended MySQL persistence layer used by MedOrbits.

It explains the database design principles and the procedures for managing schema changes. It does not, by itself, confirm that every described entity, constraint, or migration has been implemented.

The actual SQL files, applied migration history, and verified deployed database schema are authoritative.

2. Documentation

Document	Purpose
schema.md	Describes schema design principles, intended data domains, relationships, constraints, indexing, data types, and security considerations.
migrations.md	Describes how database migrations should be created, reviewed, tested, applied, tracked, and recovered.

3. Database Standards

Database changes should follow these principles:

* Use version-controlled, uniquely identified migrations.
* Preserve referential integrity through appropriate primary keys, foreign keys, and constraints.
* Use suitable indexes based on query patterns and measured performance.
* Represent monetary values using integer minor units or an appropriate exact decimal type.
* Document timestamp and timezone conventions.
* Protect credentials, authentication data, personal information, and private document metadata.
* Test schema changes before production deployment.
* Maintain appropriate backup and recovery procedures for high-risk changes.

Consult the linked documents for the detailed requirements.

4. Source of Truth

Before relying on a table, column, index, constraint, or relationship:

1. Inspect the relevant SQL schema files, including schema.sql if present.
2. Review migration files in their defined execution order.
3. Confirm which migrations have actually been applied.
4. Verify the deployed database structure through an approved process.
5. Update the documentation when the verified schema or migration conventions change.

Do not assume that a documented entity or proposed migration exists in the deployed database.

5. Maintenance

When changing database conventions or structure:

* Update schema.md when schema design or data-model documentation changes.
* Update migrations.md when migration procedures or safeguards change.
* Update this README if document locations or responsibilities change.
* Keep examples and references consistent with the actual repository.
* Never include database credentials or other secrets in documentation.

6. Related Resources

* schema.md — Schema design and intended data domains.
* migrations.md — Migration workflow and production safeguards.
* schema.sql — Schema definition, if present.
* Migration directory — Versioned SQL changes, according to the actual repository structure.

Accuracy rule: Documentation describes conventions and intended design. Actual SQL files, migration history, and the verified deployed schema determine what is implemented.