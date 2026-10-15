'use strict';

const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

const ERROR_CODES = Object.freeze({
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INVALID_JSON: 'INVALID_JSON',
  CORS_ORIGIN_DENIED: 'CORS_ORIGIN_DENIED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
});

const USER_ROLES = Object.freeze({
  USER: 'user',
  STUDENT: 'student',
  CANDIDATE: 'candidate',
  EMPLOYER: 'employer',
  COUNSELLOR: 'counsellor',
  STAFF: 'staff',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
});

/*
 * Roles are identifiers, not permissions.
 * Enforce permissions through server-side authorization middleware.
 */

const APPLICATION_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  DOCUMENTS_REQUIRED: 'documents_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
});

const JOB_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PAUSED: 'paused',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
});

const SUBSCRIPTION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
});

const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

const SECURITY = Object.freeze({
  MIN_SESSION_SECRET_LENGTH: 32,
  DEFAULT_TOKEN_BYTES: 32,
  MAX_REQUEST_ID_LENGTH: 128,
});

const API = Object.freeze({
  PREFIX: '/api/v1',
  DEFAULT_PORT: 3000,
  DEFAULT_BODY_LIMIT: '1mb',
  DEFAULT_RATE_LIMIT: 300,
});

const ENVIRONMENTS = Object.freeze({
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
});

module.exports = {
  HTTP_STATUS,
  ERROR_CODES,
  USER_ROLES,
  APPLICATION_STATUS,
  PAYMENT_STATUS,
  JOB_STATUS,
  SUBSCRIPTION_STATUS,
  PAGINATION,
  SECURITY,
  API,
  ENVIRONMENTS,
};