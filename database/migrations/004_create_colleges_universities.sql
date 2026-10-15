
-- =============================================================================
-- MedOrbits Migration 004: Colleges and Universities
-- Database: MySQL 8.0.16+
--
-- Depends on:
--   001_create_users.sql
--   003_create_courses.sql (execution order only; no direct foreign key)
--
-- Purpose:
--   Store university and college records for education discovery and admissions.
--
-- Notes:
--   - Generate public_id using crypto.randomUUID() in the application.
--   - MySQL DDL may implicitly commit; use the migration runner.
--   - Intended for fresh installations.
-- =============================================================================


-- =============================================================================
-- 1. UNIVERSITIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS universities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,

    name VARCHAR(250) NOT NULL,
    slug VARCHAR(270) NOT NULL,
    university_type VARCHAR(100) NULL,

    country VARCHAR(100) NOT NULL DEFAULT 'India',
    state VARCHAR(120) NULL,
    city VARCHAR(120) NULL,

    website VARCHAR(500) NULL,
    recognition_details TEXT NULL,
    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_universities_public_id (public_id),
    UNIQUE KEY uq_universities_slug (slug),

    KEY idx_universities_location (country, state, city),
    KEY idx_universities_active (is_active),

    CONSTRAINT chk_universities_name_not_blank
        CHECK (CHAR_LENGTH(TRIM(name)) > 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- 2. COLLEGES
-- =============================================================================

CREATE TABLE IF NOT EXISTS colleges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,

    university_id BIGINT UNSIGNED NULL,

    name VARCHAR(250) NOT NULL,
    slug VARCHAR(270) NOT NULL,
    college_type VARCHAR(100) NULL,

    country VARCHAR(100) NOT NULL DEFAULT 'India',
    state VARCHAR(120) NULL,
    city VARCHAR(120) NULL,
    address TEXT NULL,
    pincode VARCHAR(12) NULL,

    website VARCHAR(500) NULL,
    affiliation_details TEXT NULL,
    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_colleges_public_id (public_id),
    UNIQUE KEY uq_colleges_slug (slug),

    KEY idx_colleges_university_id (university_id),
    KEY idx_colleges_location (country, state, city),
    KEY idx_colleges_active (is_active),

    CONSTRAINT chk_colleges_name_not_blank
        CHECK (CHAR_LENGTH(TRIM(name)) > 0),

    CONSTRAINT fk_colleges_university
        FOREIGN KEY (university_id)
        REFERENCES universities (id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
