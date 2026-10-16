
'use strict';

const ALLOWED_CHANGE_FIELDS = Object.freeze([
  'currentPassword',
  'newPassword',
  'confirmPassword',
]);

const ALLOWED_RESET_REQUEST_FIELDS = Object.freeze([
  'email',
]);

const ALLOWED_RESET_FIELDS = Object.freeze([
  'token',
  'newPassword',
  'confirmPassword',
]);

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const MAX_TOKEN_LENGTH = 2048;
const MAX_EMAIL_LENGTH = 254;

function validationError(message, field, code = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.status = 400;
  error.statusCode = 400;
  error.code = code;
  error.field = field;
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
    trim = false,
    label = field,
  } = options;

  if (typeof value !== 'string') {
    throw validationError(`${label} must be a string.`, field);
  }

  const normalized = trim ? value.trim() : value;

  if (normalized.length < minLength) {
    throw validationError(
      `${label} must be at least ${minLength} character(s).`,
      field
    );
  }

  if (normalized.length > maxLength) {
    throw validationError(
      `${label} must not exceed ${maxLength} characters.`,
      field
    );
  }

  return normalized;
}

function validatePassword(value, field = 'newPassword') {
  const password = requireString(value, field, {
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
    label: 'Password',
  });

  // Do not trim, normalize, or silently modify passwords.
  if (/\u0000/.test(password)) {
    throw validationError(
      'Password must not contain null characters.',
      field
    );
  }

  return password;
}

function validateEmail(value) {
  const email = requireString(value, 'email', {
    minLength: 3,
    maxLength: MAX_EMAIL_LENGTH,
    trim: true,
    label: 'Email',
  }).toLowerCase();

  // Practical format check; the application should still verify ownership.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw validationError('Enter a valid email address.', 'email');
  }

  return email;
}

function validateChange(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_CHANGE_FIELDS);

  const currentPassword = requireString(
    body.currentPassword,
    'currentPassword',
    {
      minLength: 1,
      maxLength: MAX_PASSWORD_LENGTH,
      label: 'Current password',
    }
  );

  const newPassword = validatePassword(body.newPassword);
  const confirmPassword = requireString(
    body.confirmPassword,
    'confirmPassword',
    {
      minLength: MIN_PASSWORD_LENGTH,
      maxLength: MAX_PASSWORD_LENGTH,
      label: 'Password confirmation',
    }
  );

  if (newPassword !== confirmPassword) {
    throw validationError(
      'New password and confirmation do not match.',
      'confirmPassword',
      'PASSWORD_MISMATCH'
    );
  }

  if (currentPassword === newPassword) {
    throw validationError(
      'New password must be different from the current password.',
      'newPassword',
      'PASSWORD_UNCHANGED'
    );
  }

  return {
    currentPassword,
    newPassword,
  };
}

function validateResetRequest(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_RESET_REQUEST_FIELDS);

  return {
    email: validateEmail(body.email),
  };
}

function validateReset(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_RESET_FIELDS);

  const token = requireString(body.token, 'token', {
    minLength: 16,
    maxLength: MAX_TOKEN_LENGTH,
    trim: true,
    label: 'Password reset token',
  });

  const newPassword = validatePassword(body.newPassword);
  const confirmPassword = requireString(
    body.confirmPassword,
    'confirmPassword',
    {
      minLength: MIN_PASSWORD_LENGTH,
      maxLength: MAX_PASSWORD_LENGTH,
      label: 'Password confirmation',
    }
  );

  if (newPassword !== confirmPassword) {
    throw validationError(
      'New password and confirmation do not match.',
      'confirmPassword',
      'PASSWORD_MISMATCH'
    );
  }

  return {
    token,
    newPassword,
  };
}

function validate(input, mode = 'change') {
  switch (mode) {
    case 'change':
      return validateChange(input);

    case 'reset-request':
      return validateResetRequest(input);

    case 'reset':
      return validateReset(input);

    default:
      throw validationError(
        `Unsupported password validation mode: ${mode}.`,
        'mode',
        'INVALID_VALIDATION_MODE'
      );
  }
}

module.exports = {
  validate,
  validateChange,
  validateResetRequest,
  validateReset,
  validatePassword,
  validateEmail,
  ALLOWED_CHANGE_FIELDS,
  ALLOWED_RESET_REQUEST_FIELDS,
  ALLOWED_RESET_FIELDS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
};
