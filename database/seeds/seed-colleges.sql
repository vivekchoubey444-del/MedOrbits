-- =============================================================================
-- MedOrbits: Seed Illustrative Institution Records
-- File: database/seeds/seed-colleges.sql
-- Database: MySQL 8.0.16+
--
-- Requires:
--   004_create_colleges_universities.sql
--
-- Purpose:
--   Add fictional universities and colleges for local development, testing,
--   and automated test environments.
--
-- SAFETY:
--   - Development/test databases only.
--   - All institutions in this seed are fictional.
--   - Never represent these records as real, recognized, or accredited
--     educational institutions.
--   - Do not use this seed as an official admissions catalogue.
--
-- IDEMPOTENCY:
--   Requires UNIQUE constraints on universities.slug and colleges.slug.
--   Existing records are not overwritten when a duplicate key is encountered.
--
-- RELATIONSHIPS:
--   College records reference universities by their unique slugs.
-- =============================================================================
START TRANSACTION;
-- =============================================================================
-- 1. UNIVERSITIES
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
ON DUPLICATE KEY UPDATE
    id = id;
-- =============================================================================
-- 2. COLLEGES
-- =============================================================================
-- INSERT ... SELECT links each college to its intended university.
-- The unique university slug is expected to return exactly one record.
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
SELECT
    UUID(),
    u.id,
    'MedOrbits Demonstration Medical College',
    'medorbits-demo-medical-college',
    'Demonstration Medical College',
    'India',
    'Uttar Pradesh',
    'Noida',
    NULL,
    NULL,
    NULL,
    'Fictional college record for application and catalogue testing.',
    TRUE
FROM universities AS u
WHERE u.slug = 'medorbits-demo-university'
ON DUPLICATE KEY UPDATE
    id = id;
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
SELECT
    UUID(),
    u.id,
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
FROM universities AS u
WHERE u.slug = 'medorbits-sample-health-sciences-university'
ON DUPLICATE KEY UPDATE
    id = id;
-- =============================================================================
-- 3. VERIFY SEEDED UNIVERSITIES
-- =============================================================================
SELECT
    id,
    public_id,
    name,
    slug,
    university_type,
    country,
    state,
    city,
    is_active
FROM universities
WHERE slug IN (
    'medorbits-demo-university',
    'medorbits-sample-health-sciences-university'
)
ORDER BY slug;
-- =============================================================================
-- 4. VERIFY SEEDED COLLEGES AND UNIVERSITY RELATIONSHIPS
-- =============================================================================
SELECT
    c.id,
    c.public_id,
    c.name AS college_name,
    c.slug AS college_slug,
    c.college_type,
    u.name AS university_name,
    u.slug AS university_slug,
    c.country,
    c.state,
    c.city,
    c.is_active
FROM colleges AS c
INNER JOIN universities AS u
    ON u.id = c.university_id
WHERE c.slug IN (
    'medorbits-demo-medical-college',
    'medorbits-sample-dental-college'
)
ORDER BY c.slug;
COMMIT;