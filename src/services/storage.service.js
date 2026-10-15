'use strict';
const crypto = require('node:crypto');
const { ServiceError, requireDependency, requiredString, requiredId } = require('./service-utils');
function createStorageService({ provider, documentRepository, maxBytes = 10 * 1024 * 1024, allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'] }) {
  requireDependency(provider, 'storage provider');
  return {
    async upload({ ownerId, buffer, filename, mimeType }) {
      requiredId(ownerId, 'ownerId'); requiredString(filename, 'filename', { max: 255 });
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ServiceError('A non-empty file buffer is required.', { code: 'INVALID_FILE', status: 422 });
      if (buffer.length > maxBytes) throw new ServiceError('File exceeds the maximum permitted size.', { code: 'FILE_TOO_LARGE', status: 413 });
      if (!allowedMimeTypes.includes(mimeType)) throw new ServiceError('File type is not allowed.', { code: 'FILE_TYPE_NOT_ALLOWED', status: 415 });
      const key = `${String(ownerId)}/${crypto.randomUUID()}`;
      const stored = await provider.put({ key, body: buffer, contentType: mimeType, metadata: { originalName: filename } });
      const record = documentRepository ? await documentRepository.create({ ownerId, storageKey: key, originalName: filename, mimeType, size: buffer.length, checksum: crypto.createHash('sha256').update(buffer).digest('hex'), status: 'pending' }) : { storageKey: key };
      return { document: record, storageKey: key, etag: stored?.etag || null };
    },
    async createDownloadUrl({ storageKey, ownerId, expiresInSeconds = 300 }) {
      requiredString(storageKey, 'storageKey', { max: 1024 }); requiredId(ownerId, 'ownerId');
      if (documentRepository) {
        const doc = await documentRepository.findByStorageKey(storageKey);
        if (!doc || String(doc.ownerId) !== String(ownerId)) throw new ServiceError('Document not found.', { code: 'NOT_FOUND', status: 404 });
        if (doc.status === 'rejected') throw new ServiceError('This document is unavailable.', { code: 'DOCUMENT_UNAVAILABLE', status: 403 });
      }
      if (typeof provider.createSignedUrl !== 'function') throw new ServiceError('Signed downloads are not configured.', { status: 501 });
      return { url: await provider.createSignedUrl(storageKey, Math.min(900, Math.max(30, Number(expiresInSeconds) || 300))) };
    },
    async remove({ storageKey, ownerId }) {
      requiredString(storageKey, 'storageKey', { max: 1024 }); requiredId(ownerId, 'ownerId');
      const doc = documentRepository ? await documentRepository.findByStorageKey(storageKey) : null;
      if (documentRepository && (!doc || String(doc.ownerId) !== String(ownerId))) throw new ServiceError('Document not found.', { code: 'NOT_FOUND', status: 404 });
      await provider.delete(storageKey);
      if (doc && documentRepository.updateById) await documentRepository.updateById(doc.id, { status: 'deleted', deletedAt: new Date() });
      return { deleted: true };
    },
  };
}
module.exports = { createStorageService };
