
-- =============================================================================
-- MedOrbits Migration 010: Audit Logs
-- File: database/migrations/010_create_audit_logs.sql
-- Database: MySQL 8.0.16+
--
-- Dependencies:
--   001_create_users.sql
--
-- Purpose:
--   Record security-sensitive actions, outcomes and request metadata.
--
-- Security:
--   - Never store passwords, access tokens, session cookies or secrets.
--   - Restrict audit-log access to authorized personnel.
--   - Audit logs should be append-only at the application level.
--   - Do not rely on application logs as the only security control.
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    actor_user_id BIGINT UNSIGNED NULL,

    action VARCHAR(120) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(150) NULL,

    outcome VARCHAR(30) NOT NULL DEFAULT 'success',
    request_id VARCHAR(150) NULL,

    -- IPv4 and IPv6 textual representations.
    -- Validate the address in the application before inserting.
    ip_address VARCHAR(45) NULL,

    user_agent TEXT NULL,

    metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    KEY idx_audit_logs_actor_created (
        actor_user_id,
        created_at
    ),

    KEY idx_audit_logs_action_created (
        action,
        created_at
    ),

    KEY idx_audit_logs_resource (
        resource_type,
        resource_id
    ),

    KEY idx_audit_logs_created_at (created_at),

    KEY idx_audit_logs_request_id (request_id),

    KEY idx_audit_logs_outcome_created (
        outcome,
        created_at
    ),

    CONSTRAINT chk_audit_logs_outcome
        CHECK (
            outcome IN (
                'success',
                'failure',
                'denied'
            )
        ),

    CONSTRAINT chk_audit_logs_action
        CHECK (CHAR_LENGTH(TRIM(action)) > 0),

    CONSTRAINT chk_audit_logs_resource_type
        CHECK (CHAR_LENGTH(TRIM(resource_type)) > 0),

    CONSTRAINT chk_audit_logs_request_id
        CHECK (
            request_id IS NULL
            OR CHAR_LENGTH(TRIM(request_id)) > 0
        ),

    CONSTRAINT fk_audit_logs_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users (id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
