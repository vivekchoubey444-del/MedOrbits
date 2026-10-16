
'use strict';

const {
  isAdmin,
  hasPermission,
  sameId,
  actorId,
  resourceOwnerId,
  safeStatus,
} = require('./policy-utils');

const COURSE_OWNER_FIELDS = [
  'ownerId',
  'createdBy',
  'managedBy',
];

const PUBLIC_STATUSES = new Set([
  'published',
]);

const EDITABLE_STATUSES = new Set([
  'draft',
  'published',
  'archived',
]);

const HIDDEN_STATUSES = new Set([
  'deleted',
]);

const PROTECTED_FIELDS = new Set([
  'id',
  '_id',
  'ownerId',
  'createdBy',
  'managedBy',
  'status',
  'verified',
  'verificationStatus',
  'approvedBy',
  'approvedAt',
  'publishedAt',
  'archivedAt',
  'deletedAt',
  'createdAt',
  'updatedAt',
]);

function courseOwnerId(course) {
  return resourceOwnerId(course, COURSE_OWNER_FIELDS);
}

function isCourseOwner(actor, course) {
  if (!actor || !course) {
    return false;
  }

  const ownerId = courseOwnerId(course);

  return ownerId != null &&
    sameId(actorId(actor), ownerId);
}

function canViewCourse(actor, course) {
  if (!course || typeof course !== 'object') {
    return false;
  }

  const status = safeStatus(course.status);

  if (HIDDEN_STATUSES.has(status)) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'courses:read:any')
  ) {
    return true;
  }

  if (PUBLIC_STATUSES.has(status)) {
    return true;
  }

  return Boolean(
    actor &&
    (
      isCourseOwner(actor, course) ||
      hasPermission(actor, 'courses:read:private')
    )
  );
}

function canCreateCourse(actor, input = {}) {
  if (
    !actor ||
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'courses:create')
  );
}

function canUpdateCourse(actor, course, changes = {}) {
  if (
    !actor ||
    !course ||
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    return false;
  }

  if (
    isAdmin(actor) ||
    hasPermission(actor, 'courses:update:any')
  ) {
    return true;
  }

  if (!isCourseOwner(actor, course)) {
    return false;
  }

  if (!EDITABLE_STATUSES.has(safeStatus(course.status))) {
    return false;
  }

  return !Object.keys(changes).some(
    (key) => PROTECTED_FIELDS.has(key)
  );
}

function canPublishCourse(actor, course) {
  if (!actor || !course) {
    return false;
  }

  if (!['draft', 'archived'].includes(safeStatus(course.status))) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'courses:publish')
  );
}

function canArchiveCourse(actor, course) {
  if (!actor || !course) {
    return false;
  }

  if (safeStatus(course.status) !== 'published') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'courses:archive')
  );
}

function canRestoreCourse(actor, course) {
  if (!actor || !course) {
    return false;
  }

  if (safeStatus(course.status) !== 'archived') {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'courses:restore')
  );
}

function canVerifyCourse(actor, course) {
  if (!actor || !course) {
    return false;
  }

  if (HIDDEN_STATUSES.has(safeStatus(course.status))) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'courses:verify')
  );
}

function canDeleteCourse(actor, course) {
  if (!actor || !course) {
    return false;
  }

  if (HIDDEN_STATUSES.has(safeStatus(course.status))) {
    return false;
  }

  return Boolean(
    isAdmin(actor) ||
    hasPermission(actor, 'courses:delete')
  );
}

function canExportCourses(actor) {
  return Boolean(
    actor &&
    (
      isAdmin(actor) ||
      hasPermission(actor, 'courses:export')
    )
  );
}

module.exports = {
  courseOwnerId,
  isCourseOwner,
  canViewCourse,
  canCreateCourse,
  canUpdateCourse,
  canPublishCourse,
  canArchiveCourse,
  canRestoreCourse,
  canVerifyCourse,
  canDeleteCourse,
  canExportCourses,
};
