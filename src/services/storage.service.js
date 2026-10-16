
'use strict';

const crypto = require('node:crypto');

const {
  ServiceError,
  requireDependency,
  requiredString,
  requiredId,
  assertFound,
} = require('./service-utils');

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIGNED_URL_SECONDS = 900;
const MIN_SIGNED_URL_SECONDS = 30;

const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

function createStorageService({
  provider,
  documentRepository,
  maxBytes = DEFAULT_MAX_BYTES,
  allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
}) {
  requireDependency(provider, 'storage provider');

  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError('maxBytes must be a positive safe integer.');
  }

  if (
    !Array.isArray(allowedMimeTypes) ||
    allowedMimeTypes.length === 0 ||
    !allowedMimeTypes.every(
      (type) => typeof type === 'string' && type.length > 0,
    )
  ) {
    throw new TypeError('allowedMimeTypes must be a non-empty string array.');
  }

  function validateStorageKey(storageKey) {
    const key = requiredString(storageKey, 'storageKey', {
      max: 1024,
    });

    // Keys are generated as "<ownerId>/<UUID>" by this service.
    // Reject traversal and malformed keys before accessing storage.
    if (
      key.startsWith('/') ||
      key.includes('\\') ||
      key.split('/').some((part) => part === '.' || part === '..') ||
      key.includes('\0')
    ) {
      throw new ServiceError('Invalid storage key.', {
        code: 'INVALID_STORAGE_KEY',
        status: 422,
      });
    }

    return key;
  }

  function sanitizeFilename(filename) {
    const value = requiredString(filename, 'filename', {
      max: 255,
    }).trim();

    if (
      !value ||
      /[\u0000-\u001f\u007f]/.test(value) ||
      value.includes('/') ||
      value.includes('\\')
    ) {
      throw new ServiceError('Invalid filename.', {
        code: 'INVALID_FILENAME',
        status: 422,
      });
    }

    return value;
  }

  function validateFileSignature(buffer, mimeType) {
    // MIME types supplied by the client are not trustworthy.
    // Check basic file signatures; perform full scanning/validation
    // in a dedicated upload-validation pipeline for production use.
    if (mimeType === 'application/pdf') {
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }

    if (mimeType === 'image/jpeg') {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    }

    if (mimeType === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        )
      );
    }

    return false;
  }

  async function findOwnedDocument(storageKey, ownerId) {
    if (!documentRepository) {
      throw new ServiceError(
        'Document ownership verification is not configured.',
        {
          code: 'DOCUMENT_REPOSITORY_REQUIRED',
          status: 503,
        },
      );
    }

    const doc = await documentRepository.findByStorageKey(storageKey);

    if (!doc || String(doc.ownerId) !== String(ownerId)) {
      throw new ServiceError('Document not found.', {
        code: 'NOT_FOUND',
        status: 404,
      });
    }

    return doc;
  }

  return {
    async upload({ ownerId, buffer, filename, mimeType } = {}) {
      requiredId(ownerId, 'ownerId');

      const originalName = sanitizeFilename(filename);

      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new ServiceError('A non-empty file buffer is required.', {
          code: 'INVALID_FILE',
          status: 422,
        });
      }

      if (buffer.length > maxBytes) {
        throw new ServiceError(
          'File exceeds the maximum permitted size.',
          {
            code: 'FILE_TOO_LARGE',
            status: 413,
          },
        );
      }

      if (!allowedMimeTypes.includes(mimeType)) {
        throw new ServiceError('File type is not allowed.', {
          code: 'FILE_TYPE_NOT_ALLOWED',
          status: 415,
        });
      }

      if (!validateFileSignature(buffer, mimeType)) {
        throw new ServiceError(
          'The file content does not match the declared file type.',
          {
            code: 'FILE_SIGNATURE_MISMATCH',
            status: 415,
          },
        );
      }

      const checksum = crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');

      const key = `${String(ownerId)}/${crypto.randomUUID()}`;

      const stored = await provider.put({
        key,
        body: buffer,
        contentType: mimeType,
        metadata: {
          originalName,
          checksum,
        },
      });

      let record;

      try {
        if (documentRepository) {
          record = await documentRepository.create({
            ownerId,
            storageKey: key,
            originalName,
            mimeType,
            size: buffer.length,
            checksum,
            status: 'pending',
          });
        } else {
          record = { storageKey: key, status: 'pending' };
        }
      } catch (error) {
        // Attempt cleanup if storage succeeds but metadata persistence fails.
        try {
          await provider.delete(key);
        } catch {
          // Log through infrastructure monitoring without exposing
          // storage details to the client.
        }

        throw new ServiceError(
          'Unable to register the uploaded document.',
          {
            code: 'DOCUMENT_REGISTRATION_FAILED',
            status: 500,
          },
        );
      }

      return {
        document: record,
        storageKey: key,
        etag: stored?.etag || null,
      };
    },

    async createDownloadUrl({
      storageKey,
      ownerId,
      expiresInSeconds = 300,
    } = {}) {
      const key = validateStorageKey(storageKey);
      requiredId(ownerId, 'ownerId');

      const doc = await findOwnedDocument(key, ownerId);

      if (['rejected', 'deleted', 'pending'].includes(doc.status)) {
        throw new ServiceError(
          'This document is not available for download.',
          {
            code: 'DOCUMENT_UNAVAILABLE',
            status: 403,
          },
        );
      }

      if (typeof provider.createSignedUrl !== 'function') {
        throw new ServiceError(
          'Signed downloads are not configured.',
          {
            code: 'SIGNED_DOWNLOADS_UNAVAILABLE',
            status: 501,
          },
        );
      }

      const requestedExpiry = Number(expiresInSeconds);

      if (
        !Number.isFinite(requestedExpiry) ||
        requestedExpiry < MIN_SIGNED_URL_SECONDS
      ) {
        throw new ServiceError('Invalid signed URL expiry.', {
          code: 'INVALID_EXPIRY',
          status: 422,
        });
      }

      const ttl = Math.min(
        MAX_SIGNED_URL_SECONDS,
        Math.floor(requestedExpiry),
      );

      const url = await provider.createSignedUrl(key, ttl);

      if (typeof url !== 'string' || url.length === 0) {
        throw new ServiceError(
          'The storage provider returned an invalid download URL.',
          {
            code: 'STORAGE_PROVIDER_ERROR',
            status: 502,
          },
        );
      }

      return { url };
    },

    async remove({ storageKey, ownerId } = {}) {
      const key = validateStorageKey(storageKey);
      requiredId(ownerId, 'ownerId');

      const doc = await findOwnedDocument(key, ownerId);

      if (doc.status === 'deleted') {
        return { deleted: true };
      }

      await provider.delete(key);

      if (typeof documentRepository.updateById !== 'function') {
        throw new ServiceError(
          'Document status updates are not configured.',
          {
            code: 'DOCUMENT_REPOSITORY_MISCONFIGURED',
            status: 500,
          },
        );
      }

      assertFound(
        await documentRepository.updateById(doc.id, {
          status: 'deleted',
          deletedAt: new Date(),
        }),
        'Document',
      );

      return { deleted: true };
    },
  };
}

module.exports = { createStorageService };
