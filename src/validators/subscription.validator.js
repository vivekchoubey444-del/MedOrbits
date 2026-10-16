
'use strict';

const ALLOWED_CREATE_FIELDS = Object.freeze([
  'plan_id',
  'user_id',
  'employer_id',
  'billing_cycle',
  'currency',
  'start_date',
  'end_date',
  'trial_days',
  'metadata',
]);

const ALLOWED_UPDATE_FIELDS = Object.freeze([
  'billing_cycle',
  'auto_renew',
  'cancel_at_period_end',
  'metadata',
]);

const ALLOWED_QUERY_FIELDS = Object.freeze([
  'page',
  'limit',
  'status',
  'billing_cycle',
  'currency',
  'user_id',
  'employer_id',
]);

const BILLING_CYCLES = Object.freeze([
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
]);

const SUBSCRIPTION_STATUSES = Object.freeze([
  'pending',
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'expired',
  'incomplete',
  'unpaid',
]);

const SUPPORTED_CURRENCIES = Object.freeze([
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
]);

const MAX_TRIAL_DAYS = 90;
const MAX_METADATA_BYTES = 8192;

function validationError(message, field, code = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.status = 400;
  error.statusCode = 400;
  error.code = code;

  if (field) error.field = field;

  return error;
}

function requireObject(input, label = 'Request body') {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw validationError(`${label} must be a JSON object.`);
  }

  return input;
}

function rejectUnknownFields(input, allowedFields) {
  const unknownFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length > 0) {
    throw validationError(
      `Unsupported field(s): ${unknownFields.join(', ')}.`
    );
  }
}

function requireString(value, field, options = {}) {
  const {
    minLength = 1,
    maxLength = 255,
    trim = true,
  } = options;

  if (typeof value !== 'string') {
    throw validationError(`${field} must be a string.`, field);
  }

  const result = trim ? value.trim() : value;

  if (result.length < minLength || result.length > maxLength) {
    throw validationError(
      `${field} must contain ${minLength} to ${maxLength} characters.`,
      field
    );
  }

  return result;
}

function positiveId(value, field) {
  const id =
    typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(id) || id < 1) {
    throw validationError(
      `${field} must be a positive integer.`,
      field
    );
  }

  return id;
}

function validateEnum(value, field, allowedValues) {
  const normalized = requireString(value, field, {
    minLength: 1,
    maxLength: 40,
  }).toLowerCase();

  if (!allowedValues.includes(normalized)) {
    throw validationError(
      `${field} must be one of: ${allowedValues.join(', ')}.`,
      field
    );
  }

  return normalized;
}

function validateCurrency(value) {
  const currency = requireString(value, 'currency', {
    minLength: 3,
    maxLength: 3,
  }).toUpperCase();

  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw validationError(
      `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}.`,
      'currency'
    );
  }

  return currency;
}

function validateDate(value, field) {
  const date = requireString(value, field, {
    minLength: 10,
    maxLength: 10,
  });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw validationError(`${field} must use YYYY-MM-DD format.`, field);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw validationError(`${field} must be a valid date.`, field);
  }

  return date;
}

function validateBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw validationError(`${field} must be a boolean.`, field);
  }

  return value;
}

function validateMetadata(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw validationError(
      'metadata must be a JSON object.',
      'metadata'
    );
  }

  let serialized;

  try {
    serialized = JSON.stringify(value);
  } catch {
    throw validationError(
      'metadata must be JSON-serializable.',
      'metadata'
    );
  }

  if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_BYTES) {
    throw validationError(
      `metadata must not exceed ${MAX_METADATA_BYTES} bytes.`,
      'metadata'
    );
  }

  return value;
}

function validateCreate(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_CREATE_FIELDS);

  if (body.plan_id === undefined) {
    throw validationError('plan_id is required.', 'plan_id');
  }

  const result = {
    plan_id: positiveId(body.plan_id, 'plan_id'),
  };

  // IDs supplied by clients must be authorized against the authenticated user.
  // Prefer deriving user_id from req.user in the controller/service.
  if (body.user_id !== undefined) {
    result.user_id = positiveId(body.user_id, 'user_id');
  }

  if (body.employer_id !== undefined) {
    result.employer_id = positiveId(body.employer_id, 'employer_id');
  }

  if (body.billing_cycle !== undefined) {
    result.billing_cycle = validateEnum(
      body.billing_cycle,
      'billing_cycle',
      BILLING_CYCLES
    );
  }

  if (body.currency !== undefined) {
    result.currency = validateCurrency(body.currency);
  }

  if (body.start_date !== undefined) {
    result.start_date = validateDate(body.start_date, 'start_date');
  }

  if (body.end_date !== undefined) {
    result.end_date = validateDate(body.end_date, 'end_date');
  }

  if (
    result.start_date &&
    result.end_date &&
    result.end_date < result.start_date
  ) {
    throw validationError(
      'end_date must be on or after start_date.',
      'end_date'
    );
  }

  if (body.trial_days !== undefined) {
    const trialDays = body.trial_days;

    if (
      !Number.isSafeInteger(trialDays) ||
      trialDays < 0 ||
      trialDays > MAX_TRIAL_DAYS
    ) {
      throw validationError(
        `trial_days must be an integer between 0 and ${MAX_TRIAL_DAYS}.`,
        'trial_days'
      );
    }

    result.trial_days = trialDays;
  }

  if (body.metadata !== undefined) {
    result.metadata = validateMetadata(body.metadata);
  }

  return result;
}

function validateUpdate(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_UPDATE_FIELDS);

  if (Object.keys(body).length === 0) {
    throw validationError(
      'Provide at least one supported field to update.'
    );
  }

  const result = {};

  if (body.billing_cycle !== undefined) {
    result.billing_cycle = validateEnum(
      body.billing_cycle,
      'billing_cycle',
      BILLING_CYCLES
    );
  }

  if (body.auto_renew !== undefined) {
    result.auto_renew = validateBoolean(
      body.auto_renew,
      'auto_renew'
    );
  }

  if (body.cancel_at_period_end !== undefined) {
    result.cancel_at_period_end = validateBoolean(
      body.cancel_at_period_end,
      'cancel_at_period_end'
    );
  }

  if (body.metadata !== undefined) {
    result.metadata = validateMetadata(body.metadata);
  }

  return result;
}

function parseBoundedInteger(value, field, min, max) {
  const text = String(value);

  if (!/^\d+$/.test(text)) {
    throw validationError(`${field} must be an integer.`, field);
  }

  const number = Number(text);

  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw validationError(
      `${field} must be between ${min} and ${max}.`,
      field
    );
  }

  return number;
}

function validateQuery(input) {
  const query = requireObject(input, 'Query parameters');
  rejectUnknownFields(query, ALLOWED_QUERY_FIELDS);

  const result = {};

  if (query.page !== undefined) {
    result.page = parseBoundedInteger(
      query.page,
      'page',
      1,
      1000000
    );
  }

  if (query.limit !== undefined) {
    result.limit = parseBoundedInteger(
      query.limit,
      'limit',
      1,
      100
    );
  }

  if (query.status !== undefined) {
    result.status = validateEnum(
      query.status,
      'status',
      SUBSCRIPTION_STATUSES
    );
  }

  if (query.billing_cycle !== undefined) {
    result.billing_cycle = validateEnum(
      query.billing_cycle,
      'billing_cycle',
      BILLING_CYCLES
    );
  }

  if (query.currency !== undefined) {
    result.currency = validateCurrency(query.currency);
  }

  if (query.user_id !== undefined) {
    result.user_id = positiveId(query.user_id, 'user_id');
  }

  if (query.employer_id !== undefined) {
    result.employer_id = positiveId(
      query.employer_id,
      'employer_id'
    );
  }

  return result;
}

function validate(input, mode = 'create') {
  switch (mode) {
    case 'create':
      return validateCreate(input);

    case 'update':
      return validateUpdate(input);

    case 'query':
      return validateQuery(input);

    default:
      throw validationError(
        `Unsupported subscription validation mode: ${mode}.`,
        'mode',
        'INVALID_VALIDATION_MODE'
      );
  }
}

module.exports = {
  validate,
  validateCreate,
  validateUpdate,
  validateQuery,
  validateDate,
  validateCurrency,
  validateMetadata,
  BILLING_CYCLES,
  SUBSCRIPTION_STATUSES,
  SUPPORTED_CURRENCIES,
  ALLOWED_CREATE_FIELDS,
  ALLOWED_UPDATE_FIELDS,
  ALLOWED_QUERY_FIELDS,
};
