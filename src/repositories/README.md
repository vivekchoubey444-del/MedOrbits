MedOrbits Repositories

Directory: src/repositories/

1. Purpose

The repositories layer provides controlled database access for MedOrbits. It contains parameterized MySQL queries and explicit table and column allowlists to reduce SQL injection risks and prevent unintended database operations.

Repositories isolate database operations from business logic. Services use repositories to retrieve and persist data, while controllers handle HTTP requests and responses.

2. Available Repositories

The following repositories are planned or available within the MedOrbits architecture:

* user.repository.js — User records and profile data.
* session.repository.js — Session records and session lifecycle data.
* course.repository.js — Course information.
* college.repository.js — College records.
* university.repository.js — University records.
* application.repository.js — Admission and service application records.
* document.repository.js — Document metadata and associated records.
* job.repository.js — Job listings.
* candidate.repository.js — Candidate profiles and job-seeking records.
* employer.repository.js — Employer profiles and employer-related records.
* payment.repository.js — Payment records and transaction references.
* subscription.repository.js — Subscription records and lifecycle data.

The list describes the repository architecture; the presence of a name in this document does not establish that its implementation, schema, or migrations are complete.

3. Responsibilities

Repositories are responsible for:

* Executing parameterized MySQL queries.
* Using explicit allowlists for permitted tables, columns, and sortable fields.
* Retrieving, inserting, updating, and deleting records where supported.
* Applying consistent database access patterns.
* Handling database errors without exposing SQL statements, credentials, or sensitive internal details.
* Supporting transactions where multiple related database operations must succeed or fail together.
* Returning predictable results for service-layer consumption.

Repositories should not implement HTTP response handling, role-based authorization, request validation, or application workflow decisions.

4. Generic CRUD Repository

The generic CRUD repository provides reusable database operations for trusted server-side callers.

Before using it, ensure that:

1. Table names come from a fixed server-side allowlist.
2. Column names come from an explicit allowlist for the selected table.
3. Values are passed through parameterized query bindings.
4. Sort fields and sort directions are validated against permitted values.
5. Update operations accept only explicitly permitted fields.
6. Delete operations are restricted to authorized, well-defined use cases.
7. The selected repository and operation are appropriate for the calling service.

SQL parameters generally protect values, not arbitrary table names, column names, or SQL fragments. Identifiers must therefore be selected from trusted allowlists rather than interpolated from user input.

5. Authorization and Data Ownership

Generic CRUD operations do not replace application authorization.

Controllers and services must enforce the applicable ownership, role, and resource-access rules before accessing protected records.

Examples include:

* Users may access only the profile information permitted by the application’s access policy.
* Candidates must not access another candidate’s private documents or application records without authorization.
* Employers must not access another employer’s restricted records.
* Payment and subscription records must be protected from unauthorized modification.
* Administrative operations must require appropriate administrative privileges.

Never expose unrestricted generic update or delete operations directly to public users.

Authorization should be enforced for the specific resource and operation, not merely by checking whether a user is logged in.

6. Expected Request Flow

The intended application flow is:

Route → Controller → Service → Repository → MySQL

* Routes: Define endpoints and attach appropriate middleware.
* Controllers: Process HTTP input, invoke services, and format responses.
* Services: Apply business rules, coordinate operations, and enforce relevant workflow constraints.
* Repositories: Execute controlled database queries.
* MySQL: Persist and retrieve application data.

This separation keeps database logic reusable and prevents HTTP handlers from becoming tightly coupled to SQL.

7. Database and Transaction Safety

Production implementations should:

* Use a supported MySQL driver and connection pool.
* Keep database credentials in environment-based configuration.
* Use parameterized queries for all untrusted values.
* Apply appropriate transaction boundaries to multi-step operations.
* Use consistent transaction connections for every query in a transaction.
* Enforce database constraints and appropriate indexes.
* Define predictable handling for missing records, duplicate keys, deadlocks, and connection failures.
* Avoid logging passwords, access tokens, payment credentials, document contents, or unnecessary personal information.

Payment state changes, application updates, and other multi-step workflows should use transactions and idempotency controls where appropriate.

8. Repository API and Error Handling

Each repository should expose a documented interface consistent with its callers. For example, a repository may provide methods such as findById, findMany, create, updateById, or deleteById where those operations are appropriate.

These method names are conventions, not a claim that every repository already implements them.

Repository methods should:

* Return documented result types.
* Distinguish a missing record from a database failure.
* Propagate or translate errors consistently.
* Avoid silently swallowing database errors.
* Avoid returning database internals directly to clients.

Services and controllers should translate failures into suitable application or HTTP responses.

9. Testing Requirements

Repository tests should cover:

* Valid queries and expected results.
* Parameter binding and SQL-injection resistance.
* Rejection of unknown table names, column names, and sort fields.
* Update field allowlists.
* Missing-record behavior.
* Duplicate records and constraint violations.
* Transaction rollback on failure.
* Database connection and timeout errors.
* Tenant, ownership, and resource boundaries where applicable.

Use a controlled test database or a reliable database test environment for integration tests. Mock-only tests cannot establish that real MySQL queries, constraints, and transactions behave correctly.

10. Production Readiness Checklist

Before a repository is used in production, verify that:

* [ ]	Its implementation matches the actual MySQL schema.
* [ ]	Required migrations and indexes exist.
* [ ]	All values use parameterized queries.
* [ ]	Table and column identifiers use fixed allowlists.
* [ ]	Update and delete operations are restricted.
* [ ]	Authorization is enforced by the relevant service or controller.
* [ ]	Transactions are used where required.
* [ ]	Errors and logs do not expose sensitive information.
* [ ]	Automated tests cover important database behavior.
* [ ]	Database credentials and connection settings are configured securely.

Important: A repository file, exported method, or generic CRUD implementation is not evidence that the associated feature is production-ready. Verify implementation, schema, authorization, and tests independently.