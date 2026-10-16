
'use strict';

const ALLOWED_CREATE_FIELDS = Object.freeze([
  'name',
  'first_name',
  'last_name',
  'email',
  'password',
  'phone',
  'role',
  'status',
  'preferred_language',
  'country_code',
]);

const ALLOWED_UPDATE_FIELDS = Object.freeze([
  'name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'preferred_language',
  'country_code',
  'profile_image_url',
]);

const ALLOWED_QUERY_FIELDS = Object.freeze([
  'page',
  'limit',
  'search',
  'role',
  'status',
  'country_code',
]);

const USER_ROLES = Object.freeze([
  'student',
  'candidate',
  'employer',
  'counsellor',
  'consultant',
  'recruiter',
  'admin',
  'super_admin',
]);

const USER_STATUSES = Object.freeze([
  'pending',
  'active',
  'inactive',
  'suspended',
]);

const SUPPORTED_LANGUAGES = Object.freeze([
  'en',
  'hi',
  'bn',
  'as',
  'ne',
  'mr',
  'gu',
  'pa',
  'ur',
  'or',
  'ps',
  'fa',
  'fr',
  'de',
  'es',
  'zh',
  'ar',
  'ru',
  'ka',
  'kk',
  'uz',
  'ky',
]);

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

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

function validateName(value, field = 'name') {
  const name = requireString(value, field, {
    minLength: 2,
    maxLength: MAX_NAME_LENGTH,
  });

  if (/[\u0000-\u001F\u007F]/.test(name)) {
    throw validationError(
      `${field} contains unsupported control characters.`,
      field
    );
  }

  return name;
}

function validateEmail(value) {
  const email = requireString(value, 'email', {
    minLength: 3,
    maxLength: MAX_EMAIL_LENGTH,
  }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw validationError('Enter a valid email address.', 'email');
  }

  return email;
}

function validatePassword(value) {
  // Never trim or normalize passwords.
  const password = requireString(value, 'password', {
    minLength: 12,
    maxLength: MAX_PASSWORD_LENGTH,
    trim: false,
  });

  if (/\u0000/.test(password)) {
    throw validationError(
      'Password must not contain null characters.',
      'password'
    );
  }

  return password;
}

function validatePhone(value) {
  const phone = requireString(value, 'phone', {
    minLength: 5,
    maxLength: 30,
  });

  if (!/^[+0-9().\-\s]+$/.test(phone)) {
    throw validationError(
      'phone contains unsupported characters.',
      'phone'
    );
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length < 5 || digits.length > 15) {
    throw validationError(
      'phone must contain between 5 and 15 digits.',
      'phone'
    );
  }

  return phone;
}

function validateCountryCode(value) {
  const code = requireString(value, 'country_code', {
    minLength: 2,
    maxLength: 2,
  }).toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    throw validationError(
      'country_code must be a two-letter ISO country code.',
      'country_code'
    );
  }

  return code;
}

function validateLanguage(value) {
  const language = requireString(value, 'preferred_language', {
    minLength: 2,
    maxLength: 5,
  }).toLowerCase();

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw validationError(
      `preferred_language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
      'preferred_language'
    );
  }

  return language;
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

function validateProfileImageUrl(value) {
  const raw = requireString(value, 'profile_image_url', {
    minLength: 1,
    maxLength: 2048,
  });

  let url;

  try {
    url = new URL(raw);
  } catch {
    throw validationError(
      'profile_image_url must be a valid URL.',
      'profile_image_url'
    );
  }

  if (url.protocol !== 'https:') {
    throw validationError(
      'profile_image_url must use HTTPS.',
      'profile_image_url'
    );
  }

  if (url.username || url.password) {
    throw validationError(
      'profile_image_url must not contain embedded credentials.',
      'profile_image_url'
    );
  }

  return url.toString();
}

function validateCreate(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_CREATE_FIELDS);

  if (body.email === undefined) {
    throw validationError('email is required.', 'email');
  }

  if (body.password === undefined) {
    throw validationError('password is required.', 'password');
  }

  const result = {
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  };

  if (body.name !== undefined) {
    result.name = validateName(body.name);
  }

  if (body.first_name !== undefined) {
    result.first_name = validateName(body.first_name, 'first_name');
  }

  if (body.last_name !== undefined) {
    result.last_name = validateName(body.last_name, 'last_name');
  }

  if (result.name === undefined) {
    if (!result.first_name || !result.last_name) {
      throw validationError(
        'Provide name or both first_name and last_name.',
        'name'
      );
    }
  }

  if (body.phone !== undefined) {
    result.phone = validatePhone(body.phone);
  }

  // Public registration must not allow privilege escalation.
  // Assign roles and statuses using trusted server-side logic.
  if (body.role !== undefined) {
    throw validationError(
      'role cannot be assigned through public user creation.',
      'role',
      'FIELD_NOT_ALLOWED'
    );
  }

  if (body.status !== undefined) {
    throw validationError(
      'status is managed by the server.',
      'status',
      'FIELD_NOT_ALLOWED'
    );
  }

  if (body.preferred_language !== undefined) {
    result.preferred_language = validateLanguage(
      body.preferred_language
    );
  }

  if (body.country_code !== undefined) {
    result.country_code = validateCountryCode(body.country_code);
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

  if (body.name !== undefined) {
    result.name = validateName(body.name);
  }

  if (body.first_name !== undefined) {
    result.first_name = validateName(body.first_name, 'first_name');
  }

  if (body.last_name !== undefined) {
    result.last_name = validateName(body.last_name, 'last_name');
  }

  if (body.email !== undefined) {
    result.email = validateEmail(body.email);
  }

  if (body.phone !== undefined) {
    result.phone = validatePhone(body.phone);
  }

  if (body.preferred_language !== undefined) {
    result.preferred_language = validateLanguage(
      body.preferred_language
    );
  }

  if (body.country_code !== undefined) {
    result.country_code = validateCountryCode(body.country_code);
  }

  if (body.profile_image_url !== undefined) {
    result.profile_image_url = validateProfileImageUrl(
      body.profile_image_url
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

  if (query.search !== undefined) {
    result.search = requireString(query.search, 'search', {
      minLength: 1,
      maxLength: 200,
    });
  }

  if (query.role !== undefined) {
    result.role = validateEnum(query.role, 'role', USER_ROLES);
  }

  if (query.status !== undefined) {
    result.status = validateEnum(
      query.status,
      'status',
      USER_STATUSES
    );
  }

  if (query.country_code !== undefined) {
    result.country_code = validateCountryCode(query.country_code);
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
        `Unsupported user validation mode: ${mode}.`,
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
  validateName,
  validateEmail,
  validatePassword,
  validatePhone,
  validateCountryCode,
  validateLanguage,
  USER_ROLES,
  USER_STATUSES,
  SUPPORTED_LANGUAGES,
  ALLOWED_CREATE_FIELDS,
  ALLOWED_UPDATE_FIELDS,
  ALLOWED_QUERY_FIELDS,
};
