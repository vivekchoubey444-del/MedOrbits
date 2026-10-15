
# MedOrbits Storage

This directory contains private runtime files generated or uploaded by the MedOrbits application.

## Directory Structure

- `tmp/` — temporary processing files.
- `uploads/` — incoming files awaiting classification.
- `documents/` — private user documents.
- `applications/` — admission application attachments.
- `profiles/` — profile images and user assets.
- `employer-documents/` — employer verification documents.
- `generated/` — generated reports, receipts, and PDFs.
- `exports/` — authorized data exports.
- `quarantine/` — files awaiting security review.
- `backups/` — reserved for protected local backup workflows.

## Security Requirements

1. Never serve this directory directly using `express.static()`.
2. Never commit uploaded files, personal documents, database dumps, or backups.
3. Generate opaque storage filenames; do not trust client-supplied paths.
4. Validate file extensions, MIME types, file signatures, and size limits.
5. Scan uploaded files before making them available to users.
6. Keep quarantined files inaccessible until they pass validation and scanning.
7. Authorize every document download on the server.
8. Use private object storage for production where appropriate.
9. Encrypt sensitive documents in transit and at rest.
10. Apply retention and deletion policies to temporary files and user data.
11. Never store passwords, API keys, payment card data, or secrets in uploaded files.
12. Keep database backups outside the public web root and preferably outside this directory.

## Production Storage

Use private object storage for sensitive production documents when practical. Store only the storage key and validated metadata in the database.

Do not rely on a filename or unguessable URL as a substitute for authorization.

## Development

Use synthetic documents and test data only. Ensure `.gitignore` excludes runtime files while retaining the directory structure through `.gitkeep` files.
