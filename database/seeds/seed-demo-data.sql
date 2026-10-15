
-- =============================================================================
-- MedOrbits: Seed Minimal Synthetic Demonstration Data
-- File: database/seeds/seed-demo-data.sql
-- Database: MySQL 8.0.16+
--
-- Requires:
--   Migrations 001-010
--   seed-courses.sql
--   seed-colleges.sql
--   A pre-existing synthetic user with the specified email
--
-- SAFETY:
--   Development/test databases only.
--   Does not create login accounts or payment records.
--   The applicant and application are fictional.
-- =============================================================================

START TRANSACTION;

INSERT INTO applications (
    public_id,
    application_number,
    user_id,
    course_id,
    college_id,
    applicant_name,
    applicant_email,
    applicant_phone,
    status,
    notes,
    submitted_at
)
SELECT
    UUID(),
    'DEMO-APPLICATION-0001',
    u.id,
    c.id,
    cl.id,
    'Demo Applicant',
    'demo-applicant@example.invalid',
    NULL,
    'submitted',
    'Synthetic demonstration record. Not a real admission application.',
    CURRENT_TIMESTAMP(3)
FROM users AS u
CROSS JOIN courses AS c
CROSS JOIN colleges AS cl
WHERE u.email = 'demo-applicant@example.invalid'
  AND c.slug = 'mbbs'
  AND cl.slug = 'medorbits-demo-medical-college'
ON DUPLICATE KEY UPDATE
    id = id;

COMMIT;
