
-- =============================================================================
-- MedOrbits Migration 006: Documents
-- File: database/migrations/006_create_documents.sql
-- Database: MySQL 8.0.16+
--
-- Dependencies:
--   001_create_users.sql
--   005_create_applications.sql
--
-- Purpose:
--   Store document metadata for user and application documents.
--
-- Security:
--   Store actual files in private storage, not in the public web directory.
--   Never trust client-supplied filenames, MIME types or file checksums.
--   Validate file content, size, permissions and ownership in the application.
-- =============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- Generate UUIDs in the application using crypto.randomUUID().
    public_id CHAR(36) NOT NULL,

    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED NULL,

    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,

    -- Unique private-storage identifier; do not store a public file URL here.
    storage_key VARCHAR(1024) NOT NULL,

    mime_type VARCHAR(150) NOT NULL,
    file_size_bytes BIGINT UNSIGNED NOT NULL,

    checksum_sha256 CHAR(64) NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'uploaded',

    uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    reviewed_at DATETIME(3) NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    rejection_reason TEXT NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_documents_public_id (public_id),
    UNIQUE KEY uq_documents_storage_key (storage_key),

    KEY idx_documents_user_id (user_id),
    KEY idx_documents_application_id (application_id),
    KEY idx_documents_status (status),
    KEY idx_documents_type (document_type),
    KEY idx_documents_uploaded_at (uploaded_at),
    KEY idx_documents_user_status (user_id, status),
    KEY idx_documents_application_status (application_id, status),

    CONSTRAINT chk_documents_size
        CHECK (file_size_bytes > 0),

    CONSTRAINT chk_documents_status
        CHECK (
            status IN (
                'uploaded',
                'pending_review',
                'verified',
                'rejected',
                'deleted'
            )
        ),

    CONSTRAINT chk_documents_filename
        CHECK (CHAR_LENGTH(TRIM(original_filename)) > 0),

    CONSTRAINT chk_documents_type
        CHECK (CHAR_LENGTH(TRIM(document_type)) > 0),

    CONSTRAINT chk_documents_mime_type
        CHECK (CHAR_LENGTH(TRIM(mime_type)) > 0),

    CONSTRAINT chk_documents_checksum
        CHECK (
            checksum_sha256 IS NULL
            OR checksum_sha256 REGEXP '^[0-9a-fA-F]{64}$'
        ),

    CONSTRAINT fk_documents_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_documents_application
        FOREIGN KEY (application_id)
        REFERENCES applications (id)
        ON DELETE SET NULL,

    CONSTRAINT fk_documents_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users (id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
