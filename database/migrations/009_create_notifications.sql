-- =============================================================================
-- MedOrbits Migration 009: Notifications Infrastructure
-- File: database/migrations/009_create_notifications.sql
-- Database: MySQL 8.0.16+
--
-- Dependencies:
--   001_create_users.sql
--
-- Purpose:
--   Notification records, user preferences, templates, channel deliveries,
--   delivery attempts, worker leasing and provider webhook deduplication.
--
-- Important:
--   Generate public_id using crypto.randomUUID() in Node.js.
--   Use UTC for application-generated timestamps.
--   Verify provider webhook signatures before processing events.
--   Never store provider credentials, payment credentials or access tokens.
-- =============================================================================


-- =============================================================================
-- TABLE: notification_templates
-- Purpose:
--   Store versioned templates for supported notification channels.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,

    template_key VARCHAR(120) NOT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,

    channel VARCHAR(20) NOT NULL,
    locale VARCHAR(20) NOT NULL DEFAULT 'en',

    subject_template VARCHAR(255) NULL,
    title_template VARCHAR(200) NULL,
    body_template TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_notification_templates_public_id (public_id),

    UNIQUE KEY uq_notification_template_version (
        template_key,
        channel,
        locale,
        version
    ),

    KEY idx_notification_templates_active (
        template_key,
        channel,
        locale,
        is_active
    ),

    CONSTRAINT chk_notification_templates_version
        CHECK (version > 0),

    CONSTRAINT chk_notification_templates_key
        CHECK (CHAR_LENGTH(TRIM(template_key)) > 0),

    CONSTRAINT chk_notification_templates_channel
        CHECK (
            channel IN (
                'in_app',
                'email',
                'sms',
                'push'
            )
        ),

    CONSTRAINT chk_notification_templates_locale
        CHECK (CHAR_LENGTH(TRIM(locale)) > 0),

    CONSTRAINT chk_notification_templates_body
        CHECK (CHAR_LENGTH(TRIM(body_template)) > 0)

) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- TABLE: notification_preferences
-- Purpose:
--   Store per-user channel and category preferences.
--
-- Security and compliance notifications may require separate policy handling.
-- Do not treat user preferences as a substitute for consent or legal compliance.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT UNSIGNED NOT NULL,

    notification_category VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL,

    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_notification_preferences_user_category_channel (
        user_id,
        notification_category,
        channel
    ),

    KEY idx_notification_preferences_category (
        notification_category,
        channel,
        is_enabled
    ),

    CONSTRAINT chk_notification_preferences_category
        CHECK (CHAR_LENGTH(TRIM(notification_category)) > 0),

    CONSTRAINT chk_notification_preferences_channel
        CHECK (
            channel IN (
                'in_app',
                'email',
                'sms',
                'push'
            )
        ),

    CONSTRAINT fk_notification_preferences_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- TABLE: notifications
-- Purpose:
--   Store the logical notification and its in-app presentation state.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    notification_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',

    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,

    action_url VARCHAR(2048) NULL,

    entity_type VARCHAR(80) NULL,
    entity_public_id CHAR(36) NULL,

    template_id BIGINT UNSIGNED NULL,

    -- Store only sanitized, non-sensitive contextual data.
    payload JSON NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'normal',

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME(3) NULL,

    scheduled_at DATETIME(3) NULL,
    sent_at DATETIME(3) NULL,

    expires_at DATETIME(3) NULL,
    deleted_at DATETIME(3) NULL,

    -- Application-level idempotency key for the logical notification.
    deduplication_key VARCHAR(191) NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_notifications_public_id (public_id),

    UNIQUE KEY uq_notifications_user_dedup (
        user_id,
        deduplication_key
    ),

    KEY idx_notifications_user_feed (
        user_id,
        deleted_at,
        created_at
    ),

    KEY idx_notifications_user_unread (
        user_id,
        is_read,
        deleted_at,
        created_at
    ),

    KEY idx_notifications_status_schedule (
        status,
        scheduled_at
    ),

    KEY idx_notifications_category (
        user_id,
        category,
        created_at
    ),

    KEY idx_notifications_expiration (
        expires_at,
        deleted_at
    ),

    KEY idx_notifications_template (template_id),

    CONSTRAINT chk_notifications_type
        CHECK (CHAR_LENGTH(TRIM(notification_type)) > 0),

    CONSTRAINT chk_notifications_category
        CHECK (CHAR_LENGTH(TRIM(category)) > 0),

    CONSTRAINT chk_notifications_title
        CHECK (CHAR_LENGTH(TRIM(title)) > 0),

    CONSTRAINT chk_notifications_body
        CHECK (CHAR_LENGTH(TRIM(body)) > 0),

    CONSTRAINT chk_notifications_priority
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'urgent'
            )
        ),

    CONSTRAINT chk_notifications_status
        CHECK (
            status IN (
                'pending',
                'processing',
                'sent',
                'failed',
                'cancelled'
            )
        ),

    CONSTRAINT chk_notifications_read_state
        CHECK (
            (is_read = FALSE AND read_at IS NULL)
            OR
            (is_read = TRUE AND read_at IS NOT NULL)
        ),

    CONSTRAINT chk_notifications_sent_timestamp
        CHECK (
            status <> 'sent'
            OR sent_at IS NOT NULL
        ),

    CONSTRAINT chk_notifications_expiration
        CHECK (
            expires_at IS NULL
            OR expires_at > created_at
        ),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_notifications_template
        FOREIGN KEY (template_id)
        REFERENCES notification_templates (id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- TABLE: notification_deliveries
-- Purpose:
--   Track delivery independently for each notification channel.
--
-- Example:
--   One logical notification can have an in-app delivery and an email delivery.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,
    notification_id BIGINT UNSIGNED NOT NULL,

    channel VARCHAR(20) NOT NULL,

    provider VARCHAR(60) NULL,
    provider_message_id VARCHAR(255) NULL,

    -- Optional provider-recipient reference. Avoid unnecessary personal data.
    recipient_reference VARCHAR(255) NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    scheduled_at DATETIME(3) NULL,
    next_attempt_at DATETIME(3) NULL,

    attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts INT UNSIGNED NOT NULL DEFAULT 5,

    lease_token CHAR(36) NULL,
    lease_expires_at DATETIME(3) NULL,

    last_attempt_at DATETIME(3) NULL,
    sent_at DATETIME(3) NULL,
    delivered_at DATETIME(3) NULL,
    failed_at DATETIME(3) NULL,

    last_error_code VARCHAR(100) NULL,
    last_error_message TEXT NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_notification_deliveries_public_id (public_id),

    UNIQUE KEY uq_notification_channel (
        notification_id,
        channel
    ),

    UNIQUE KEY uq_notification_provider_message (
        provider,
        provider_message_id
    ),

    KEY idx_notification_delivery_queue (
        status,
        scheduled_at,
        next_attempt_at
    ),

    KEY idx_notification_delivery_lease (
        status,
        lease_expires_at
    ),

    KEY idx_notification_delivery_provider (
        provider,
        status
    ),

    CONSTRAINT chk_notification_deliveries_channel
        CHECK (
            channel IN (
                'in_app',
                'email',
                'sms',
                'push'
            )
        ),

    CONSTRAINT chk_notification_deliveries_status
        CHECK (
            status IN (
                'pending',
                'processing',
                'sent',
                'delivered',
                'failed',
                'cancelled',
                'bounced'
            )
        ),

    CONSTRAINT chk_notification_deliveries_attempts
        CHECK (
            max_attempts > 0
            AND attempt_count <= max_attempts
        ),

    CONSTRAINT chk_notification_deliveries_lease
        CHECK (
            (lease_token IS NULL AND lease_expires_at IS NULL)
            OR
            (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
        ),

    CONSTRAINT chk_notification_deliveries_sent
        CHECK (
            status NOT IN ('sent', 'delivered')
            OR sent_at IS NOT NULL
        ),

    CONSTRAINT chk_notification_deliveries_delivered
        CHECK (
            status <> 'delivered'
            OR delivered_at IS NOT NULL
        ),

    CONSTRAINT chk_notification_deliveries_failed
        CHECK (
            status <> 'failed'
            OR failed_at IS NOT NULL
        ),

    CONSTRAINT fk_notification_deliveries_notification
        FOREIGN KEY (notification_id)
        REFERENCES notifications (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- TABLE: notification_delivery_attempts
-- Purpose:
--   Maintain immutable-style history for each delivery attempt.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    delivery_id BIGINT UNSIGNED NOT NULL,
    attempt_number INT UNSIGNED NOT NULL,

    provider VARCHAR(60) NULL,
    provider_message_id VARCHAR(255) NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'processing',

    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at DATETIME(3) NULL,

    error_code VARCHAR(100) NULL,
    error_message TEXT NULL,

    -- Sanitized response only. Never persist provider credentials.
    provider_response JSON NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_notification_attempt_number (
        delivery_id,
        attempt_number
    ),

    KEY idx_notification_attempt_status (
        delivery_id,
        status
    ),

    KEY idx_notification_attempt_provider_message (
        provider,
        provider_message_id
    ),

    KEY idx_notification_attempt_started (
        started_at
    ),

    CONSTRAINT chk_notification_attempt_number
        CHECK (attempt_number > 0),

    CONSTRAINT chk_notification_attempt_status
        CHECK (
            status IN (
                'processing',
                'sent',
                'delivered',
                'failed',
                'bounced',
                'cancelled'
            )
        ),

    CONSTRAINT fk_notification_attempt_delivery
        FOREIGN KEY (delivery_id)
        REFERENCES notification_deliveries (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- TABLE: notification_provider_events
-- Purpose:
--   Deduplicate provider callbacks and track event processing.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_provider_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    provider VARCHAR(60) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,

    event_type VARCHAR(120) NOT NULL,

    delivery_id BIGINT UNSIGNED NULL,
    delivery_attempt_id BIGINT UNSIGNED NULL,

    processing_status VARCHAR(30) NOT NULL DEFAULT 'received',

    received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    processed_at DATETIME(3) NULL,

    attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_error TEXT NULL,

    -- Store sanitized payloads only.
    event_payload JSON NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_notification_provider_event (
        provider,
        provider_event_id
    ),

    KEY idx_notification_provider_event_queue (
        processing_status,
        received_at
    ),

    KEY idx_notification_provider_event_delivery (
        delivery_id
    ),

    KEY idx_notification_provider_event_attempt (
        delivery_attempt_id
    ),

    CONSTRAINT chk_notification_provider_event_status
        CHECK (
            processing_status IN (
                'received',
                'processing',
                'processed',
                'failed',
                'ignored'
            )
        ),

    CONSTRAINT chk_notification_provider_event_attempts
        CHECK (attempt_count >= 0),

    CONSTRAINT fk_notification_provider_event_delivery
        FOREIGN KEY (delivery_id)
        REFERENCES notification_deliveries (id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,

    CONSTRAINT fk_notification_provider_event_attempt
        FOREIGN KEY (delivery_attempt_id)
        REFERENCES notification_delivery_attempts (id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- END OF MIGRATION 009
--
-- Worker responsibilities:
--   1. Claim eligible deliveries atomically.
--   2. Set status='processing', lease_token and lease_expires_at.
--   3. Increment attempt_count and create an attempt-history row.
--   4. Call the provider outside the database transaction.
--   5. Update delivery and attempt state using the lease token.
--   6. Retry transient errors with bounded exponential backoff.
--   7. Verify and deduplicate provider callbacks before applying state changes.
--
-- Notes:
--   - MySQL DDL may implicitly commit.
--   - CREATE TABLE IF NOT EXISTS does not modify existing tables.
--   - Use a new forward migration for changes to an installed schema.
-- =============================================================================