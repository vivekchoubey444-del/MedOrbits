
-- =============================================================================
-- Migration: 001_create_users.sql
-- Purpose: Create the core MedOrbits users table.
-- Database: MySQL 8.0.16+
-- Engine: InnoDB
--
-- IMPORTANT:
-- - Execute through the project's migration runner.
-- - Generate public_id in the application using crypto.randomUUID().
-- - Never store plaintext passwords.
-- - This migration is for a fresh installation.
-- - MySQL DDL statements may implicitly commit; do not rely on BEGIN/ROLLBACK
--   to reverse CREATE TABLE or CREATE INDEX operations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,

    name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'user',
    status VARCHAR(30) NOT NULL DEFAULT 'active',

    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at DATETIME(3) NULL,

    phone VARCHAR(30) NULL,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified_at DATETIME(3) NULL,

    last_login_at DATETIME(3) NULL,
    password_changed_at DATETIME(3) NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_users_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_users_email
        UNIQUE (email),

    CONSTRAINT chk_users_role
        CHECK (role IN ('user', 'admin', 'counsellor', 'employer')),

    CONSTRAINT chk_users_status
        CHECK (status IN ('active', 'pending', 'suspended', 'disabled')),

    CONSTRAINT chk_users_name_not_blank
        CHECK (CHAR_LENGTH(TRIM(name)) > 0),

    CONSTRAINT chk_users_email_not_blank
        CHECK (CHAR_LENGTH(TRIM(email)) > 0),

    CONSTRAINT chk_users_email_verified_consistency
        CHECK (
            (email_verified = FALSE AND email_verified_at IS NULL)
            OR
            (email_verified = TRUE AND email_verified_at IS NOT NULL)
        ),

    CONSTRAINT chk_users_phone_verified_consistency
        CHECK (
            (phone_verified = FALSE AND phone_verified_at IS NULL)
            OR
            (phone_verified = TRUE AND phone_verified_at IS NOT NULL)
        ),

    KEY idx_users_role (role),
    KEY idx_users_status (status),
    KEY idx_users_created_at (created_at),
    KEY idx_users_last_login (last_login_at),
    KEY idx_users_deleted_at (deleted_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
