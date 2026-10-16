'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  universityOwnerId,
  isUniversityOwner,
  canViewUniversity,
  canCreateUniversity,
  canUpdateUniversity,
  canPublishUniversity,
  canArchiveUniversity,
  canRestoreUniversity,
  canVerifyUniversity,
  canDeleteUniversity,
  canExportUniversities,
} = require('../../../src/policies/university.policy');
function makeActor(overrides = {}) {
  return {
    id: 'user-1',
    role: 'user',
    permissions: [],
    ...overrides,
  };
}
function makeUniversity(overrides = {}) {
  return {
    id: 'university-1',
    name: 'Example University',
    ownerId: 'user-1',
    createdBy: 'user-1',
    managedBy: 'user-1',
    status: 'draft',
    verified: false,
    ...overrides,
  };
}
test('universityOwnerId', async (t) => {
  await t.test('returns ownerId when available', () => {
    assert.equal(
      universityOwnerId({
        ownerId: 'owner-1',
        createdBy: 'creator-1',
        managedBy: 'manager-1',
      }),
      'owner-1'
    );
  });
  await t.test('falls back to createdBy', () => {
    assert.equal(
      universityOwnerId({
        ownerId: null,
        createdBy: 'creator-1',
        managedBy: 'manager-1',
      }),
      'creator-1'
    );
  });
  await t.test('falls back to managedBy', () => {
    assert.equal(
      universityOwnerId({
        ownerId: null,
        createdBy: null,
        managedBy: 'manager-1',
      }),
      'manager-1'
    );
  });
  await t.test('returns null when no owner identifier exists', () => {
    assert.equal(universityOwnerId({}), null);
    assert.equal(universityOwnerId({ ownerId: null }), null);
    assert.equal(universityOwnerId({ createdBy: null }), null);
    assert.equal(universityOwnerId({ managedBy: null }), null);
  });
  await t.test('returns null for invalid university values', () => {
    assert.equal(universityOwnerId(null), null);
    assert.equal(universityOwnerId(undefined), null);
    assert.equal(universityOwnerId('university'), null);
    assert.equal(universityOwnerId(123), null);
  });
  await t.test('supports numeric identifiers', () => {
    assert.equal(
      universityOwnerId({ ownerId: 123 }),
      '123'
    );
  });
});
test('isUniversityOwner', async (t) => {
  await t.test('recognizes the owner', () => {
    assert.equal(
      isUniversityOwner(
        makeActor({ id: 'user-1' }),
        makeUniversity({ ownerId: 'user-1' })
      ),
      true
    );
  });
  await t.test('recognizes createdBy ownership', () => {
    assert.equal(
      isUniversityOwner(
        makeActor({ id: 'creator-1' }),
        makeUniversity({
          ownerId: null,
          createdBy: 'creator-1',
        })
      ),
      true
    );
  });
  await t.test('recognizes managedBy ownership', () => {
    assert.equal(
      isUniversityOwner(
        makeActor({ id: 'manager-1' }),
        makeUniversity({
          ownerId: null,
          createdBy: null,
          managedBy: 'manager-1',
        })
      ),
      true
    );
  });
  await t.test('compares compatible identifier types', () => {
    assert.equal(
      isUniversityOwner(
        makeActor({ id: 123 }),
        makeUniversity({ ownerId: '123' })
      ),
      true
    );
  });
  await t.test('rejects a different owner', () => {
    assert.equal(
      isUniversityOwner(
        makeActor({ id: 'user-2' }),
        makeUniversity({ ownerId: 'user-1' })
      ),
      false
    );
  });
  await t.test('rejects missing actors or universities', () => {
    assert.equal(
      isUniversityOwner(null, makeUniversity()),
      false
    );
    assert.equal(
      isUniversityOwner(makeActor(), null),
      false
    );
    assert.equal(
      isUniversityOwner(undefined, undefined),
      false
    );
  });
  await t.test('rejects universities without an owner', () => {
    assert.equal(
      isUniversityOwner(
        makeActor(),
        makeUniversity({
          ownerId: null,
          createdBy: null,
          managedBy: null,
        })
      ),
      false
    );
  });
});
test('canViewUniversity', async (t) => {
  await t.test('allows anyone to view published universities', () => {
    assert.equal(
      canViewUniversity(
        makeActor(),
        makeUniversity({ status: 'published' })
      ),
      true
    );
    assert.equal(
      canViewUniversity(
        null,
        makeUniversity({ status: 'published' })
      ),
      true
    );
    assert.equal(
      canViewUniversity(
        undefined,
        makeUniversity({ status: 'published' })
      ),
      true
    );
  });
  await t.test('allows owners to view private universities', () => {
    for (const status of ['draft', 'archived']) {
      assert.equal(
        canViewUniversity(
          makeActor(),
          makeUniversity({ status })
        ),
        true,
        `Expected owner access for status: ${status}`
      );
    }
  });
  await t.test('denies non-owners access to draft universities by default', () => {
    assert.equal(
      canViewUniversity(
        makeActor({ id: 'user-2' }),
        makeUniversity({ status: 'draft' })
      ),
      false
    );
  });
  await t.test('denies non-owners access to archived universities by default', () => {
    assert.equal(
      canViewUniversity(
        makeActor({ id: 'user-2' }),
        makeUniversity({ status: 'archived' })
      ),
      false
    );
  });
  await t.test('allows private-read permission holders to view private universities', () => {
    const actor = makeActor({
      id: 'user-2',
      permissions: ['universities:read:private'],
    });
    assert.equal(
      canViewUniversity(
        actor,
        makeUniversity({ status: 'draft' })
      ),
      true
    );
    assert.equal(
      canViewUniversity(
        actor,
        makeUniversity({ status: 'archived' })
      ),
      true
    );
  });
  await t.test('allows admins to view private universities', () => {
    assert.equal(
      canViewUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({
          ownerId: 'user-2',
          status: 'draft',
        })
      ),
      true
    );
  });
  await t.test('allows read-any permission holders to view private universities', () => {
    assert.equal(
      canViewUniversity(
        makeActor({
          id: 'user-2',
          permissions: ['universities:read:any'],
        }),
        makeUniversity({ status: 'draft' })
      ),
      true
    );
  });
  await t.test('never exposes deleted universities', () => {
    assert.equal(
      canViewUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'deleted' })
      ),
      false
    );
    assert.equal(
      canViewUniversity(
        makeActor({
          permissions: [
            'universities:read:any',
            'universities:read:private',
          ],
        }),
        makeUniversity({ status: 'deleted' })
      ),
      false
    );
    assert.equal(
      canViewUniversity(
        makeActor(),
        makeUniversity({ status: 'deleted' })
      ),
      false
    );
  });
  await t.test('normalizes university status', () => {
    assert.equal(
      canViewUniversity(
        makeActor(),
        makeUniversity({ status: ' PUBLISHED ' })
      ),
      true
    );
    assert.equal(
      canViewUniversity(
        makeActor(),
        makeUniversity({ status: ' DELETED ' })
      ),
      false
    );
  });
  await t.test('rejects invalid university objects', () => {
    assert.equal(canViewUniversity(makeActor(), null), false);
    assert.equal(canViewUniversity(makeActor(), undefined), false);
    assert.equal(canViewUniversity(makeActor(), 'university'), false);
    assert.equal(canViewUniversity(makeActor(), 123), false);
  });
});
test('canCreateUniversity', async (t) => {
  await t.test('allows administrators to create universities', () => {
    assert.equal(
      canCreateUniversity(makeActor({ role: 'admin' })),
      true
    );
  });
  await t.test('allows actors with universities:create permission', () => {
    assert.equal(
      canCreateUniversity(
        makeActor({
          permissions: ['universities:create'],
        })
      ),
      true
    );
  });
  await t.test('denies actors without create permission', () => {
    assert.equal(
      canCreateUniversity(makeActor()),
      false
    );
    assert.equal(
      canCreateUniversity(
        makeActor({
          permissions: ['universities:read:any'],
        })
      ),
      false
    );
  });
  await t.test('rejects missing actors', () => {
    assert.equal(canCreateUniversity(null), false);
    assert.equal(canCreateUniversity(undefined), false);
  });
  await t.test('rejects invalid input values', () => {
    assert.equal(
      canCreateUniversity(makeActor(), null),
      false
    );
    assert.equal(
      canCreateUniversity(makeActor(), undefined),
      false
    );
    assert.equal(
      canCreateUniversity(makeActor(), []),
      false
    );
    assert.equal(
      canCreateUniversity(makeActor(), 'university'),
      false
    );
  });
  await t.test('accepts a valid object input', () => {
    assert.equal(
      canCreateUniversity(makeActor(), {
        name: 'Example University',
      }),
      false
    );
    assert.equal(
      canCreateUniversity(
        makeActor({ role: 'admin' }),
        { name: 'Example University' }
      ),
      true
    );
  });
  await t.test('does not treat untrusted input fields as authorization', () => {
    assert.equal(
      canCreateUniversity(
        makeActor(),
        {
          ownerId: 'user-1',
          createdBy: 'user-1',
          status: 'published',
          verified: true,
        }
      ),
      false
    );
  });
});
test('canUpdateUniversity', async (t) => {
  await t.test('allows owners to update ordinary fields in editable states', () => {
    for (const status of ['draft', 'published', 'archived']) {
      assert.equal(
        canUpdateUniversity(
          makeActor(),
          makeUniversity({ status }),
          { name: 'Updated University' }
        ),
        true,
        `Expected owner update for status: ${status}`
      );
    }
  });
  await t.test('rejects updates from non-owners', () => {
    assert.equal(
      canUpdateUniversity(
        makeActor({ id: 'user-2' }),
        makeUniversity(),
        { name: 'Changed' }
      ),
      false
    );
  });
  await t.test('allows admins to update universities they do not own', () => {
    assert.equal(
      canUpdateUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ ownerId: 'user-2' }),
        { name: 'Updated University' }
      ),
      true
    );
  });
  await t.test('allows update-any permission holders', () => {
    assert.equal(
      canUpdateUniversity(
        makeActor({
          permissions: ['universities:update:any'],
        }),
        makeUniversity({ ownerId: 'user-2' }),
        { name: 'Updated University' }
      ),
      true
    );
  });
  await t.test('rejects owner updates for non-editable states', () => {
    for (const status of ['deleted', 'pending', 'verified', 'unknown']) {
      assert.equal(
        canUpdateUniversity(
          makeActor(),
          makeUniversity({ status }),
          { name: 'Changed' }
        ),
        false,
        `Expected owner update to be denied for status: ${status}`
      );
    }
  });
  await t.test('rejects missing actors, universities, and changes', () => {
    assert.equal(
      canUpdateUniversity(null, makeUniversity(), {}),
      false
    );
    assert.equal(
      canUpdateUniversity(makeActor(), null, {}),
      false
    );
    assert.equal(
      canUpdateUniversity(makeActor(), makeUniversity(), null),
      false
    );
    assert.equal(
      canUpdateUniversity(makeActor(), makeUniversity(), undefined),
      false
    );
  });
  await t.test('rejects array and primitive change values', () => {
    assert.equal(
      canUpdateUniversity(makeActor(), makeUniversity(), []),
      false
    );
    assert.equal(
      canUpdateUniversity(makeActor(), makeUniversity(), 'name'),
      false
    );
    assert.equal(
      canUpdateUniversity(makeActor(), makeUniversity(), 123),
      false
    );
  });
  await t.test('blocks modification of protected fields', () => {
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
      assert.equal(
        canUpdateUniversity(
          makeActor(),
          makeUniversity(),
          { [field]: 'tampered-value' }
        ),
        false,
        `Expected protected field to be rejected: ${field}`
      );
    }
  });
  await t.test('allows unrelated fields alongside valid changes', () => {
    assert.equal(
      canUpdateUniversity(
        makeActor(),
        makeUniversity(),
        {
          name: 'Updated University',
          description: 'Updated description',
          website: 'https://example.edu',
        }
      ),
      true
    );
  });
  await t.test('privileged update bypasses owner field restrictions', () => {
    assert.equal(
      canUpdateUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity(),
        {
          ownerId: 'user-2',
          status: 'published',
          verified: true,
        }
      ),
      true
    );
    assert.equal(
      canUpdateUniversity(
        makeActor({
          permissions: ['universities:update:any'],
        }),
        makeUniversity(),
        { status: 'deleted' }
      ),
      true
    );
  });
});
test('canPublishUniversity', async (t) => {
  await t.test('allows publishing draft universities with permission', () => {
    assert.equal(
      canPublishUniversity(
        makeActor({
          permissions: ['universities:publish'],
        }),
        makeUniversity({ status: 'draft' })
      ),
      true
    );
  });
  await t.test('allows republishing archived universities with permission', () => {
    assert.equal(
      canPublishUniversity(
        makeActor({
          permissions: ['universities:publish'],
        }),
        makeUniversity({ status: 'archived' })
      ),
      true
    );
  });
  await t.test('allows admins to publish eligible universities', () => {
    assert.equal(
      canPublishUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'draft' })
      ),
      true
    );
  });
  await t.test('denies publishing without the required permission', () => {
    assert.equal(
      canPublishUniversity(
        makeActor(),
        makeUniversity({ status: 'draft' })
      ),
      false
    );
  });
  await t.test('rejects statuses other than draft and archived', () => {
    for (const status of [
      'published',
      'deleted',
      'pending',
      'unknown',
    ]) {
      assert.equal(
        canPublishUniversity(
          makeActor({
            role: 'admin',
            permissions: ['universities:publish'],
          }),
          makeUniversity({ status })
        ),
        false,
        `Expected publishing to be denied for status: ${status}`
      );
    }
  });
  await t.test('rejects missing actors or universities', () => {
    assert.equal(
      canPublishUniversity(null, makeUniversity()),
      false
    );
    assert.equal(
      canPublishUniversity(makeActor(), null),
      false
    );
  });
});
test('canArchiveUniversity', async (t) => {
  await t.test('allows archiving published universities with permission', () => {
    assert.equal(
      canArchiveUniversity(
        makeActor({
          permissions: ['universities:archive'],
        }),
        makeUniversity({ status: 'published' })
      ),
      true
    );
  });
  await t.test('allows admins to archive published universities', () => {
    assert.equal(
      canArchiveUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'published' })
      ),
      true
    );
  });
  await t.test('denies archiving without permission', () => {
    assert.equal(
      canArchiveUniversity(
        makeActor(),
        makeUniversity({ status: 'published' })
      ),
      false
    );
  });
  await t.test('rejects universities not in published state', () => {
    for (const status of [
      'draft',
      'archived',
      'deleted',
      'pending',
      'unknown',
    ]) {
      assert.equal(
        canArchiveUniversity(
          makeActor({
            role: 'admin',
            permissions: ['universities:archive'],
          }),
          makeUniversity({ status })
        ),
        false,
        `Expected archiving to be denied for status: ${status}`
      );
    }
  });
  await t.test('rejects missing actors or universities', () => {
    assert.equal(
      canArchiveUniversity(null, makeUniversity()),
      false
    );
    assert.equal(
      canArchiveUniversity(makeActor(), null),
      false
    );
  });
});
test('canRestoreUniversity', async (t) => {
  await t.test('allows restoring archived universities with permission', () => {
    assert.equal(
      canRestoreUniversity(
        makeActor({
          permissions: ['universities:restore'],
        }),
        makeUniversity({ status: 'archived' })
      ),
      true
    );
  });
  await t.test('allows admins to restore archived universities', () => {
    assert.equal(
      canRestoreUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'archived' })
      ),
      true
    );
  });
  await t.test('denies restoration without permission', () => {
    assert.equal(
      canRestoreUniversity(
        makeActor(),
        makeUniversity({ status: 'archived' })
      ),
      false
    );
  });
  await t.test('rejects universities not in archived state', () => {
    for (const status of [
      'draft',
      'published',
      'deleted',
      'pending',
      'unknown',
    ]) {
      assert.equal(
        canRestoreUniversity(
          makeActor({
            role: 'admin',
            permissions: ['universities:restore'],
          }),
          makeUniversity({ status })
        ),
        false,
        `Expected restoration to be denied for status: ${status}`
      );
    }
  });
  await t.test('rejects missing actors or universities', () => {
    assert.equal(
      canRestoreUniversity(null, makeUniversity()),
      false
    );
    assert.equal(
      canRestoreUniversity(makeActor(), null),
      false
    );
  });
});
test('canVerifyUniversity', async (t) => {
  await t.test('allows verification with the required permission', () => {
    assert.equal(
      canVerifyUniversity(
        makeActor({
          permissions: ['universities:verify'],
        }),
        makeUniversity({ status: 'draft' })
      ),
      true
    );
    assert.equal(
      canVerifyUniversity(
        makeActor({
          permissions: ['universities:verify'],
        }),
        makeUniversity({ status: 'published' })
      ),
      true
    );
    assert.equal(
      canVerifyUniversity(
        makeActor({
          permissions: ['universities:verify'],
        }),
        makeUniversity({ status: 'archived' })
      ),
      true
    );
  });
  await t.test('allows admins to verify non-deleted universities', () => {
    assert.equal(
      canVerifyUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'draft' })
      ),
      true
    );
    assert.equal(
      canVerifyUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'published' })
      ),
      true
    );
  });
  await t.test('denies verification without permission', () => {
    assert.equal(
      canVerifyUniversity(
        makeActor(),
        makeUniversity({ status: 'draft' })
      ),
      false
    );
  });
  await t.test('never allows verification of deleted universities', () => {
    assert.equal(
      canVerifyUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'deleted' })
      ),
      false
    );
    assert.equal(
      canVerifyUniversity(
        makeActor({
          permissions: ['universities:verify'],
        }),
        makeUniversity({ status: 'deleted' })
      ),
      false
    );
  });
  await t.test('rejects missing actors or universities', () => {
    assert.equal(
      canVerifyUniversity(null, makeUniversity()),
      false
    );
    assert.equal(
      canVerifyUniversity(makeActor(), null),
      false
    );
  });
});
test('canDeleteUniversity', async (t) => {
  await t.test('allows deletion with the required permission', () => {
    assert.equal(
      canDeleteUniversity(
        makeActor({
          permissions: ['universities:delete'],
        }),
        makeUniversity({ status: 'draft' })
      ),
      true
    );
    assert.equal(
      canDeleteUniversity(
        makeActor({
          permissions: ['universities:delete'],
        }),
        makeUniversity({ status: 'published' })
      ),
      true
    );
    assert.equal(
      canDeleteUniversity(
        makeActor({
          permissions: ['universities:delete'],
        }),
        makeUniversity({ status: 'archived' })
      ),
      true
    );
  });
  await t.test('allows admins to delete non-deleted universities', () => {
    assert.equal(
      canDeleteUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'published' })
      ),
      true
    );
  });
  await t.test('denies deletion without permission', () => {
    assert.equal(
      canDeleteUniversity(
        makeActor(),
        makeUniversity({ status: 'published' })
      ),
      false
    );
  });
  await t.test('prevents repeated deletion of already-deleted universities', () => {
    assert.equal(
      canDeleteUniversity(
        makeActor({ role: 'admin' }),
        makeUniversity({ status: 'deleted' })
      ),
      false
    );
    assert.equal(
      canDeleteUniversity(
        makeActor({
          permissions: ['universities:delete'],
        }),
        makeUniversity({ status: 'deleted' })
      ),
      false
    );
  });
  await t.test('rejects missing actors or universities', () => {
    assert.equal(
      canDeleteUniversity(null, makeUniversity()),
      false
    );
    assert.equal(
      canDeleteUniversity(makeActor(), null),
      false
    );
  });
});
test('canExportUniversities', async (t) => {
  await t.test('allows administrators to export universities', () => {
    assert.equal(
      canExportUniversities(makeActor({ role: 'admin' })),
      true
    );
  });
  await t.test('allows actors with universities:export permission', () => {
    assert.equal(
      canExportUniversities(
        makeActor({
          permissions: ['universities:export'],
        })
      ),
      true
    );
  });
  await t.test('denies actors without export permission', () => {
    assert.equal(
      canExportUniversities(makeActor()),
      false
    );
    assert.equal(
      canExportUniversities(
        makeActor({
          permissions: ['universities:read:any'],
        })
      ),
      false
    );
  });
  await t.test('rejects missing actors', () => {
    assert.equal(canExportUniversities(null), false);
    assert.equal(canExportUniversities(undefined), false);
  });
});