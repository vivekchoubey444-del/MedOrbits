
'use strict';

const ALLOWED_CREATE_FIELDS = Object.freeze([
  'subscription_id',
  'application_id',
  'order_id',
  'amount',
  'currency',
  'payment_method',
  'description',
  'return_url',
]);

const ALLOWED_QUERY_FIELDS = Object.freeze([
  'page',
  'limit',
  'status',
  'currency',
  'from',
  'to',
]);

const ALLOWED_WEBHOOK_FIELDS = Object.freeze([
  'event',
  'type',
  'id',
  'data',
]);

const PAYMENT_METHODS = Object.freeze([
  'card',
  'upi',
  'net_banking',
  'wallet',
  'bank_transfer',
  'emi',
  'provider_checkout',
]);

const PAYMENT_STATUSES = Object.freeze([
  'created',
  'pending',
  'processing',
  'authorized',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
]);

const SUPPORTED_CURRENCIES = Object.freeze([
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
]);

const MAX_AMOUNT_MINOR_UNITS = 100000000000;
const MAX_DESCRIPTION_LENGTH = 500;

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

  if (unknownFields.length) {
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

function optionalString(value, field, options = {}) {
  if (value === undefined) return undefined;

  if (value === null && options.allowNull) return null;

  return requireString(value, field, options);
}

function positiveId(value, field) {
  const id = typeof value === 'string' && /^\d+$/.test(value)
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

function validateAmount(value) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw validationError(
      'amount must be a positive number.',
      'amount'
    );
  }

  // Reject fractional precision beyond two decimal places.
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-7) {
    throw validationError(
      'amount must have no more than two decimal places.',
      'amount'
    );
  }

  if (Math.round(value * 100) > MAX_AMOUNT_MINOR_UNITS) {
    throw validationError('amount exceeds the allowed limit.', 'amount');
  }

  return Number(value.toFixed(2));
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

function validateReturnUrl(value) {
  const raw = requireString(value, 'return_url', {
    minLength: 1,
    maxLength: 2048,
  });

  let url;

  try {
    url = new URL(raw);
  } catch {
    throw validationError('return_url must be a valid URL.', 'return_url');
  }

  if (!['https:', 'http:'].includes(url.protocol)) {
    throw validationError(
      'return_url must use HTTP or HTTPS.',
      'return_url'
    );
  }

  if (url.username || url.password) {
    throw validationError(
      'return_url must not contain embedded credentials.',
      'return_url'
    );
  }

  return url.toString();
}

function validateCreate(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_CREATE_FIELDS);

  // A payment must be associated with a server-authorized billable record.
  const hasSubscription = body.subscription_id !== undefined;
  const hasApplication = body.application_id !== undefined;

  if (hasSubscription === hasApplication) {
    throw validationError(
      'Provide exactly one of subscription_id or application_id.',
      'subscription_id'
    );
  }

  if (body.amount === undefined) {
    throw validationError('amount is required.', 'amount');
  }

  if (body.currency === undefined) {
    throw validationError('currency is required.', 'currency');
  }

  const result = {
    amount: validateAmount(body.amount),
    currency: validateCurrency(body.currency),
  };

  if (hasSubscription) {
    result.subscription_id = positiveId(
      body.subscription_id,
      'subscription_id'
    );
  }

  if (hasApplication) {
    result.application_id = positiveId(
      body.application_id,
      'application_id'
    );
  }

  if (body.order_id !== undefined) {
    result.order_id = requireString(body.order_id, 'order_id', {
      minLength: 1,
      maxLength: 128,
    });
  }

  if (body.payment_method !== undefined) {
    const method = requireString(body.payment_method, 'payment_method', {
      minLength: 1,
      maxLength: 40,
    }).toLowerCase();

    if (!PAYMENT_METHODS.includes(method)) {
      throw validationError(
        `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}.`,
        'payment_method'
      );
    }

    result.payment_method = method;
  }

  if (body.description !== undefined) {
    result.description = requireString(body.description, 'description', {
      minLength: 1,
      maxLength: MAX_DESCRIPTION_LENGTH,
    });
  }

  if (body.return_url !== undefined) {
    result.return_url = validateReturnUrl(body.return_url);
  }

  return result;
}

function validateQuery(input) {
  const query = requireObject(input, 'Query parameters');
  rejectUnknownFields(query, ALLOWED_QUERY_FIELDS);

  const result = {};

  if (query.page !== undefined) {
    result.page = parseBoundedInteger(query.page, 'page', 1, 1000000);
  }

  if (query.limit !== undefined) {
    result.limit = parseBoundedInteger(query.limit, 'limit', 1, 100);
  }

  if (query.status !== undefined) {
    const status = requireString(query.status, 'status', {
      minLength: 1,
      maxLength: 32,
    }).toLowerCase();

    if (!PAYMENT_STATUSES.includes(status)) {
      throw validationError(
        `status must be one of: ${PAYMENT_STATUSES.join(', ')}.`,
        'status'
      );
    }

    result.status = status;
  }

  if (query.currency !== undefined) {
    result.currency = validateCurrency(query.currency);
  }

  if (query.from !== undefined) {
    result.from = validateDate(query.from, 'from');
  }

  if (query.to !== undefined) {
    result.to = validateDate(query.to, 'to');
  }

  if (result.from && result.to && result.from > result.to) {
    throw validationError(
      'from must be on or before to.',
      'from'
    );
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

/**
 * Performs structural validation only.
 * Always verify the provider signature against the original raw request body
 * before trusting or processing a webhook.
 */
function validateWebhookPayload(input) {
  const body = requireObject(input, 'Webhook payload');
  rejectUnknownFields(body, ALLOWED_WEBHOOK_FIELDS);

  const event = body.event !== undefined ? body.event : body.type;

  if (event === undefined) {
    throw validationError(
      'Webhook event or type is required.',
      'event'
    );
  }

  const normalizedEvent = requireString(event, 'event', {
    minLength: 1,
    maxLength: 200,
  });

  const result = {
    event: normalizedEvent,
  };

  if (body.id !== undefined) {
    result.id = requireString(body.id, 'id', {
      minLength: 1,
      maxLength: 255,
    });
  }

  if (body.data !== undefined) {
    result.data = requireObject(body.data, 'Webhook data');
  }

  return result;
}

function validate(input, mode = 'create') {
  switch (mode) {
    case 'create':
      return validateCreate(input);

    case 'query':
      return validateQuery(input);

    case 'webhook':
      return validateWebhookPayload(input);

    default:
      throw validationError(
        `Unsupported payment validation mode: ${mode}.`,
        'mode',
        'INVALID_VALIDATION_MODE'
      );
  }
}

module.exports = {
  validate,
  validateCreate,
  validateQuery,
  validateWebhookPayload,
  validateAmount,
  validateCurrency,
  validateReturnUrl,
  ALLOWED_CREATE_FIELDS,
  ALLOWED_QUERY_FIELDS,
  ALLOWED_WEBHOOK_FIELDS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SUPPORTED_CURRENCIES,
};
