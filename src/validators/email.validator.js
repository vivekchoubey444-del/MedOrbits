
'use strict';

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;

function validationError(
  message,
  code = 'INVALID_EMAIL',
  field = 'email'
) {
  const error = new Error(message);

  error.name = 'ValidationError';
  error.status = 400;
  error.statusCode = 400;
  error.code = code;
  error.publicMessage = message;

  if (field) {
    error.field = field;
  }

  return error;
}

/**
 * Normalize an email address according to the application policy:
 * - Trim surrounding whitespace.
 * - Convert to lowercase.
 *
 * This policy is suitable for typical MedOrbits account workflows.
 * It does not prove that the mailbox exists or belongs to the user.
 */
function normalizeEmail(value) {
  if (typeof value !== 'string') {
    throw validationError(
      'Email address must be a string.',
      'INVALID_TYPE'
    );
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    throw validationError(
      'Email address is required.',
      'REQUIRED_FIELD'
    );
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    throw validationError(
      `Email address must not exceed ${MAX_EMAIL_LENGTH} characters.`,
      'OUT_OF_RANGE'
    );
  }

  return email;
}

/**
 * Basic email syntax validation.
 * Does not perform DNS, mailbox-existence, or ownership verification.
 */
function validateEmail(value, options = {}) {
  const {
    required = true,
    allowDisplayName = false,
  } = options;

  if (value === undefined || value === null) {
    if (!required) {
      return undefined;
    }

    throw validationError(
      'Email address is required.',
      'REQUIRED_FIELD'
    );
  }

  if (typeof value !== 'string') {
    throw validationError(
      'Email address must be a string.',
      'INVALID_TYPE'
    );
  }

  const email = normalizeEmail(value);

  if (allowDisplayName) {
    throw validationError(
      'Display-name email formats are not supported. Provide the email address only.',
      'INVALID_FORMAT'
    );
  }

  if (/\s/.test(email)) {
    throw validationError(
      'Email address must not contain whitespace.',
      'INVALID_FORMAT'
    );
  }

  const parts = email.split('@');

  if (parts.length !== 2) {
    throw validationError(
      'Enter a valid email address.',
      'INVALID_FORMAT'
    );
  }

  const [localPart, domain] = parts;

  if (
    localPart.length === 0 ||
    localPart.length > MAX_LOCAL_PART_LENGTH
  ) {
    throw validationError(
      'Email address has an invalid local part.',
      'INVALID_FORMAT'
    );
  }

  if (
    domain.length === 0 ||
    domain.length > MAX_DOMAIN_LENGTH
  ) {
    throw validationError(
      'Email address has an invalid domain.',
      'INVALID_FORMAT'
    );
  }

  // Supports common dot-atom email addresses.
  // Quoted local parts and internationalized domain names are not
  // supported by this lightweight validator.
  const localPattern =
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;

  if (!localPattern.test(localPart)) {
    throw validationError(
      'Email address has an invalid local part.',
      'INVALID_FORMAT'
    );
  }

  const labels = domain.split('.');

  if (labels.length < 2) {
    throw validationError(
      'Email domain must contain a valid domain suffix.',
      'INVALID_FORMAT'
    );
  }

  const validDomainLabel = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

  for (const label of labels) {
    if (
      label.length === 0 ||
      label.length > 63 ||
      !validDomainLabel.test(label)
    ) {
      throw validationError(
        'Email address has an invalid domain.',
        'INVALID_FORMAT'
      );
    }
  }

  const suffix = labels[labels.length - 1];

  if (!/[a-z]/i.test(suffix)) {
    throw validationError(
      'Email domain suffix is invalid.',
      'INVALID_FORMAT'
    );
  }

  return email;
}

function isValidEmail(value, options = {}) {
  try {
    validateEmail(value, options);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  validateEmail,
  normalizeEmail,
  isValidEmail,
  MAX_EMAIL_LENGTH,
  MAX_LOCAL_PART_LENGTH,
  MAX_DOMAIN_LENGTH,
};
