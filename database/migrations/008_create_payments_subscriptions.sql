
-- =============================================================================
-- MedOrbits Migration 008: Payments and Subscriptions
-- File: database/migrations/008_create_subscriptions_payments.sql
-- Database: MySQL 8.0.16+
--
-- Dependencies:
--   001_create_users.sql
--
-- Purpose:
--   Manage user subscriptions, payment attempts and payment-provider references.
--
-- Important:
--   - Generate public_id using crypto.randomUUID() in Node.js.
--   - Store monetary values as integer minor units (e.g. paise for INR).
--   - Verify payment status using the payment provider's server-side API/webhook.
--   - Never store card numbers, CVVs, UPI PINs or other payment credentials.
-- =============================================================================


-- =============================================================================
-- TABLE: subscriptions
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    plan_code VARCHAR(80) NOT NULL,
    plan_name VARCHAR(150) NOT NULL,

    amount_minor BIGINT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly',

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    starts_at DATETIME(3) NULL,
    current_period_start DATETIME(3) NULL,
    current_period_end DATETIME(3) NULL,
    cancelled_at DATETIME(3) NULL,

    provider VARCHAR(60) NULL,
    provider_customer_id VARCHAR(255) NULL,
    provider_subscription_id VARCHAR(255) NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_subscriptions_public_id (public_id),

    KEY idx_subscriptions_user_id (user_id),
    KEY idx_subscriptions_status (status),
    KEY idx_subscriptions_period_end (current_period_end),
    KEY idx_subscriptions_user_status (user_id, status),
    KEY idx_subscriptions_provider_customer (
        provider,
        provider_customer_id
    ),
    KEY idx_subscriptions_provider_subscription (
        provider,
        provider_subscription_id
    ),

    CONSTRAINT chk_subscriptions_amount
        CHECK (amount_minor >= 0),

    CONSTRAINT chk_subscriptions_currency
        CHECK (currency REGEXP '^[A-Z]{3}$'),

    CONSTRAINT chk_subscriptions_plan_code
        CHECK (CHAR_LENGTH(TRIM(plan_code)) > 0),

    CONSTRAINT chk_subscriptions_plan_name
        CHECK (CHAR_LENGTH(TRIM(plan_name)) > 0),

    CONSTRAINT chk_subscriptions_interval
        CHECK (
            billing_interval IN (
                'monthly',
                'quarterly',
                'yearly',
                'one_time'
            )
        ),

    CONSTRAINT chk_subscriptions_status
        CHECK (
            status IN (
                'pending',
                'active',
                'past_due',
                'cancelled',
                'expired',
                'suspended'
            )
        ),

    CONSTRAINT chk_subscriptions_period
        CHECK (
            current_period_start IS NULL
            OR current_period_end IS NULL
            OR current_period_end > current_period_start
        ),

    CONSTRAINT fk_subscriptions_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- =============================================================================
-- TABLE: payments
-- =============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    public_id CHAR(36) NOT NULL,

    user_id BIGINT UNSIGNED NOT NULL,
    subscription_id BIGINT UNSIGNED NULL,

    payment_reference VARCHAR(100) NOT NULL,

    provider VARCHAR(60) NOT NULL,
    provider_payment_id VARCHAR(255) NULL,
    provider_order_id VARCHAR(255) NULL,

    amount_minor BIGINT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',

    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(60) NULL,

    paid_at DATETIME(3) NULL,
    failed_at DATETIME(3) NULL,
    failure_code VARCHAR(100) NULL,
    failure_message TEXT NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    UNIQUE KEY uq_payments_public_id (public_id),
    UNIQUE KEY uq_payments_reference (payment_reference),

    -- MySQL permits multiple NULL values in a unique index.
    -- This preserves uniqueness for non-NULL provider payment IDs.
    UNIQUE KEY uq_payments_provider_payment (
        provider,
        provider_payment_id
    ),

    KEY idx_payments_user_id (user_id),
    KEY idx_payments_subscription_id (subscription_id),
    KEY idx_payments_status (status),
    KEY idx_payments_created_at (created_at),
    KEY idx_payments_user_status_created (
        user_id,
        status,
        created_at
    ),
    KEY idx_payments_provider_order (
        provider,
        provider_order_id
    ),

    CONSTRAINT chk_payments_amount
        CHECK (amount_minor > 0),

    CONSTRAINT chk_payments_currency
        CHECK (currency REGEXP '^[A-Z]{3}$'),

    CONSTRAINT chk_payments_provider
        CHECK (CHAR_LENGTH(TRIM(provider)) > 0),

    CONSTRAINT chk_payments_reference
        CHECK (CHAR_LENGTH(TRIM(payment_reference)) > 0),

    CONSTRAINT chk_payments_status
        CHECK (
            status IN (
                'pending',
                'processing',
                'successful',
                'failed',
                'cancelled',
                'partially_refunded',
                'refunded'
            )
        ),

    CONSTRAINT fk_payments_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_payments_subscription
        FOREIGN KEY (subscription_id)
        REFERENCES subscriptions (id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
