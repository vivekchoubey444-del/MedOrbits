
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  jobOwnerId,
  jobEmployerId,
  isJobOwner,
  canViewJob,
  canCreateJob,
  canUpdateJob,
  canPublishJob,
  canPauseJob,
  canCloseJob,
  canMarkJobFilled,
  canDeleteJob,
  canViewJobApplicants,
  canExportJobs,
} = require('../../../src/policies/job.policy');

function makeJob(overrides = {}) {
  return {
    id: 'job-001',
    employerId: 'employer-001',
    ownerId: 'user-001',
    title: 'Healthcare Consultant',
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

// --------------------------------------------------
// Ownership helpers
// --------------------------------------------------

test('jobOwnerId returns employerId first', () => {
  assert.equal(jobOwnerId(makeJob()), 'employer-001');
});

test('jobOwnerId supports ownerId, createdBy and managedBy', () => {
  assert.equal(
    jobOwnerId({
      employerId: null,
      ownerId: 'owner-001',
      createdBy: 'creator-001',
      managedBy: 'manager-001',
    }),
    'owner-001'
  );

  assert.equal(
    jobOwnerId({
      employerId: null,
      ownerId: null,
      createdBy: 'creator-001',
      managedBy: 'manager-001',
    }),
    'creator-001'
  );

  assert.equal(
    jobOwnerId({
      employerId: null,
      ownerId: null,
      createdBy: null,
      managedBy: 'manager-001',
    }),
    'manager-001'
  );
});

test('jobOwnerId returns null for invalid resources', () => {
  assert.equal(jobOwnerId(null), null);
  assert.equal(jobOwnerId(undefined), null);
  assert.equal(jobOwnerId('job'), null);
  assert.equal(jobOwnerId([]), null);
  assert.equal(jobOwnerId({}), null);
});

test('jobEmployerId returns employerId', () => {
  assert.equal(jobEmployerId(makeJob()), 'employer-001');
});

test('jobEmployerId returns null when employerId is absent', () => {
  assert.equal(jobEmployerId({ employerId: null }), null);
  assert.equal(jobEmployerId({}), null);
  assert.equal(jobEmployerId(null), null);
  assert.equal(jobEmployerId(undefined), null);
});

test('isJobOwner recognizes employer membership', () => {
  assert.equal(
    isJobOwner(makeActor(), makeJob()),
    true
  );
});

test('isJobOwner requires the employer role for employer membership', () => {
  assert.equal(
    isJobOwner(
      makeActor({ role: 'user' }),
      makeJob()
    ),
    true
  );
});

test('isJobOwner recognizes matching ownerId', () => {
  assert.equal(
    isJobOwner(
      makeActor({
        id: 'owner-001',
        employerId: 'different-employer',
      }),
      makeJob({ ownerId: 'owner-001' })
    ),
    true
  );
});

test('isJobOwner supports createdBy and managedBy', () => {
  assert.equal(
    isJobOwner(
      makeActor({
        id: 'creator-001',
        employerId: null,
      }),
      makeJob({
        employerId: null,
        ownerId: null,
        createdBy: 'creator-001',
      })
    ),
    true
  );

  assert.equal(
    isJobOwner(
      makeActor({
        id: 'manager-001',
        employerId: null,
      }),
      makeJob({
        employerId: null,
        ownerId: null,
        managedBy: 'manager-001',
      })
    ),
    true
  );
});

test('isJobOwner denies unrelated actors', () => {
  assert.equal(
    isJobOwner(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeJob()
    ),
    false
  );
});

test('isJobOwner denies missing actors and jobs', () => {
  assert.equal(isJobOwner(null, makeJob()), false);
  assert.equal(isJobOwner(makeActor(), null), false);
});

// --------------------------------------------------
// Job visibility
// --------------------------------------------------

test('canViewJob allows public access to published jobs', () => {
  assert.equal(
    canViewJob(
      null,
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canViewJob normalizes published status', () => {
  assert.equal(
    canViewJob(
      null,
      makeJob({ status: ' PUBLISHED ' })
    ),
    true
  );
});

test('canViewJob allows owners to view private jobs', () => {
  assert.equal(
    canViewJob(makeActor(), makeJob()),
    true
  );

  assert.equal(
    canViewJob(
      makeActor(),
      makeJob({ status: 'paused' })
    ),
    true
  );
});

test('canViewJob allows administrators to view private jobs', () => {
  assert.equal(
    canViewJob(makeAdmin(), makeJob()),
    true
  );
});

test('canViewJob allows jobs:read:any permission', () => {
  assert.equal(
    canViewJob(
      withPermission('jobs:read:any', {
        id: 'reviewer-001',
        employerId: null,
      }),
      makeJob()
    ),
    true
  );
});

test('canViewJob allows jobs:read:private permission', () => {
  assert.equal(
    canViewJob(
      withPermission('jobs:read:private', {
        id: 'reviewer-001',
        employerId: null,
      }),
      makeJob()
    ),
    true
  );
});

test('canViewJob denies unrelated users access to drafts', () => {
  assert.equal(
    canViewJob(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeJob()
    ),
    false
  );

  assert.equal(canViewJob(null, makeJob()), false);
});

test('canViewJob denies terminal job statuses', () => {
  for (const status of ['closed', 'filled', 'deleted']) {
    assert.equal(
      canViewJob(
        makeAdmin(),
        makeJob({ status })
      ),
      false
    );
  }
});

test('canViewJob denies invalid resources', () => {
  assert.equal(canViewJob(makeActor(), null), false);
  assert.equal(canViewJob(makeActor(), undefined), false);
  assert.equal(canViewJob(makeActor(), 'job'), false);
});

// --------------------------------------------------
// Job creation
// --------------------------------------------------

test('canCreateJob allows administrators', () => {
  assert.equal(canCreateJob(makeAdmin(), {}), true);
});

test('canCreateJob allows jobs:create:any permission', () => {
  assert.equal(
    canCreateJob(
      withPermission('jobs:create:any', {
        role: 'user',
        isSuspended: true,
      }),
      {}
    ),
    true
  );
});

test('canCreateJob allows authorized active employers', () => {
  assert.equal(
    canCreateJob(
      withPermission('jobs:create:own-employer'),
      {}
    ),
    true
  );
});

test('canCreateJob denies employers without create permission', () => {
  assert.equal(canCreateJob(makeActor(), {}), false);
});

test('canCreateJob denies unsupported roles without global permission', () => {
  for (const role of ['user', 'student', 'recruiter', 'guest']) {
    assert.equal(
      canCreateJob(
        withPermission('jobs:create:own-employer', { role }),
        {}
      ),
      false
    );
  }
});

test('canCreateJob denies suspended employers', () => {
  assert.equal(
    canCreateJob(
      withPermission('jobs:create:own-employer', {
        isSuspended: true,
      }),
      {}
    ),
    false
  );

  assert.equal(
    canCreateJob(
      withPermission('jobs:create:own-employer', {
        status: 'suspended',
      }),
      {}
    ),
    false
  );
});

test('canCreateJob denies disabled employers', () => {
  assert.equal(
    canCreateJob(
      withPermission('jobs:create:own-employer', {
        status: 'disabled',
      }),
      {}
    ),
    false
  );
});

test('canCreateJob requires an employer account ID', () => {
  assert.equal(
    canCreateJob(
      withPermission('jobs:create:own-employer', {
        employerId: null,
      }),
      {}
    ),
    false
  );
});

test('canCreateJob rejects malformed arguments', () => {
  assert.equal(canCreateJob(null, {}), false);
  assert.equal(canCreateJob(makeActor(), null), false);
  assert.equal(canCreateJob(makeActor(), []), false);
  assert.equal(canCreateJob(makeActor(), 'job'), false);
});

// --------------------------------------------------
// Job updates
// --------------------------------------------------

test('canUpdateJob allows owners to update editable jobs', () => {
  for (const status of ['draft', 'published', 'paused']) {
    assert.equal(
      canUpdateJob(
        makeActor(),
        makeJob({ status }),
        { title: 'Updated job title' }
      ),
      true
    );
  }
});

test('canUpdateJob denies unrelated users', () => {
  assert.equal(
    canUpdateJob(
      makeActor({
        id: 'user-002',
        employerId: 'employer-002',
      }),
      makeJob(),
      { title: 'Unauthorized update' }
    ),
    false
  );
});

test('canUpdateJob denies updates to terminal statuses', () => {
  for (const status of ['closed', 'filled', 'deleted']) {
    assert.equal(
      canUpdateJob(
        makeActor(),
        makeJob({ status }),
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
  test(`canUpdateJob protects ${field} from owner changes`, () => {
    assert.equal(
      canUpdateJob(
        makeActor(),
        makeJob(),
        { [field]: 'unauthorized-value' }
      ),
      false
    );
  });
}

test('canUpdateJob allows ordinary editable fields', () => {
  assert.equal(
    canUpdateJob(
      makeActor(),
      makeJob(),
      {
        title: 'Frontend Developer',
        description: 'Updated role description',
        location: 'Noida',
        employmentType: 'full-time',
      }
    ),
    true
  );
});

test('canUpdateJob allows administrators to update protected fields', () => {
  assert.equal(
    canUpdateJob(
      makeAdmin(),
      makeJob(),
      {
        status: 'published',
        verified: true,
        employerId: 'employer-002',
      }
    ),
    true
  );
});

test('canUpdateJob allows jobs:update:any permission', () => {
  assert.equal(
    canUpdateJob(
      withPermission('jobs:update:any', {
        id: 'user-002',
        employerId: null,
      }),
      makeJob({ status: 'deleted' }),
      { status: 'published' }
    ),
    true
  );
});

test('canUpdateJob rejects malformed arguments', () => {
  assert.equal(canUpdateJob(null, makeJob(), {}), false);
  assert.equal(canUpdateJob(makeActor(), null, {}), false);
  assert.equal(canUpdateJob(makeActor(), makeJob(), null), false);
  assert.equal(canUpdateJob(makeActor(), makeJob(), []), false);
  assert.equal(canUpdateJob(makeActor(), makeJob(), 'title'), false);
});

// --------------------------------------------------
// Publishing
// --------------------------------------------------

test('canPublishJob allows administrators to publish drafts', () => {
  assert.equal(
    canPublishJob(
      makeAdmin(),
      makeJob({ status: 'draft' })
    ),
    true
  );
});

test('canPublishJob allows administrators to republish paused jobs', () => {
  assert.equal(
    canPublishJob(
      makeAdmin(),
      makeJob({ status: 'paused' })
    ),
    true
  );
});

test('canPublishJob allows jobs:publish:any permission', () => {
  assert.equal(
    canPublishJob(
      withPermission('jobs:publish:any'),
      makeJob()
    ),
    true
  );
});

test('canPublishJob allows authorized employer owners', () => {
  assert.equal(
    canPublishJob(
      withPermission('jobs:publish:own-employer'),
      makeJob()
    ),
    true
  );
});

test('canPublishJob denies owners without publish permission', () => {
  assert.equal(
    canPublishJob(makeActor(), makeJob()),
    false
  );
});

test('canPublishJob denies invalid lifecycle transitions', () => {
  for (const status of ['published', 'closed', 'filled', 'deleted']) {
    assert.equal(
      canPublishJob(
        makeAdmin(),
        makeJob({ status })
      ),
      false
    );
  }
});

test('canPublishJob denies missing arguments', () => {
  assert.equal(canPublishJob(null, makeJob()), false);
  assert.equal(canPublishJob(makeAdmin(), null), false);
});

// --------------------------------------------------
// Pausing
// --------------------------------------------------

test('canPauseJob allows administrators to pause published jobs', () => {
  assert.equal(
    canPauseJob(
      makeAdmin(),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canPauseJob allows jobs:pause:any permission', () => {
  assert.equal(
    canPauseJob(
      withPermission('jobs:pause:any'),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canPauseJob allows authorized employer owners', () => {
  assert.equal(
    canPauseJob(
      withPermission('jobs:pause:own-employer'),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canPauseJob denies owners without pause permission', () => {
  assert.equal(
    canPauseJob(
      makeActor(),
      makeJob({ status: 'published' })
    ),
    false
  );
});

test('canPauseJob denies non-published jobs', () => {
  for (const status of ['draft', 'paused', 'closed', 'filled', 'deleted']) {
    assert.equal(
      canPauseJob(
        makeAdmin(),
        makeJob({ status })
      ),
      false
    );
  }
});

test('canPauseJob denies missing arguments', () => {
  assert.equal(canPauseJob(null, makeJob()), false);
  assert.equal(canPauseJob(makeAdmin(), null), false);
});

// --------------------------------------------------
// Closing
// --------------------------------------------------

test('canCloseJob allows administrators to close active jobs', () => {
  for (const status of ['draft', 'published', 'paused']) {
    assert.equal(
      canCloseJob(
        makeAdmin(),
        makeJob({ status })
      ),
      true
    );
  }
});

test('canCloseJob allows jobs:close:any permission', () => {
  assert.equal(
    canCloseJob(
      withPermission('jobs:close:any'),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canCloseJob allows authorized employer owners', () => {
  assert.equal(
    canCloseJob(
      withPermission('jobs:close:own-employer'),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canCloseJob denies owners without close permission', () => {
  assert.equal(
    canCloseJob(
      makeActor(),
      makeJob({ status: 'published' })
    ),
    false
  );
});

test('canCloseJob denies terminal statuses', () => {
  for (const status of ['closed', 'filled', 'deleted']) {
    assert.equal(
      canCloseJob(
        makeAdmin(),
        makeJob({ status })
      ),
      false
    );
  }
});

test('canCloseJob denies missing arguments', () => {
  assert.equal(canCloseJob(null, makeJob()), false);
  assert.equal(canCloseJob(makeAdmin(), null), false);
});

// --------------------------------------------------
// Marking jobs filled
// --------------------------------------------------

test('canMarkJobFilled allows administrators to fill published jobs', () => {
  assert.equal(
    canMarkJobFilled(
      makeAdmin(),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canMarkJobFilled allows jobs:mark-filled:any permission', () => {
  assert.equal(
    canMarkJobFilled(
      withPermission('jobs:mark-filled:any'),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canMarkJobFilled allows authorized employer owners', () => {
  assert.equal(
    canMarkJobFilled(
      withPermission('jobs:mark-filled:own-employer'),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canMarkJobFilled denies owners without permission', () => {
  assert.equal(
    canMarkJobFilled(
      makeActor(),
      makeJob({ status: 'published' })
    ),
    false
  );
});

test('canMarkJobFilled requires published status', () => {
  for (const status of ['draft', 'paused', 'closed', 'filled', 'deleted']) {
    assert.equal(
      canMarkJobFilled(
        makeAdmin(),
        makeJob({ status })
      ),
      false
    );
  }
});

test('canMarkJobFilled denies missing arguments', () => {
  assert.equal(canMarkJobFilled(null, makeJob()), false);
  assert.equal(canMarkJobFilled(makeAdmin(), null), false);
});

// --------------------------------------------------
// Deletion
// --------------------------------------------------

test('canDeleteJob allows administrators to delete active jobs', () => {
  for (const status of ['draft', 'published', 'paused', 'closed', 'filled']) {
    assert.equal(
      canDeleteJob(
        makeAdmin(),
        makeJob({ status })
      ),
      true
    );
  }
});

test('canDeleteJob allows jobs:delete:any permission', () => {
  assert.equal(
    canDeleteJob(
      withPermission('jobs:delete:any'),
      makeJob({ status: 'published' })
    ),
    true
  );
});

test('canDeleteJob allows authorized employers to delete drafts', () => {
  assert.equal(
    canDeleteJob(
      withPermission('jobs:delete:own-employer'),
      makeJob({ status: 'draft' })
    ),
    true
  );
});

test('canDeleteJob denies employer deletion of published jobs', () => {
  assert.equal(
    canDeleteJob(
      withPermission('jobs:delete:own-employer'),
      makeJob({ status: 'published' })
    ),
    false
  );
});

test('canDeleteJob denies employer deletion of paused jobs', () => {
  assert.equal(
    canDeleteJob(
      withPermission('jobs:delete:own-employer'),
      makeJob({ status: 'paused' })
    ),
    false
  );
});

test('canDeleteJob denies owners without delete permission', () => {
  assert.equal(
    canDeleteJob(
      makeActor(),
      makeJob({ status: 'draft' })
    ),
    false
  );
});

test('canDeleteJob denies repeated deletion', () => {
  assert.equal(
    canDeleteJob(
      makeAdmin(),
      makeJob({ status: 'deleted' })
    ),
    false
  );

  assert.equal(
    canDeleteJob(
      withPermission('jobs:delete:any'),
      makeJob({ status: 'deleted' })
    ),
    false
  );
});

test('canDeleteJob denies missing arguments', () => {
  assert.equal(canDeleteJob(null, makeJob()), false);
  assert.equal(canDeleteJob(makeAdmin(), null), false);
});

// --------------------------------------------------
// Applicant visibility
// --------------------------------------------------

test('canViewJobApplicants allows administrators', () => {
  assert.equal(
    canViewJobApplicants(
      makeAdmin(),
      makeJob()
    ),
    true
  );
});

test('canViewJobApplicants allows applications:read:any permission', () => {
  assert.equal(
    canViewJobApplicants(
      withPermission('applications:read:any'),
      makeJob()
    ),
    true
  );
});

test('canViewJobApplicants allows authorized employer owners', () => {
  assert.equal(
    canViewJobApplicants(
      withPermission('applications:read:employer'),
      makeJob()
    ),
    true
  );
});

test('canViewJobApplicants denies owners without applicant-read permission', () => {
  assert.equal(
    canViewJobApplicants(
      makeActor(),
      makeJob()
    ),
    false
  );
});

test('canViewJobApplicants denies unrelated employers', () => {
  assert.equal(
    canViewJobApplicants(
      withPermission('applications:read:employer', {
        employerId: 'employer-002',
      }),
      makeJob()
    ),
    false
  );
});

test('canViewJobApplicants denies missing arguments', () => {
  assert.equal(canViewJobApplicants(null, makeJob()), false);
  assert.equal(canViewJobApplicants(makeAdmin(), null), false);
});

// --------------------------------------------------
// Export
// --------------------------------------------------

test('canExportJobs allows administrators', () => {
  assert.equal(canExportJobs(makeAdmin()), true);
});

test('canExportJobs allows jobs:export permission', () => {
  assert.equal(
    canExportJobs(
      withPermission('jobs:export')
    ),
    true
  );
});

test('canExportJobs denies unauthorized and anonymous actors', () => {
  assert.equal(canExportJobs(makeActor()), false);
  assert.equal(canExportJobs(null), false);
  assert.equal(canExportJobs(undefined), false);
});

// --------------------------------------------------
// Authorization boundaries
// --------------------------------------------------

test('unknown roles do not receive administrative permissions', () => {
  const unknown = makeActor({
    role: 'job_manager',
    permissions: [],
  });

  const job = makeJob();

  assert.equal(canCreateJob(unknown, {}), false);
  assert.equal(canUpdateJob(unknown, job, {}), false);
  assert.equal(canPublishJob(unknown, job), false);
  assert.equal(canPauseJob(unknown, job), false);
  assert.equal(canCloseJob(unknown, job), false);
  assert.equal(canMarkJobFilled(unknown, job), false);
  assert.equal(canDeleteJob(unknown, job), false);
  assert.equal(canExportJobs(unknown), false);
});

test('isAdmin flag alone grants no administrative privileges', () => {
  const forgedAdmin = makeActor({
    id: 'forged-admin',
    role: 'user',
    employerId: null,
    isAdmin: true,
    permissions: [],
  });

  const job = makeJob();

  assert.equal(canCreateJob(forgedAdmin, {}), false);
  assert.equal(canUpdateJob(forgedAdmin, job, {}), false);
  assert.equal(canPublishJob(forgedAdmin, job), false);
  assert.equal(canPauseJob(forgedAdmin, job), false);
  assert.equal(canCloseJob(forgedAdmin, job), false);
  assert.equal(canMarkJobFilled(forgedAdmin, job), false);
  assert.equal(canDeleteJob(forgedAdmin, job), false);
  assert.equal(canExportJobs(forgedAdmin), false);
});
