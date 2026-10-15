'use strict';

const {
  isAdmin, hasRole, hasPermission, isOwner, sameId,
  resourceOwnerId,
} = require('./policy-utils');

function documentOwnerId(document) {
  return resourceOwnerId(document, ['userId', 'ownerId', 'candidateId', 'applicantId', 'uploadedBy']);
}

function canUploadDocument(actor, metadata = {}) {
  if (!actor) return false;
  if (isAdmin(actor) || hasPermission(actor, 'documents:upload:any')) return true;
  const targetOwner = metadata.userId ?? metadata.ownerId ?? metadata.candidateId;
  if (!targetOwner) return hasRole(actor, 'user', 'student', 'candidate', 'employer');
  return isOwner(actor, targetOwner) &&
    hasRole(actor, 'user', 'student', 'candidate', 'employer');
}

function canViewDocument(actor, document) {
  if (!actor || !document) return false;
  if (isAdmin(actor) || hasPermission(actor, 'documents:read:any')) return true;
  if (isOwner(actor, documentOwnerId(document))) return true;

  const relatedApplication = document.applicationId &&
    (sameId(document.applicationApplicantId, actor.id ?? actor.userId ?? actor.sub) ||
     sameId(document.applicantId, actor.id ?? actor.userId ?? actor.sub));
  if (relatedApplication && hasPermission(actor, 'applications:read:assigned')) return true;

  const isAssignedReviewer =
    sameId(document.assignedTo, actor.id ?? actor.userId ?? actor.sub) ||
    sameId(document.reviewerId, actor.id ?? actor.userId ?? actor.sub);

  return isAssignedReviewer &&
    hasRole(actor, 'counsellor', 'support') &&
    hasPermission(actor, 'documents:review:assigned');
}

function canUpdateDocument(actor, document, changes = {}) {
  if (!actor || !document) return false;
  if (isAdmin(actor) || hasPermission(actor, 'documents:update:any')) return true;
  if (!isOwner(actor, documentOwnerId(document))) return false;

  // Owners may update limited metadata, never review/security/storage fields.
  const forbidden = new Set([
    'userId', 'ownerId', 'candidateId', 'applicantId', 'uploadedBy',
    'status', 'verificationStatus', 'reviewStatus', 'reviewerId',
    'storageKey', 'bucket', 'url', 'downloadUrl', 'checksum',
    'malwareScanStatus', 'deletedAt',
  ]);
  return !Object.keys(changes || {}).some((key) => forbidden.has(key));
}

function canReviewDocument(actor, document) {
  if (!actor || !document) return false;
  return isAdmin(actor) ||
    hasPermission(actor, 'documents:review:any') ||
    (sameId(document.reviewerId ?? document.assignedTo, actor.id ?? actor.userId ?? actor.sub) &&
     hasRole(actor, 'counsellor', 'support') &&
     hasPermission(actor, 'documents:review:assigned'));
}

function canDeleteDocument(actor, document) {
  if (!actor || !document) return false;
  if (isAdmin(actor) || hasPermission(actor, 'documents:delete:any')) return true;
  return isOwner(actor, documentOwnerId(document)) &&
    !document.requiredForActiveApplication &&
    !['verified', 'locked', 'submitted'].includes(String(document.status || '').toLowerCase());
}

function canGenerateDocumentDownload(actor, document) {
  return canViewDocument(actor, document) &&
    document.isDeleted !== true &&
    document.deletedAt == null;
}

module.exports = {
  canUploadDocument,
  canViewDocument,
  canUpdateDocument,
  canReviewDocument,
  canDeleteDocument,
  canGenerateDocumentDownload,
};
