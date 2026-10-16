
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

const college = (overrides = {}) => ({
  id: 'college-001',
  name: 'MedOrbits Medical College',
  ownerId: 'user-001',
  status: 'draft',
  verified: false,
  ...overrides,
});

const actor = (overrides = {}) => ({
  id: 'user-001',
  role: 'user',
  permissions: [],
  ...overrides,
});

const admin = (overrides = {}) => actor({
  id: 'admin-001',
  role: 'admin',
  ...overrides,
});

const withPermission = (permission, overrides = {}) =>
  actor({
    permissions: [permission],
    ...overrides,
  });

test('collegeOwnerId', async (t) => {
  await t.test('returns ownerId when present', () => {
    assert.equal(collegeOwnerId(college()), 'user-001');
  });

  await t.test('supports createdBy as an ownership fallback', () => {
    assert.equal(
      collegeOwnerId({
        createdBy: 'creator-001',
      }),
      'creator-001'
    );
  });

  await t.test('supports managedBy as an ownership fallback', () => {
    assert.equal(
      collegeOwnerId({
        managedBy: 'manager-001',
      }),
      'manager-001'
    );
  });

  await t.test('uses the first available ownership field', () => {
    assert.equal(
      collegeOwnerId({
        ownerId: 'owner-001',
        createdBy: 'creator-001',
        managedBy: 'manager-001',
      }),
      'owner-001'
    );
  });

  await t.test('returns null for missing or invalid resources', () => {
    assert.equal(collegeOwnerId(null), null);
    assert.equal(collegeOwnerId(undefined), null);
    assert.equal(collegeOwnerId('college'), null);
    assert.equal(collegeOwnerId([]), null);
    assert.equal(collegeOwnerId({}), null);
  });
});

test('isCollegeOwner', async (t) => {
  await t.test('allows the matching owner', () => {
    assert.equal(isCollegeOwner(actor(), college()), true);
  });

  await t.test('normalizes numeric and string identifiers', () => {
    assert.equal(
      isCollegeOwner(
        actor({ id: 123 }),
        college({ ownerId: '123' })
      ),
      true
    );
  });

  await t.test('supports createdBy ownership', () => {
    assert.equal(
      isCollegeOwner(
        actor({ id: 'creator-001' }),
        college({
          ownerId: null,
          createdBy: 'creator-001',
        })
      ),
      true
    );
  });

  await t.test('denies a non-owner', () => {
    assert.equal(
      isCollegeOwner(actor({ id: 'user-002' }), college()),
      false
    );
  });

  await t.test('denies missing actors, resources, and owners', () => {
    assert.equal(isCollegeOwner(null, college()), false);
    assert.equal(isCollegeOwner(actor(), null), false);
    assert.equal(
      isCollegeOwner(actor(), college({ ownerId: null })),
      false
    );
  });
});

test('canViewCollege', async (t) => {
  await t.test('allows public access to published colleges', () => {
    assert.equal(
      canViewCollege(null, college({ status: 'published' })),
      true
    );
  });

  await t.test('normalizes college status', () => {
    assert.equal(
      canViewCollege(null, college({ status: ' PUBLISHED ' })),
      true
    );
  });

  await t.test('allows an owner to view a draft college', () => {
    assert.equal(canViewCollege(actor(), college()), true);
  });

  await t.test('allows an owner to view an archived college', () => {
    assert.equal(
      canViewCollege(
        actor(),
        college({ status: 'archived' })
      ),
      true
    );
  });

  await t.test('denies a non-owner access to a draft college', () => {
    assert.equal(
      canViewCollege(
        actor({ id: 'user-002' }),
        college()
      ),
      false
    );
  });

  await t.test('allows explicit private-read permission', () => {
    assert.equal(
      canViewCollege(
        withPermission('colleges:read:private', {
          id: 'reviewer-001',
        }),
        college()
      ),
      true
    );
  });

  await t.test('allows explicit read-any permission', () => {
    assert.equal(
      canViewCollege(
        withPermission('colleges:read:any'),
        college()
      ),
      true
    );
  });

  await t.test('allows administrators to view private colleges', () => {
    assert.equal(
      canViewCollege(admin(), college()),
      true
    );
  });

  await t.test('always denies deleted colleges', () => {
    assert.equal(
      canViewCollege(
        admin(),
        college({ status: 'deleted' })
      ),
      false
    );
  });

  await t.test('denies missing or malformed resources', () => {
    assert.equal(canViewCollege(actor(), null), false);
    assert.equal(canViewCollege(actor(), 'college'), false);
    assert.equal(canViewCollege(actor(), []), false);
  });
});

test('canCreateCollege', async (t) => {
  await t.test('allows an administrator', () => {
    assert.equal(canCreateCollege(admin(), {}), true);
  });

  await t.test('allows explicit create permission', () => {
    assert.equal(
      canCreateCollege(
        withPermission('colleges:create'),
        { name: 'New College' }
      ),
      true
    );
  });

  await t.test('denies users without create permission', () => {
    assert.equal(canCreateCollege(actor(), {}), false);
  });

  await t.test('denies anonymous actors', () => {
    assert.equal(canCreateCollege(null, {}), false);
  });

  await t.test('denies invalid input', () => {
    assert.equal(canCreateCollege(actor(), null), false);
    assert.equal(canCreateCollege(actor(), []), false);
    assert.equal(canCreateCollege(actor(), 'college'), false);
  });
});

test('canUpdateCollege', async (t) => {
  await t.test('allows an owner to update ordinary fields in draft', () => {
    assert.equal(
      canUpdateCollege(actor(), college(), {
        name: 'Updated College',
        address: 'Noida',
      }),
      true
    );
  });

  await t.test('allows an owner to update ordinary fields when published', () => {
    assert.equal(
      canUpdateCollege(
        actor(),
        college({ status: 'published' }),
        { name: 'Updated Name' }
      ),
      true
    );
  });

  await t.test('allows an owner to update ordinary fields when archived', () => {
    assert.equal(
      canUpdateCollege(
        actor(),
        college({ status: 'archived' }),
        { description: 'Updated description' }
      ),
      true
    );
  });

  await t.test('denies updates by non-owners', () => {
    assert.equal(
      canUpdateCollege(
        actor({ id: 'user-002' }),
        college(),
        { name: 'Unauthorized Change' }
      ),
      false
    );
  });

  await t.test('denies updates to deleted colleges for ordinary owners', () => {
    assert.equal(
      canUpdateCollege(
        actor(),
        college({ status: 'deleted' }),
        { name: 'Updated Name' }
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
    await t.test(`denies owner changes to protected field: ${field}`, () => {
      assert.equal(
        canUpdateCollege(
          actor(),
          college(),
          { [field]: 'unauthorized-value' }
        ),
        false
      );
    });
  }

  await t.test('allows an administrator to update protected fields', () => {
    assert.equal(
      canUpdateCollege(
        admin(),
        college({ status: 'deleted' }),
        {
          status: 'published',
          verified: true,
          ownerId: 'user-002',
        }
      ),
      true
    );
  });

  await t.test('allows explicit update-any permission', () => {
    assert.equal(
      canUpdateCollege(
        withPermission('colleges:update:any'),
        college({ status: 'deleted' }),
        { status: 'published' }
      ),
      true
    );
  });

  await t.test('denies malformed actor, resource, and changes', () => {
    assert.equal(canUpdateCollege(null, college(), {}), false);
    assert.equal(canUpdateCollege(actor(), null, {}), false);
    assert.equal(canUpdateCollege(actor(), college(), null), false);
    assert.equal(canUpdateCollege(actor(), college(), []), false);
    assert.equal(canUpdateCollege(actor(), college(), 'name'), false);
  });
});

test('canPublishCollege', async (t) => {
  await t.test('allows an administrator to publish a draft', () => {
    assert.equal(
      canPublishCollege(admin(), college()),
      true
    );
  });

  await t.test('allows explicit publish permission', () => {
    assert.equal(
      canPublishCollege(
        withPermission('colleges:publish'),
        college()
      ),
      true
    );
  });

  await t.test('allows publishing an archived college with permission', () => {
    assert.equal(
      canPublishCollege(
        withPermission('colleges:publish'),
        college({ status: 'archived' })
      ),
      true
    );
  });

  await t.test('denies publishing without permission', () => {
    assert.equal(canPublishCollege(actor(), college()), false);
  });

  await t.test('denies publishing a published college', () => {
    assert.equal(
      canPublishCollege(
        admin(),
        college({ status: 'published' })
      ),
      false
    );
  });

  await t.test('denies publishing a deleted college', () => {
    assert.equal(
      canPublishCollege(
        admin(),
        college({ status: 'deleted' })
      ),
      false
    );
  });

  await t.test('denies missing actors and resources', () => {
    assert.equal(canPublishCollege(null, college()), false);
    assert.equal(canPublishCollege(admin(), null), false);
  });
});

test('canArchiveCollege', async (t) => {
  await t.test('allows an administrator to archive a published college', () => {
    assert.equal(
      canArchiveCollege(
        admin(),
        college({ status: 'published' })
      ),
      true
    );
  });

  await t.test('allows explicit archive permission', () => {
    assert.equal(
      canArchiveCollege(
        withPermission('colleges:archive'),
        college({ status: 'published' })
      ),
      true
    );
  });

  await t.test('denies archiving without permission', () => {
    assert.equal(
      canArchiveCollege(
        actor(),
        college({ status: 'published' })
      ),
      false
    );
  });

  await t.test('denies archiving a draft college', () => {
    assert.equal(canArchiveCollege(admin(), college()), false);
  });

  await t.test('denies archiving an already archived college', () => {
    assert.equal(
      canArchiveCollege(
        admin(),
        college({ status: 'archived' })
      ),
      false
    );
  });

  await t.test('denies missing actors and resources', () => {
    assert.equal(canArchiveCollege(null, college()), false);
    assert.equal(canArchiveCollege(admin(), null), false);
  });
});

test('canRestoreCollege', async (t) => {
  await t.test('allows an administrator to restore an archived college', () => {
    assert.equal(
      canRestoreCollege(
        admin(),
        college({ status: 'archived' })
      ),
      true
    );
  });

  await t.test('allows explicit restore permission', () => {
    assert.equal(
      canRestoreCollege(
        withPermission('colleges:restore'),
        college({ status: 'archived' })
      ),
      true
    );
  });

  await t.test('denies restoring without permission', () => {
    assert.equal(
      canRestoreCollege(
        actor(),
        college({ status: 'archived' })
      ),
      false
    );
  });

  await t.test('denies restoring a draft college', () => {
    assert.equal(canRestoreCollege(admin(), college()), false);
  });

  await t.test('denies restoring a published college', () => {
    assert.equal(
      canRestoreCollege(
        admin(),
        college({ status: 'published' })
      ),
      false
    );
  });

  await t.test('denies missing actors and resources', () => {
    assert.equal(canRestoreCollege(null, college()), false);
    assert.equal(canRestoreCollege(admin(), null), false);
  });
});

test('canVerifyCollege', async (t) => {
  await t.test('allows an administrator to verify a draft college', () => {
    assert.equal(canVerifyCollege(admin(), college()), true);
  });

  await t.test('allows explicit verification permission', () => {
    assert.equal(
      canVerifyCollege(
        withPermission('colleges:verify'),
        college()
      ),
      true
    );
  });

  await t.test('denies verification without permission', () => {
    assert.equal(canVerifyCollege(actor(), college()), false);
  });

  await t.test('allows verification of a published college', () => {
    assert.equal(
      canVerifyCollege(
        admin(),
        college({ status: 'published' })
      ),
      true
    );
  });

  await t.test('allows verification of an archived college', () => {
    assert.equal(
      canVerifyCollege(
        admin(),
        college({ status: 'archived' })
      ),
      true
    );
  });

  await t.test('denies verification of a deleted college', () => {
    assert.equal(
      canVerifyCollege(
        admin(),
        college({ status: 'deleted' })
      ),
      false
    );
  });

  await t.test('denies missing actors and resources', () => {
    assert.equal(canVerifyCollege(null, college()), false);
    assert.equal(canVerifyCollege(admin(), null), false);
  });
});

test('canDeleteCollege', async (t) => {
  await t.test('allows an administrator to delete a draft college', () => {
    assert.equal(canDeleteCollege(admin(), college()), true);
  });

  await t.test('allows explicit delete permission', () => {
    assert.equal(
      canDeleteCollege(
        withPermission('colleges:delete'),
        college()
      ),
      true
    );
  });

  await t.test('denies deletion without permission', () => {
    assert.equal(canDeleteCollege(actor(), college()), false);
  });

  await t.test('allows deletion of a published college with permission', () => {
    assert.equal(
      canDeleteCollege(
        admin(),
        college({ status: 'published' })
      ),
      true
    );
  });

  await t.test('denies deleting an already deleted college', () => {
    assert.equal(
      canDeleteCollege(
        admin(),
        college({ status: 'deleted' })
      ),
      false
    );
  });

  await t.test('denies missing actors and resources', () => {
    assert.equal(canDeleteCollege(null, college()), false);
    assert.equal(canDeleteCollege(admin(), null), false);
  });
});

test('canExportColleges', async (t) => {
  await t.test('allows an administrator to export colleges', () => {
    assert.equal(canExportColleges(admin()), true);
  });

  await t.test('allows explicit export permission', () => {
    assert.equal(
      canExportColleges(
        withPermission('colleges:export')
      ),
      true
    );
  });

  await t.test('denies users without export permission', () => {
    assert.equal(canExportColleges(actor()), false);
  });

  await t.test('denies anonymous actors', () => {
    assert.equal(canExportColleges(null), false);
  });
});

test('authorization boundary cases', async (t) => {
  await t.test('superadmin receives administrative privileges', () => {
    const superadmin = actor({ role: 'super_admin' });

    assert.equal(canCreateCollege(superadmin, {}), true);
    assert.equal(canPublishCollege(superadmin, college()), true);
    assert.equal(
      canArchiveCollege(
        superadmin,
        college({ status: 'published' })
      ),
      true
    );
    assert.equal(canExportColleges(superadmin), true);
  });

  await t.test('does not grant privileges for an unknown role alone', () => {
    const unknown = actor({
      role: 'college_supervisor',
      permissions: [],
    });

    assert.equal(canCreateCollege(unknown, {}), false);
    assert.equal(canExportColleges(unknown), false);
    assert.equal(canPublishCollege(unknown, college()), false);
  });

  await t.test('supports permissions alongside a non-admin role', () => {
    const publisher = actor({
      role: 'user',
      permissions: ['colleges:publish'],
    });

    assert.equal(canPublishCollege(publisher, college()), true);
    assert.equal(canCreateCollege(publisher, {}), false);
  });

  await t.test('does not trust isAdmin without a recognized role or permission', () => {
    const forgedAdmin = actor({
      isAdmin: true,
      permissions: [],
    });

    assert.equal(canCreateCollege(forgedAdmin, {}), false);
    assert.equal(canExportColleges(forgedAdmin), false);
  });
});
