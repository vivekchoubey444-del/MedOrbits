MedOrbits — Storage Integration

Directory: src/integrations/storage/

Overview

The storage integration provides a provider-independent interface for storing, retrieving, and deleting file objects.

It supports local filesystem storage by default and an optional S3-compatible provider. Provider-specific operations are encapsulated behind a consistent API.

Security principle: Private files must not be exposed through public URLs by this adapter. Every download must be authorized by the application.

Directory Structure

src/integrations/storage/
├── README.md
├── index.js
├── local.provider.js
├── s3.provider.js
├── storage.client.js
└── storage.config.js

Storage API

The adapter exposes the following operations:

Method	Input	Responsibility
put()	{ key, body: Buffer, contentType }	Store a file object.
get()	key	Retrieve a stored object.
delete()	key	Delete a stored object.

Example usage

‘use strict’;
const storage = require(‘./storage.client’);
async function storeDocument(buffer, contentType) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError(‘Document body must be a Buffer.’);
  }
  // Generate this key on the server, not from a client filename.
  const key = `documents/${require(‘node:crypto’).randomUUID()}`;
  await storage.put({
    key,
    body: buffer,
    contentType,
  });
  return { key };
}
module.exports = { storeDocument };

This example illustrates the API contract. Confirm the actual export shape of storage.client.js before using it.

Configuration

Local storage

Local storage is the default provider.

STORAGE_DRIVER=local
STORAGE_LOCAL_ROOT=storage/private
STORAGE_MAX_FILE_BYTES=10485760

STORAGE_LOCAL_ROOT configures the local storage root, and STORAGE_MAX_FILE_BYTES defines the maximum permitted file size in bytes.

The example maximum is 10 MiB; adjust it to the application’s requirements.

Requirements:

* Store private files outside publicly served directories.
* Restrict filesystem permissions.
* Resolve and validate storage paths.
* Reject path traversal and unsafe keys.
* Enforce file-size limits before writing.
* Avoid trusting client-provided filenames.

S3 storage

Set the following variables when using the S3 provider:

STORAGE_DRIVER=s3
S3_BUCKET=your-private-bucket
S3_REGION=your-region

Optional configuration may include:

S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
S3_PREFIX=

Install the AWS SDK dependency:

npm install @aws-sdk/client-s3

Use instance roles or the hosting platform’s workload identity where supported. Avoid hardcoding access keys or committing credentials.

The S3 provider should use private object access by default and must not make stored documents publicly readable.

Provider Selection

The STORAGE_DRIVER setting determines which provider is initialized.

* local — uses local filesystem storage.
* s3 — uses the configured S3 provider.

Validate the driver at startup. Unsupported driver values and missing required configuration must produce clear errors rather than silently selecting another provider.

Initialize only the selected provider.

Security Requirements

Object keys

* Generate keys on the server.
* Do not use client filenames as storage paths or object keys.
* Reject absolute paths, traversal sequences, and malformed keys.
* Apply a consistent key-prefix policy.
* Prevent unauthorized overwrites and cross-user access.
* Avoid returning internal filesystem paths or sensitive object metadata.

Upload validation

* Enforce STORAGE_MAX_FILE_BYTES.
* Validate allowed file types in the upload service.
* Inspect file signatures where appropriate.
* Treat client-provided MIME types and extensions as untrusted.
* Scan uploaded content for malware when required by the application’s risk profile.
* Store untrusted uploads privately until validation and scanning are complete.

Downloads

This adapter intentionally does not generate public URLs or signed URLs.

Before retrieving a document, the application must:

1. Authenticate the requester.
2. Load the authoritative document record.
3. Verify ownership or the applicable access permission.
4. Retrieve the object using its server-controlled storage key.
5. Return the file with appropriate response headers.
6. Avoid exposing internal storage details.

Authorization must be enforced on every download request, regardless of whether the underlying provider is local or S3.

Deletion

* Verify that the requester or internal operation is authorized to delete the object.
* Confirm the key belongs to the expected storage namespace.
* Coordinate deletion with the application’s database records and retention requirements.
* Handle missing objects and provider failures consistently.

Error Handling

The storage adapter should distinguish between:

* Invalid keys or input.
* Unsupported configuration.
* File-size violations.
* Missing objects.
* Filesystem permission errors.
* S3 authentication or authorization failures.
* Network timeouts and provider outages.

Do not expose raw filesystem paths, credentials, or provider internals through public API responses.

Testing Requirements

Test the storage interface against both local and S3-compatible providers where applicable.

* Successful upload, retrieval, and deletion.
* Empty or invalid buffers.
* File-size limits.
* Invalid and traversal-based keys.
* Missing objects.
* Unauthorized downloads at the application layer.
* Filesystem permission failures.
* S3 configuration and access failures.
* Disabled or unsupported provider configuration.
* Cleanup and deletion failure handling.

Use temporary directories and mocked or isolated storage resources in automated tests. Do not use production documents or credentials.

Implementation Checklist

* [ ]	put(), get(), and delete() follow the documented contract.
* [ ]	Local storage defaults to a private directory.
* [ ]	S3 credentials use an appropriate identity mechanism.
* [ ]	File-size limits are enforced.
* [ ]	Object keys are server-generated and validated.
* [ ]	Upload validation and optional malware scanning are handled by the appropriate service.
* [ ]	Every download is authorized.
* [ ]	Public and signed URL generation is not exposed by this adapter.
* [ ]	Provider errors are handled consistently.
* [ ]	Automated tests cover security and failure scenarios.

⸻

Related documentation

* src/config/storage.js — Application storage configuration.
* src/integrations/README.md — Integration architecture and shared requirements.
* src/controllers/README.md — Controller responsibilities and authorization.
* infrastructure/backup/ — Backup and restore procedures.

MedOrbits — Study · Work · Grow

Private, provider-independent storage for application documents and files.