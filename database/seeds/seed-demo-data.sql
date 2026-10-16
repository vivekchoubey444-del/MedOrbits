-- =============================================================================
-- MedOrbits: Seed Minimal Synthetic Demonstration Data
-- File: database/seeds/seed-demo-data.sql
-- Database: MySQL 8.0.16+
--
-- Requires:
--   Migrations 001-010
--   database/seeds/seed-courses.sql
--   database/seeds/seed-colleges.sql
--   A pre-existing synthetic user with the specified email
--
-- SAFETY:
--   Development/test databases only.
--   Does not create login accounts or payment records.
--   All demonstration applicant details are fictional.
--   Never use this seed against a production database.
--
-- IDEMPOTENCY:
--   Uses a stable application number to prevent duplicate demo applications.
--   Requires applications.application_number to have a UNIQUE constraint.
--
-- IMPORTANT:
--   The transaction does not automatically roll back when prerequisite
--   records are missing. Verify the affected-row count after execution.
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
INNER JOIN courses AS c
    ON c.slug = 'mbbs'
INNER JOIN colleges AS cl
    ON cl.slug = 'medorbits-demo-medical-college'
WHERE u.email = 'demo-applicant@example.invalid'
ON DUPLICATE KEY UPDATE
    id = id;
-- Confirm the demo application exists before committing.
-- This check assumes application_number is unique.
SELECT
    application_number,
    applicant_name,
    applicant_email,
    status
FROM applications
WHERE application_number = 'DEMO-APPLICATION-0001';
COMMIT;