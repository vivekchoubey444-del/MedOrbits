MEDORBITS DATABASE SCHEMA
File: database/schema.txt
Database: MySQL 8.0+
Character set: utf8mb4
Engine: InnoDB

IMPORTANT
1. Create a dedicated database and restricted application user before running this schema.
2. Back up any existing database first. CREATE TABLE IF NOT EXISTS does not migrate existing table structures.
3. Store password hashes only (Argon2id or bcrypt); never store plaintext passwords.
4. Store payment-provider tokens/references, not raw card data or CVV.
5. Review retention, consent, and access rules before using real personal or educational records.
6. Run this file against a development database first. The schema is a starting configuration and needs application-level integration tests.

CREATE DATABASE IF NOT EXISTS medorbits
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE medorbits;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schema_migrations_name (migration_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('pending','active','suspended','deleted') NOT NULL DEFAULT 'pending',
  email_verified_at DATETIME NULL,
  phone_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_public_id (public_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status_created (status, created_at),
  KEY idx_users_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_key VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_key (role_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  permission_key VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_key (permission_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(180) NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  level VARCHAR(80) NULL,
  description TEXT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_slug (slug),
  KEY idx_courses_category_published (category, is_published)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS colleges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(200) NOT NULL,
  name VARCHAR(255) NOT NULL,
  institution_type VARCHAR(80) NULL,
  state VARCHAR(100) NULL,
  city VARCHAR(120) NULL,
  address VARCHAR(500) NULL,
  website_url VARCHAR(500) NULL,
  recognition_body VARCHAR(180) NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_colleges_slug (slug),
  KEY idx_colleges_location (state, city),
  KEY idx_colleges_published (is_published, is_verified)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_colleges (
  course_id BIGINT UNSIGNED NOT NULL,
  college_id BIGINT UNSIGNED NOT NULL,
  duration_months SMALLINT UNSIGNED NULL,
  tuition_fee DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  admission_notes TEXT NULL,
  PRIMARY KEY (course_id, college_id),
  CONSTRAINT fk_course_colleges_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_colleges_college FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_ref VARCHAR(40) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  course_id BIGINT UNSIGNED NULL,
  college_id BIGINT UNSIGNED NULL,
  application_type VARCHAR(80) NOT NULL DEFAULT 'admission',
  status ENUM('draft','submitted','under_review','documents_required','approved','rejected','withdrawn','closed') NOT NULL DEFAULT 'draft',
  applicant_data JSON NULL,
  submitted_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_applications_ref (application_ref),
  KEY idx_applications_user_status (user_id, status, created_at),
  KEY idx_applications_course_college (course_id, college_id),
  CONSTRAINT fk_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_applications_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  CONSTRAINT fk_applications_college FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL,
  CONSTRAINT fk_applications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
  status ENUM('uploaded','scanning','verified','rejected','deleted') NOT NULL DEFAULT 'uploaded',
  verified_by BIGINT UNSIGNED NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_documents_ref (document_ref),
  KEY idx_documents_user_type (user_id, document_type, status),
  KEY idx_documents_application (application_id),
  CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  CONSTRAINT fk_documents_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_slug VARCHAR(200) NOT NULL,
  website_url VARCHAR(500) NULL,
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employers_user (user_id),
  UNIQUE KEY uq_employers_slug (company_slug),
  CONSTRAINT fk_employers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employer_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(220) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description MEDIUMTEXT NOT NULL,
  employment_type VARCHAR(60) NULL,
  location VARCHAR(180) NULL,
  salary_min DECIMAL(12,2) NULL,
  salary_max DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('draft','published','paused','closed') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_jobs_slug (slug),
  KEY idx_jobs_status_published (status, published_at),
  KEY idx_jobs_employer (employer_id),
  CONSTRAINT fk_jobs_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  resume_document_id BIGINT UNSIGNED NULL,
  cover_letter TEXT NULL,
  status ENUM('submitted','viewed','shortlisted','rejected','withdrawn','hired') NOT NULL DEFAULT 'submitted',
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_application_user (job_id, user_id),
  KEY idx_job_applications_user (user_id, applied_at),
  CONSTRAINT fk_job_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_job_applications_resume FOREIGN KEY (resume_document_id) REFERENCES documents(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_key VARCHAR(100) NOT NULL,
  status ENUM('trialing','active','past_due','cancelled','expired') NOT NULL DEFAULT 'active',
  provider VARCHAR(80) NULL,
  provider_customer_ref VARCHAR(255) NULL,
  provider_subscription_ref VARCHAR(255) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_subscriptions_user_status (user_id, status),
  UNIQUE KEY uq_subscriptions_provider_ref (provider, provider_subscription_ref),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_ref VARCHAR(80) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  subscription_id BIGINT UNSIGNED NULL,
  provider VARCHAR(80) NOT NULL,
  provider_payment_ref VARCHAR(255) NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('created','pending','succeeded','failed','refunded','partially_refunded','cancelled') NOT NULL DEFAULT 'created',
  idempotency_key VARCHAR(150) NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_ref (payment_ref),
  UNIQUE KEY uq_payments_idempotency (idempotency_key),
  KEY idx_payments_user_status (user_id, status, created_at),
  UNIQUE KEY uq_payments_provider_ref (provider, provider_payment_ref),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('in_app','email','sms') NOT NULL DEFAULT 'in_app',
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  payload JSON NULL,
  status ENUM('queued','sent','failed','read') NOT NULL DEFAULT 'queued',
  scheduled_at DATETIME NULL,
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_status (user_id, status, created_at),
  KEY idx_notifications_schedule (status, scheduled_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Recommended initial roles. Safe to re-run.
INSERT INTO roles (role_key, name, description) VALUES
  ('student', 'Student', 'Student or applicant account'),
  ('job_seeker', 'Job Seeker', 'Career and employment services user'),
  ('employer', 'Employer', 'Employer account'),
  ('support', 'Support', 'Customer support operator'),
  ('admin', 'Administrator', 'Privileged platform administrator')
ON DUPLICATE KEY UPDATE n