
-- =============================================================================
-- Migration: 002_create_roles_permissions.sql
-- Purpose: Create normalized roles, permissions and role assignments.
-- Database: MySQL 8.0.16+
--
-- Depends on:
--   001_create_users.sql
--
-- Security:
-- - Authorization must be enforced by backend middleware and services.
-- - Never rely on frontend role checks alone.
-- - Do not allow public registration to assign privileged roles.
-- - Protect role and permission changes with audit logging.
--
-- This migration is designed for a fresh installation.
-- MySQL DDL can implicitly commit; do not depend on transaction rollback
-- to undo CREATE TABLE operations.
-- =============================================================================


-- =============================================================================
-- 1. ROLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT NULL,

    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_roles_name (name),

    CONSTRAINT chk_roles_name_format
        CHECK (REGEXP_LIKE(name, '^[a-z][a-z0-9_]*$', 'c')),

    CONSTRAINT chk_roles_display_name
        CHECK (CHAR_LENGTH(TRIM(display_name)) > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 2. PERMISSIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,
    resource VARCHAR(60) NOT NULL,
    action VARCHAR(60) NOT NULL,
    description TEXT NULL,

    is_system BOOLEAN NOT NULL DEFAULT FALSE,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_permissions_name (name),
    KEY idx_permissions_resource_action (resource, action),

    CONSTRAINT chk_permissions_name_format
        CHECK (REGEXP_LIKE(name, '^[a-z][a-z0-9_.:-]*$', 'c')),

    CONSTRAINT chk_permissions_resource
        CHECK (CHAR_LENGTH(TRIM(resource)) > 0),

    CONSTRAINT chk_permissions_action
        CHECK (CHAR_LENGTH(TRIM(action)) > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 3. ROLE-PERMISSION MAPPING
-- =============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (role_id, permission_id),

    KEY idx_role_permissions_permission_id (permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions (id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 4. USER-ROLE MAPPING
-- =============================================================================
-- A user can have multiple roles.
--
-- users.role is retained for compatibility with the existing user schema.
-- If user_roles becomes the authoritative authorization source, migrate
-- existing assignments through a separate reviewed migration.
--
-- assigned_by is nullable to support system-created assignments.

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,

    assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    assigned_by BIGINT UNSIGNED NULL,

    PRIMARY KEY (user_id, role_id),

    KEY idx_user_roles_role_id (role_id),
    KEY idx_user_roles_assigned_by (assigned_by),

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_roles_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES users (id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 5. SEED SYSTEM ROLES
-- =============================================================================
-- Re-running this seed does not reset existing descriptions or active states.

INSERT INTO roles (
    name,
    display_name,
    description,
    is_system
)
VALUES
    (
        'user',
        'User',
        'Standard registered account.',
        TRUE
    ),
    (
        'admin',
        'Administrator',
        'Administrative access subject to explicit permissions.',
        TRUE
    ),
    (
        'counsellor',
        'Counsellor',
        'Education guidance and application support.',
        TRUE
    ),
    (
        'employer',
        'Employer',
        'Employer and recruitment-related access.',
        TRUE
    )
ON DUPLICATE KEY UPDATE
    id = id;


-- =============================================================================
-- 6. SEED BASE PERMISSIONS
-- =============================================================================
-- These records define capabilities; they do not independently grant access.
-- The role_permissions table determines which roles receive each permission.

INSERT INTO permissions (
    name,
    resource,
    action,
    description,
    is_system
)
VALUES
    (
        'profile.read_own',
        'profile',
        'read_own',
        'Read own profile.',
        TRUE
    ),
    (
        'profile.update_own',
        'profile',
        'update_own',
        'Update own profile.',
        TRUE
    ),

    (
        'applications.create',
        'applications',
        'create',
        'Create an application.',
        TRUE
    ),
    (
        'applications.read_own',
        'applications',
        'read_own',
        'Read own applications.',
        TRUE
    ),
    (
        'applications.update_own',
        'applications',
        'update_own',
        'Update own eligible applications.',
        TRUE
    ),
    (
        'applications.read_all',
        'applications',
        'read_all',
        'Read applications across users.',
        TRUE
    ),
    (
        'applications.review',
        'applications',
        'review',
        'Review submitted applications.',
        TRUE
    ),
    (
        'applications.manage',
        'applications',
        'manage',
        'Manage application workflows.',
        TRUE
    ),

    (
        'colleges.read',
        'colleges',
        'read',
        'View college information.',
        TRUE
    ),
    (
        'colleges.manage',
        'colleges',
        'manage',
        'Create and manage college records.',
        TRUE
    ),

    (
        'courses.read',
        'courses',
        'read',
        'View course information.',
        TRUE
    ),
    (
        'courses.manage',
        'courses',
        'manage',
        'Create and manage course records.',
        TRUE
    ),

    (
        'jobs.read',
        'jobs',
        'read',
        'View job listings.',
        TRUE
    ),
    (
        'jobs.manage',
        'jobs',
        'manage',
        'Manage job listings.',
        TRUE
    ),

    (
        'employers.manage_own',
        'employers',
        'manage_own',
        'Manage own employer profile and listings.',
        TRUE
    ),

    (
        'users.read',
        'users',
        'read',
        'Read user account information.',
        TRUE
    ),
    (
        'users.manage',
        'users',
        'manage',
        'Manage user accounts.',
        TRUE
    ),

    (
        'roles.read',
        'roles',
        'read',
        'View roles and permissions.',
        TRUE
    ),
    (
        'roles.manage',
        'roles',
        'manage',
        'Manage roles and permission assignments.',
        TRUE
    ),

    (
        'payments.read_own',
        'payments',
        'read_own',
        'Read own payment records.',
        TRUE
    ),
    (
        'payments.read_all',
        'payments',
        'read_all',
        'Read payment records across users.',
        TRUE
    ),
    (
        'payments.refund',
        'payments',
        'refund',
        'Initiate authorized refunds.',
        TRUE
    ),

    (
        'documents.read_own',
        'documents',
        'read_own',
        'Read own documents.',
        TRUE
    ),
    (
        'documents.manage_own',
        'documents',
        'manage_own',
        'Manage own eligible documents.',
        TRUE
    ),
    (
        'documents.review',
        'documents',
        'review',
        'Review submitted documents.',
        TRUE
    ),

    (
        'support.create',
        'support',
        'create',
        'Create a support request.',
        TRUE
    ),
    (
        'support.manage',
        'support',
        'manage',
        'Manage support requests.',
        TRUE
    )

ON DUPLICATE KEY UPDATE
    id = id;


-- =============================================================================
-- 7. ASSIGN BASE PERMISSIONS TO THE USER ROLE
-- =============================================================================

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.id,
    p.id
FROM roles AS r
INNER JOIN permissions AS p
    ON p.name IN (
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
WHERE r.name = 'user'
ON DUPLICATE KEY UPDATE
    role_id = role_permissions.role_id;


-- =============================================================================
-- 8. ASSIGN COUNSELLOR PERMISSIONS
-- =============================================================================

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.id,
    p.id
FROM roles AS r
INNER JOIN permissions AS p
    ON p.name IN (
        'profile.read_own',
        'profile.update_own',
        'applications.read_all',
        'applications.review',
        'colleges.read',
        'courses.read',
        'documents.review',
        'support.manage'
    )
WHERE r.name = 'counsellor'
ON DUPLICATE KEY UPDATE
    role_id = role_permissions.role_id;


-- =============================================================================
-- 9. ASSIGN EMPLOYER PERMISSIONS
-- =============================================================================

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.id,
    p.id
FROM roles AS r
INNER JOIN permissions AS p
    ON p.name IN (
        'profile.read_own',
        'profile.update_own',
        'jobs.read',
        'employers.manage_own',
        'support.create'
    )
WHERE r.name = 'employer'
ON DUPLICATE KEY UPDATE
    role_id = role_permissions.role_id;


-- =============================================================================
-- 10. ASSIGN ADMIN PERMISSIONS
-- =============================================================================
-- This grants every currently system-marked permission to the admin role.
-- Review this policy before production use.
--
-- Only trusted administrators should be able to assign the admin role.
-- Protect privileged operations with backend authorization and audit logs.

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    r.id,
    p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name = 'admin'
  AND p.is_system = TRUE
ON DUPLICATE KEY UPDATE
    role_id = role_permissions.role_id;


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
