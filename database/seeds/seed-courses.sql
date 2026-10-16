-- =============================================================================
-- MedOrbits: Seed Illustrative Education Courses
-- File: database/seeds/seed-courses.sql
-- Database: MySQL 8.0.16+
--
-- Requires:
--   003_create_courses.sql
--
-- Purpose:
--   Insert baseline education course catalogue records for development,
--   testing, local demonstrations, and automated test environments.
--
-- SAFETY AND DATA QUALITY:
--   - Records are illustrative, not official admission guidance.
--   - Verify eligibility, duration, entrance examinations, and regulations
--     with the relevant official authorities before publishing.
--   - Do not use this seed as a substitute for production catalogue management.
--   - Existing course records are not overwritten by this script.
--
-- IDEMPOTENCY:
--   Re-running this script must not create duplicate course slugs.
--   The courses.slug column should have a UNIQUE constraint.
--
-- IMPORTANT:
--   This script does not create or modify the courses table.
--   Run the required migration before executing this seed.
-- =============================================================================
START TRANSACTION;
-- ---------------------------------------------------------------------------
-- 1. Insert baseline education courses
-- ---------------------------------------------------------------------------
INSERT INTO courses (
    public_id,
    name,
    slug,
    code,
    category,
    qualification_level,
    description,
    duration_months,
    eligibility,
    entrance_exam,
    is_active
)
VALUES
    (
        UUID(),
        'Bachelor of Medicine and Bachelor of Surgery',
        'mbbs',
        'MBBS',
        'Medical',
        'Undergraduate',
        'Illustrative medical course catalogue entry.',
        66,
        'Verify current eligibility and applicable regulations with official authorities.',
        'NEET-UG',
        TRUE
    ),
    (
        UUID(),
        'Bachelor of Dental Surgery',
        'bds',
        'BDS',
        'Dental',
        'Undergraduate',
        'Illustrative dental course catalogue entry.',
        60,
        'Verify current eligibility and applicable regulations with official authorities.',
        'NEET-UG',
        TRUE
    ),
    (
        UUID(),
        'Bachelor of Ayurvedic Medicine and Surgery',
        'bams',
        'BAMS',
        'AYUSH',
        'Undergraduate',
        'Illustrative Ayurveda course catalogue entry.',
        66,
        'Verify current eligibility and applicable regulations with official authorities.',
        'NEET-UG',
        TRUE
    ),
    (
        UUID(),
        'Bachelor of Pharmacy',
        'b-pharm',
        'BPHARM',
        'Pharmacy',
        'Undergraduate',
        'Illustrative pharmacy course catalogue entry.',
        48,
        'Verify eligibility with the relevant institution and regulator.',
        NULL,
        TRUE
    ),
    (
        UUID(),
        'Bachelor of Science in Nursing',
        'bsc-nursing',
        'BSCN',
        'Nursing',
        'Undergraduate',
        'Illustrative nursing course catalogue entry.',
        48,
        'Verify eligibility and admission requirements with the relevant institution.',
        NULL,
        TRUE
    ),
    (
        UUID(),
        'Bachelor of Technology in Computer Science',
        'btech-computer-science',
        'BTECH-CSE',
        'Engineering',
        'Undergraduate',
        'Illustrative engineering course catalogue entry.',
        48,
        'Verify eligibility and entrance requirements with the relevant institution.',
        NULL,
        TRUE
    )
ON DUPLICATE KEY UPDATE
    id = id;
-- ---------------------------------------------------------------------------
-- 2. Verify baseline course records
-- ---------------------------------------------------------------------------
-- This query displays the seeded course slugs and their current status.
-- It does not automatically abort the transaction if a record is missing.
SELECT
    id,
    public_id,
    name,
    slug,
    code,
    category,
    qualification_level,
    duration_months,
    entrance_exam,
    is_active
FROM courses
WHERE slug IN (
    'mbbs',
    'bds',
    'bams',
    'b-pharm',
    'bsc-nursing',
    'btech-computer-science'
)
ORDER BY FIELD(
    slug,
    'mbbs',
    'bds',
    'bams',
    'b-pharm',
    'bsc-nursing',
    'btech-computer-science'
);
COMMIT;