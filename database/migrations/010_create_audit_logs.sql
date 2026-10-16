-- =============================================================================
-- MedOrbits Migration 010: Audit Logs
-- File: database/migrations/010_create_audit_logs.sql
-- Database: MySQL 8.0.16+
--
-- Dependencies:
--   001_create_users.sql
--
-- Purpose:
--   Maintain a structured audit trail of security-sensitive actions,
--   administrative changes, data access and business-critical events.
--
-- Coverage:
--   Authentication, authorization, users, applications, documents, payments,
--   subscriptions, employers, jobs, notifications and administrative actions.
--
-- Security:
--   - Never store passwords, access tokens, cookies, secrets or payment
--     credentials.
--   - Do not store full document contents or unnecessary personal information.
--   - Restrict audit-log access to authorized personnel.
--   - Treat audit records as append-only at the application level.
--   - Use external log storage or tamper-evident controls for stronger
--     protection against privileged database modifications.
--
-- Compatibility:
--   MySQL 8.0.16+; InnoDB; utf8mb4.
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- Stable identifier for external references and investigations.
    public_id CHAR(36) NOT NULL,
    -- Actor can be a registered user, system process or unauthenticated client.
    -- NULL is appropriate for anonymous requests and system-generated events.
    actor_user_id BIGINT UNSIGNED NULL,
    actor_type VARCHAR(30) NOT NULL DEFAULT 'user',
    actor_identifier VARCHAR(191) NULL,
    -- Action names should be stable, machine-readable values.
    -- Examples: auth.login, application.review, payment.refund.
    action VARCHAR(120) NOT NULL,
    -- Target object, such as application, document, user, payment or job.
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(191) NULL,
    resource_public_id CHAR(36) NULL,
    -- Result of the attempted operation.
    outcome VARCHAR(30) NOT NULL DEFAULT 'success',
    -- HTTP/request correlation fields.
    request_id VARCHAR(150) NULL,
    correlation_id VARCHAR(150) NULL,
    http_method VARCHAR(10) NULL,
    route_template VARCHAR(255) NULL,
    http_status SMALLINT UNSIGNED NULL,
    -- IPv4/IPv6 text representation. Validate in the application.
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(1024) NULL,
    -- Optional structured context. Never include secrets or raw credentials.
    metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
    -- Optional sanitized change snapshots.
    -- Include only fields approved for auditing.
    before_data JSON NULL,
    after_data JSON NULL,
    -- Optional stable code for application-level error classification.
    error_code VARCHAR(100) NULL,
    -- Event occurrence and persistence timestamps.
    occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_audit_logs_public_id (public_id),
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
        resource_id,
        created_at
    ),
    KEY idx_audit_logs_resource_public_id (
        resource_type,
        resource_public_id,
        created_at
    ),
    KEY idx_audit_logs_request_id (request_id),
    KEY idx_audit_logs_correlation_id (correlation_id),
    KEY idx_audit_logs_outcome_created (
        outcome,
        created_at
    ),
    KEY idx_audit_logs_actor_type_created (
        actor_type,
        created_at
    ),
    KEY idx_audit_logs_ip_created (
        ip_address,
        created_at
    ),
    KEY idx_audit_logs_occurred_at (occurred_at),
    CONSTRAINT chk_audit_logs_public_id
        CHECK (CHAR_LENGTH(TRIM(public_id)) = 36),
    CONSTRAINT chk_audit_logs_actor_type
        CHECK (
            actor_type IN (
                'user',
                'admin',
                'system',
                'service',
                'anonymous'
            )
        ),
    CONSTRAINT chk_audit_logs_action
        CHECK (CHAR_LENGTH(TRIM(action)) > 0),
    CONSTRAINT chk_audit_logs_resource_type
        CHECK (CHAR_LENGTH(TRIM(resource_type)) > 0),
    CONSTRAINT chk_audit_logs_outcome
        CHECK (
            outcome IN (
                'success',
                'failure',
                'denied',
                'error'
            )
        ),
    CONSTRAINT chk_audit_logs_request_id
        CHECK (
            request_id IS NULL
            OR CHAR_LENGTH(TRIM(request_id)) > 0
        ),
    CONSTRAINT chk_audit_logs_correlation_id
        CHECK (
            correlation_id IS NULL
            OR CHAR_LENGTH(TRIM(correlation_id)) > 0
        ),
    CONSTRAINT chk_audit_logs_http_method
        CHECK (
            http_method IS NULL
            OR http_method IN (
                'GET',
                'POST',
                'PUT',
                'PATCH',
                'DELETE',
                'HEAD',
                'OPTIONS'
            )
        ),
    CONSTRAINT chk_audit_logs_http_status
        CHECK (
            http_status IS NULL
            OR http_status BETWEEN 100 AND 599
        ),
    CONSTRAINT chk_audit_logs_ip_address
        CHECK (
            ip_address IS NULL
            OR CHAR_LENGTH(TRIM(ip_address)) > 0
        ),
    CONSTRAINT chk_audit_logs_actor_identifier
        CHECK (
            actor_identifier IS NULL
            OR CHAR_LENGTH(TRIM(actor_identifier)) > 0
        ),
    CONSTRAINT chk_audit_logs_resource_id
        CHECK (
            resource_id IS NULL
            OR CHAR_LENGTH(TRIM(resource_id)) > 0
        ),
    CONSTRAINT chk_audit_logs_route_template
        CHECK (
            route_template IS NULL
            OR CHAR_LENGTH(TRIM(route_template)) > 0
        ),
    CONSTRAINT fk_audit_logs_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
-- =============================================================================
-- END OF MIGRATION 010
--
-- Application responsibilities:
--   1. Generate public_id using crypto.randomUUID().
--   2. Populate request_id and correlation_id consistently.
--   3. Use stable action and resource-type naming conventions.
--   4. Sanitize metadata and before/after snapshots.
--   5. Never record credentials, session tokens, payment secrets or raw files.
--   6. Restrict UPDATE and DELETE privileges on audit_logs where practical.
--   7. Use controlled retention, archival and access-review procedures.
--
-- Operational note:
--   CREATE TABLE IF NOT EXISTS does not alter an existing table.
--   MySQL DDL may implicitly commit. Use a new forward migration for changes.
-- =============================================================================