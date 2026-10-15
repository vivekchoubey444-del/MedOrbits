
-- =============================================================================
-- MedOrbits Migration 005: Student Applications
-- Database: MySQL 8.0.16+
--
-- Dependencies:
--   001_create_users.sql
--   003_create_courses.sql
--   004_create_colleges_universities.sql
--
-- Purpose:
--   Store student applications, admission preferences and review status.
--
-- Notes:
--   - Generate public_id in the application using crypto.randomUUID().
--   - Store timestamps using the application's UTC convention.
--   - This migration is intended for a fresh installation.
--   - MySQL DDL may implicitly commit; use the migration runner.
-- =============================================================================

CREATE TABLE IF NOT EXISTS applications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,
    application_number VARCHAR(60) NOT NULL,

    user_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NULL,
    college_id BIGINT UNSIGNED NULL,

    applicant_name VARCHAR(200) NOT NULL,
    applicant_email VARCHAR(254) NOT NULL,
    applicant_phone VARCHAR(30) NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    notes TEXT NULL,

    submitted_at DATETIME(3) NULL,
    reviewed_at DATETIME(3) NULL,
    reviewed_by BIGINT UNSIGNED NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_applications_public_id (public_id),
    UNIQUE KEY uq_applications_number (application_number),

    KEY idx_applications_user_id (user_id),
    KEY idx_applications_course_id (course_id),
    KEY idx_applications_college_id (college_id),
    KEY idx_applications_status_created (status, created_at),
    KEY idx_applications_reviewer (reviewed_by),

    CONSTRAINT chk_applications_status
        CHECK (
            status IN (
                'draft',
                'submitted',
                'under_review',
                'approved',
                'rejected',
                'withdrawn'
            )
        ),

    CONSTRAINT chk_applications_applicant_name
        CHECK (CHAR_LENGTH(TRIM(applicant_name)) > 0),

    CONSTRAINT chk_applications_applicant_email
        CHECK (CHAR_LENGTH(TRIM(applicant_email)) > 0),

    CONSTRAINT fk_applications_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_applications_course
        FOREIGN KEY (course_id)
        REFERENCES courses (id)
        ON DELETE SET NULL,

    CONSTRAINT fk_applications_college
        FOREIGN KEY (college_id)
        REFERENCES colleges (id)
        ON DELETE SET NULL,

    CONSTRAINT fk_applications_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users (id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
