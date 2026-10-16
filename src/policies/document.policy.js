
'use strict';

const {
  isAdmin,
  hasRole,
  hasPermission,
  isOwner,
  sameId,
  resourceOwnerId,
} = require('./policy-utils');

const OWNER_FIELDS = [
  'userId',
  'ownerId',
  'candidateId',
  'applicantId',
  'uploadedBy',
];

const PROTECTED_DOCUMENT_FIELDS = new Set([
  'id',
  '_id',
  'userId',
  'ownerId',
  'candidateId',
  'applicantId',
  'uploadedBy',
  'status',
  'verificationStatus',
  'reviewStatus',
  'reviewerId',
  'assignedTo',
  'storageKey',
  'bucket',
  'url',
  'downloadUrl',
  'checksum',
  'malwareScanStatus',
  'isDeleted',
  'deletedAt',
  'createdAt',
  'updatedAt',
]);

function actorId(actor) {
  return actor?.id ?? actor?.userId ?? actor?.sub ?? null;
}

function documentOwnerId(document) {
  return resourceOwnerId(document, OWNER_FIELDS);
}

function canUploadDocument(actor, metadata = {}) {
  if (!actor) return false;

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'documents:upload:any')
  ) {
    return true;
  }

  if (!hasRole(actor, 'user', 'student', 'candidate', 'employer')) {
    return false;
  }

  const targetOwner =
    metadata.userId ??
    metadata.ownerId ??
    metadata.candidateId;

  // The controller/service must bind ownership to the authenticated
  // identity when no explicit owner is provided.
  if (targetOwner == null || targetOwner === '') {
    return true;
  }

  return isOwner(actor, targetOwner);
}

function canViewDocument(actor, document) {
  if (!actor || !document) return false;

  if (
    document.isDeleted === true ||
    document.deletedAt != null
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'documents:read:any')
  ) {
    return true;
  }

  if (isOwner(actor, documentOwnerId(document))) {
    return true;
  }

  const id = actorId(actor);

  if (id == null) return false;

  const relatedApplication =
    document.applicationId != null &&
    (
      sameId(document.applicationApplicantId, id) ||
      sameId(document.applicantId, id)
    );

  if (
    relatedApplication &&
    hasPermission(actor, 'applications:read:assigned')
  ) {
    return true;
  }

  const isAssignedReviewer =
    sameId(document.assignedTo, id) ||
    sameId(document.reviewerId, id);

  return (
    isAssignedReviewer &&
    hasRole(actor, 'counsellor', 'support') &&
    hasPermission(actor, 'documents:review:assigned')
  );
}

function canUpdateDocument(actor, document, changes = {}) {
  if (!actor || !document) return false;

  if (
    document.isDeleted === true ||
    document.deletedAt != null
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'documents:update:any')
  ) {
    return true;
  }

  if (!isOwner(actor, documentOwnerId(document))) {
    return false;
  }

  if (
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  return !Object.keys(changes).some((key) =>
    PROTECTED_DOCUMENT_FIELDS.has(key)
  );
}

function canReviewDocument(actor, document) {
  if (!actor || !document) return false;

  if (
    document.isDeleted === true ||
    document.deletedAt != null
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'documents:review:any')
  ) {
    return true;
  }

  const id = actorId(actor);

  if (id == null) return false;

  const assigned =
    sameId(document.reviewerId, id) ||
    sameId(document.assignedTo, id);

  return (
    assigned &&
    hasRole(actor, 'counsellor', 'support') &&
    hasPermission(actor, 'documents:review:assigned')
  );
}

function canDeleteDocument(actor, document) {
  if (!actor || !document) return false;

  if (
    document.isDeleted === true ||
    document.deletedAt != null
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'documents:delete:any')
  ) {
    return true;
  }

  const status = String(document.status || '').toLowerCase();

  return (
    isOwner(actor, documentOwnerId(document)) &&
    document.requiredForActiveApplication !== true &&
    !['verified', 'locked', 'submitted'].includes(status)
  );
}

function canGenerateDocumentDownload(actor, document) {
  if (!actor || !document) return false;

  if (
    document.isDeleted === true ||
    document.deletedAt != null
  ) {
    return false;
  }

  if (!canViewDocument(actor, document)) {
    return false;
  }

  // The download service must additionally enforce storage-key
  // ownership, document review status, and signed-URL expiry.
  return true;
}

module.exports = {
  canUploadDocument,
  canViewDocument,
  canUpdateDocument,
  canReviewDocument,
  canDeleteDocument,
  canGenerateDocumentDownload,
};
