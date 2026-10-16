
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collegeOwnerId,
  isCollegeOwner,
  canViewCollege,
  canCreateCollege,
  canUpdateCollege,
  canPublishCollege,
  canArchiveCollege,
  canRestoreCollege,
  canVerifyCollege,
  canDeleteCollege,
  canExportColleges,
} = require('../../../src/policies/college.policy');

function makeCollege(overrides = {}) {
  return {
    id: 'college-001',
    name: 'MedOrbits Medical College',
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
// Ownership
// --------------------------------------------------

test('collegeOwnerId returns the first configured owner identifier', () => {
  assert.equal(
    collegeOwnerId(makeCollege()),
    'user-001'
  );

  assert.equal(
    collegeOwnerId({
      ownerId: 'owner-001',
      createdBy: 'creator-001',
      managedBy: 'manager-001',
    }),
    'owner-001'
  );

  assert.equal(
    collegeOwnerId({
      ownerId: null,
      createdBy: 'creator-001',
    }),
    'creator-001'
  );

  assert.equal(
    collegeOwnerId({
      ownerId: '',
      createdBy: null,
      managedBy: 'manager-001',
    }),
    'manager-001'
  );
});

test('collegeOwnerId returns null for missing ownership', () => {
  assert.equal(collegeOwnerId(null), null);
  assert.equal(collegeOwnerId(undefined), null);
  assert.equal(collegeOwnerId('college'), null);
  assert.equal(collegeOwnerId([]), null);
  assert.equal(collegeOwnerId({}), null);
});

test('isCollegeOwner recognizes the matching owner', () => {
  assert.equal(
    isCollegeOwner(makeActor(), makeCollege()),
    true
  );
});

test('isCollegeOwner supports ownerId, createdBy and managedBy', () => {
  assert.equal(
    isCollegeOwner(
      makeActor({ id: 'creator-001' }),
      makeCollege({
        ownerId: null,
        createdBy: 'creator-001',
      })
    ),
    true
  );

  assert.equal(
    isCollegeOwner(
      makeActor({ id: 'manager-001' }),
      makeCollege({
        ownerId: null,
        managedBy: 'manager-001',
      })
    ),
    true
  );
});

test('isCollegeOwner compares numeric and string identifiers safely', () => {
  assert.equal(
    isCollegeOwner(
      makeActor({ id: 123 }),
      makeCollege({ ownerId: '123' })
    ),
    true
  );
});

test('isCollegeOwner denies mismatched or missing identities', () => {
  assert.equal(
    isCollegeOwner(
      makeActor({ id: 'user-002' }),
      makeCollege()
    ),
    false
  );

  assert.equal(isCollegeOwner(null, makeCollege()), false);
  assert.equal(isCollegeOwner(makeActor(), null), false);

  assert.equal(
    isCollegeOwner(
      makeActor({ id: null, userId: null, sub: null, _id: null }),
      makeCollege({ ownerId: null, createdBy: null, managedBy: null })
    ),
    false
  );
});

// --------------------------------------------------
// College visibility
// --------------------------------------------------

test('canViewCollege allows anonymous access to published colleges', () => {
  assert.equal(
    canViewCollege(
      null,
      makeCollege({ status: 'published' })
    ),
    true
  );
});

test('canViewCollege normalizes published status', () => {
  assert.equal(
    canViewCollege(
      null,
      makeCollege({ status: ' PUBLISHED ' })
    ),
    true
  );
});

test('canViewCollege allows owners to view private colleges', () => {
  assert.equal(
    canViewCollege(makeActor(), makeCollege()),
    true
  );

  assert.equal(
    canViewCollege(
      makeActor(),
      makeCollege({ status: 'archived' })
    ),
    true
  );
});

test('canViewCollege allows private-read permission', () => {
  assert.equal(
    canViewCollege(
      makeAuthorizedActor('colleges:read:private', {
        id: 'reviewer-001',
      }),
      makeCollege()
    ),
    true
  );
});

test('canViewCollege allows read-any permission', () => {
  assert.equal(
    canViewCollege(
      makeAuthorizedActor('colleges:read:any'),
      makeCollege()
    ),
    true
  );
});

test('canViewCollege allows administrators to view private colleges', () => {
  assert.equal(
    canViewCollege(makeAdmin(), makeCollege()),
    true
  );
});

test('canViewCollege denies access to deleted colleges', () => {
  const deleted = makeCollege({ status: 'deleted' });

  assert.equal(canViewCollege(null, deleted), false);
  assert.equal(canViewCollege(makeActor(), deleted), false);
  assert.equal(canViewCollege(makeAdmin(), deleted), false);

  assert.equal(
    canViewCollege(
      makeAuthorizedActor('colleges:read:any'),
      deleted
    ),
    false
  );
});

test('canViewCollege denies unauthorized access to drafts', () => {
  assert.equal(
    canViewCollege(
      makeActor({ id: 'user-002' }),
      makeCollege()
    ),
    false
  );

  assert.equal(canViewCollege(null, makeCollege()), false);
});

test('canViewCollege denies malformed resources', () => {
  assert.equal(canViewCollege(makeActor(), null), false);
  assert.equal(canViewCollege(makeActor(), undefined), false);
  assert.equal(canViewCollege(makeActor(), 'college'), false);
  assert.equal(canViewCollege(makeActor(), []), false);
});

// --------------------------------------------------
// College creation
// --------------------------------------------------

test('canCreateCollege allows administrators', () => {
  assert.equal(canCreateCollege(makeAdmin(), {}), true);
});

test('canCreateCollege allows explicit create permission', () => {
  assert.equal(
    canCreateCollege(
      makeAuthorizedActor('colleges:create'),
      { name: 'New College' }
    ),
    true
  );
});

test('canCreateCollege denies users without create permission', () => {
  assert.equal(canCreateCollege(makeActor(), {}), false);
  assert.equal(canCreateCollege(null, {}), false);
});

test('canCreateCollege denies malformed inputs', () => {
  assert.equal(canCreateCollege(makeActor(), null), false);
  assert.equal(canCreateCollege(makeActor(), undefined), false);
  assert.equal(canCreateCollege(makeActor(), []), false);
  assert.equal(canCreateCollege(makeActor(), 'college'), false);
});

// --------------------------------------------------
// College updates and protected fields
// --------------------------------------------------

test('canUpdateCollege allows owners to update ordinary fields', () => {
  assert.equal(
    canUpdateCollege(
      makeActor(),
      makeCollege(),
      {
        name: 'Updated College',
        address: 'Noida',
        description: 'Updated description',
      }
    ),
    true
  );
});

test('canUpdateCollege allows owners to update published colleges', () => {
  assert.equal(
    canUpdateCollege(
      makeActor(),
      makeCollege({ status: 'published' }),
      { name: 'Updated Published College' }
    ),
    true
  );
});

test('canUpdateCollege allows owners to update archived colleges', () => {
  assert.equal(
    canUpdateCollege(
      makeActor(),
      makeCollege({ status: 'archived' }),
      { description: 'Updated archived college' }
    ),
    true
  );
});

test('canUpdateCollege denies updates by non-owners', () => {
  assert.equal(
    canUpdateCollege(
      makeActor({ id: 'user-002' }),
      makeCollege(),
      { name: 'Unauthorized Change' }
    ),
    false
  );
});

test('canUpdateCollege denies owner updates to deleted colleges', () => {
  assert.equal(
    canUpdateCollege(
      makeActor(),
      makeCollege({ status: 'deleted' }),
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
  test(`canUpdateCollege protects the ${field} field from owners`, () => {
    assert.equal(
      canUpdateCollege(
        makeActor(),
        makeCollege(),
        { [field]: 'unauthorized-value' }
      ),
      false
    );
  });
}

test('canUpdateCollege allows administrators to update protected fields', () => {
  assert.equal(
    canUpdateCollege(
      makeAdmin(),
      makeCollege(),
      {
        status: 'published',
        verified: true,
        ownerId: 'user-002',
      }
    ),
    true
  );
});

test('canUpdateCollege allows update-any permission', () => {
  assert.equal(
    canUpdateCollege(
      makeAuthorizedActor('colleges:update:any'),
      makeCollege({ status: 'deleted' }),
      { status: 'published' }
    ),
    true
  );
});

test('canUpdateCollege denies malformed arguments', () => {
  assert.equal(canUpdateCollege(null, makeCollege(), {}), false);
  assert.equal(canUpdateCollege(makeActor(), null, {}), false);
  assert.equal(canUpdateCollege(makeActor(), makeCollege(), null), false);
  assert.equal(canUpdateCollege(makeActor(), makeCollege(), []), false);
  assert.equal(canUpdateCollege(makeActor(), makeCollege(), 'name'), false);
});

// --------------------------------------------------
// Publishing
// --------------------------------------------------

test('canPublishCollege allows administrators to publish drafts', () => {
  assert.equal(
    canPublishCollege(makeAdmin(), makeCollege()),
    true
  );
});

test('canPublishCollege allows explicit publish permission', () => {
  assert.equal(
    canPublishCollege(
      makeAuthorizedActor('colleges:publish'),
      makeCollege()
    ),
    true
  );
});

test('canPublishCollege allows restoring archived colleges to publication', () => {
  assert.equal(
    canPublishCollege(
      makeAuthorizedActor('colleges:publish'),
      makeCollege({ status: 'archived' })
    ),
    true
  );
});

test('canPublishCollege denies users without permission', () => {
  assert.equal(canPublishCollege(makeActor(), makeCollege()), false);
});

test('canPublishCollege denies invalid lifecycle transitions', () => {
  assert.equal(
    canPublishCollege(
      makeAdmin(),
      makeCollege({ status: 'published' })
    ),
    false
  );

  assert.equal(
    canPublishCollege(
      makeAdmin(),
      makeCollege({ status: 'deleted' })
    ),
    false
  );
});

test('canPublishCollege denies missing actors and colleges', () => {
  assert.equal(canPublishCollege(null, makeCollege()), false);
  assert.equal(canPublishCollege(makeAdmin(), null), false);
});

// --------------------------------------------------
// Archiving
// --------------------------------------------------

test('canArchiveCollege allows administrators to archive published colleges', () => {
  assert.equal(
    canArchiveCollege(
      makeAdmin(),
      makeCollege({ status: 'published' })
    ),
    true
  );
});

test('canArchiveCollege allows explicit archive permission', () => {
  assert.equal(
    canArchiveCollege(
      makeAuthorizedActor('colleges:archive'),
      makeCollege({ status: 'published' })
    ),
    true
  );
});

test('canArchiveCollege denies users without permission', () => {
  assert.equal(
    canArchiveCollege(
      makeActor(),
      makeCollege({ status: 'published' })
    ),
    false
  );
});

test('canArchiveCollege denies invalid lifecycle transitions', () => {
  assert.equal(canArchiveCollege(makeAdmin(), makeCollege()), false);

  assert.equal(
    canArchiveCollege(
      makeAdmin(),
      makeCollege({ status: 'archived' })
    ),
    false
  );

  assert.equal(
    canArchiveCollege(
      makeAdmin(),
      makeCollege({ status: 'deleted' })
    ),
    false
  );
});

test('canArchiveCollege denies missing actors and colleges', () => {
  assert.equal(canArchiveCollege(null, makeCollege()), false);
  assert.equal(canArchiveCollege(makeAdmin(), null), false);
});

// --------------------------------------------------
// Restoration
// --------------------------------------------------

test('canRestoreCollege allows administrators to restore archived colleges', () => {
  assert.equal(
    canRestoreCollege(
      makeAdmin(),
      makeCollege({ status: 'archived' })
    ),
    true
  );
});

test('canRestoreCollege allows explicit restore permission', () => {
  assert.equal(
    canRestoreCollege(
      makeAuthorizedActor('colleges:restore'),
      makeCollege({ status: 'archived' })
    ),
    true
  );
});

test('canRestoreCollege denies users without permission', () => {
  assert.equal(
    canRestoreCollege(
      makeActor(),
      makeCollege({ status: 'archived' })
    ),
    false
  );
});

test('canRestoreCollege denies invalid lifecycle transitions', () => {
  assert.equal(canRestoreCollege(makeAdmin(), makeCollege()), false);

  assert.equal(
    canRestoreCollege(
      makeAdmin(),
      makeCollege({ status: 'published' })
    ),
    false
  );

  assert.equal(
    canRestoreCollege(
      makeAdmin(),
      makeCollege({ status: 'deleted' })
    ),
    false
  );
});

test('canRestoreCollege denies missing actors and colleges', () => {
  assert.equal(canRestoreCollege(null, makeCollege()), false);
  assert.equal(canRestoreCollege(makeAdmin(), null), false);
});

// --------------------------------------------------
// Verification
// --------------------------------------------------

test('canVerifyCollege allows administrators to verify active records', () => {
  assert.equal(canVerifyCollege(makeAdmin(), makeCollege()), true);

  assert.equal(
    canVerifyCollege(
      makeAdmin(),
      makeCollege({ status: 'published' })
    ),
    true
  );

  assert.equal(
    canVerifyCollege(
      makeAdmin(),
      makeCollege({ status: 'archived' })
    ),
    true
  );
});

test('canVerifyCollege allows explicit verification permission', () => {
  assert.equal(
    canVerifyCollege(
      makeAuthorizedActor('colleges:verify'),
      makeCollege()
    ),
    true
  );
});

test('canVerifyCollege denies users without permission', () => {
  assert.equal(canVerifyCollege(makeActor(), makeCollege()), false);
});

test('canVerifyCollege denies deleted colleges', () => {
  assert.equal(
    canVerifyCollege(
      makeAdmin(),
      makeCollege({ status: 'deleted' })
    ),
    false
  );

  assert.equal(
    canVerifyCollege(
      makeAuthorizedActor('colleges:verify'),
      makeCollege({ status: 'deleted' })
    ),
    false
  );
});

test('canVerifyCollege denies missing actors and colleges', () => {
  assert.equal(canVerifyCollege(null, makeCollege()), false);
  assert.equal(canVerifyCollege(makeAdmin(), null), false);
});

// --------------------------------------------------
// Deletion
// --------------------------------------------------

test('canDeleteCollege allows administrators to delete records', () => {
  assert.equal(canDeleteCollege(makeAdmin(), makeCollege()), true);
});

test('canDeleteCollege allows explicit delete permission', () => {
  assert.equal(
    canDeleteCollege(
      makeAuthorizedActor('colleges:delete'),
      makeCollege()
    ),
    true
  );
});

test('canDeleteCollege denies users without permission', () => {
  assert.equal(canDeleteCollege(makeActor(), makeCollege()), false);
});

test('canDeleteCollege allows deletion of published colleges with permission', () => {
  assert.equal(
    canDeleteCollege(
      makeAuthorizedActor('colleges:delete'),
      makeCollege({ status: 'published' })
    ),
    true
  );
});

test('canDeleteCollege denies repeated deletion', () => {
  assert.equal(
    canDeleteCollege(
      makeAdmin(),
      makeCollege({ status: 'deleted' })
    ),
    false
  );
});

test('canDeleteCollege denies missing actors and colleges', () => {
  assert.equal(canDeleteCollege(null, makeCollege()), false);
  assert.equal(canDeleteCollege(makeAdmin(), null), false);
});

// --------------------------------------------------
// Exports
// --------------------------------------------------

test('canExportColleges allows administrators', () => {
  assert.equal(canExportColleges(makeAdmin()), true);
});

test('canExportColleges allows explicit export permission', () => {
  assert.equal(
    canExportColleges(
      makeAuthorizedActor('colleges:export')
    ),
    true
  );
});

test('canExportColleges denies unauthorized and anonymous actors', () => {
  assert.equal(canExportColleges(makeActor()), false);
  assert.equal(canExportColleges(null), false);
  assert.equal(canExportColleges(undefined), false);
});

// --------------------------------------------------
// Shared policy utility integration
// --------------------------------------------------

test('college policy recognizes the superadmin role alias', () => {
  const superadmin = makeActor({ role: 'super_admin' });

  assert.equal(canCreateCollege(superadmin, {}), true);
  assert.equal(canExportColleges(superadmin), true);
  assert.equal(canPublishCollege(superadmin, makeCollege()), true);
});

test('college policy recognizes administrator role aliases', () => {
  const administrator = makeActor({ role: 'administrator' });

  assert.equal(canCreateCollege(administrator, {}), true);
  assert.equal(canExportColleges(administrator), true);
});

test('an unknown role alone does not grant administrative privileges', () => {
  const unknown = makeActor({
    role: 'college_supervisor',
    permissions: [],
  });

  assert.equal(canCreateCollege(unknown, {}), false);
  assert.equal(canExportColleges(unknown), false);
  assert.equal(canPublishCollege(unknown, makeCollege()), false);
});

test('an explicit permission grants only its authorized operation', () => {
  const publisher = makeAuthorizedActor('colleges:publish');

  assert.equal(canPublishCollege(publisher, makeCollege()), true);
  assert.equal(canCreateCollege(publisher, {}), false);
  assert.equal(canExportColleges(publisher), false);
});

test('an untrusted isAdmin flag alone grants no administrative privileges', () => {
  const forgedAdmin = makeActor({
    isAdmin: true,
    permissions: [],
  });

  assert.equal(canCreateCollege(forgedAdmin, {}), false);
  assert.equal(canExportColleges(forgedAdmin), false);
  assert.equal(canPublishCollege(forgedAdmin, makeCollege()), false);
});
