
-- =============================================================================
-- MedOrbits: Seed Baseline Roles and Permissions
-- File: database/seeds/seed-roles.sql
-- Database: MySQL 8.0.16+
--
-- Requires:
--   001_create_users.sql
--   002_create_roles_permissions.sql
--
-- Safe to re-run without duplicating existing role names, permissions,
-- or role-permission assignments.
--
-- SECURITY:
--   Admin permissions are assigned to the system admin role.
--   Assignment of the admin role to actual users must be restricted.
-- =============================================================================

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1. Baseline roles
-- ---------------------------------------------------------------------------

INSERT INTO roles (
    name,
    display_name,
    description,
    is_system
)
VALUES
    ('user', 'User', 'Standard registered account.', TRUE),
    ('admin', 'Administrator', 'Administrative account.', TRUE),
    ('counsellor', 'Counsellor', 'Education guidance and application support.', TRUE),
    ('employer', 'Employer', 'Recruitment and employer account.', TRUE)
ON DUPLICATE KEY UPDATE
    id = id;

-- ---------------------------------------------------------------------------
-- 2. Baseline permissions
-- ---------------------------------------------------------------------------

INSERT INTO permissions (
    name,
    resource,
    action,
    description,
    is_system
)
VALUES
    ('profile.read_own', 'profile', 'read_own', 'Read own profile.', TRUE),
    ('profile.update_own', 'profile', 'update_own', 'Update own profile.', TRUE),
    ('applications.create', 'applications', 'create', 'Create applications.', TRUE),
    ('applications.read_own', 'applications', 'read_own', 'Read own applications.', TRUE),
    ('applications.update_own', 'applications', 'update_own', 'Update eligible own applications.', TRUE),
    ('applications.read_all', 'applications', 'read_all', 'Read applications across users.', TRUE),
    ('applications.review', 'applications', 'review', 'Review applications.', TRUE),
    ('applications.manage', 'applications', 'manage', 'Manage application workflows.', TRUE),
    ('colleges.read', 'colleges', 'read', 'View colleges.', TRUE),
    ('colleges.manage', 'colleges', 'manage', 'Manage college records.', TRUE),
    ('courses.read', 'courses', 'read', 'View courses.', TRUE),
    ('courses.manage', 'courses', 'manage', 'Manage course records.', TRUE),
    ('jobs.read', 'jobs', 'read', 'View jobs.', TRUE),
    ('jobs.manage', 'jobs', 'manage', 'Manage job listings.', TRUE),
    ('employers.manage_own', 'employers', 'manage_own', 'Manage own employer profile.', TRUE),
    ('users.read', 'users', 'read', 'Read user records.', TRUE),
    ('users.manage', 'users', 'manage', 'Manage user accounts.', TRUE),
    ('roles.read', 'roles', 'read', 'Read roles and permissions.', TRUE),
    ('roles.manage', 'roles', 'manage', 'Manage role assignments.', TRUE),
    ('payments.read_own', 'payments', 'read_own', 'Read own payments.', TRUE),
    ('payments.read_all', 'payments', 'read_all', 'Read all payments.', TRUE),
    ('payments.refund', 'payments', 'refund', 'Initiate authorized refunds.', TRUE),
    ('documents.read_own', 'documents', 'read_own', 'Read own documents.', TRUE),
    ('documents.manage_own', 'documents', 'manage_own', 'Manage own eligible documents.', TRUE),
    ('documents.review', 'documents', 'review', 'Review submitted documents.', TRUE),
    ('support.create', 'support', 'create', 'Create support requests.', TRUE),
    ('support.manage', 'support', 'manage', 'Manage support requests.', TRUE)
ON DUPLICATE KEY UPDATE
    id = id;

-- ---------------------------------------------------------------------------
-- 3. Baseline user permissions
-- ---------------------------------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name = 'user'
  AND p.name IN (
      'profile.read_own',
      'profile.update_own',
      'applications.create',
      'applications.read_own',
      'applications.update_own',
      'colleges.read',
      'courses.read',
      'jobs.read',
      'payments.read_own',
      'documents.read_own',
      'documents.manage_own',
      'support.create'
  )
ON DUPLICATE KEY UPDATE
    role_id = role_id;

-- ---------------------------------------------------------------------------
-- 4. Counsellor permissions
-- ---------------------------------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name = 'counsellor'
  AND p.name IN (
      'profile.read_own',
      'profile.update_own',
      'applications.read_all',
      'applications.review',
      'colleges.read',
      'courses.read',
      'documents.review',
      'support.manage'
  )
ON DUPLICATE KEY UPDATE
    role_id = role_id;

-- ---------------------------------------------------------------------------
-- 5. Employer permissions
-- ---------------------------------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name = 'employer'
  AND p.name IN (
      'profile.read_own',
      'profile.update_own',
      'jobs.read',
      'employers.manage_own',
      'support.create'
  )
ON DUPLICATE KEY UPDATE
    role_id = role_id;

-- ---------------------------------------------------------------------------
-- 6. Admin permissions
-- ---------------------------------------------------------------------------
-- Only the system admin role receives these permissions from this seed.
-- This does not assign the admin role to any user.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name = 'admin'
  AND p.is_system = TRUE
ON DUPLICATE KEY UPDATE
    role_id = role_id;

COMMIT;
