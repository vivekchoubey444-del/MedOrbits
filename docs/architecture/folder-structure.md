MedOrbits Repository Folder Structure

Purpose: Define the responsibilities and conventions for the MedOrbits repository’s top-level directories.

Status: Architecture reference. Verify actual paths and files against the repository before treating this document as a complete inventory.

1. Top-Level Directory Overview

Path	Responsibility
pages/	Public informational pages, landing pages, and error or offline pages.
account/	User authentication, account access, dashboards, security, and account workflows.
education/	Courses, colleges, universities, admissions, and study-abroad content.
career/	Jobs, internships, employer services, and career-support features.
admin/	Administrative interfaces for managing platform resources.
legal/	Legal notices, policies, consent preferences, and compliance-related pages.
assets/	CSS, browser-side JavaScript, public data, images, icons, fonts, and downloadable resources intended for public access.
public/	Public web metadata and well-known files, such as applicable verification and crawler directives.
src/	Backend application modules, routes, controllers, services, middleware, integrations, jobs, and workers.
database/	SQL schema, database migrations, seed data, and test fixtures.
storage/	Runtime storage conventions and, where configured, uploaded or generated files. Private data must not be publicly served.
scripts/	Development, maintenance, migration, build, and validation utilities.
tests/	Unit, integration, API, database, security, end-to-end, and accessibility tests.
infrastructure/	Deployment, backups, monitoring, database operations, queue operations, and environment-specific infrastructure configuration.
docs/	Architecture, API contracts, setup instructions, operational procedures, and developer documentation.

2. Directory Ownership and Boundaries

Frontend pages

The pages/, account/, education/, career/, admin/, and legal/ directories contain frontend pages grouped by their intended audience or business responsibility.

* Keep page-specific content within the relevant module.
* Reuse shared components and assets where practical.
* Keep navigation, links, and asset paths consistent with the actual deployment structure.
* Do not treat a frontend page as proof that its backend operation is implemented.
* Enforce authentication and authorization through backend controls for protected functionality.

Shared assets

The assets/ directory contains resources intended to be referenced by the frontend.

* Keep stylesheets, browser JavaScript, images, icons, and public data organized by responsibility.
* Do not place API secrets, private configuration, session data, or private uploaded documents in publicly served asset paths.
* Validate that downloadable files are intended for public access before placing them in a publicly served directory.
* Keep asset references consistent with the deployment base path.

Backend source

The src/ directory contains server-side application code.

* Separate routing, controllers, services, middleware, integrations, and background processing according to their responsibilities.
* Keep authorization and business rules on the server.
* Validate all untrusted input.
* Avoid coupling unrelated modules unnecessarily.
* Document important module interfaces and error-handling behavior.

Use the repository’s actual module system and export conventions. Do not introduce a new architectural pattern without considering the existing application.

Database resources

The database/ directory owns database-related resources.

* Keep schema definitions and migration history synchronized.
* Use migrations to evolve deployed databases.
* Keep seed data distinct from production records.
* Use synthetic fixtures for testing.
* Do not commit production database dumps, credentials, or private user records.

Runtime storage

The storage/ directory describes runtime storage conventions where applicable.

* Keep private uploads outside publicly served directories.
* Apply authorization before serving private files.
* Define retention, deletion, and cleanup procedures.
* Exclude runtime-generated private files from version control unless a specific, documented reason requires otherwise.

The directory’s presence does not establish that a particular storage provider or upload implementation is configured.

Tests and scripts

The tests/ and scripts/ directories support quality assurance and maintenance.

* Organize tests by their purpose and scope.
* Use synthetic data and isolated test resources.
* Keep scripts focused, documented, and safe to run.
* Make destructive operations explicit and protect production environments.
* Integrate required checks into the project’s CI workflow where configured.

Infrastructure

The infrastructure/ directory may contain deployment and operational resources.

* Document environment-specific requirements.
* Keep credentials outside source control.
* Protect backup and recovery procedures.
* Define monitoring and operational recovery expectations.
* Avoid duplicating deployment configuration without a clear ownership boundary.

The actual deployment platform and infrastructure tooling must be confirmed from the repository configuration.

Documentation

The docs/ directory contains technical and operational documentation, including architecture references and API specifications.

* Keep documentation close to the implementation it describes, or link to the canonical document.
* Use consistent file naming.
* Identify placeholders and proposed functionality clearly.
* Update documentation when the implementation changes.
* Validate referenced paths and commands before publishing them as verified instructions.

3. Naming and Organization Conventions

* Use consistent, descriptive directory and file names.
* Follow the naming conventions already established within each module.
* Keep modules focused on a clear responsibility.
* Use documented exports and interfaces for shared modules.
* Avoid duplicate implementations of the same business operation.
* Keep nested README.md files synchronized with their directories.
* Keep manifests, configuration files, and examples aligned with actual dependencies and tooling.
* Prefer explicit ownership of shared resources over undocumented cross-directory dependencies.

4. Security and Version-Control Rules

Do not commit the following unless a specific, reviewed exception is justified:

* Environment files containing real secrets.
* Passwords, private keys, access tokens, or API credentials.
* Runtime uploads or private user documents.
* Production logs containing sensitive information.
* Production database dumps or private database exports.
* Generated files containing private or environment-specific data.
* Payment-provider secrets or private webhook configuration.

Use an appropriate .gitignore policy and review staged changes before committing.

Public assets and synthetic test fixtures may be committed when their contents are safe for public repository access.

5. Documentation and Implementation Accuracy

This structure defines intended directory responsibilities, not proof that every directory or module exists in the current checkout.

Before documenting a path as implemented:

1. Confirm that the path exists.
2. Inspect the relevant files.
3. Verify its responsibility from the code or configuration.
4. Confirm any referenced routes, scripts, dependencies, or integrations.
5. Update the relevant README or architecture document.

If a directory is planned but not yet implemented, identify it as planned rather than presenting it as an existing module.

6. Repository Maintenance Checklist

* [ ]	Top-level directories have clear responsibilities.
* [ ]	Nested README files reflect actual contents.
* [ ]	File paths and links resolve correctly.
* [ ]	Shared assets contain no secrets or private uploads.
* [ ]	Runtime storage is not accidentally exposed through static hosting.
* [ ]	Database migrations, schema documentation, and seeds are consistent.
* [ ]	Scripts and tests use synthetic data where appropriate.
* [ ]	Environment-specific configuration does not contain committed credentials.
* [ ]	API and architecture documentation reflect implemented behavior.
* [ ]	CI validates the required checks configured by the project.

7. Change Management

When adding, removing, or reorganizing a top-level module:

1. Define its responsibility and ownership.
2. Review dependencies on existing modules.
3. Update the directory tree and relevant documentation.
4. Update import paths, routing, build configuration, and deployment configuration as needed.
5. Review security and data-access implications.
6. Update tests and CI checks.
7. Verify the resulting repository structure before merging.

Maintenance principle: Keep the MedOrbits repository modular, secure, documented, and consistent with the actual implementation. Avoid creating duplicate sources of truth or describing planned components as completed functionality.