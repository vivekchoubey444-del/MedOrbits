-- =============================================================================
-- MEDORBITS: CONSOLIDATED DATABASE SCHEMA
-- File: database/schema.sql
-- Database: MySQL 8.0.16+
-- Engine: InnoDB
-- Character set: utf8mb4
-- Collation: utf8mb4_0900_ai_ci
--
-- PURPOSE
--   Unified schema for MedOrbits education consultancy, admissions,
--   career services, recruitment, subscriptions, payments, and administration.
--
-- IMPORTANT
--   1. Intended for a NEW development database.
--   2. Back up existing databases before applying schema changes.
--   3. CREATE TABLE IF NOT EXISTS does not migrate existing table structures.
--   4. Use versioned migrations for deployed databases.
--   5. Store password hashes only (Argon2id or bcrypt).
--   6. Never store raw card numbers or CVVs.
--   7. Never assign administrative privileges without authorization.
--   8. Review all schema and seed changes before production deployment.
-- =============================================================================
CREATE DATABASE IF NOT EXISTS medorbits
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE medorbits;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- =============================================================================
-- 1. SCHEMA MIGRATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    migration_name VARCHAR(255) NOT NULL,
    checksum CHAR(64) NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_schema_migrations_name (migration_name)
) ENGINE=InnoDB;
-- =============================================================================
-- 2. USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM(
        'pending',
        'active',
        'suspended',
        'deleted'
    ) NOT NULL DEFAULT 'pending',
    email_verified_at DATETIME(3) NULL,
    phone_verified_at DATETIME(3) NULL,
    last_login_at DATETIME(3) NULL,
    password_changed_at DATETIME(3) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_public_id (public_id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_status_created (status, created_at),
    KEY idx_users_phone (phone),
    KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB;
-- =============================================================================
-- 3. ROLES AND PERMISSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_key VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_key (role_key),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    permission_key VARCHAR(120) NOT NULL,
    name VARCHAR(120) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_key (permission_key),
    UNIQUE KEY uq_permissions_name (name),
    KEY idx_permissions_resource_action (resource, action)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    KEY idx_user_roles_role (role_id),
    KEY idx_user_roles_assigned_by (assigned_by),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_user_roles_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    KEY idx_role_permissions_permission (permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
-- =============================================================================
-- 4. COURSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS courses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    code VARCHAR(60) NOT NULL,
    category VARCHAR(100) NOT NULL,
    qualification_level VARCHAR(80) NULL,
    description TEXT NULL,
    duration_months SMALLINT UNSIGNED NULL,
    eligibility TEXT NULL,
    entrance_exam VARCHAR(120) NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_courses_public_id (public_id),
    UNIQUE KEY uq_courses_slug (slug),
    UNIQUE KEY uq_courses_code (code),
    KEY idx_courses_category_active (category, is_active),
    KEY idx_courses_published (is_published, is_active),
    CONSTRAINT chk_courses_duration
        CHECK (duration_months IS NULL OR duration_months > 0)
) ENGINE=InnoDB;
-- =============================================================================
-- 5. UNIVERSITIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS universities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    university_type VARCHAR(100) NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    state VARCHAR(100) NULL,
    city VARCHAR(120) NULL,
    website VARCHAR(500) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_universities_public_id (public_id),
    UNIQUE KEY uq_universities_slug (slug),
    KEY idx_universities_location (country, state, city),
    KEY idx_universities_status (is_active, is_verified)
) ENGINE=InnoDB;
-- =============================================================================
-- 6. COLLEGES AND COURSE RELATIONSHIPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS colleges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    university_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    college_type VARCHAR(100) NULL,
    institution_type VARCHAR(80) NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    state VARCHAR(100) NULL,
    city VARCHAR(120) NULL,
    address VARCHAR(500) NULL,
    pincode VARCHAR(20) NULL,
    website VARCHAR(500) NULL,
    website_url VARCHAR(500) NULL,
    recognition_body VARCHAR(180) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_colleges_public_id (public_id),
    UNIQUE KEY uq_colleges_slug (slug),
    KEY idx_colleges_university (university_id),
    KEY idx_colleges_location (country, state, city),
    KEY idx_colleges_status (is_active, is_verified, is_published),
    CONSTRAINT fk_colleges_university
        FOREIGN KEY (university_id) REFERENCES universities(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS course_colleges (
    course_id BIGINT UNSIGNED NOT NULL,
    college_id BIGINT UNSIGNED NOT NULL,
    duration_months SMALLINT UNSIGNED NULL,
    tuition_fee DECIMAL(12,2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    admission_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id, college_id),
    KEY idx_course_colleges_college (college_id),
    CONSTRAINT fk_course_colleges_course
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_course_colleges_college
        FOREIGN KEY (college_id) REFERENCES colleges(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_course_colleges_duration
        CHECK (duration_months IS NULL OR duration_months > 0),
    CONSTRAINT chk_course_colleges_fee
        CHECK (tuition_fee IS NULL OR tuition_fee >= 0)
) ENGINE=InnoDB;
-- =============================================================================
-- 7. ADMISSION APPLICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS applications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    application_number VARCHAR(60) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NULL,
    college_id BIGINT UNSIGNED NULL,
    application_type VARCHAR(80) NOT NULL DEFAULT 'admission',
    applicant_name VARCHAR(160) NOT NULL,
    applicant_email VARCHAR(254) NOT NULL,
    applicant_phone VARCHAR(30) NULL,
    status ENUM(
        'draft',
        'submitted',
        'under_review',
        'documents_required',
        'approved',
        'rejected',
        'withdrawn',
        'closed'
    ) NOT NULL DEFAULT 'draft',
    applicant_data JSON NULL,
    notes TEXT NULL,
    review_notes TEXT NULL,
    submitted_at DATETIME(3) NULL,
    reviewed_at DATETIME(3) NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_applications_public_id (public_id),
    UNIQUE KEY uq_applications_number (application_number),
    KEY idx_applications_user_status (user_id, status, created_at),
    KEY idx_applications_course_college (course_id, college_id),
    KEY idx_applications_reviewer (reviewed_by, reviewed_at),
    CONSTRAINT fk_applications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_applications_course
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_applications_college
        FOREIGN KEY (college_id) REFERENCES colleges(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_applications_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;
-- =============================================================================
-- 8. DOCUMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    document_ref CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED NULL,
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    sha256 CHAR(64) NULL,
    status ENUM(
        'uploaded',
        'scanning',
        'verified',
        'rejected',
        'deleted'
    ) NOT NULL DEFAULT 'uploaded',
    verified_by BIGINT UNSIGNED NULL,
    verified_at DATETIME(3) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_documents_ref (document_ref),
    KEY idx_documents_user_type (user_id, document_type, status),
    KEY idx_documents_application (application_id),
    KEY idx_documents_verifier (verified_by),
    CONSTRAINT fk_documents_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_documents_application
        FOREIGN KEY (application_id) REFERENCES applications(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_documents_verifier
        FOREIGN KEY (verified_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;
-- =============================================================================
-- 9. EMPLOYERS, JOBS, AND JOB APPLICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS employers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_slug VARCHAR(200) NOT NULL,
    website_url VARCHAR(500) NULL,
    verification_status ENUM(
        'pending',
        'verified',
        'rejected'
    ) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_employers_public_id (public_id),
    UNIQUE KEY uq_employers_user (user_id),
    UNIQUE KEY uq_employers_slug (company_slug),
    CONSTRAINT fk_employers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    employer_id BIGINT UNSIGNED NOT NULL,
    slug VARCHAR(220) NOT NULL,
    title VARCHAR(220) NOT NULL,
    description MEDIUMTEXT NOT NULL,
    employment_type VARCHAR(60) NULL,
    location VARCHAR(180) NULL,
    salary_min DECIMAL(12,2) NULL,
    salary_max DECIMAL(12,2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM(
        'draft',
        'published',
        'paused',
        'closed'
    ) NOT NULL DEFAULT 'draft',
    published_at DATETIME(3) NULL,
    expires_at DATETIME(3) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_jobs_public_id (public_id),
    UNIQUE KEY uq_jobs_slug (slug),
    KEY idx_jobs_status_published (status, published_at),
    KEY idx_jobs_employer (employer_id),
    CONSTRAINT fk_jobs_employer
        FOREIGN KEY (employer_id) REFERENCES employers(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_jobs_salary_min
        CHECK (salary_min IS NULL OR salary_min >= 0),
    CONSTRAINT chk_jobs_salary_max
        CHECK (salary_max IS NULL OR salary_max >= 0),
    CONSTRAINT chk_jobs_salary_range
        CHECK (
            salary_min IS NULL
            OR salary_max IS NULL
            OR salary_max >= salary_min
        )
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS job_applications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    job_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    resume_document_id BIGINT UNSIGNED NULL,
    cover_letter TEXT NULL,
    status ENUM(
        'submitted',
        'viewed',
        'shortlisted',
        'rejected',
        'withdrawn',
        'hired'
    ) NOT NULL DEFAULT 'submitted',
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_job_applications_public_id (public_id),
    UNIQUE KEY uq_job_application_user (job_id, user_id),
    KEY idx_job_applications_user (user_id, applied_at),
    KEY idx_job_applications_resume (resume_document_id),
    CONSTRAINT fk_job_applications_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_job_applications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_job_applications_resume
        FOREIGN KEY (resume_document_id) REFERENCES documents(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;
-- =============================================================================
-- 10. SUBSCRIPTIONS AND PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_key VARCHAR(100) NOT NULL,
    status ENUM(
        'trialing',
        'active',
        'past_due',
        'cancelled',
        'expired'
    ) NOT NULL DEFAULT 'active',
    provider VARCHAR(80) NULL,
    provider_customer_ref VARCHAR(255) NULL,
    provider_subscription_ref VARCHAR(255) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    starts_at DATETIME(3) NOT NULL,
    ends_at DATETIME(3) NULL,
    cancelled_at DATETIME(3) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscriptions_public_id (public_id),
    UNIQUE KEY uq_subscriptions_provider_ref
        (provider, provider_subscription_ref),
    KEY idx_subscriptions_user_status (user_id, status),
    CONSTRAINT fk_subscriptions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_subscriptions_amount
        CHECK (amount >= 0),
    CONSTRAINT chk_subscriptions_dates
        CHECK (ends_at IS NULL OR ends_at >= starts_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    payment_ref VARCHAR(80) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    subscription_id BIGINT UNSIGNED NULL,
    application_id BIGINT UNSIGNED NULL,
    provider VARCHAR(80) NOT NULL,
    provider_payment_ref VARCHAR(255) NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM(
        'created',
        'pending',
        'succeeded',
        'failed',
        'refunded',
        'partially_refunded',
        'cancelled'
    ) NOT NULL DEFAULT 'created',
    idempotency_key VARCHAR(150) NULL,
    paid_at DATETIME(3) NULL,
    refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payments_ref (payment_ref),
    UNIQUE KEY uq_payments_idempotency (idempotency_key),
    UNIQUE KEY uq_payments_provider_ref (provider, provider_payment_ref),
    KEY idx_payments_user_status (user_id, status, created_at),
    KEY idx_payments_subscription (subscription_id),
    KEY idx_payments_application (application_id),
    CONSTRAINT fk_payments_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_payments_subscription
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_payments_application
        FOREIGN KEY (application_id) REFERENCES applications(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_payments_amount
        CHECK (amount >= 0),
    CONSTRAINT chk_payments_refunded_amount
        CHECK (
            refunded_amount >= 0
            AND refunded_amount <= amount
        )
) ENGINE=InnoDB;
-- =============================================================================
-- 11. NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    channel ENUM('in_app', 'email', 'sms') NOT NULL DEFAULT 'in_app',
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    payload JSON NULL,
    status ENUM(
        'queued',
        'sent',
        'failed',
        'read'
    ) NOT NULL DEFAULT 'queued',
    scheduled_at DATETIME(3) NULL,
    sent_at DATETIME(3) NULL,
    read_at DATETIME(3) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_notifications_public_id (public_id),
    KEY idx_notifications_user_status (user_id, status, created_at),
    KEY idx_notifications_schedule (status, scheduled_at),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
-- =============================================================================
-- 12. AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT UNSIGNED NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NULL,
    request_id VARCHAR(100) NULL,
    ip_address VARBINARY(16) NULL,
    user_agent VARCHAR(500) NULL,
    details JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_actor_created (actor_user_id, created_at),
    KEY idx_audit_entity (entity_type, entity_id, created_at),
    KEY idx_audit_action_created (action, created_at),
    CONSTRAINT fk_audit_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;
-- =============================================================================
-- 13. BASELINE ROLES
-- =============================================================================
-- These roles do not automatically grant administrative privileges.
-- Run the dedicated permission seed to establish role-permission mappings.
-- Do not assign the admin role to users through this schema file.
INSERT INTO roles (
    role_key,
    name,
    display_name,
    description,
    is_system
)
VALUES
    ('user', 'user', 'User', 'Standard registered account.', TRUE),
    ('student', 'student', 'Student', 'Student or applicant account.', TRUE),
    ('job_seeker', 'job_seeker', 'Job Seeker', 'Career and employment services user.', TRUE),
    ('employer', 'employer', 'Employer', 'Employer account.', TRUE),
    ('counsellor', 'counsellor', 'Counsellor', 'Education guidance and application support.', TRUE),
    ('support', 'support', 'Support', 'Customer support operator.', TRUE),
    ('admin', 'admin', 'Administrator', 'Privileged platform administrator.', TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    display_name = VALUES(display_name),
    description = VALUES(description),
    is_system = VALUES(is_system);
-- =============================================================================
-- 14. INITIAL PERMISSIONS
-- =============================================================================
-- Role-permission assignments should be managed by database/seeds/seed-roles.sql.
-- Permission names match the application authorization vocabulary.
INSERT INTO permissions (
    permission_key,
    name,
    resource,
    action,
    description,
    is_system
)
VALUES
    ('profile.read_own', 'profile.read_own', 'profile', 'read_own', 'Read own profile.', TRUE),
    ('profile.update_own', 'profile.update_own', 'profile', 'update_own', 'Update own profile.', TRUE),
    ('applications.create', 'applications.create', 'applications', 'create', 'Create applications.', TRUE),
    ('applications.read_own', 'applications.read_own', 'applications', 'read_own', 'Read own applications.', TRUE),
    ('applications.update_own', 'applications.update_own', 'applications', 'update_own', 'Update eligible own applications.', TRUE),
    ('applications.read_all', 'applications.read_all', 'applications', 'read_all', 'Read applications across users.', TRUE),
    ('applications.review', 'applications.review', 'applications', 'review', 'Review applications.', TRUE),
    ('applications.manage', 'applications.manage', 'applications', 'manage', 'Manage application workflows.', TRUE),
    ('colleges.read', 'colleges.read', 'colleges', 'read', 'View colleges.', TRUE),
    ('colleges.manage', 'colleges.manage', 'colleges', 'manage', 'Manage college records.', TRUE),
    ('courses.read', 'courses.read', 'courses', 'read', 'View courses.', TRUE),
    ('courses.manage', 'courses.manage', 'courses', 'manage', 'Manage course records.', TRUE),
    ('jobs.read', 'jobs.read', 'jobs', 'read', 'View jobs.', TRUE),
    ('jobs.manage', 'jobs.manage', 'jobs', 'manage', 'Manage job listings.', TRUE),
    ('employers.manage_own', 'employers.manage_own', 'employers', 'manage_own', 'Manage own employer profile.', TRUE),
    ('users.read', 'users.read', 'users', 'read', 'Read user records.', TRUE),
    ('users.manage', 'users.manage', 'users', 'manage', 'Manage user accounts.', TRUE),
    ('roles.read', 'roles.read', 'roles', 'read', 'Read roles and permissions.', TRUE),
    ('roles.manage', 'roles.manage', 'roles', 'manage', 'Manage role assignments.', TRUE),
    ('payments.read_own', 'payments.read_own', 'payments', 'read_own', 'Read own payments.', TRUE),
    ('payments.read_all', 'payments.read_all', 'payments', 'read_all', 'Read all payments.', TRUE),
    ('payments.refund', 'payments.refund', 'payments', 'refund', 'Initiate authorized refunds.', TRUE),
    ('documents.read_own', 'documents.read_own', 'documents', 'read_own', 'Read own documents.', TRUE),
    ('documents.manage_own', 'documents.manage_own', 'documents', 'manage_own', 'Manage own eligible documents.', TRUE),
    ('documents.review', 'documents.review', 'documents', 'review', 'Review submitted documents.', TRUE),
    ('support.create', 'support.create', 'support', 'create', 'Create support requests.', TRUE),
    ('support.manage', 'support.manage', 'support', 'manage', 'Manage support requests.', TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    resource = VALUES(resource),
    action = VALUES(action),
    description = VALUES(description),
    is_system = VALUES(is_system);
-- =============================================================================
-- END OF SCHEMA
-- =============================================================================