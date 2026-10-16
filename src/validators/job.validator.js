
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'employer_id',
  'title',
  'slug',
  'description',
  'responsibilities',
  'requirements',
  'employment_type',
  'work_mode',
  'experience_min',
  'experience_max',
  'education_level',
  'skills',
  'location',
  'city',
  'state',
  'country_code',
  'salary_min',
  'salary_max',
  'salary_currency',
  'vacancies',
  'application_deadline',
  'status',
]);

const ALLOWED_EMPLOYMENT_TYPES = Object.freeze([
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'internship',
  'freelance',
  'apprenticeship',
]);

const ALLOWED_WORK_MODES = Object.freeze([
  'onsite',
  'remote',
  'hybrid',
]);

const ALLOWED_EDUCATION_LEVELS = Object.freeze([
  'high_school',
  'certificate',
  'diploma',
  'undergraduate',
  'postgraduate',
  'doctoral',
  'professional',
  'other',
]);

const ALLOWED_STATUSES = Object.freeze([
  'draft',
  'published',
  'paused',
  'closed',
  'archived',
]);

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 15000;
const MAX_LIST_ITEMS = 100;
const MAX_LIST_ITEM_LENGTH = 500;

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

function validateEnum(data, field, allowedValues) {
  if (data[field] === undefined) return;

  if (typeof data[field] !== 'string') {
    throw validationError(`${field} must be a string.`);
  }

  data[field] = data[field].trim().toLowerCase();

  if (!allowedValues.includes(data[field])) {
    throw validationError(
      `${field} must be one of: ${allowedValues.join(', ')}.`
    );
  }
}

function validateDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw validationError(`${field} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw validationError(`${field} must be a valid calendar date.`);
  }

  return value;
}

function validateStringArray(data, field) {
  if (data[field] === undefined) return;

  if (
    !Array.isArray(data[field]) ||
    data[field].length > MAX_LIST_ITEMS
  ) {
    throw validationError(
      `${field} must be an array containing at most ${MAX_LIST_ITEMS} entries.`
    );
  }

  data[field] = data[field].map((item) => {
    if (typeof item !== 'string') {
      throw validationError(`Each ${field} entry must be a string.`);
    }

    const value = item.trim();

    if (
      value.length < 1 ||
      value.length > MAX_LIST_ITEM_LENGTH
    ) {
      throw validationError(
        `Each ${field} entry must contain between 1 and ${MAX_LIST_ITEM_LENGTH} characters.`
      );
    }

    return value;
  });

  const normalized = data[field].map((item) => item.toLowerCase());

  if (new Set(normalized).size !== normalized.length) {
    throw validationError(`${field} must not contain duplicates.`);
  }
}

function validate(input = {}, options = {}) {
  const { partial = false } = options;
  const data = pickAllowed(input);

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.'
    );
  }

  normalizeString(data, 'title', MAX_TITLE_LENGTH, 3);
  normalizeString(data, 'slug', 200, 2);
  normalizeString(data, 'description', MAX_DESCRIPTION_LENGTH, 20);
  normalizeString(data, 'location', 200, 1);
  normalizeString(data, 'city', 100, 1);
  normalizeString(data, 'state', 100, 1);
  normalizeString(data, 'salary_currency', 3, 3);

  if (data.employer_id !== undefined) {
    if (
      !Number.isSafeInteger(data.employer_id) ||
      data.employer_id < 1
    ) {
      throw validationError('employer_id must be a positive integer.');
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

  validateEnum(data, 'employment_type', ALLOWED_EMPLOYMENT_TYPES);
  validateEnum(data, 'work_mode', ALLOWED_WORK_MODES);
  validateEnum(data, 'education_level', ALLOWED_EDUCATION_LEVELS);
  validateEnum(data, 'status', ALLOWED_STATUSES);

  for (const field of ['experience_min', 'experience_max']) {
    if (data[field] === undefined) continue;

    if (
      !Number.isFinite(data[field]) ||
      data[field] < 0 ||
      data[field] > 70
    ) {
      throw validationError(
        `${field} must be a number between 0 and 70.`
      );
    }
  }

  if (
    data.experience_min !== undefined &&
    data.experience_max !== undefined &&
    data.experience_min > data.experience_max
  ) {
    throw validationError(
      'experience_min cannot exceed experience_max.'
    );
  }

  for (const field of ['salary_min', 'salary_max']) {
    if (data[field] === undefined) continue;

    if (
      typeof data[field] !== 'number' ||
      !Number.isFinite(data[field]) ||
      data[field] < 0 ||
      data[field] > 1000000000000
    ) {
      throw validationError(
        `${field} must be a non-negative finite number within the supported limit.`
      );
    }
  }

  if (
    data.salary_min !== undefined &&
    data.salary_max !== undefined &&
    data.salary_min > data.salary_max
  ) {
    throw validationError(
      'salary_min cannot exceed salary_max.'
    );
  }

  if (
    (data.salary_min !== undefined || data.salary_max !== undefined) &&
    !data.salary_currency
  ) {
    throw validationError(
      'salary_currency is required when a salary range is provided.'
    );
  }

  if (data.salary_currency !== undefined) {
    data.salary_currency = data.salary_currency.toUpperCase();

    if (!CURRENCY_REGEX.test(data.salary_currency)) {
      throw validationError(
        'salary_currency must be a three-letter currency code.'
      );
    }
  }

  if (data.country_code !== undefined) {
    if (typeof data.country_code !== 'string') {
      throw validationError('country_code must be a string.');
    }

    data.country_code = data.country_code.trim().toUpperCase();

    if (!COUNTRY_CODE_REGEX.test(data.country_code)) {
      throw validationError(
        'country_code must be a two-letter country code.'
      );
    }
  }

  if (data.vacancies !== undefined) {
    if (
      !Number.isSafeInteger(data.vacancies) ||
      data.vacancies < 1 ||
      data.vacancies > 100000
    ) {
      throw validationError(
        'vacancies must be a positive integer not exceeding 100000.'
      );
    }
  }

  validateStringArray(data, 'responsibilities');
  validateStringArray(data, 'requirements');
  validateStringArray(data, 'skills');

  if (data.application_deadline !== undefined &&
      data.application_deadline !== null) {
    data.application_deadline = validateDate(
      data.application_deadline,
      'application_deadline'
    );
  }

  if (!partial) {
    for (const field of [
      'title',
      'description',
      'employment_type',
      'work_mode',
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
  ALLOWED_EMPLOYMENT_TYPES,
  ALLOWED_WORK_MODES,
  ALLOWED_EDUCATION_LEVELS,
  ALLOWED_STATUSES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};
