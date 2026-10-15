
-- =============================================================================
-- MedOrbits: Seed Illustrative Education Courses
-- File: database/seeds/seed-courses.sql
-- Database: MySQL 8.0.16+
--
-- Requires:
--   003_create_courses.sql
--
-- Purpose:
--   Insert sample education course catalogue records for development/testing.
--
-- IMPORTANT:
--   These are illustrative catalogue records, not official admission guidance.
--   Verify eligibility, duration and entrance requirements with official sources.
-- =============================================================================

START TRANSACTION;

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
        'Illustrative medical course catalog entry.',
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
        'Illustrative dental course catalog entry.',
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
        'Illustrative Ayurveda course catalog entry.',
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
        'Illustrative pharmacy course catalog entry.',
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
        'Illustrative nursing course catalog entry.',
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
        'Illustrative engineering course catalog entry.',
        48,
        'Verify eligibility and entrance requirements with the relevant institution.',
        NULL,
        TRUE
    )
AS incoming
ON DUPLICATE KEY UPDATE
    id = id;

COMMIT;
