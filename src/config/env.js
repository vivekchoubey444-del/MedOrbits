
'use strict';

const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

/**
 * MedOrbits environment configuration.
 *
 * Responsibilities:
 * - Load the root .env file.
 * - Validate environment variables.
 * - Normalize booleans, numbers, lists, and optional strings.
 * - Enforce conditional security requirements.
 * - Export a single immutable configuration object.
 *
 * Usage:
 *   const { env } = require('./config/env');
 *
 * Do not read process.env throughout application modules when a
 * validated value is available here.
 */

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const NODE_ENV_VALUES = ['development', 'test', 'production'];

dotenv.config({
  path: path.join(PROJECT_ROOT, '.env'),
  quiet: true,
});

/* -------------------------------------------------------------------------- */
/* 1. Reusable validators                                                     */
/* -------------------------------------------------------------------------- */

const booleanValue = (defaultValue) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'boolean') return value;

      if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (['true', '1', 'yes', 'on'].includes(normalized)) {
          return true;
        }

        if (['false', '0', 'no', 'off'].includes(normalized)) {
          return false;
        }
      }

      return value;
    },
    z.boolean().default(defaultValue),
  );

const integerValue = (defaultValue, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) =>
  z.coerce
    .number()
    .int()
    .min(minimum)
    .max(maximum)
    .default(defaultValue);

const optionalString = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }

    return value;
  },
  z.string().optional(),
);

const urlValue = (defaultValue) =>
  z.string().url().default(defaultValue);

const currencyValue = (defaultValue = 'INR') =>
  z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default(defaultValue);

const commaSeparatedList = (defaultValue = '') =>
  z
    .string()
    .default(defaultValue)
    .transform((value) =>
      [...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      )],
    );

const secretValue = optionalString;

const sameSiteValue = z.enum(['strict', 'lax', 'none']).default('lax');

const environmentSchema = z
  .object({
    /* ---------------------------------------------------------------------- */
    /* Application and network                                                */
    /* ---------------------------------------------------------------------- */

    NODE_ENV: z.enum(NODE_ENV_VALUES).default('development'),
    APP_ENV: z.string().trim().min(1).default('development'),
    APP_NAME: z.string().trim().min(1).default('MedOrbits'),

    APP_URL: urlValue('http://localhost:3000'),
    APP_BASE_URL: urlValue('http://localhost:3000'),
    FRONTEND_URL: urlValue('http://localhost:3000'),
    PUBLIC_SITE_URL: urlValue('http://localhost:3000'),
    API_BASE_URL: urlValue('http://localhost:3000/api/v1'),

    API_PREFIX: z
      .string()
      .trim()
      .regex(/^\/[A-Za-z0-9/_-]*$/, 'API_PREFIX must be a URL path.')
      .default('/api/v1'),

    HOST: z.string().trim().min(1).default('127.0.0.1'),
    PORT: integerValue(3000, 1, 65535),
    TRUST_PROXY: z.string().trim().default('0'),

    APP_TIMEZONE: z.string().trim().min(1).default('Asia/Kolkata'),
    APP_LOCALE: z.string().trim().min(1).default('en-IN'),
    APP_CURRENCY: currencyValue(),

    PUBLIC_DEFAULT_LOCALE: z.string().trim().default('en-IN'),
    PUBLIC_DEFAULT_CURRENCY: currencyValue(),
    PUBLIC_BRAND_NAME: z.string().trim().default('MedOrbits'),

    APP_SUPPORT_EMAIL: z.string().email().default('support@example.com'),
    APP_CONTACT_EMAIL: z.string().email().default('contact@example.com'),
    APP_LEGAL_EMAIL: z.string().email().default('legal@example.com'),

    MAINTENANCE_MODE: booleanValue(false),

    /* ---------------------------------------------------------------------- */
    /* Security, sessions, authentication and cookies                         */
    /* ---------------------------------------------------------------------- */

    SESSION_SECRET: secretValue,
    JWT_SECRET: secretValue,
    COOKIE_SECRET: secretValue,

    JWT_ISSUER: z.string().trim().default('medorbits'),
    JWT_AUDIENCE: z.string().trim().default('medorbits-users'),
    JWT_ACCESS_TOKEN_TTL: z.string().trim().default('15m'),
    JWT_REFRESH_TOKEN_TTL: z.string().trim().default('7d'),
    JWT_ALGORITHM: z.enum(['HS256']).default('HS256'),

    BCRYPT_ROUNDS: integerValue(12, 10, 15),

    CSRF_ENABLED: booleanValue(true),

    COOKIE_NAME: z.string().trim().min(1).default('medorbits.sid'),
    COOKIE_HTTP_ONLY: booleanValue(true),
    COOKIE_SECURE: booleanValue(false),
    COOKIE_SAME_SITE: sameSiteValue,
    COOKIE_DOMAIN: optionalString,

    REQUEST_BODY_LIMIT: z.string().trim().default('1mb'),
    JSON_BODY_LIMIT: z.string().trim().default('1mb'),
    URLENCODED_BODY_LIMIT: z.string().trim().default('1mb'),

    HELMET_ENABLED: booleanValue(true),
    CONTENT_SECURITY_POLICY_ENABLED: booleanValue(true),
    TLS_REJECT_UNAUTHORIZED: booleanValue(true),

    AUTH_ENABLED: booleanValue(true),
    REGISTRATION_ENABLED: booleanValue(true),
    EMAIL_VERIFICATION_REQUIRED: booleanValue(true),
    PHONE_VERIFICATION_REQUIRED: booleanValue(false),
    MFA_ENABLED: booleanValue(false),

    PASSWORD_MIN_LENGTH: integerValue(12, 8, 256),
    PASSWORD_RESET_TOKEN_TTL_MINUTES: integerValue(30, 1),
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: integerValue(24, 1),

    /* ---------------------------------------------------------------------- */
    /* MySQL                                                                  */
    /* ---------------------------------------------------------------------- */

    DB_CLIENT: z.enum(['mysql']).default('mysql'),
    DB_HOST: z.string().trim().min(1).default('127.0.0.1'),
    DB_PORT: integerValue(3306, 1, 65535),
    DB_NAME: z.string().trim().min(1).default('medorbits'),
    DB_USER: z.string().trim().min(1).default('medorbits_app'),
    DB_PASSWORD: secretValue,
    DATABASE_URL: secretValue,

    DB_CONNECTION_LIMIT: integerValue(10, 1, 1000),
    DB_QUEUE_LIMIT: integerValue(0, 0),
    DB_CONNECT_TIMEOUT: integerValue(10000, 1),
    DB_IDLE_TIMEOUT: integerValue(60000, 1),

    DB_WAIT_FOR_CONNECTIONS: booleanValue(true),
    DB_ENABLE_KEEPALIVE: booleanValue(true),
    DB_TIMEZONE: z.string().trim().default('Z'),
    DB_LOG_QUERIES: booleanValue(false),

    DB_AUTO_MIGRATE: booleanValue(false),
    DB_AUTO_SEED: booleanValue(false),

    DB_SSL_ENABLED: booleanValue(false),
    DB_SSL_CA_PATH: optionalString,
    DB_SSL_CERT_PATH: optionalString,
    DB_SSL_KEY_PATH: optionalString,

    DB_MIGRATION_USER: optionalString,
    DB_MIGRATION_PASSWORD: optionalString,

    /* ---------------------------------------------------------------------- */
    /* Redis, sessions and cache                                              */
    /* ---------------------------------------------------------------------- */

    REDIS_ENABLED: booleanValue(false),
    REDIS_HOST: z.string().trim().default('127.0.0.1'),
    REDIS_PORT: integerValue(6379, 1, 65535),
    REDIS_USERNAME: optionalString,
    REDIS_PASSWORD: secretValue,
    REDIS_DB: integerValue(0, 0, 255),
    REDIS_URL: secretValue,
    REDIS_TLS_ENABLED: booleanValue(false),
    REDIS_CONNECT_TIMEOUT: integerValue(10000, 1),
    REDIS_KEY_PREFIX: z.string().default('medorbits:'),

    SESSION_STORE: z.enum(['memory', 'redis', 'mongo']).default('memory'),
    SESSION_TTL_SECONDS: integerValue(604800, 1),

    CACHE_ENABLED: booleanValue(false),
    CACHE_TTL_SECONDS: integerValue(300, 1),
    RATE_LIMIT_STORE: z.enum(['memory', 'redis']).default('memory'),

    /* ---------------------------------------------------------------------- */
    /* CORS                                                                   */
    /* ---------------------------------------------------------------------- */

    CORS_ALLOWED_ORIGINS: commaSeparatedList('http://localhost:3000'),
    CORS_ALLOW_CREDENTIALS: booleanValue(true),
    CORS_MAX_AGE_SECONDS: integerValue(600, 0),

    /* ---------------------------------------------------------------------- */
    /* Email and SMTP                                                         */
    /* ---------------------------------------------------------------------- */

    EMAIL_ENABLED: booleanValue(false),
    EMAIL_PROVIDER: z.enum(['smtp', 'resend', 'sendgrid', 'mailgun']).default('smtp'),

    SMTP_HOST: optionalString,
    SMTP_PORT: integerValue(587, 1, 65535),
    SMTP_SECURE: booleanValue(false),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: secretValue,
    SMTP_CONNECTION_TIMEOUT_MS: integerValue(10000, 1),

    EMAIL_FROM_NAME: z.string().trim().default('MedOrbits'),
    EMAIL_FROM_ADDRESS: z.string().email().default('noreply@example.com'),
    EMAIL_REPLY_TO: z.string().email().default('support@example.com'),
    EMAIL_SEND_TIMEOUT_MS: integerValue(15000, 1),
    EMAIL_MAX_RETRIES: integerValue(3, 0, 20),

    EMAIL_VERIFICATION_URL: urlValue(
      'http://localhost:3000/account/verify-email.html',
    ),
    PASSWORD_RESET_URL: urlValue(
      'http://localhost:3000/account/reset-password.html',
    ),

    RESEND_API_KEY: secretValue,
    SENDGRID_API_KEY: secretValue,
    MAILGUN_API_KEY: secretValue,
    MAILGUN_DOMAIN: optionalString,

    /* ---------------------------------------------------------------------- */
    /* File uploads and private storage                                       */
    /* ---------------------------------------------------------------------- */

    UPLOADS_ENABLED: booleanValue(true),
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),

    STORAGE_LOCAL_PATH: z.string().trim().min(1).default('storage/private'),
    STORAGE_TEMP_PATH: z.string().trim().min(1).default('storage/temporary'),

    UPLOAD_MAX_FILE_SIZE_MB: integerValue(10, 1, 1024),
    UPLOAD_MAX_FILES: integerValue(10, 1, 1000),
    UPLOAD_MAX_TOTAL_SIZE_MB: integerValue(50, 1, 4096),

    UPLOAD_ALLOWED_MIME_TYPES: commaSeparatedList(
      'application/pdf,image/jpeg,image/png',
    ),

    PRIVATE_DOCUMENTS_ENABLED: booleanValue(true),
    DOCUMENTS_REQUIRE_AUTHENTICATION: booleanValue(true),
    DOCUMENTS_REQUIRE_AUTHORIZATION: booleanValue(true),

    TEMP_FILE_TTL_HOURS: integerValue(24, 1),
    UPLOAD_CLEANUP_ENABLED: booleanValue(true),

    MALWARE_SCAN_ENABLED: booleanValue(false),
    CLAMAV_HOST: z.string().trim().default('127.0.0.1'),
    CLAMAV_PORT: integerValue(3310, 1, 65535),

    S3_ENABLED: booleanValue(false),
    S3_ENDPOINT: optionalString,
    S3_REGION: z.string().trim().default('ap-south-1'),
    S3_BUCKET: optionalString,
    S3_ACCESS_KEY_ID: secretValue,
    S3_SECRET_ACCESS_KEY: secretValue,
    S3_FORCE_PATH_STYLE: booleanValue(false),
    S3_PUBLIC_BASE_URL: optionalString,

    /* ---------------------------------------------------------------------- */
    /* Payments                                                               */
    /* ---------------------------------------------------------------------- */

    PAYMENTS_ENABLED: booleanValue(false),
    PAYMENT_CURRENCY: currencyValue(),
    PAYMENT_MODE: z.enum(['test', 'live']).default('test'),

    RAZORPAY_ENABLED: booleanValue(false),
    RAZORPAY_KEY_ID: secretValue,
    RAZORPAY_KEY_SECRET: secretValue,
    RAZORPAY_WEBHOOK_SECRET: secretValue,

    CASHFREE_ENABLED: booleanValue(false),
    CASHFREE_APP_ID: secretValue,
    CASHFREE_SECRET_KEY: secretValue,
    CASHFREE_WEBHOOK_SECRET: secretValue,
    CASHFREE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

    STRIPE_ENABLED: booleanValue(false),
    STRIPE_PUBLISHABLE_KEY: secretValue,
    STRIPE_SECRET_KEY: secretValue,
    STRIPE_WEBHOOK_SECRET: secretValue,

    PAYMENT_SUCCESS_URL: urlValue(
      'http://localhost:3000/account/payment-success.html',
    ),
    PAYMENT_FAILURE_URL: urlValue(
      'http://localhost:3000/account/payment-failure.html',
    ),
    PAYMENT_WEBHOOK_TOLERANCE_SECONDS: integerValue(300, 1),

    /* ---------------------------------------------------------------------- */
    /* Subscriptions and billing                                              */
    /* ---------------------------------------------------------------------- */

    SUBSCRIPTIONS_ENABLED: booleanValue(false),
    SUBSCRIPTION_DEFAULT_CURRENCY: currencyValue(),
    SUBSCRIPTION_GRACE_PERIOD_DAYS: integerValue(3, 0),
    SUBSCRIPTION_RENEWAL_ENABLED: booleanValue(false),
    SUBSCRIPTION_REMINDERS_ENABLED: booleanValue(false),

    BILLING_JOB_ENABLED: booleanValue(false),
    BILLING_JOB_BATCH_SIZE: integerValue(100, 1),

    /* ---------------------------------------------------------------------- */
    /* AI                                                                     */
    /* ---------------------------------------------------------------------- */

    AI_ENABLED: booleanValue(false),
    AI_PROVIDER: optionalString,
    AI_API_URL: optionalString,
    AI_API_KEY: secretValue,
    AI_MODEL: optionalString,

    AI_TIMEOUT_MS: integerValue(30000, 1),
    AI_MAX_RETRIES: integerValue(2, 0, 20),
    AI_MAX_OUTPUT_TOKENS: integerValue(2000, 1),
    AI_LOG_PROMPTS: booleanValue(false),
    AI_SEND_PERSONAL_DATA: booleanValue(false),

    /* ---------------------------------------------------------------------- */
    /* Search and maps                                                        */
    /* ---------------------------------------------------------------------- */

    SEARCH_ENABLED: booleanValue(true),
    SEARCH_PROVIDER: optionalString,
    SEARCH_API_KEY: secretValue,

    MAPS_ENABLED: booleanValue(false),
    MAPS_PROVIDER: optionalString,
    GOOGLE_MAPS_API_KEY: secretValue,
    MAPBOX_ACCESS_TOKEN: secretValue,

    /* ---------------------------------------------------------------------- */
    /* Rate limiting                                                          */
    /* ---------------------------------------------------------------------- */

    RATE_LIMIT_ENABLED: booleanValue(true),
    RATE_LIMIT_WINDOW_MS: integerValue(900000, 1),
    RATE_LIMIT_MAX_REQUESTS: integerValue(100, 1),

    AUTH_RATE_LIMIT_WINDOW_MS: integerValue(900000, 1),
    AUTH_RATE_LIMIT_MAX_REQUESTS: integerValue(10, 1),

    PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS: integerValue(5, 1),
    EMAIL_VERIFICATION_RATE_LIMIT_MAX_REQUESTS: integerValue(10, 1),

    UPLOAD_RATE_LIMIT_WINDOW_MS: integerValue(900000, 1),
    UPLOAD_RATE_LIMIT_MAX_REQUESTS: integerValue(20, 1),

    /* ---------------------------------------------------------------------- */
    /* Logging and monitoring                                                */
    /* ---------------------------------------------------------------------- */

    LOG_LEVEL: z.enum([
      'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent',
    ]).default('info'),

    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
    LOG_TO_CONSOLE: booleanValue(true),
    LOG_TO_FILE: booleanValue(false),
    LOG_DIRECTORY: z.string().trim().default('storage/logs'),

    HTTP_LOGGING_ENABLED: booleanValue(true),
    HTTP_LOG_FORMAT: z.string().trim().default('combined'),
    LOG_REDACT_SENSITIVE_FIELDS: booleanValue(true),

    ERROR_TRACKING_ENABLED: booleanValue(false),
    SENTRY_DSN: optionalString,
    SENTRY_ENVIRONMENT: z.string().trim().default('development'),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),

    HEALTH_CHECK_ENABLED: booleanValue(true),
    HEALTH_CHECK_EXPOSE_DETAILS: booleanValue(false),

    /* ---------------------------------------------------------------------- */
    /* Queues and workers                                                     */
    /* ---------------------------------------------------------------------- */

    QUEUE_ENABLED: booleanValue(false),
    QUEUE_DRIVER: z.enum(['redis']).default('redis'),
    QUEUE_PREFIX: z.string().default('medorbits:queue:'),

    WORKER_CONCURRENCY: integerValue(2, 1, 100),
    WORKER_MAX_RETRIES: integerValue(3, 0, 100),
    WORKER_RETRY_DELAY_MS: integerValue(5000, 1),

    SCHEDULER_ENABLED: booleanValue(false),
    NOTIFICATION_JOBS_ENABLED: booleanValue(false),
    EMAIL_JOBS_ENABLED: booleanValue(false),
    DOCUMENT_CLEANUP_JOB_ENABLED: booleanValue(false),
    REPORT_GENERATION_JOB_ENABLED: booleanValue(false),

    /* ---------------------------------------------------------------------- */
    /* SMS and WhatsApp                                                       */
    /* ---------------------------------------------------------------------- */

    SMS_ENABLED: booleanValue(false),
    SMS_PROVIDER: optionalString,
    SMS_API_KEY: secretValue,
    SMS_API_SECRET: secretValue,
    SMS_SENDER_ID: optionalString,
    SMS_OTP_TTL_SECONDS: integerValue(300, 1),
    SMS_OTP_MAX_ATTEMPTS: integerValue(5, 1),

    WHATSAPP_ENABLED: booleanValue(false),
    WHATSAPP_PROVIDER: optionalString,
    WHATSAPP_API_KEY: secretValue,
    WHATSAPP_PHONE_NUMBER_ID: optionalString,

    /* ---------------------------------------------------------------------- */
    /* Platform features                                                      */
    /* ---------------------------------------------------------------------- */

    ADMISSIONS_ENABLED: booleanValue(true),
    COUNSELLING_ENABLED: booleanValue(true),
    COLLEGE_DIRECTORY_ENABLED: booleanValue(true),
    COURSE_DIRECTORY_ENABLED: booleanValue(true),
    STUDY_ABROAD_ENABLED: booleanValue(true),

    JOBS_ENABLED: booleanValue(true),
    INTERNSHIPS_ENABLED: booleanValue(true),
    EMPLOYER_REGISTRATION_ENABLED: booleanValue(true),
    RECRUITMENT_ENABLED: booleanValue(true),
    CAREER_GUIDANCE_ENABLED: booleanValue(true),

    SUPPORT_TICKETS_ENABLED: booleanValue(true),
    CONTACT_FORMS_ENABLED: booleanValue(true),
    NOTIFICATIONS_ENABLED: booleanValue(true),

    ADMIN_PANEL_ENABLED: booleanValue(true),
    ADMIN_MFA_REQUIRED: booleanValue(true),

    /* ---------------------------------------------------------------------- */
    /* Admin bootstrap and internal access                                    */
    /* ---------------------------------------------------------------------- */

    BOOTSTRAP_ADMIN_ENABLED: booleanValue(false),
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
    BOOTSTRAP_ADMIN_PASSWORD: secretValue,
    INTERNAL_API_TOKEN: secretValue,

    /* ---------------------------------------------------------------------- */
    /* Privacy and analytics                                                  */
    /* ---------------------------------------------------------------------- */

    PRIVACY_CONTROLS_ENABLED: booleanValue(true),
    COOKIE_CONSENT_ENABLED: booleanValue(true),

    ANALYTICS_ENABLED: booleanValue(false),
    MARKETING_TRACKING_ENABLED: booleanValue(false),

    AUDIT_LOG_RETENTION_DAYS: integerValue(365, 1),
    TEMP_FILE_RETENTION_HOURS: integerValue(24, 1),

    ANALYTICS_PROVIDER: optionalString,
    GOOGLE_ANALYTICS_ID: optionalString,

    /* ---------------------------------------------------------------------- */
    /* External requests, webhooks and deployment                             */
    /* ---------------------------------------------------------------------- */

    HTTP_CLIENT_TIMEOUT_MS: integerValue(15000, 1),
    EXTERNAL_API_MAX_RETRIES: integerValue(2, 0, 20),
    EXTERNAL_API_RETRY_DELAY_MS: integerValue(1000, 1),

    WEBHOOK_SIGNATURE_REQUIRED: booleanValue(true),
    WEBHOOK_MAX_CLOCK_SKEW_SECONDS: integerValue(300, 1),

    DEPLOYMENT_ENVIRONMENT: z.string().trim().default('local'),
    RELEASE_VERSION: z.string().trim().default('1.0.0'),

    STARTUP_TIMEOUT_MS: integerValue(30000, 1),
    SHUTDOWN_TIMEOUT_MS: integerValue(10000, 1000, 120000),

    /* ---------------------------------------------------------------------- */
    /* Testing                                                                */
    /* ---------------------------------------------------------------------- */

    TEST_DATABASE_URL: secretValue,
    TEST_REDIS_URL: secretValue,

    TEST_EMAIL_ENABLED: booleanValue(false),
    TEST_PAYMENTS_ENABLED: booleanValue(false),
    TEST_AI_ENABLED: booleanValue(false),

    ENABLE_DEBUG_ROUTES: booleanValue(false),
    ENABLE_TEST_ENDPOINTS: booleanValue(false),
  })
  .strict()
  .superRefine((config, ctx) => {
    const addIssue = (key, message) => {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message,
      });
    };

    /* Production secrets and security. */
    if (config.NODE_ENV === 'production') {
      for (const key of ['SESSION_SECRET', 'JWT_SECRET', 'COOKIE_SECRET']) {
        const value = config[key];

        if (!value || value.length < 32) {
          addIssue(
            key,
            `${key} must be a unique secret of at least 32 characters in production.`,
          );
        }

        if (
          value &&
          /^replace_with_/i.test(value)
        ) {
          addIssue(key, `${key} must not use a placeholder value.`);
        }
      }

      if (!config.COOKIE_SECURE) {
        addIssue('COOKIE_SECURE', 'COOKIE_SECURE must be true in production.');
      }

      if (config.COOKIE_SAME_SITE === 'none' && !config.COOKIE_SECURE) {
        addIssue(
          'COOKIE_SAME_SITE',
          'SameSite=None requires secure cookies.',
        );
      }

      if (
        config.CORS_ALLOWED_ORIGINS.includes('*') ||
        config.CORS_ALLOWED_ORIGINS.length === 0
      ) {
        addIssue(
          'CORS_ALLOWED_ORIGINS',
          'Production requires explicit trusted CORS origins.',
        );
      }

      if (config.DB_AUTO_SEED) {
        addIssue(
          'DB_AUTO_SEED',
          'Automatic database seeding must be disabled in production.',
        );
      }

      if (config.ENABLE_DEBUG_ROUTES || config.ENABLE_TEST_ENDPOINTS) {
        addIssue(
          'ENABLE_DEBUG_ROUTES',
          'Debug routes and test endpoints must be disabled in production.',
        );
      }

      if (config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'trace') {
        addIssue(
          'LOG_LEVEL',
          'Debug and trace logging should not be enabled in production.',
        );
      }

      if (config.HEALTH_CHECK_EXPOSE_DETAILS) {
        addIssue(
          'HEALTH_CHECK_EXPOSE_DETAILS',
          'Detailed health information must not be exposed in production.',
        );
      }
    }

    /* Database. */
    if (!config.DATABASE_URL && !config.DB_PASSWORD) {
      addIssue(
        'DB_PASSWORD',
        'Set DB_PASSWORD or DATABASE_URL for database authentication.',
      );
    }

    if (
      config.DB_SSL_ENABLED &&
      config.DB_SSL_CERT_PATH &&
      !config.DB_SSL_KEY_PATH
    ) {
      addIssue(
        'DB_SSL_KEY_PATH',
        'DB_SSL_KEY_PATH is required when a client certificate is configured.',
      );
    }

    /* Redis-backed features. */
    if (
      (config.SESSION_STORE === 'redis' ||
        config.CACHE_ENABLED ||
        config.RATE_LIMIT_STORE === 'redis' ||
        config.QUEUE_ENABLED) &&
      !config.REDIS_ENABLED
    ) {
      addIssue(
        'REDIS_ENABLED',
        'REDIS_ENABLED must be true when Redis-backed features are enabled.',
      );
    }

    if (config.SESSION_STORE === 'mongo') {
      addIssue(
        'SESSION_STORE',
        'MongoDB session storage is not supported by this MySQL-oriented configuration.',
      );
    }

    /* Email providers. */
    if (config.EMAIL_ENABLED) {
      if (config.EMAIL_PROVIDER === 'smtp') {
        for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']) {
          if (!config[key]) {
            addIssue(key, `${key} is required when SMTP email is enabled.`);
          }
        }
      }

      if (config.EMAIL_PROVIDER === 'resend' && !config.RESEND_API_KEY) {
        addIssue('RESEND_API_KEY', 'RESEND_API_KEY is required for Resend.');
      }

      if (config.EMAIL_PROVIDER === 'sendgrid' && !config.SENDGRID_API_KEY) {
        addIssue('SENDGRID_API_KEY', 'SENDGRID_API_KEY is required for SendGrid.');
      }

      if (
        config.EMAIL_PROVIDER === 'mailgun' &&
        (!config.MAILGUN_API_KEY || !config.MAILGUN_DOMAIN)
      ) {
        addIssue(
          'MAILGUN_API_KEY',
          'MAILGUN_API_KEY and MAILGUN_DOMAIN are required for Mailgun.',
        );
      }
    }

    /* Uploads and storage. */
    if (
      config.UPLOAD_MAX_TOTAL_SIZE_MB <
      config.UPLOAD_MAX_FILE_SIZE_MB
    ) {
      addIssue(
        'UPLOAD_MAX_TOTAL_SIZE_MB',
        'Total upload size must be at least as large as the maximum individual file size.',
      );
    }

    if (config.STORAGE_DRIVER === 's3') {
      if (!config.S3_ENABLED) {
        addIssue(
          'S3_ENABLED',
          'S3_ENABLED must be true when STORAGE_DRIVER is s3.',
        );
      }

      for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
        if (!config[key]) {
          addIssue(key, `${key} is required when S3 storage is enabled.`);
        }
      }
    }

    if (config.MALWARE_SCAN_ENABLED && !config.CLAMAV_HOST) {
      addIssue(
        'CLAMAV_HOST',
        'CLAMAV_HOST is required when malware scanning is enabled.',
      );
    }

    /* Payments. */
    if (config.PAYMENTS_ENABLED) {
      const enabledProviders = [
        config.RAZORPAY_ENABLED,
        config.CASHFREE_ENABLED,
        config.STRIPE_ENABLED,
      ].filter(Boolean).length;

      if (enabledProviders === 0) {
        addIssue(
          'PAYMENTS_ENABLED',
          'Enable and configure at least one payment provider.',
        );
      }
    }

    if (config.PAYMENTS_ENABLED && config.PAYMENT_MODE === 'live') {
      if (config.RAZORPAY_ENABLED) {
        for (const key of [
          'RAZORPAY_KEY_ID',
          'RAZORPAY_KEY_SECRET',
          'RAZORPAY_WEBHOOK_SECRET',
        ]) {
          if (!config[key]) {
            addIssue(key, `${key} is required for live Razorpay payments.`);
          }
        }
      }

      if (config.CASHFREE_ENABLED) {
        for (const key of [
          'CASHFREE_APP_ID',
          'CASHFREE_SECRET_KEY',
          'CASHFREE_WEBHOOK_SECRET',
        ]) {
          if (!config[key]) {
            addIssue(key, `${key} is required for live Cashfree payments.`);
          }
        }

        if (config.CASHFREE_ENVIRONMENT !== 'production') {
          addIssue(
            'CASHFREE_ENVIRONMENT',
            'Cashfree must use production environment for live payments.',
          );
        }
      }

      if (config.STRIPE_ENABLED) {
        for (const key of [
          'STRIPE_PUBLISHABLE_KEY',
          'STRIPE_SECRET_KEY',
          'STRIPE_WEBHOOK_SECRET',
        ]) {
          if (!config[key]) {
            addIssue(key, `${key} is required for live Stripe payments.`);
          }
        }
      }
    }

    /* AI integration. */
    if (config.AI_ENABLED) {
      if (!config.AI_API_URL || !config.AI_MODEL || !config.AI_API_KEY) {
        addIssue(
          'AI_ENABLED',
          'AI_API_URL, AI_MODEL, and AI_API_KEY are required when AI is enabled.',
        );
      }

      if (config.AI_SEND_PERSONAL_DATA && config.NODE_ENV === 'production') {
        addIssue(
          'AI_SEND_PERSONAL_DATA',
          'Sending personal data to an AI provider requires a separately approved data-protection workflow.',
        );
      }
    }

    /* Bootstrap administrator. */
    if (config.BOOTSTRAP_ADMIN_ENABLED) {
      if (!config.BOOTSTRAP_ADMIN_EMAIL || !config.BOOTSTRAP_ADMIN_PASSWORD) {
        addIssue(
          'BOOTSTRAP_ADMIN_ENABLED',
          'Bootstrap admin email and password are required when bootstrap is enabled.',
        );
      }

      if (
        config.NODE_ENV === 'production' &&
        config.BOOTSTRAP_ADMIN_PASSWORD &&
        config.BOOTSTRAP_ADMIN_PASSWORD.length < 16
      ) {
        addIssue(
          'BOOTSTRAP_ADMIN_PASSWORD',
          'Production bootstrap admin password must be at least 16 characters.',
        );
      }
    }

    /* Session security. */
    if (
      config.COOKIE_SAME_SITE === 'none' &&
      !config.COOKIE_SECURE
    ) {
      addIssue(
        'COOKIE_SECURE',
        'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.',
      );
    }

    /* Reject obvious invalid origin entries. */
    for (const origin of config.CORS_ALLOWED_ORIGINS) {
      if (origin !== '*') {
        try {
          const parsed = new URL(origin);

          if (
            !['http:', 'https:'].includes(parsed.protocol) ||
            parsed.origin !== origin
          ) {
            addIssue(
              'CORS_ALLOWED_ORIGINS',
              `Invalid CORS origin: ${origin}`,
            );
          }
        } catch {
          addIssue(
            'CORS_ALLOWED_ORIGINS',
            `Invalid CORS origin: ${origin}`,
          );
        }
      }
    }
  });

/* -------------------------------------------------------------------------- */
/* 2. Parse and validate                                                      */
/* -------------------------------------------------------------------------- */

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const errors = result.error.issues
    .map((issue) => {
      const variable = issue.path.join('.') || 'environment';
      return `- ${variable}: ${issue.message}`;
    })
    .join('\n');

  console.error(
    `[MedOrbits] Invalid environment configuration:\n${errors}`,
  );

  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* 3. Export validated configuration                                          */
/* -------------------------------------------------------------------------- */

const env = Object.freeze(result.data);

module.exports = {
  env,
  PROJECT_ROOT,
};
