
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'user_id',
  'organization_name',
  'slug',
  'organization_type',
  'registration_number',
  'industry',
  'website',
  'email',
  'phone',
  'description',
  'logo_document_id',
  'address',
  'city',
  'state',
  'country_code',
  'pincode',
  'employee_count',
  'status',
]);

const ALLOWED_ORGANIZATION_TYPES = Object.freeze([
  'company',
  'recruitment_agency',
  'educational_institution',
  'hospital',
  'clinic',
  'nonprofit',
  'government',
  'other',
]);

const ALLOWED_STATUSES = Object.freeze([
  'pending',
  'active',
  'inactive',
  'suspended',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

const MAX_DESCRIPTION_LENGTH = 5000;

function validationError(message, code = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  error.publicMessage = message;
  return error;
}

function pickAllowed(input = {}) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw validationError(
      'Request body must be a JSON object.',
      'INVALID_BODY'
    );
  }

  const unknownFields = Object.keys(input).filter(
    (field) => !ALLOWED_FIELDS.includes(field)
  );

  if (unknownFields.length > 0) {
    throw validationError(
      `Unsupported field(s): ${unknownFields.join(', ')}.`,
      'UNKNOWN_FIELDS'
    );
  }

  const output = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = input[field];
    }
  }

  return output;
}

function normalizeString(data, field, maxLength, minLength = 0) {
  if (data[field] === undefined) return;

  if (typeof data[field] !== 'string') {
    throw validationError(`${field} must be a string.`);
  }

  data[field] = data[field].trim();

  if (
    data[field].length < minLength ||
    data[field].length > maxLength
  ) {
    throw validationError(
      `${field} must contain between ${minLength} and ${maxLength} characters.`
    );
  }
}

function validateUrl(value, field) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw validationError(`${field} must be a valid URL.`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw validationError(`${field} must use HTTP or HTTPS.`);
  }

  return url.toString();
}

function validate(input = {}, options = {}) {
  const { partial = false } = options;
  const data = pickAllowed(input);

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.'
    );
  }

  normalizeString(data, 'organization_name', 200, 2);
  normalizeString(data, 'slug', 200, 2);
  normalizeString(data, 'registration_number', 100, 1);
  normalizeString(data, 'industry', 100, 1);
  normalizeString(data, 'phone', 25, 0);
  normalizeString(data, 'address', 500, 1);
  normalizeString(data, 'city', 100, 1);
  normalizeString(data, 'state', 100, 1);
  normalizeString(data, 'pincode', 20, 1);
  normalizeString(data, 'description', MAX_DESCRIPTION_LENGTH);
  normalizeString(data, 'website', 2048, 1);
  normalizeString(data, 'email', 254, 1);

  if (data.user_id !== undefined) {
    if (
      !Number.isSafeInteger(data.user_id) ||
      data.user_id < 1
    ) {
      throw validationError('user_id must be a positive integer.');
    }
  }

  if (data.logo_document_id !== undefined) {
    if (
      !Number.isSafeInteger(data.logo_document_id) ||
      data.logo_document_id < 1
    ) {
      throw validationError(
        'logo_document_id must be a positive integer.'
      );
    }
  }

  if (data.slug !== undefined) {
    data.slug = data.slug.toLowerCase();

    if (!SLUG_REGEX.test(data.slug)) {
      throw validationError(
        'slug must contain lowercase letters, numbers, and single hyphens.'
      );
    }
  }

  if (data.organization_type !== undefined) {
    if (typeof data.organization_type !== 'string') {
      throw validationError('organization_type must be a string.');
    }

    data.organization_type = data.organization_type
      .trim()
      .toLowerCase();

    if (!ALLOWED_ORGANIZATION_TYPES.includes(data.organization_type)) {
      throw validationError(
        `organization_type must be one of: ${ALLOWED_ORGANIZATION_TYPES.join(', ')}.`
      );
    }
  }

  if (data.website !== undefined && data.website !== '') {
    data.website = validateUrl(data.website, 'website');
  }

  if (data.email !== undefined) {
    data.email = data.email.toLowerCase();

    if (!EMAIL_REGEX.test(data.email)) {
      throw validationError('A valid email address is required.');
    }
  }

  if (data.phone !== undefined && data.phone !== '') {
    if (
      !/^[+()\d\s.-]+$/.test(data.phone) ||
      data.phone.replace(/\D/g, '').length < 7
    ) {
      throw validationError('A valid phone number is required.');
    }
  }

  if (data.country_code !== undefined) {
    if (typeof data.country_code !== 'string') {
      throw validationError('country_code must be a string.');
    }

    data.country_code = data.country_code.trim().toUpperCase();

    if (!COUNTRY_CODE_REGEX.test(data.country_code)) {
      throw validationError(
        'country_code must be a two-letter ISO country code.'
      );
    }
  }

  if (data.employee_count !== undefined) {
    if (
      !Number.isSafeInteger(data.employee_count) ||
      data.employee_count < 0 ||
      data.employee_count > 100000000
    ) {
      throw validationError(
        'employee_count must be a non-negative integer.'
      );
    }
  }

  if (data.status !== undefined) {
    if (typeof data.status !== 'string') {
      throw validationError('status must be a string.');
    }

    data.status = data.status.trim().toLowerCase();

    if (!ALLOWED_STATUSES.includes(data.status)) {
      throw validationError(
        `status must be one of: ${ALLOWED_STATUSES.join(', ')}.`
      );
    }

    if (['active', 'suspended'].includes(data.status)) {
      throw validationError(
        `status "${data.status}" can only be changed through an authorized administrative workflow.`,
        'PROTECTED_FIELD'
      );
    }
  }

  if (!partial) {
    for (const field of [
      'organization_name',
      'organization_type',
      'email',
      'country_code',
    ]) {
      if (!data[field]) {
        throw validationError(`${field} is required.`);
      }
    }
  }

  return data;
}

function validateCreate(input) {
  return validate(input);
}

function validateUpdate(input) {
  return validate(input, { partial: true });
}

module.exports = {
  ALLOWED_FIELDS,
  ALLOWED_ORGANIZATION_TYPES,
  ALLOWED_STATUSES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};
