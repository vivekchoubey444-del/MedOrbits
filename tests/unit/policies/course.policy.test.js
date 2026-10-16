
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('../../../src/policies/courses.policy');

function makeCourse(overrides = {}) {
  return {
    id: 'course-001',
    name: 'Bachelor of Medicine and Bachelor of Surgery',
    slug: 'mbbs',
    ownerId: 'user-001',
    status: 'draft',
    verified: false,
    ...overrides,
  };
}

function makeActor(overrides = {}) {
  return {
    id: 'user-001',
    role: 'user',
    permissions: [],
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'admin-001',
    role: 'admin',
    ...overrides,
  });
}

function makeAuthorizedActor(permission, overrides = {}) {
  return makeActor({
    permissions: [permission],
    ...overrides,
  });
}

// --------------------------------------------------
// Course ownership
// --------------------------------------------------

test('courseOwnerId returns ownerId', () => {
  assert.equal(courseOwnerId(makeCourse()), 'user-001');
});

test('courseOwnerId supports createdBy as a fallback', () => {
  assert.equal(
    courseOwnerId({
      ownerId: null,
      createdBy: 'creator-001',
    }),
    'creator-001'
  );
});

test('courseOwnerId supports managedBy as a fallback', () => {
  assert.equal(
    courseOwnerId({
      ownerId: null,
      createdBy: null,
      managedBy: 'manager-001',
    }),
    'manager-001'
  );
});

test('courseOwnerId prioritizes owner fields in configured order', () => {
  assert.equal(
    courseOwnerId({
      ownerId: 'owner-001',
      createdBy: 'creator-001',
      managedBy: 'manager-001',
    }),
    'owner-001'
  );
});

test('courseOwnerId returns null for missing or invalid resources', () => {
  assert.equal(courseOwnerId(null), null);
  assert.equal(courseOwnerId(undefined), null);
  assert.equal(courseOwnerId('course'), null);
  assert.equal(courseOwnerId([]), null);
  assert.equal(courseOwnerId({}), null);
});

test('isCourseOwner recognizes the matching owner', () => {
  assert.equal(
    isCourseOwner(makeActor(), makeCourse()),
    true
  );
});

test('isCourseOwner supports createdBy and managedBy', () => {
  assert.equal(
    isCourseOwner(
      makeActor({ id: 'creator-001' }),
      makeCourse({
        ownerId: null,
        createdBy: 'creator-001',
      })
    ),
    true
  );

  assert.equal(
    isCourseOwner(
      makeActor({ id: 'manager-001' }),
      makeCourse({
        ownerId: null,
        managedBy: 'manager-001',
      })
    ),
    true
  );
});

test('isCourseOwner compares numeric and string identifiers', () => {
  assert.equal(
    isCourseOwner(
      makeActor({ id: 123 }),
      makeCourse({ ownerId: '123' })
    ),
    true
  );
});

test('isCourseOwner denies non-owners', () => {
  assert.equal(
    isCourseOwner(
      makeActor({ id: 'user-002' }),
      makeCourse()
    ),
    false
  );
});

test('isCourseOwner denies missing actors and resources', () => {
  assert.equal(isCourseOwner(null, makeCourse()), false);
  assert.equal(isCourseOwner(makeActor(), null), false);
  assert.equal(isCourseOwner(makeActor(), undefined), false);
});

// --------------------------------------------------
// Course visibility
// --------------------------------------------------

test('canViewCourse allows anonymous access to published courses', () => {
  assert.equal(
    canViewCourse(
      null,
      makeCourse({ status: 'published' })
    ),
    true
  );
});

test('canViewCourse normalizes course status', () => {
  assert.equal(
    canViewCourse(
      null,
      makeCourse({ status: ' PUBLISHED ' })
    ),
    true
  );
});

test('canViewCourse allows owners to view draft courses', () => {
  assert.equal(
    canViewCourse(makeActor(), makeCourse()),
    true
  );
});

test('canViewCourse allows owners to view archived courses', () => {
  assert.equal(
    canViewCourse(
      makeActor(),
      makeCourse({ status: 'archived' })
    ),
    true
  );
});

test('canViewCourse allows administrators to view private courses', () => {
  assert.equal(
    canViewCourse(makeAdmin(), makeCourse()),
    true
  );
});

test('canViewCourse allows courses:read:any permission', () => {
  assert.equal(
    canViewCourse(
      makeAuthorizedActor('courses:read:any'),
      makeCourse()
    ),
    true
  );
});

test('canViewCourse allows courses:read:private permission', () => {
  assert.equal(
    canViewCourse(
      makeAuthorizedActor('courses:read:private', {
        id: 'reviewer-001',
      }),
      makeCourse()
    ),
    true
  );
});

test('canViewCourse denies unauthorized access to draft courses', () => {
  assert.equal(
    canViewCourse(
      makeActor({ id: 'user-002' }),
      makeCourse()
    ),
    false
  );

  assert.equal(canViewCourse(null, makeCourse()), false);
});

test('canViewCourse denies access to deleted courses', () => {
  const deleted = makeCourse({ status: 'deleted' });

  assert.equal(canViewCourse(null, deleted), false);
  assert.equal(canViewCourse(makeActor(), deleted), false);
  assert.equal(canViewCourse(makeAdmin(), deleted), false);

  assert.equal(
    canViewCourse(
      makeAuthorizedActor('courses:read:any'),
      deleted
    ),
    false
  );
});

test('canViewCourse denies malformed resources', () => {
  assert.equal(canViewCourse(makeActor(), null), false);
  assert.equal(canViewCourse(makeActor(), undefined), false);
  assert.equal(canViewCourse(makeActor(), 'course'), false);
  assert.equal(canViewCourse(makeActor(), []), false);
});

// --------------------------------------------------
// Course creation
// --------------------------------------------------

test('canCreateCourse allows administrators', () => {
  assert.equal(canCreateCourse(makeAdmin(), {}), true);
});

test('canCreateCourse allows courses:create permission', () => {
  assert.equal(
    canCreateCourse(
      makeAuthorizedActor('courses:create'),
      { name: 'New Course' }
    ),
    true
  );
});

test('canCreateCourse denies users without permission', () => {
  assert.equal(canCreateCourse(makeActor(), {}), false);
  assert.equal(canCreateCourse(null, {}), false);
});

test('canCreateCourse denies invalid input', () => {
  assert.equal(canCreateCourse(makeActor(), null), false);
  assert.equal(canCreateCourse(makeActor(), undefined), false);
  assert.equal(canCreateCourse(makeActor(), []), false);
  assert.equal(canCreateCourse(makeActor(), 'course'), false);
});

// --------------------------------------------------
// Course updates
// --------------------------------------------------

test('canUpdateCourse allows owners to update ordinary fields', () => {
  assert.equal(
    canUpdateCourse(
      makeActor(),
      makeCourse(),
      {
        name: 'Updated Course',
        description: 'Updated description',
        duration: 'Five years',
      }
    ),
    true
  );
});

test('canUpdateCourse allows owners to update published courses', () => {
  assert.equal(
    canUpdateCourse(
      makeActor(),
      makeCourse({ status: 'published' }),
      { name: 'Updated Published Course' }
    ),
    true
  );
});

test('canUpdateCourse allows owners to update archived courses', () => {
  assert.equal(
    canUpdateCourse(
      makeActor(),
      makeCourse({ status: 'archived' }),
      { description: 'Updated description' }
    ),
    true
  );
});

test('canUpdateCourse denies updates by non-owners', () => {
  assert.equal(
    canUpdateCourse(
      makeActor({ id: 'user-002' }),
      makeCourse(),
      { name: 'Unauthorized Change' }
    ),
    false
  );
});

test('canUpdateCourse denies updates to deleted courses', () => {
  assert.equal(
    canUpdateCourse(
      makeActor(),
      makeCourse({ status: 'deleted' }),
      { name: 'Unauthorized Change' }
    ),
    false
  );
});

const protectedFields = [
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
];

for (const field of protectedFields) {
  test(`canUpdateCourse prevents owner changes to ${field}`, () => {
    assert.equal(
      canUpdateCourse(
        makeActor(),
        makeCourse(),
        { [field]: 'unauthorized-value' }
      ),
      false
    );
  });
}

test('canUpdateCourse allows administrators to update protected fields', () => {
  assert.equal(
    canUpdateCourse(
      makeAdmin(),
      makeCourse(),
      {
        status: 'published',
        verified: true,
        ownerId: 'user-002',
      }
    ),
    true
  );
});

test('canUpdateCourse allows courses:update:any permission', () => {
  assert.equal(
    canUpdateCourse(
      makeAuthorizedActor('courses:update:any'),
      makeCourse({ status: 'deleted' }),
      { status: 'published' }
    ),
    true
  );
});

test('canUpdateCourse denies malformed arguments', () => {
  assert.equal(canUpdateCourse(null, makeCourse(), {}), false);
  assert.equal(canUpdateCourse(makeActor(), null, {}), false);
  assert.equal(canUpdateCourse(makeActor(), makeCourse(), null), false);
  assert.equal(canUpdateCourse(makeActor(), makeCourse(), []), false);
  assert.equal(canUpdateCourse(makeActor(), makeCourse(), 'name'), false);
});

// --------------------------------------------------
// Publishing
// --------------------------------------------------

test('canPublishCourse allows administrators to publish drafts', () => {
  assert.equal(
    canPublishCourse(makeAdmin(), makeCourse()),
    true
  );
});

test('canPublishCourse allows courses:publish permission', () => {
  assert.equal(
    canPublishCourse(
      makeAuthorizedActor('courses:publish'),
      makeCourse()
    ),
    true
  );
});

test('canPublishCourse allows publishing archived courses', () => {
  assert.equal(
    canPublishCourse(
      makeAuthorizedActor('courses:publish'),
      makeCourse({ status: 'archived' })
    ),
    true
  );
});

test('canPublishCourse denies unauthorized publishing', () => {
  assert.equal(
    canPublishCourse(makeActor(), makeCourse()),
    false
  );
});

test('canPublishCourse denies invalid lifecycle transitions', () => {
  assert.equal(
    canPublishCourse(
      makeAdmin(),
      makeCourse({ status: 'published' })
    ),
    false
  );

  assert.equal(
    canPublishCourse(
      makeAdmin(),
      makeCourse({ status: 'deleted' })
    ),
    false
  );
});

test('canPublishCourse denies missing actors and courses', () => {
  assert.equal(canPublishCourse(null, makeCourse()), false);
  assert.equal(canPublishCourse(makeAdmin(), null), false);
});

// --------------------------------------------------
// Archiving
// --------------------------------------------------

test('canArchiveCourse allows administrators to archive published courses', () => {
  assert.equal(
    canArchiveCourse(
      makeAdmin(),
      makeCourse({ status: 'published' })
    ),
    true
  );
});

test('canArchiveCourse allows courses:archive permission', () => {
  assert.equal(
    canArchiveCourse(
      makeAuthorizedActor('courses:archive'),
      makeCourse({ status: 'published' })
    ),
    true
  );
});

test('canArchiveCourse denies unauthorized archiving', () => {
  assert.equal(
    canArchiveCourse(
      makeActor(),
      makeCourse({ status: 'published' })
    ),
    false
  );
});

test('canArchiveCourse denies invalid lifecycle transitions', () => {
  assert.equal(canArchiveCourse(makeAdmin(), makeCourse()), false);

  assert.equal(
    canArchiveCourse(
      makeAdmin(),
      makeCourse({ status: 'archived' })
    ),
    false
  );

  assert.equal(
    canArchiveCourse(
      makeAdmin(),
      makeCourse({ status: 'deleted' })
    ),
    false
  );
});

test('canArchiveCourse denies missing actors and courses', () => {
  assert.equal(canArchiveCourse(null, makeCourse()), false);
  assert.equal(canArchiveCourse(makeAdmin(), null), false);
});

// --------------------------------------------------
// Restoration
// --------------------------------------------------

test('canRestoreCourse allows administrators to restore archived courses', () => {
  assert.equal(
    canRestoreCourse(
      makeAdmin(),
      makeCourse({ status: 'archived' })
    ),
    true
  );
});

test('canRestoreCourse allows courses:restore permission', () => {
  assert.equal(
    canRestoreCourse(
      makeAuthorizedActor('courses:restore'),
      makeCourse({ status: 'archived' })
    ),
    true
  );
});

test('canRestoreCourse denies unauthorized restoration', () => {
  assert.equal(
    canRestoreCourse(
      makeActor(),
      makeCourse({ status: 'archived' })
    ),
    false
  );
});

test('canRestoreCourse denies invalid lifecycle transitions', () => {
  assert.equal(canRestoreCourse(makeAdmin(), makeCourse()), false);

  assert.equal(
    canRestoreCourse(
      makeAdmin(),
      makeCourse({ status: 'published' })
    ),
    false
  );

  assert.equal(
    canRestoreCourse(
      makeAdmin(),
      makeCourse({ status: 'deleted' })
    ),
    false
  );
});

test('canRestoreCourse denies missing actors and courses', () => {
  assert.equal(canRestoreCourse(null, makeCourse()), false);
  assert.equal(canRestoreCourse(makeAdmin(), null), false);
});

// --------------------------------------------------
// Verification
// --------------------------------------------------

test('canVerifyCourse allows administrators to verify non-deleted courses', () => {
  assert.equal(canVerifyCourse(makeAdmin(), makeCourse()), true);

  assert.equal(
    canVerifyCourse(
      makeAdmin(),
      makeCourse({ status: 'published' })
    ),
    true
  );

  assert.equal(
    canVerifyCourse(
      makeAdmin(),
      makeCourse({ status: 'archived' })
    ),
    true
  );
});

test('canVerifyCourse allows courses:verify permission', () => {
  assert.equal(
    canVerifyCourse(
      makeAuthorizedActor('courses:verify'),
      makeCourse()
    ),
    true
  );
});

test('canVerifyCourse denies unauthorized verification', () => {
  assert.equal(
    canVerifyCourse(makeActor(), makeCourse()),
    false
  );
});

test('canVerifyCourse denies deleted courses', () => {
  const deleted = makeCourse({ status: 'deleted' });

  assert.equal(canVerifyCourse(makeAdmin(), deleted), false);

  assert.equal(
    canVerifyCourse(
      makeAuthorizedActor('courses:verify'),
      deleted
    ),
    false
  );
});

test('canVerifyCourse denies missing actors and courses', () => {
  assert.equal(canVerifyCourse(null, makeCourse()), false);
  assert.equal(canVerifyCourse(makeAdmin(), null), false);
});

// --------------------------------------------------
// Deletion
// --------------------------------------------------

test('canDeleteCourse allows administrators to delete courses', () => {
  assert.equal(canDeleteCourse(makeAdmin(), makeCourse()), true);
});

test('canDeleteCourse allows courses:delete permission', () => {
  assert.equal(
    canDeleteCourse(
      makeAuthorizedActor('courses:delete'),
      makeCourse()
    ),
    true
  );
});

test('canDeleteCourse denies unauthorized deletion', () => {
  assert.equal(
    canDeleteCourse(makeActor(), makeCourse()),
    false
  );
});

test('canDeleteCourse allows deleting published courses with permission', () => {
  assert.equal(
    canDeleteCourse(
      makeAuthorizedActor('courses:delete'),
      makeCourse({ status: 'published' })
    ),
    true
  );
});

test('canDeleteCourse denies repeated deletion', () => {
  assert.equal(
    canDeleteCourse(
      makeAdmin(),
      makeCourse({ status: 'deleted' })
    ),
    false
  );
});

test('canDeleteCourse denies missing actors and courses', () => {
  assert.equal(canDeleteCourse(null, makeCourse()), false);
  assert.equal(canDeleteCourse(makeAdmin(), null), false);
});

// --------------------------------------------------
// Export
// --------------------------------------------------

test('canExportCourses allows administrators', () => {
  assert.equal(canExportCourses(makeAdmin()), true);
});

test('canExportCourses allows courses:export permission', () => {
  assert.equal(
    canExportCourses(
      makeAuthorizedActor('courses:export')
    ),
    true
  );
});

test('canExportCourses denies unauthorized actors', () => {
  assert.equal(canExportCourses(makeActor()), false);
  assert.equal(canExportCourses(null), false);
  assert.equal(canExportCourses(undefined), false);
});

// --------------------------------------------------
// Authorization boundaries
// --------------------------------------------------

test('course policy recognizes superadmin role', () => {
  const superadmin = makeActor({ role: 'super_admin' });

  assert.equal(canCreateCourse(superadmin, {}), true);
  assert.equal(canExportCourses(superadmin), true);
  assert.equal(canPublishCourse(superadmin, makeCourse()), true);
});

test('unknown role alone does not grant course permissions', () => {
  const unknown = makeActor({
    role: 'course_manager',
    permissions: [],
  });

  assert.equal(canCreateCourse(unknown, {}), false);
  assert.equal(canExportCourses(unknown), false);
  assert.equal(canPublishCourse(unknown, makeCourse()), false);
});

test('explicit permission grants only its designated operation', () => {
  const publisher = makeAuthorizedActor('courses:publish');

  assert.equal(
    canPublishCourse(publisher, makeCourse()),
    true
  );

  assert.equal(canCreateCourse(publisher, {}), false);
  assert.equal(canExportCourses(publisher), false);
});

test('isAdmin flag alone does not grant privileges', () => {
  const forgedAdmin = makeActor({
    isAdmin: true,
    permissions: [],
  });

  assert.equal(canCreateCourse(forgedAdmin, {}), false);
  assert.equal(canExportCourses(forgedAdmin), false);
  assert.equal(
    canPublishCourse(forgedAdmin, makeCourse()),
    false
  );
});
