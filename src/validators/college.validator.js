
'use strict';

const ALLOWED_FIELDS = Object.freeze([
  'name',
  'slug',
  'code',
  'college_type',
  'country_code',
  'state',
  'city',
  'address',
  'pincode',
  'website',
  'email',
  'phone',
  'university_id',
  'courses',
  'accreditation',
  'established_year',
  'description',
  'status',
]);

const ALLOWED_TYPES = Object.freeze([
  'government',
  'private',
  'deemed',
  'autonomous',
  'public',
  'other',
]);

const ALLOWED_STATUSES = Object.freeze([
  'draft',
  'published',
  'inactive',
  'archived',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

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
    (key) => !ALLOWED_FIELDS.includes(key)
  );

  if (unknownFields.length > 0) {
    throw validationError(
      `Unsupported field(s): ${unknownFields.join(', ')}.`,
      'UNKNOWN_FIELDS'
    );
  }

  const output = {};

  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      output[key] = input[key];
    }
  }

  return output;
}

function validate(input = {}, options = {}) {
  const { partial = false } = options;
  const data = pickAllowed(input);

  if (Object.keys(data).length === 0) {
    throw validationError(
      'At least one supported field must be provided.'
    );
  }

  for (const field of [
    'name',
    'slug',
    'code',
    'state',
    'city',
    'address',
    'pincode',
    'website',
    'email',
    'phone',
    'description',
  ]) {
    if (data[field] === undefined) continue;

    if (typeof data[field] !== 'string') {
      throw validationError(`${field} must be a string.`);
    }

    data[field] = data[field].trim();
  }

  if (data.name !== undefined) {
    if (data.name.length < 2 || data.name.length > 200) {
      throw validationError(
        'name must contain between 2 and 200 characters.'
      );
    }
  }

  if (data.slug !== undefined) {
    data.slug = data.slug.toLowerCase();

    if (
      data.slug.length < 2 ||
      data.slug.length > 200 ||
      !SLUG_REGEX.test(data.slug)
    ) {
      throw validationError(
        'slug must contain lowercase letters, numbers, and single hyphens.'
      );
    }
  }

  if (data.code !== undefined) {
    if (
      data.code.length < 1 ||
      data.code.length > 50
    ) {
      throw validationError(
        'code must contain between 1 and 50 characters.'
      );
    }
  }

  if (data.college_type !== undefined) {
    if (
      typeof data.college_type !== 'string' ||
      !ALLOWED_TYPES.includes(data.college_type.trim().toLowerCase())
    ) {
      throw validationError(
        `college_type must be one of: ${ALLOWED_TYPES.join(', ')}.`
      );
    }

    data.college_type = data.college_type.trim().toLowerCase();
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

  if (data.pincode !== undefined) {
    if (
      data.pincode.length < 3 ||
      data.pincode.length > 12
    ) {
      throw validationError(
        'pincode must contain between 3 and 12 characters.'
      );
    }
  }

  if (data.website !== undefined && data.website !== '') {
    let url;

    try {
      url = new URL(data.website);
    } catch {
      throw validationError('website must be a valid URL.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw validationError(
        'website must use HTTP or HTTPS.'
      );
    }

    data.website = url.toString();
  }

  if (data.email !== undefined && data.email !== '') {
    data.email = data.email.toLowerCase();

    if (
      data.email.length > 254 ||
      !EMAIL_REGEX.test(data.email)
    ) {
      throw validationError('email must be a valid email address.');
    }
  }

  if (data.phone !== undefined && data.phone !== '') {
    if (
      data.phone.length > 25 ||
      !/^[+()\d\s.-]+$/.test(data.phone)
    ) {
      throw validationError('phone must be a valid phone number.');
    }
  }

  if (data.university_id !== undefined) {
    if (
      !Number.isSafeInteger(data.university_id) ||
      data.university_id < 1
    ) {
      throw validationError(
        'university_id must be a positive integer.'
      );
    }
  }

  if (data.courses !== undefined) {
    if (
      !Array.isArray(data.courses) ||
      data.courses.length > 500
    ) {
      throw validationError(
        'courses must be an array containing at most 500 entries.'
      );
    }

    for (const courseId of data.courses) {
      if (!Number.isSafeInteger(courseId) || courseId < 1) {
        throw validationError(
          'Each courses entry must be a positive integer ID.'
        );
      }
    }

    if (new Set(data.courses).size !== data.courses.length) {
      throw validationError(
        'courses must not contain duplicate IDs.'
      );
    }
  }

  if (data.accreditation !== undefined) {
    if (
      !Array.isArray(data.accreditation) ||
      data.accreditation.length > 50
    ) {
      throw validationError(
        'accreditation must be an array containing at most 50 entries.'
      );
    }

    data.accreditation = data.accreditation.map((item) => {
      if (typeof item !== 'string') {
        throw validationError(
          'Each accreditation entry must be a string.'
        );
      }

      const value = item.trim();

      if (value.length < 1 || value.length > 200) {
        throw validationError(
          'Each accreditation entry must contain between 1 and 200 characters.'
        );
      }

      return value;
    });
  }

  if (data.established_year !== undefined) {
    const currentYear = new Date().getFullYear();

    if (
      !Number.isSafeInteger(data.established_year) ||
      data.established_year < 1500 ||
      data.established_year > currentYear
    ) {
      throw validationError(
        `established_year must be an integer between 1500 and ${currentYear}.`
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
  }

  if (data.description !== undefined &&
      data.description.length > 10000) {
    throw validationError(
      'description must not exceed 10000 characters.'
    );
  }

  if (!partial) {
    for (const field of ['name', 'slug', 'country_code', 'city']) {
      if (!data[field]) {
        throw validationError(`${field} is required.`);
      }
    }

    if (data.college_type === undefined) {
      throw validationError('college_type is required.');
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
  ALLOWED_TYPES,
  ALLOWED_STATUSES,
  pickAllowed,
  validate,
  validateCreate,
  validateUpdate,
};
