
-- =============================================================================
-- MedOrbits Migration 003: Courses
-- Database: MySQL 8.0.16+
--
-- Depends on:
--   001_create_users.sql
--   002_create_roles_permissions.sql
--
-- Purpose:
--   Store courses offered by colleges and universities.
--
-- Notes:
--   - Generate public_id in the application using crypto.randomUUID().
--   - Run through the migration runner in numeric order.
--   - This migration is intended for a fresh installation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS courses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,

    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    code VARCHAR(50) NULL,
    category VARCHAR(100) NOT NULL,
    qualification_level VARCHAR(100) NULL,

    description TEXT NULL,
    duration_months INT UNSIGNED NULL,
    eligibility TEXT NULL,
    entrance_exam VARCHAR(200) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by BIGINT UNSIGNED NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_courses_public_id (public_id),
    UNIQUE KEY uq_courses_slug (slug),

    KEY idx_courses_category (category),
    KEY idx_courses_active (is_active),
    KEY idx_courses_name (name),
    KEY idx_courses_created_by (created_by),

    CONSTRAINT chk_courses_name_not_blank
        CHECK (CHAR_LENGTH(TRIM(name)) > 0),

    CONSTRAINT chk_courses_duration
        CHECK (duration_months IS NULL OR duration_months > 0),

    CONSTRAINT fk_courses_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
