# Database Schema Overview

## Intended Domains

The repository structure anticipates data for:

- Users, roles, permissions, and sessions.
- Courses, colleges, universities, and admissions.
- Applications and private document metadata.
- Jobs, employers, candidates, and internships.
- Payments, subscriptions, notifications, and audit logs.

These are logical domains, not a claim that every table or relationship already exists.

## Design Requirements

- Use primary keys and appropriate foreign keys.
- Add unique constraints for values that must be unique.
- Index frequent lookup, join, and pagination paths based on measured queries.
- Store money using integer minor units or an appropriate exact decimal type; do not use floating-point values for currency.
- Store timestamps consistently and document timezone assumptions.
- Keep password hashes, session identifiers, and payment references protected.
- Avoid storing full payment card data.
- Store private file metadata and ownership separately from publicly accessible resources.
- Apply retention and deletion requirements to personal data and audit records.

## Verification

Inspect `database/schema.sql` and all applied migrations before relying on a table, column, index, or relationship. Use synthetic data in development and tests.
