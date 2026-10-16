
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'name',
  'slug',
  'code',
  'category',
  'level',
  'duration',
  'description',
  'country_codes',
  'eligibility',
  'entrance_exams',
  'degree_awarded',
  'field_of_study',
  'career_options',
  'official_url',
  'status',
]);

const ALLOWED_CATEGORIES = Object.freeze([
  'medical',
  'dental',
  'ayush',
  'nursing',
  'pharmacy',
  'allied_health',
  'paramedical',
  'engineering',
  'management',
  'science',
  'arts',
  'commerce',
  'law',
  'education',
  'other',
]);

const ALLOWED_LEVELS = Object.freeze([
  'certificate',
  'diploma',
  'undergraduate',
  'postgraduate',
  'doctoral',
  'postdoctoral',
  'professional',
  'other',
]);

const ALLOWED_STATUSES = Object.freeze([
  'draft',
  'published',
  'inactive',
  'archived',
]);

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
const MAX_DESCRIPTION_LENGTH = 15000;

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

  normalizeString(data, 'name', 200, 2);
  normalizeString(data, 'slug', 200, 2);
  normalizeString(data, 'code', 50, 1);
  normalizeString(data, 'duration', 150, 1);
  normalizeString(data, 'description', MAX_DESCRIPTION_LENGTH);
  normalizeString(data, 'degree_awarded', 200);
  normalizeString(data, 'field_of_study', 200);

  if (data.slug !== undefined) {
    data.slug = data.slug.toLowerCase();

    if (!SLUG_REGEX.test(data.slug)) {
      throw validationError(
        'slug must contain lowercase letters, numbers, and single hyphens.'
      );
    }
  }

  if (data.category !== undefined) {
    if (typeof data.category !== 'string') {
      throw validationError('category must be a string.');
    }

    data.category = data.category.trim().toLowerCase();

    if (!ALLOWED_CATEGORIES.includes(data.category)) {
      throw validationError(
        `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`
      );
    }
  }

  if (data.level !== undefined) {
    if (typeof data.level !== 'string') {
      throw validationError('level must be a string.');
    }

    data.level = data.level.trim().toLowerCase();

    if (!ALLOWED_LEVELS.includes(data.level)) {
      throw validationError(
        `level must be one of: ${ALLOWED_LEVELS.join(', ')}.`
      );
    }
  }

  if (data.country_codes !== undefined) {
    if (
      !Array.isArray(data.country_codes) ||
      data.country_codes.length === 0 ||
      data.country_codes.length > 100
    ) {
      throw validationError(
        'country_codes must be a non-empty array containing at most 100 entries.'
      );
    }

    data.country_codes = data.country_codes.map((code) => {
      if (typeof code !== 'string') {
        throw validationError(
          'Each country code must be a two-letter ISO country code.'
        );
      }

      const normalized = code.trim().toUpperCase();

      if (!COUNTRY_CODE_REGEX.test(normalized)) {
        throw validationError(
          `Invalid country code: ${code}.`
        );
      }

      return normalized;
    });

    if (new Set(data.country_codes).size !== data.country_codes.length) {
      throw validationError(
        'country_codes must not contain duplicates.'
      );
    }
  }

  for (const field of [
    'eligibility',
    'entrance_exams',
    'career_options',
  ]) {
    if (data[field] === undefined) continue;

    if (!Array.isArray(data[field]) || data[field].length > 100) {
      throw validationError(
        `${field} must be an array containing at most 100 entries.`
      );
    }

    data[field] = data[field].map((item) => {
      if (typeof item !== 'string') {
        throw validationError(
          `Each ${field} entry must be a string.`
        );
      }

      const value = item.trim();

      if (value.length < 1 || value.length > 500) {
        throw validationError(
          `Each ${field} entry must contain between 1 and 500 characters.`
        );
      }

      return value;
    });
  }

  if (data.official_url !== undefined && data.official_url !== null) {
    if (typeof data.official_url !== 'string') {
      throw validationError(
        'official_url must be a URL string or null.'
      );
    }

    data.official_url = data.official_url.trim();

    if (data.official_url !== '') {
      data.official_url = validateUrl(
        data.official_url,
        'official_url'
      );
    } else {
      data.official_url = null;
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
  }

  if (!partial) {
    for (const field of [
      'name',
      'slug',
      'category',
      'level',
      'duration',
    ]) {
      if (!data[field]) {
        throw validationError(`${field} is required.`);
      }
    }

    if (!data.country_codes || data.country_codes.length === 0) {
      throw validationError('country_codes is required.');
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
  ALLOWED_CATEGORIES,
  ALLOWED_LEVELS,
  ALLOWED_STATUSES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};
