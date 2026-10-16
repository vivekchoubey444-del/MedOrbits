
'use strict';

const ALLOWED_CREATE_FIELDS = Object.freeze([
  'name',
  'slug',
  'code',
  'university_type',
  'country_code',
  'state',
  'city',
  'address',
  'pincode',
  'website',
  'email',
  'phone',
  'established_year',
  'recognition',
  'accreditation',
  'description',
  'logo_url',
  'official_url',
  'status',
]);

const ALLOWED_UPDATE_FIELDS = Object.freeze([
  'name',
  'slug',
  'code',
  'university_type',
  'country_code',
  'state',
  'city',
  'address',
  'pincode',
  'website',
  'email',
  'phone',
  'established_year',
  'recognition',
  'accreditation',
  'description',
  'logo_url',
  'official_url',
  'status',
]);

const ALLOWED_QUERY_FIELDS = Object.freeze([
  'page',
  'limit',
  'search',
  'country_code',
  'state',
  'city',
  'university_type',
  'status',
  'established_year',
]);

const UNIVERSITY_TYPES = Object.freeze([
  'public',
  'private',
  'deemed',
  'central',
  'state',
  'open',
  'international',
  'autonomous',
  'other',
]);

const UNIVERSITY_STATUSES = Object.freeze([
  'draft',
  'published',
  'inactive',
  'archived',
]);

const MAX_NAME_LENGTH = 200;
const MAX_SLUG_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_ADDRESS_LENGTH = 1000;
const MAX_LIST_TEXT_LENGTH = 2000;

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

function optionalString(value, field, options = {}) {
  if (value === undefined) return undefined;

  if (value === null && options.allowNull) return null;

  return requireString(value, field, options);
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

function validateSlug(value) {
  const slug = requireString(value, 'slug', {
    minLength: 1,
    maxLength: MAX_SLUG_LENGTH,
  }).toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw validationError(
      'slug may contain lowercase letters, numbers, and single hyphens between words.',
      'slug'
    );
  }

  return slug;
}

function validateCode(value) {
  const code = requireString(value, 'code', {
    minLength: 1,
    maxLength: 50,
  }).toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(code)) {
    throw validationError(
      'code contains unsupported characters.',
      'code'
    );
  }

  return code;
}

function validateEmail(value) {
  const email = requireString(value, 'email', {
    minLength: 3,
    maxLength: 254,
  }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw validationError('email must be valid.', 'email');
  }

  return email;
}

function validateUrl(value, field, options = {}) {
  const urlText = requireString(value, field, {
    minLength: 1,
    maxLength: 2048,
  });

  let parsed;

  try {
    parsed = new URL(urlText);
  } catch {
    throw validationError(`${field} must be a valid URL.`, field);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw validationError(
      `${field} must use HTTP or HTTPS.`,
      field
    );
  }

  if (parsed.username || parsed.password) {
    throw validationError(
      `${field} must not contain embedded credentials.`,
      field
    );
  }

  if (options.httpsOnly && parsed.protocol !== 'https:') {
    throw validationError(`${field} must use HTTPS.`, field);
  }

  return parsed.toString();
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

function validateYear(value, field = 'established_year') {
  if (!Number.isSafeInteger(value) || value < 1000 || value > 2100) {
    throw validationError(
      `${field} must be a whole year between 1000 and 2100.`,
      field
    );
  }

  return value;
}

function validateTextArray(value, field, options = {}) {
  const {
    maxItems = 50,
    maxItemLength = 200,
  } = options;

  if (!Array.isArray(value)) {
    throw validationError(`${field} must be an array of strings.`, field);
  }

  if (value.length > maxItems) {
    throw validationError(
      `${field} must not contain more than ${maxItems} items.`,
      field
    );
  }

  const normalized = value.map((item, index) => {
    if (typeof item !== 'string') {
      throw validationError(
        `${field}[${index}] must be a string.`,
        field
      );
    }

    return requireString(item, `${field}[${index}]`, {
      minLength: 1,
      maxLength: maxItemLength,
    });
  });

  const seen = new Set();

  for (const item of normalized) {
    const key = item.toLowerCase();

    if (seen.has(key)) {
      throw validationError(
        `${field} must not contain duplicate items.`,
        field
      );
    }

    seen.add(key);
  }

  return normalized;
}

function validateCreate(input) {
  const body = requireObject(input);
  rejectUnknownFields(body, ALLOWED_CREATE_FIELDS);

  const requiredFields = [
    'name',
    'slug',
    'university_type',
    'country_code',
    'city',
  ];

  for (const field of requiredFields) {
    if (body[field] === undefined) {
      throw validationError(`${field} is required.`, field);
    }
  }

  const result = {
    name: requireString(body.name, 'name', {
      minLength: 2,
      maxLength: MAX_NAME_LENGTH,
    }),
    slug: validateSlug(body.slug),
    university_type: validateEnum(
      body.university_type,
      'university_type',
      UNIVERSITY_TYPES
    ),
    country_code: validateCountryCode(body.country_code),
    city: requireString(body.city, 'city', {
      minLength: 1,
      maxLength: 150,
    }),
  };

  if (body.code !== undefined) {
    result.code = validateCode(body.code);
  }

  if (body.state !== undefined) {
    result.state = requireString(body.state, 'state', {
      minLength: 1,
      maxLength: 150,
    });
  }

  if (body.address !== undefined) {
    result.address = requireString(body.address, 'address', {
      minLength: 1,
      maxLength: MAX_ADDRESS_LENGTH,
    });
  }

  if (body.pincode !== undefined) {
    result.pincode = requireString(body.pincode, 'pincode', {
      minLength: 2,
      maxLength: 20,
    });

    if (!/^[A-Za-z0-9][A-Za-z0-9\s-]*$/.test(result.pincode)) {
      throw validationError(
        'pincode contains unsupported characters.',
        'pincode'
      );
    }
  }

  if (body.website !== undefined) {
    result.website = validateUrl(body.website, 'website');
  }

  if (body.official_url !== undefined) {
    result.official_url = validateUrl(body.official_url, 'official_url');
  }

  if (body.email !== undefined) {
    result.email = validateEmail(body.email);
  }

  if (body.phone !== undefined) {
    result.phone = validatePhone(body.phone);
  }

  if (body.established_year !== undefined) {
    result.established_year = validateYear(body.established_year);
  }

  if (body.recognition !== undefined) {
    result.recognition = validateTextArray(
      body.recognition,
      'recognition',
      { maxItems: 50, maxItemLength: 200 }
    );
  }

  if (body.accreditation !== undefined) {
    result.accreditation = validateTextArray(
      body.accreditation,
      'accreditation',
      { maxItems: 50, maxItemLength: 200 }
    );
  }

  if (body.description !== undefined) {
    result.description = requireString(body.description, 'description', {
      minLength: 1,
      maxLength: MAX_DESCRIPTION_LENGTH,
    });
  }

  if (body.logo_url !== undefined) {
    result.logo_url = validateUrl(body.logo_url, 'logo_url', {
      httpsOnly: true,
    });
  }

  if (body.status !== undefined) {
    result.status = validateEnum(
      body.status,
      'status',
      UNIVERSITY_STATUSES
    );
  } else {
    result.status = 'draft';
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

  // Reuse create-field validation for individual fields while allowing
  // partial updates. Required create fields are not required here.
  const result = {};

  const stringFields = {
    name: { minLength: 2, maxLength: MAX_NAME_LENGTH },
    state: { minLength: 1, maxLength: 150 },
    city: { minLength: 1, maxLength: 150 },
    address: { minLength: 1, maxLength: MAX_ADDRESS_LENGTH },
    pincode: { minLength: 2, maxLength: 20 },
    description: { minLength: 1, maxLength: MAX_DESCRIPTION_LENGTH },
  };

  for (const [field, options] of Object.entries(stringFields)) {
    if (body[field] !== undefined) {
      result[field] = requireString(body[field], field, options);
    }
  }

  if (body.slug !== undefined) {
    result.slug = validateSlug(body.slug);
  }

  if (body.code !== undefined) {
    result.code = validateCode(body.code);
  }

  if (body.university_type !== undefined) {
    result.university_type = validateEnum(
      body.university_type,
      'university_type',
      UNIVERSITY_TYPES
    );
  }

  if (body.country_code !== undefined) {
    result.country_code = validateCountryCode(body.country_code);
  }

  if (body.website !== undefined) {
    result.website = validateUrl(body.website, 'website');
  }

  if (body.official_url !== undefined) {
    result.official_url = validateUrl(body.official_url, 'official_url');
  }

  if (body.logo_url !== undefined) {
    result.logo_url = validateUrl(body.logo_url, 'logo_url', {
      httpsOnly: true,
    });
  }

  if (body.email !== undefined) {
    result.email = validateEmail(body.email);
  }

  if (body.phone !== undefined) {
    result.phone = validatePhone(body.phone);
  }

  if (body.established_year !== undefined) {
    result.established_year = validateYear(body.established_year);
  }

  if (body.recognition !== undefined) {
    result.recognition = validateTextArray(
      body.recognition,
      'recognition'
    );
  }

  if (body.accreditation !== undefined) {
    result.accreditation = validateTextArray(
      body.accreditation,
      'accreditation'
    );
  }

  if (body.status !== undefined) {
    result.status = validateEnum(
      body.status,
      'status',
      UNIVERSITY_STATUSES
    );
  }

  if (body.pincode !== undefined &&
      !/^[A-Za-z0-9][A-Za-z0-9\s-]*$/.test(result.pincode)) {
    throw validationError(
      'pincode contains unsupported characters.',
      'pincode'
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

  if (query.country_code !== undefined) {
    result.country_code = validateCountryCode(query.country_code);
  }

  for (const field of ['state', 'city']) {
    if (query[field] !== undefined) {
      result[field] = requireString(query[field], field, {
        minLength: 1,
        maxLength: 150,
      });
    }
  }

  if (query.university_type !== undefined) {
    result.university_type = validateEnum(
      query.university_type,
      'university_type',
      UNIVERSITY_TYPES
    );
  }

  if (query.status !== undefined) {
    result.status = validateEnum(
      query.status,
      'status',
      UNIVERSITY_STATUSES
    );
  }

  if (query.established_year !== undefined) {
    result.established_year = parseBoundedInteger(
      query.established_year,
      'established_year',
      1000,
      2100
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
        `Unsupported university validation mode: ${mode}.`,
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
  validateCountryCode,
  validateSlug,
  validateUrl,
  validateEmail,
  validatePhone,
  UNIVERSITY_TYPES,
  UNIVERSITY_STATUSES,
  ALLOWED_CREATE_FIELDS,
  ALLOWED_UPDATE_FIELDS,
  ALLOWED_QUERY_FIELDS,
};
