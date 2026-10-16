
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  internshipOwnerId,
  internshipEmployerId,
  isInternshipOwner,
  canViewInternship,
  canCreateInternship,
  canUpdateInternship,
  canPublishInternship,
  canPauseInternship,
  canCloseInternship,
  canMarkInternshipFilled,
  canDeleteInternship,
  canViewInternshipApplicants,
  canExportInternships,
} = require('../../../src/policies/internship.policy');

function makeInternship(overrides = {}) {
  return {
    id: 'internship-001',
    employerId: 'employer-001',
    ownerId: 'user-001',
    title: 'Software Engineering Intern',
    status: 'draft',
    verified: false,
    applicationCount: 0,
    ...overrides,
  };
}

function makeActor(overrides = {}) {
  return {
    id: 'user-001',
    role: 'employer',
    employerId: 'employer-001',
    permissions: [],
    isSuspended: false,
    status: 'active',
    ...overrides,
  };
}

function makeAdmin(overrides = {}) {
  return makeActor({
    id: 'admin-001',
    role: 'admin',
    employerId: null,
    ...overrides,
  });
}

function withPermission(permission, overrides = {}) {
  return makeActor({
    permissions: [permission],
    ...overrides,
  });
}

function makeOwner(overrides = {}) {
  return withPermission(
    'internships:publish:own-employer',
    overrides
  );
}

// --------------------------------------------------
// Ownership helpers
// --------------------------------------------------

test('internshipEmployerId returns employerId', () => {
  assert.equal(
    internshipEmployerId(makeInternship()),
    'employer-001'
  );
});

test('internshipEmployerId returns null for missing values', () => {
  assert.equal(internshipEmployerId(null), null);
  assert.equal(internshipEmployerId(undefined), null);
  assert.equal(internshipEmployerId('internship'), null);
  assert.equal(internshipEmployerId({}), null);
});

test('internshipOwnerId prioritizes employer ownership', () => {
  assert.equal(
    internshipOwnerId(
      makeInternship({
        employerId: 'employer-001',
        ownerId: 'user-001',
      })
    ),
    'employer-001'
  );
});

test('internshipOwnerId supports ownerId, createdBy and managedBy', () => {
  assert.equal(
    internshipOwnerId({
      employerId: null,
      ownerId: 'owner-001',
      createdBy: 'creator-001',
      managedBy: 'manager-001',
    }),
    'owner-001'
  );

  assert.equal(
    internshipOwnerId({
      employerId: null,
      ownerId: null,
      createdBy: 'creator-001',
      managedBy: 'manager-001',
    }),
    'creator-001'
  );

  assert.equal(
    internshipOwnerId({
      employerId: null,
      ownerId: null,
      createdBy: null,
      managedBy: 'manager-001',
    }),
    'manager-001'
  );
});

test('internshipOwnerId handles invalid resources', () => {
  assert.equal(internshipOwnerId(null), null);
  assert.equal(internshipOwnerId(undefined), null);
  assert.equal(internshipOwnerId('internship'), null);
  assert.equal(internshipOwnerId([]), null);
  assert.equal(internshipOwnerId({}), null);
});

test('isInternshipOwner recognizes the matching employer', () => {
  assert.equal(
    isInternshipOwner(
      makeActor(),
      makeInternship()
    ),
    true
  );
});

test('isInternshipOwner requires employer role for employerId matching', () => {
  assert.equal(
    isInternshipOwner(
      makeActor({ role: 'user' }),
      makeInternship()
    ),
    false
  );
});

test('isInternshipOwner recognizes matching ownerId', () => {
  assert.equal(
    isInternshipOwner(
      makeActor({
        id: 'owner-001',
        employerId: 'different-employer',
      }),
      makeInternship({
        employerId: 'employer-001',
        ownerId: 'owner-001',
      })
    ),
    true
  );
});

test('isInternshipOwner supports createdBy and managedBy', () => {
  assert.equal(
    isInternshipOwner(
      makeActor({
        id: 'creator-001',
        employerId: null,
      }),
      makeInternship({
        employerId: null,
        createdBy: 'creator-001',
      })
    ),
    true
  );

  assert.equal(
    isInternshipOwner(
      makeActor({
        id: 'manager-001',
        employerId: null,
      }),
      makeInternship({
        employerId: null,
        managedBy: 'manager-001',
      })
    ),
    true
  );
});

test('isInternshipOwner denies mismatched identities', () => {
  assert.equal(
    isInternshipOwner(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeInternship()
    ),
    false
  );
});

test('isInternshipOwner denies missing actors and internships', () => {
  assert.equal(isInternshipOwner(null, makeInternship()), false);
  assert.equal(isInternshipOwner(makeActor(), null), false);
});

// --------------------------------------------------
// Visibility
// --------------------------------------------------

test('canViewInternship allows public access to published internships', () => {
  assert.equal(
    canViewInternship(
      null,
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canViewInternship allows case-normalized published status', () => {
  assert.equal(
    canViewInternship(
      null,
      makeInternship({ status: ' PUBLISHED ' })
    ),
    true
  );
});

test('canViewInternship allows owners to view private internships', () => {
  assert.equal(
    canViewInternship(
      makeActor(),
      makeInternship()
    ),
    true
  );

  assert.equal(
    canViewInternship(
      makeActor(),
      makeInternship({ status: 'paused' })
    ),
    true
  );
});

test('canViewInternship allows administrators to view private internships', () => {
  assert.equal(
    canViewInternship(
      makeAdmin(),
      makeInternship()
    ),
    true
  );
});

test('canViewInternship allows internships:read:any permission', () => {
  assert.equal(
    canViewInternship(
      withPermission('internships:read:any', {
        id: 'reviewer-001',
        employerId: null,
      }),
      makeInternship()
    ),
    true
  );
});

test('canViewInternship allows internships:read:private permission', () => {
  assert.equal(
    canViewInternship(
      withPermission('internships:read:private', {
        id: 'reviewer-001',
        employerId: null,
      }),
      makeInternship()
    ),
    true
  );
});

test('canViewInternship denies unrelated users access to drafts', () => {
  assert.equal(
    canViewInternship(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeInternship()
    ),
    false
  );

  assert.equal(canViewInternship(null, makeInternship()), false);
});

test('canViewInternship denies terminal statuses', () => {
  for (const status of ['closed', 'filled', 'deleted']) {
    assert.equal(
      canViewInternship(
        makeAdmin(),
        makeInternship({ status })
      ),
      false,
      `Expected ${status} internships to be hidden`
    );
  }
});

test('canViewInternship denies invalid resources', () => {
  assert.equal(canViewInternship(makeActor(), null), false);
  assert.equal(canViewInternship(makeActor(), undefined), false);
  assert.equal(canViewInternship(makeActor(), 'internship'), false);
});

// --------------------------------------------------
// Creation
// --------------------------------------------------

test('canCreateInternship allows administrators', () => {
  assert.equal(
    canCreateInternship(makeAdmin(), {}),
    true
  );
});

test('canCreateInternship allows internships:create:any permission', () => {
  assert.equal(
    canCreateInternship(
      withPermission('internships:create:any', {
        role: 'user',
        isSuspended: true,
      }),
      {}
    ),
    true
  );
});

test('canCreateInternship allows authorized active employers', () => {
  assert.equal(
    canCreateInternship(
      withPermission('internships:create:own-employer'),
      {}
    ),
    true
  );
});

test('canCreateInternship denies employers without create permission', () => {
  assert.equal(
    canCreateInternship(makeActor(), {}),
    false
  );
});

test('canCreateInternship denies non-employer roles without global permission', () => {
  assert.equal(
    canCreateInternship(
      withPermission('internships:create:own-employer', {
        role: 'user',
      }),
      {}
    ),
    false
  );
});

test('canCreateInternship denies suspended employers', () => {
  assert.equal(
    canCreateInternship(
      withPermission('internships:create:own-employer', {
        isSuspended: true,
      }),
      {}
    ),
    false
  );

  assert.equal(
    canCreateInternship(
      withPermission('internships:create:own-employer', {
        status: 'suspended',
      }),
      {}
    ),
    false
  );
});

test('canCreateInternship denies disabled employers', () => {
  assert.equal(
    canCreateInternship(
      withPermission('internships:create:own-employer', {
        status: 'disabled',
      }),
      {}
    ),
    false
  );
});

test('canCreateInternship requires an employer account ID', () => {
  assert.equal(
    canCreateInternship(
      withPermission('internships:create:own-employer', {
        employerId: null,
      }),
      {}
    ),
    false
  );
});

test('canCreateInternship rejects invalid actors and input', () => {
  assert.equal(canCreateInternship(null, {}), false);
  assert.equal(canCreateInternship(makeActor(), null), false);
  assert.equal(canCreateInternship(makeActor(), []), false);
  assert.equal(canCreateInternship(makeActor(), 'internship'), false);
});

// --------------------------------------------------
// Updates and protected fields
// --------------------------------------------------

test('canUpdateInternship allows owners to update editable statuses', () => {
  for (const status of ['draft', 'published', 'paused']) {
    assert.equal(
      canUpdateInternship(
        makeActor(),
        makeInternship({ status }),
        { title: 'Updated internship' }
      ),
      true,
      `Expected updates for ${status}`
    );
  }
});

test('canUpdateInternship denies updates by non-owners', () => {
  assert.equal(
    canUpdateInternship(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeInternship(),
      { title: 'Unauthorized update' }
    ),
    false
  );
});

test('canUpdateInternship denies updates to terminal statuses', () => {
  for (const status of ['closed', 'filled', 'deleted']) {
    assert.equal(
      canUpdateInternship(
        makeActor(),
        makeInternship({ status }),
        { title: 'Unauthorized update' }
      ),
      false
    );
  }
});

const protectedFields = [
  'id',
  '_id',
  'employerId',
  'ownerId',
  'createdBy',
  'managedBy',
  'status',
  'verified',
  'verificationStatus',
  'approvedBy',
  'approvedAt',
  'publishedAt',
  'closedAt',
  'filledAt',
  'deletedAt',
  'applicationCount',
  'createdAt',
  'updatedAt',
];

for (const field of protectedFields) {
  test(`canUpdateInternship protects ${field} from owner updates`, () => {
    assert.equal(
      canUpdateInternship(
        makeActor(),
        makeInternship(),
        { [field]: 'unauthorized-value' }
      ),
      false
    );
  });
}

test('canUpdateInternship allows ordinary editable fields', () => {
  assert.equal(
    canUpdateInternship(
      makeActor(),
      makeInternship(),
      {
        title: 'Frontend Developer Intern',
        description: 'Updated role description',
        location: 'Noida',
        stipend: 25000,
      }
    ),
    true
  );
});

test('canUpdateInternship allows administrators to update protected fields', () => {
  assert.equal(
    canUpdateInternship(
      makeAdmin(),
      makeInternship(),
      {
        status: 'published',
        verified: true,
        employerId: 'employer-002',
      }
    ),
    true
  );
});

test('canUpdateInternship allows internships:update:any permission', () => {
  assert.equal(
    canUpdateInternship(
      withPermission('internships:update:any', {
        id: 'user-002',
        employerId: null,
      }),
      makeInternship({ status: 'deleted' }),
      { status: 'published' }
    ),
    true
  );
});

test('canUpdateInternship rejects malformed arguments', () => {
  assert.equal(canUpdateInternship(null, makeInternship(), {}), false);
  assert.equal(canUpdateInternship(makeActor(), null, {}), false);
  assert.equal(canUpdateInternship(makeActor(), makeInternship(), null), false);
  assert.equal(canUpdateInternship(makeActor(), makeInternship(), []), false);
  assert.equal(canUpdateInternship(makeActor(), makeInternship(), 'title'), false);
});

// --------------------------------------------------
// Publishing
// --------------------------------------------------

test('canPublishInternship allows administrators to publish drafts', () => {
  assert.equal(
    canPublishInternship(
      makeAdmin(),
      makeInternship()
    ),
    true
  );
});

test('canPublishInternship allows administrators to publish paused internships', () => {
  assert.equal(
    canPublishInternship(
      makeAdmin(),
      makeInternship({ status: 'paused' })
    ),
    true
  );
});

test('canPublishInternship allows global publish permission', () => {
  assert.equal(
    canPublishInternship(
      withPermission('internships:publish:any'),
      makeInternship()
    ),
    true
  );
});

test('canPublishInternship allows authorized employer owners', () => {
  assert.equal(
    canPublishInternship(
      makeOwner(),
      makeInternship()
    ),
    true
  );
});

test('canPublishInternship denies owners without publish permission', () => {
  assert.equal(
    canPublishInternship(
      makeActor(),
      makeInternship()
    ),
    false
  );
});

test('canPublishInternship denies invalid transitions', () => {
  for (const status of ['published', 'closed', 'filled', 'deleted']) {
    assert.equal(
      canPublishInternship(
        makeAdmin(),
        makeInternship({ status })
      ),
      false
    );
  }
});

test('canPublishInternship denies missing arguments', () => {
  assert.equal(canPublishInternship(null, makeInternship()), false);
  assert.equal(canPublishInternship(makeAdmin(), null), false);
});

// --------------------------------------------------
// Pausing
// --------------------------------------------------

test('canPauseInternship allows administrators to pause published internships', () => {
  assert.equal(
    canPauseInternship(
      makeAdmin(),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canPauseInternship allows global pause permission', () => {
  assert.equal(
    canPauseInternship(
      withPermission('internships:pause:any'),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canPauseInternship allows authorized employer owners', () => {
  assert.equal(
    canPauseInternship(
      withPermission('internships:pause:own-employer'),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canPauseInternship denies owners without pause permission', () => {
  assert.equal(
    canPauseInternship(
      makeActor(),
      makeInternship({ status: 'published' })
    ),
    false
  );
});

test('canPauseInternship denies non-published internships', () => {
  for (const status of ['draft', 'paused', 'closed', 'filled', 'deleted']) {
    assert.equal(
      canPauseInternship(
        makeAdmin(),
        makeInternship({ status })
      ),
      false
    );
  }
});

test('canPauseInternship denies missing arguments', () => {
  assert.equal(canPauseInternship(null, makeInternship()), false);
  assert.equal(canPauseInternship(makeAdmin(), null), false);
});

// --------------------------------------------------
// Closing
// --------------------------------------------------

test('canCloseInternship allows administrators to close active internships', () => {
  for (const status of ['draft', 'published', 'paused']) {
    assert.equal(
      canCloseInternship(
        makeAdmin(),
        makeInternship({ status })
      ),
      true
    );
  }
});

test('canCloseInternship allows global close permission', () => {
  assert.equal(
    canCloseInternship(
      withPermission('internships:close:any'),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canCloseInternship allows authorized employer owners', () => {
  assert.equal(
    canCloseInternship(
      withPermission('internships:close:own-employer'),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canCloseInternship denies owners without close permission', () => {
  assert.equal(
    canCloseInternship(
      makeActor(),
      makeInternship({ status: 'published' })
    ),
    false
  );
});

test('canCloseInternship denies terminal statuses', () => {
  for (const status of ['closed', 'filled', 'deleted']) {
    assert.equal(
      canCloseInternship(
        makeAdmin(),
        makeInternship({ status })
      ),
      false
    );
  }
});

test('canCloseInternship denies missing arguments', () => {
  assert.equal(canCloseInternship(null, makeInternship()), false);
  assert.equal(canCloseInternship(makeAdmin(), null), false);
});

// --------------------------------------------------
// Marking internships filled
// --------------------------------------------------

test('canMarkInternshipFilled allows administrators', () => {
  assert.equal(
    canMarkInternshipFilled(
      makeAdmin(),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canMarkInternshipFilled allows global permission', () => {
  assert.equal(
    canMarkInternshipFilled(
      withPermission('internships:mark-filled:any'),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canMarkInternshipFilled allows authorized employer owners', () => {
  assert.equal(
    canMarkInternshipFilled(
      withPermission('internships:mark-filled:own-employer'),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canMarkInternshipFilled denies owners without permission', () => {
  assert.equal(
    canMarkInternshipFilled(
      makeActor(),
      makeInternship({ status: 'published' })
    ),
    false
  );
});

test('canMarkInternshipFilled requires published status', () => {
  for (const status of ['draft', 'paused', 'closed', 'filled', 'deleted']) {
    assert.equal(
      canMarkInternshipFilled(
        makeAdmin(),
        makeInternship({ status })
      ),
      false
    );
  }
});

test('canMarkInternshipFilled denies missing arguments', () => {
  assert.equal(canMarkInternshipFilled(null, makeInternship()), false);
  assert.equal(canMarkInternshipFilled(makeAdmin(), null), false);
});

// --------------------------------------------------
// Deletion
// --------------------------------------------------

test('canDeleteInternship allows administrators to delete non-deleted internships', () => {
  for (const status of ['draft', 'published', 'paused', 'closed', 'filled']) {
    assert.equal(
      canDeleteInternship(
        makeAdmin(),
        makeInternship({ status })
      ),
      true
    );
  }
});

test('canDeleteInternship allows global delete permission', () => {
  assert.equal(
    canDeleteInternship(
      withPermission('internships:delete:any'),
      makeInternship({ status: 'published' })
    ),
    true
  );
});

test('canDeleteInternship allows owners to delete drafts', () => {
  assert.equal(
    canDeleteInternship(
      withPermission('internships:delete:own-employer'),
      makeInternship({ status: 'draft' })
    ),
    true
  );
});

test('canDeleteInternship denies owner deletion of published internships', () => {
  assert.equal(
    canDeleteInternship(
      withPermission('internships:delete:own-employer'),
      makeInternship({ status: 'published' })
    ),
    false
  );
});

test('canDeleteInternship denies owner deletion of paused internships', () => {
  assert.equal(
    canDeleteInternship(
      withPermission('internships:delete:own-employer'),
      makeInternship({ status: 'paused' })
    ),
    false
  );
});

test('canDeleteInternship denies owners without delete permission', () => {
  assert.equal(
    canDeleteInternship(
      makeActor(),
      makeInternship({ status: 'draft' })
    ),
    false
  );
});

test('canDeleteInternship denies repeated deletion', () => {
  assert.equal(
    canDeleteInternship(
      makeAdmin(),
      makeInternship({ status: 'deleted' })
    ),
    false
  );

  assert.equal(
    canDeleteInternship(
      withPermission('internships:delete:any'),
      makeInternship({ status: 'deleted' })
    ),
    false
  );
});

test('canDeleteInternship denies missing arguments', () => {
  assert.equal(canDeleteInternship(null, makeInternship()), false);
  assert.equal(canDeleteInternship(makeAdmin(), null), false);
});

// --------------------------------------------------
// Applicant visibility
// --------------------------------------------------

test('canViewInternshipApplicants allows administrators', () => {
  assert.equal(
    canViewInternshipApplicants(
      makeAdmin(),
      makeInternship()
    ),
    true
  );
});

test('canViewInternshipApplicants allows global read permission', () => {
  assert.equal(
    canViewInternshipApplicants(
      withPermission('internship-applications:read:any', {
        id: 'reviewer-001',
        employerId: null,
      }),
      makeInternship()
    ),
    true
  );
});

test('canViewInternshipApplicants allows authorized employer owners', () => {
  assert.equal(
    canViewInternshipApplicants(
      withPermission('internship-applications:read:employer'),
      makeInternship()
    ),
    true
  );
});

test('canViewInternshipApplicants denies owners without applicant-read permission', () => {
  assert.equal(
    canViewInternshipApplicants(
      makeActor(),
      makeInternship()
    ),
    false
  );
});

test('canViewInternshipApplicants denies unrelated employers', () => {
  assert.equal(
    canViewInternshipApplicants(
      withPermission('internship-applications:read:employer', {
        employerId: 'employer-002',
      }),
      makeInternship()
    ),
    false
  );
});

test('canViewInternshipApplicants denies missing arguments', () => {
  assert.equal(
    canViewInternshipApplicants(null, makeInternship()),
    false
  );

  assert.equal(
    canViewInternshipApplicants(makeAdmin(), null),
    false
  );
});

// --------------------------------------------------
// Export
// --------------------------------------------------

test('canExportInternships allows administrators', () => {
  assert.equal(canExportInternships(makeAdmin()), true);
});

test('canExportInternships allows internships:export permission', () => {
  assert.equal(
    canExportInternships(
      withPermission('internships:export')
    ),
    true
  );
});

test('canExportInternships denies users without permission', () => {
  assert.equal(canExportInternships(makeActor()), false);
  assert.equal(canExportInternships(null), false);
  assert.equal(canExportInternships(undefined), false);
});

// --------------------------------------------------
// Authorization boundaries
// --------------------------------------------------

test('an unknown role alone grants no administrative permissions', () => {
  const unknown = makeActor({
    role: 'internship_manager',
    permissions: [],
  });

  const internship = makeInternship();

  assert.equal(canCreateInternship(unknown, {}), false);
  assert.equal(canUpdateInternship(unknown, internship, {}), false);
  assert.equal(canPublishInternship(unknown, internship), false);
  assert.equal(canPauseInternship(unknown, internship), false);
  assert.equal(canCloseInternship(unknown, internship), false);
  assert.equal(canMarkInternshipFilled(unknown, internship), false);
  assert.equal(canDeleteInternship(unknown, internship), false);
  assert.equal(canExportInternships(unknown), false);
});

test('isAdmin flag alone grants no administrative privileges', () => {
  const forgedAdmin = makeActor({
    id: 'forged-admin',
    role: 'user',
    employerId: null,
    isAdmin: true,
    permissions: [],
  });

  const internship = makeInternship();

  assert.equal(canCreateInternship(forgedAdmin, {}), false);
  assert.equal(canUpdateInternship(forgedAdmin, internship, {}), false);
  assert.equal(canPublishInternship(forgedAdmin, internship), false);
  assert.equal(canPauseInternship(forgedAdmin, internship), false);
  assert.equal(canCloseInternship(forgedAdmin, internship), false);
  assert.equal(canMarkInternshipFilled(forgedAdmin, internship), false);
  assert.equal(canDeleteInternship(forgedAdmin, internship), false);
  assert.equal(canExportInternships(forgedAdmin), false);
});
