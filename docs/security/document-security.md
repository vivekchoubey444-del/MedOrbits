# Document Security

## Storage

- Store private applicant files outside publicly served directories.
- Use private object storage or a protected filesystem with least-privilege access.
- Use generated storage keys rather than trusting user-supplied filenames.
- Encrypt data in transit and use storage encryption where available.
- Define retention, deletion, backup, and access-audit policies.

## Upload Validation

- Enforce size limits and an explicit allowlist of required formats.
- Do not trust extensions or client-provided MIME types alone.
- Validate file signatures where applicable and consider malware scanning.
- Reject path traversal, executable content, and malformed files.
- Apply rate limits and authorization checks before accepting uploads.

## Downloads

Authorize every download on the server. Use short-lived signed URLs only when appropriate, and avoid public permanent links for private records. Prevent sensitive files from appearing in application logs or analytics.

## Privacy

Never commit passports, identity proofs, financial records, completed application forms, or private student documents to the repository or public asset folders.
