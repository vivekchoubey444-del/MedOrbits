
-- =============================================================================
-- MedOrbits: Seed Illustrative Institution Records
-- File: database/seeds/seed-colleges.sql
-- Database: MySQL 8.0.16+
--
-- Requires:
--   004_create_colleges_universities.sql
--
-- Purpose:
--   Add fictional universities and colleges for development/testing only.
--
-- IMPORTANT:
--   These are fictional records, not real educational institutions.
--   Never present them as recognized or accredited institutions.
-- =============================================================================

-- Run against a development or test database only.

START TRANSACTION;


-- =============================================================================
-- UNIVERSITIES
-- =============================================================================

INSERT INTO universities (
    public_id,
    name,
    slug,
    university_type,
    country,
    state,
    city,
    website,
    description,
    is_active
)
VALUES
    (
        UUID(),
        'MedOrbits Demonstration University',
        'medorbits-demo-university',
        'Demonstration',
        'India',
        'Uttar Pradesh',
        'Noida',
        NULL,
        'Fictional university record for local development and testing.',
        TRUE
    ),
    (
        UUID(),
        'MedOrbits Sample Health Sciences University',
        'medorbits-sample-health-sciences-university',
        'Demonstration',
        'India',
        'Assam',
        'Guwahati',
        NULL,
        'Fictional health sciences university record for development testing.',
        TRUE
    )
AS incoming
ON DUPLICATE KEY UPDATE
    id = id;


-- =============================================================================
-- COLLEGES
-- =============================================================================

INSERT INTO colleges (
    public_id,
    university_id,
    name,
    slug,
    college_type,
    country,
    state,
    city,
    address,
    pincode,
    website,
    description,
    is_active
)
VALUES
    (
        UUID(),
        (
            SELECT id
            FROM universities
            WHERE slug = 'medorbits-demo-university'
        ),
        'MedOrbits Demonstration Medical College',
        'medorbits-demo-medical-college',
        'Demonstration Medical College',
        'India',
        'Uttar Pradesh',
        'Noida',
        NULL,
        NULL,
        NULL,
        'Fictional college record for application and catalog testing.',
        TRUE
    ),
    (
        UUID(),
        (
            SELECT id
            FROM universities
            WHERE slug = 'medorbits-sample-health-sciences-university'
        ),
        'MedOrbits Sample Dental College',
        'medorbits-sample-dental-college',
        'Demonstration Dental College',
        'India',
        'Assam',
        'Guwahati',
        NULL,
        NULL,
        NULL,
        'Fictional college record for development and automated tests.',
        TRUE
    )
AS incoming
ON DUPLICATE KEY UPDATE
    id = id;


COMMIT;
