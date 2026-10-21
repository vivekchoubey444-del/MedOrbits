'use strict';

/**
 * MedOrbits -- Validator Unit Tests
 *
 * File: tests/unit/validators.test.js
 * Runtime: Node.js >= 20
 * Test runner: Jest
 *
 * Run:
 *   npx jest tests/unit/validators.test.js --runInBand
 *
 * These tests validate input handling and allowlists. They do not replace
 * integration tests, authorization checks, database constraints, or security
 * testing of the complete application.
 */

const common = require('../../src/validators/common.validator');
const request = require('../../src/validators/request.validator');
const auth = require('../../src/validators/auth.validator');
const user = require('../../src/validators/user.validator');
const email = require('../../src/validators/email.validator');
const password = require('../../src/validators/password.validator');
const application = require('../../src/validators/application.validator');
const candidate = require('../../src/validators/candidate.validator');
const college = require('../../src/validators/college.validator');
const course = require('../../src/validators/course.validator');
const admission = require('../../src/validators/admission.validator');
const contact = require('../../src/validators/contact.validator');
const documentValidator = require('../../src/validators/document.validator');
const employer = require('../../src/validators/employer.validator');
const job = require('../../src/validators/job.validator');
const payment = require('../../src/validators/payment.validator');
const subscription = require('../../src/validators/subscription.validator');
const university = require('../../src/validators/university.validator');
const verification = require('../../src/validators/verification.validator');

function expectValidationError(callback, status = 400) {
  let caughtError;

  try {
    callback();
  } catch (error) {
    caughtError = error;
  }

  expect(caughtError).toBeDefined();
  expect(caughtError).toBeInstanceOf(Error);
  expect(caughtError.message).not.toBe('Expected validation to fail');
  expect(caughtError.status ?? caughtError.statusCode).toBe(status);
}

describe('common.validator', () => {
  test('exports documented limits', () => {
    expect(common.DEFAULT_MAX_STRING_LENGTH).toBe(10000);
    expect(common.DEFAULT_MAX_ARRAY_LENGTH).toBe(100);
    expect(common.DEFAULT_MAX_OBJECT_DEPTH).toBe(10);
    expect(common.DEFAULT_MAX_OBJECT_BYTES).toBe(65536);
  });

  test('creates structured validation errors', () => {
    const error = common.createValidationError(
      'Invalid name',
      'INVALID_NAME',
      'name',
    );

    expect(error).toMatchObject({
      name: 'ValidationError',
      message: 'Invalid name',
      status: 400,
      statusCode: 400,
      code: 'INVALID_NAME',
      publicMessage: 'Invalid name',
      field: 'name',
    });
  });

  test('identifies plain objects', () => {
    expect(common.isPlainObject({ name: 'MedOrbits' })).toBe(true);
    expect(common.isPlainObject(Object.create(null))).toBe(true);

    for (const value of [null, [], 'text', 1, new Date()]) {
      expect(common.isPlainObject(value)).toBe(false);
    }
  });

  test('requires plain objects', () => {
    const input = { name: 'MedOrbits' };

    expect(common.requireObject(input)).toBe(input);
    expect(() => common.requireObject(null)).toThrow();
    expect(() => common.requireObject([])).toThrow();
    expect(() => common.requireObject('text')).toThrow();
    expect(() => common.requireObject(new Date())).toThrow();
  });

  test('requires arrays and enforces item limits', () => {
    const values = ['a', 'b'];

    expect(
      common.requireArray(values, {
        field: 'items',
        minItems: 1,
        maxItems: 2,
      }),
    ).toBe(values);

    expect(() => common.requireArray('not-an-array')).toThrow();
    expect(() => common.requireArray([], { minItems: 1 })).toThrow();
    expect(() => common.requireArray([1, 2, 3], { maxItems: 2 })).toThrow();
  });

  test('requires strings, trims by default, and enforces length', () => {
    expect(common.requireString('  MedOrbits  ')).toBe('MedOrbits');

    expect(
      common.requireString('  ', {
        allowEmpty: true,
        minLength: 0,
      }),
    ).toBe('');

    expect(() => common.requireString(null)).toThrow();
    expect(() => common.requireString('')).toThrow();
    expect(() => common.requireString('ab', { minLength: 3 })).toThrow();
    expect(() => common.requireString('abcdef', { maxLength: 5 })).toThrow();
  });

  test('validates string patterns', () => {
    expect(
      common.requireString('ABC-123', {
        pattern: /^[A-Z]+-\d+$/,
      }),
    ).toBe('ABC-123');

    expect(() =>
      common.requireString('invalid', {
        pattern: /^\d+$/,
        field: 'code',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_FORMAT',
        field: 'code',
      }),
    );
  });

  test('supports optional strings and optional null values', () => {
    expect(common.optionalString(undefined)).toBeUndefined();
    expect(common.optionalString(null, { allowNull: true })).toBeNull();
    expect(common.optionalString(' hello ')).toBe('hello');
    expect(() => common.optionalString(null)).toThrow();
  });

  test('requires actual boolean values', () => {
    expect(common.requireBoolean(true)).toBe(true);
    expect(common.requireBoolean(false)).toBe(false);
    expect(() => common.requireBoolean('true')).toThrow();
    expect(() => common.requireBoolean(1)).toThrow();
  });

  test('validates finite numbers and numeric strings', () => {
    expect(common.requireNumber(10)).toBe(10);

    expect(
      common.requireNumber('12', {
        allowNumericString: true,
      }),
    ).toBe(12);

    expect(() => common.requireNumber('12')).toThrow();
    expect(() => common.requireNumber(Infinity)).toThrow();
    expect(() => common.requireNumber(-Infinity)).toThrow();
    expect(() => common.requireNumber(NaN)).toThrow();

    expect(
      () =>
        common.requireNumber(1.5, {
          integer: true,
        }),
    ).toThrow();

    expect(() => common.requireNumber(0, { min: 1 })).toThrow();
  });

  test('validates positive IDs', () => {
    expect(common.requirePositiveId(1)).toBe(1);
    expect(common.requirePositiveId('42')).toBe(42);
    expect(() => common.requirePositiveId(0)).toThrow();
    expect(() => common.requirePositiveId(-1)).toThrow();
    expect(() => common.requirePositiveId(1.5)).toThrow();
  });

  test('validates enums', () => {
    expect(
      common.requireEnum('active', {
        allowedValues: ['active', 'inactive'],
      }),
    ).toBe('active');

    expect(
      common.requireEnum(' ACTIVE ', {
        allowedValues: ['active', 'inactive'],
        caseInsensitive: true,
      }),
    ).toBe('active');

    expect(() =>
      common.requireEnum('unknown', {
        allowedValues: ['active', 'inactive'],
      }),
    ).toThrow();

    expect(() =>
      common.requireEnum('active', {
        allowedValues: [],
      }),
    ).toThrow(TypeError);
  });

  test('rejects unknown fields and supports explicit exceptions', () => {
    const input = {
      name: 'MedOrbits',
      debug: true,
    };

    expect(() =>
      common.rejectUnknownFields(input, ['name']),
    ).toThrow(
      expect.objectContaining({
        code: 'UNKNOWN_FIELD',
      }),
    );

    expect(
      common.rejectUnknownFields(input, ['name'], {
        allow: ['debug'],
      }),
    ).toBe(input);
  });

  test('picks only allowlisted fields', () => {
    expect(
      common.pickAllowed(
        {
          name: 'Student',
          role: 'admin',
          email: 'student@example.com',
        },
        ['name', 'email'],
      ),
    ).toEqual({
      name: 'Student',
      email: 'student@example.com',
    });
  });

  test('validates date-only values', () => {
    expect(common.requireDateOnly('2026-10-16')).toBe('2026-10-16');
    expect(() => common.requireDateOnly('16-10-2026')).toThrow();
    expect(() => common.requireDateOnly('not-a-date')).toThrow();
  });
});

describe('request.validator', () => {
  test('validates request objects', () => {
    expect(request.validateRequestObject({ name: 'Student' })).toEqual({
      name: 'Student',
    });

    expect(() => request.validateRequestObject(null)).toThrow();
    expect(() => request.validateRequestObject([])).toThrow();
  });

  test('validates request bodies, queries, and params', () => {
    expect(request.validateBody({ name: 'Student' })).toEqual({
      name: 'Student',
    });

    expect(request.validateQuery({ page: '1' })).toEqual({ page: '1' });
    expect(request.validateParams({ id: '12' })).toEqual({ id: '12' });
  });

  test('checks required fields', () => {
    expect(
      request.validateRequiredFields(
        {
          name: 'Student',
          email: 'student@example.com',
        },
        ['name', 'email'],
      ),
    ).toEqual({
      name: 'Student',
      email: 'student@example.com',
    });

    expect(() =>
      request.validateRequiredFields({ name: 'Student' }, ['name', 'email']),
    ).toThrow();
  });

  test('checks allowed values', () => {
    expect(request.validateAllowedValues('active', ['active', 'inactive']))
      .toBe('active');

    expect(() =>
      request.validateAllowedValues('deleted', ['active', 'inactive']),
    ).toThrow();
  });

  test('validates strings and booleans', () => {
    expect(request.validateString(' Student ', { field: 'name' })).toBe(
      'Student',
    );

    expect(request.validateBoolean(true)).toBe(true);
    expect(() => request.validateString(123)).toThrow();
    expect(() => request.validateBoolean('true')).toThrow();
  });

  test('validates numeric values and route IDs', () => {
    expect(
      request.validateNumber('12', {
        allowNumericString: true,
        integer: true,
      }),
    ).toBe(12);

    expect(request.validateRouteId('42')).toBe(42);
    expect(() => request.validateRouteId('0')).toThrow();
    expect(() => request.validateRouteId('-1')).toThrow();
  });

  test('normalizes pagination and rejects invalid values', () => {
    expect(request.validatePagination()).toEqual({
      page: 1,
      limit: 20,
    });

    expect(
      request.validatePagination({
        page: '2',
        limit: '10',
      }),
    ).toEqual({
      page: 2,
      limit: 10,
    });

    expect(() => request.validatePagination({ page: '0' })).toThrow();
    expect(() => request.validatePagination({ limit: '-1' })).toThrow();
  });

  test('validates date-only values and timestamps', () => {
    expect(request.validateDateOnly('2026-10-16')).toBe('2026-10-16');
    expect(() => request.validateDateOnly('16/10/2026')).toThrow();
    expect(() => request.validateTimestamp('not-a-timestamp')).toThrow();
  });

  test('validates text arrays', () => {
    expect(request.validateTextArray(['medical', 'dental'])).toEqual([
      'medical',
      'dental',
    ]);

    expect(() => request.validateTextArray('medical')).toThrow();
  });
});

describe('auth.validator', () => {
  test('normalizes email addresses', () => {
    expect(auth.normalizeEmail(' Student@Example.COM ')).toBe(
      'student@example.com',
    );
  });

  test('rejects invalid email addresses', () => {
    for (const value of [
      null,
      '',
      'invalid-email',
      'user@',
      `${'x'.repeat(255)}@example.com`,
    ]) {
      expect(() => auth.normalizeEmail(value)).toThrow();
    }
  });

  test('validates password length without trimming the password', () => {
    expect(auth.validatePassword('  secure-pass  ')).toBe('  secure-pass  ');
    expect(() => auth.validatePassword('short')).toThrow();
    expect(() => auth.validatePassword('x'.repeat(129))).toThrow();
    expect(() => auth.validatePassword(12345678)).toThrow();
  });

  test('validates and normalizes registration data', () => {
    expect(
      auth.validateRegister({
        name: '  Student One ',
        email: ' STUDENT@EXAMPLE.COM ',
        password: 'secure-password',
      }),
    ).toEqual({
      name: 'Student One',
      email: 'student@example.com',
      password: 'secure-password',
    });
  });

  test('rejects unsupported registration fields', () => {
    expect(() =>
      auth.validateRegister({
        name: 'Student One',
        email: 'student@example.com',
        password: 'secure-password',
        role: 'admin',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'UNKNOWN_FIELDS',
      }),
    );
  });

  test('validates login data and rejects missing credentials', () => {
    expect(
      auth.validateLogin({
        email: 'STUDENT@example.com',
        password: 'secure-password',
      }),
    ).toEqual({
      email: 'student@example.com',
      password: 'secure-password',
    });

    expect(() =>
      auth.validateLogin({
        email: 'student@example.com',
      }),
    ).toThrow();

    expect(() =>
      auth.validateLogin({
        email: 'student@example.com',
        password: 'secure-password',
        role: 'admin',
      }),
    ).toThrow();
  });
});

describe('email.validator', () => {
  test('normalizes email addresses', () => {
    expect(email.normalizeEmail(' Student@Example.COM ')).toBe(
      'student@example.com',
    );
  });

  test('validates basic email syntax', () => {
    expect(email.validateEmail('Student@example.com')).toBe(
      'student@example.com',
    );

    expect(email.isValidEmail('student@example.com')).toBe(true);
    expect(email.isValidEmail('invalid-email')).toBe(false);
  });

  test('supports optional email values', () => {
    expect(
      email.validateEmail(undefined, {
        required: false,
      }),
    ).toBeUndefined();

    expect(() => email.validateEmail(undefined)).toThrow();
  });

  test('rejects malformed addresses and display-name format', () => {
    for (const value of [
      'bad',
      'user@',
      '@example.com',
      'user name@example.com',
    ]) {
      expect(() => email.validateEmail(value)).toThrow();
    }

    expect(() =>
      email.validateEmail('Student <student@example.com>', {
        allowDisplayName: true,
      }),
    ).toThrow();
  });

  test('enforces maximum email length', () => {
    expect(email.MAX_EMAIL_LENGTH).toBe(254);
    expect(email.MAX_LOCAL_PART_LENGTH).toBe(64);
    expect(email.MAX_DOMAIN_LENGTH).toBe(253);

    expect(() =>
      email.validateEmail(`${'a'.repeat(250)}@example.com`),
    ).toThrow();
  });
});

describe('password.validator', () => {
  test('exports password length constraints', () => {
    expect(password.MIN_PASSWORD_LENGTH).toBe(12);
    expect(password.MAX_PASSWORD_LENGTH).toBe(128);
  });

  test('validates a password without silently changing it', () => {
    expect(password.validatePassword('  secure-password  ')).toBe(
      '  secure-password  ',
    );
  });

  test('rejects weak and malformed passwords', () => {
    expect(() => password.validatePassword('short')).toThrow();
    expect(() => password.validatePassword('x'.repeat(129))).toThrow();
    expect(() => password.validatePassword('secure\u0000password')).toThrow();
  });

  test('validates reset request email', () => {
    expect(
      password.validateResetRequest({
        email: 'STUDENT@example.com',
      }),
    ).toEqual({
      email: 'student@example.com',
    });

    expect(() =>
      password.validateResetRequest({
        email: 'invalid',
      }),
    ).toThrow();
  });

  test('rejects unsupported reset request fields', () => {
    expect(() =>
      password.validateResetRequest({
        email: 'student@example.com',
        role: 'admin',
      }),
    ).toThrow();
  });
});

describe('domain validator exports and allowlists', () => {
  const domainValidators = [
    ['application', application, application.ALLOWED_FIELDS],
    ['candidate', candidate, candidate.ALLOWED_FIELDS],
    ['college', college, college.ALLOWED_FIELDS],
    ['course', course, course.ALLOWED_FIELDS],
    ['admission', admission, admission.ALLOWED_FIELDS],
    ['contact', contact, contact.ALLOWED_FIELDS],
    ['document', documentValidator, documentValidator.ALLOWED_FIELDS],
    ['employer', employer, employer.ALLOWED_FIELDS],
    ['job', job, job.ALLOWED_FIELDS],
    ['verification', verification, verification.ALLOWED_FIELDS],
  ];

  test.each(domainValidators)(
    '%s exports its validation functions and field allowlist',
    (_name, validator, fields) => {
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
      expect(typeof validator.pickAllowed).toBe('function');
      expect(typeof validator.validate).toBe('function');
      expect(typeof validator.validateCreate).toBe('function');
      expect(typeof validator.validateUpdate).toBe('function');
    },
  );

  test.each(domainValidators)(
    '%s rejects unknown fields',
    (_name, validator) => {
      expect(() =>
        validator.pickAllowed({
          unsupportedInternalField: true,
        }),
      ).toThrow(
        expect.objectContaining({
          code: 'UNKNOWN_FIELDS',
        }),
      );
    },
  );

  test.each(domainValidators)(
    '%s rejects non-object input',
    (_name, validator) => {
      expect(() => validator.validate(null)).toThrow();
      expect(() => validator.validate([])).toThrow();
    },
  );
});

describe('application.validator', () => {
  test('accepts a valid application create payload', () => {
    const result = application.validateCreate({
      user_id: 1,
      course_id: 2,
      college_id: 3,
      intake_year: 2026,
      status: 'pending',
    });

    expect(result).toMatchObject({
      user_id: 1,
      course_id: 2,
      college_id: 3,
      intake_year: 2026,
      status: 'pending',
    });
  });

  test('normalizes application status and notes', () => {
    expect(
      application.validate({
        course_id: 2,
        college_id: 3,
        intake_year: 2026,
        status: ' PENDING ',
        notes: '  Please review  ',
      }),
    ).toMatchObject({
      status: 'pending',
      notes: 'Please review',
    });
  });

  test('rejects invalid IDs and intake years', () => {
    expect(() =>
      application.validateCreate({
        course_id: 0,
        college_id: 3,
        intake_year: 2026,
      }),
    ).toThrow();

    expect(() =>
      application.validateCreate({
        course_id: 2,
        college_id: 3,
        intake_year: 1900,
      }),
    ).toThrow();
  });
});

describe('course.validator', () => {
  test('validates and normalizes course fields', () => {
    const result = course.validateCreate({
      name: '  Bachelor of Medicine  ',
      slug: 'bachelor-of-medicine',
      category: 'medical',
      level: 'undergraduate',
      status: 'draft',
    });

    expect(result).toMatchObject({
      name: 'Bachelor of Medicine',
      slug: 'bachelor-of-medicine',
      category: 'medical',
      level: 'undergraduate',
      status: 'draft',
    });
  });

  test('rejects invalid slugs, categories, and levels', () => {
    expect(() =>
      course.validateCreate({
        name: 'Course',
        slug: 'Invalid Slug',
        category: 'medical',
        level: 'undergraduate',
      }),
    ).toThrow();

    expect(() =>
      course.validateCreate({
        name: 'Course',
        slug: 'valid-slug',
        category: 'unsupported',
        level: 'undergraduate',
      }),
    ).toThrow();
  });
});

describe('contact.validator', () => {
  test('normalizes a valid contact submission', () => {
    const result = contact.validateCreate({
      name: '  Student Name ',
      email: ' STUDENT@EXAMPLE.COM ',
      subject: '  Admission guidance ',
      message: '  I need help with admission. ',
      category: 'admissions',
      source: 'website',
    });

    expect(result).toMatchObject({
      name: 'Student Name',
      email: 'student@example.com',
      subject: 'Admission guidance',
      message: 'I need help with admission.',
      category: 'admissions',
      source: 'website',
    });
  });

  test('rejects invalid contact email and category', () => {
    expect(() =>
      contact.validateCreate({
        name: 'Student Name',
        email: 'invalid-email',
        message: 'Please contact me.',
      }),
    ).toThrow();

    expect(() =>
      contact.validateCreate({
        name: 'Student Name',
        email: 'student@example.com',
        message: 'Please contact me.',
        category: 'unknown-category',
      }),
    ).toThrow();
  });
});

describe('university.validator', () => {
  test('validates country codes and slugs', () => {
    expect(university.validateCountryCode('IN')).toBe('IN');
    expect(university.validateSlug('medical-university')).toBe(
      'medical-university',
    );

    expect(() => university.validateCountryCode('IND')).toThrow();
    expect(() => university.validateSlug('Invalid Slug')).toThrow();
  });

  test('validates URLs and email addresses', () => {
    expect(university.validateUrl('https://example.edu')).toBe(
      'https://example.edu',
    );

    expect(university.validateEmail('INFO@EXAMPLE.EDU')).toBe(
      'info@example.edu',
    );

    expect(() => university.validateUrl('javascript:alert(1)')).toThrow();
    expect(() => university.validateEmail('invalid')).toThrow();
  });

  test('exports supported university types and statuses', () => {
    expect(Array.isArray(university.UNIVERSITY_TYPES)).toBe(true);
    expect(university.UNIVERSITY_TYPES.length).toBeGreaterThan(0);
    expect(Array.isArray(university.UNIVERSITY_STATUSES)).toBe(true);
    expect(university.UNIVERSITY_STATUSES.length).toBeGreaterThan(0);
  });
});

describe('user.validator', () => {
  test('validates names and normalized email addresses', () => {
    expect(user.validateName('Student Name')).toBe('Student Name');
    expect(user.validateEmail(' STUDENT@EXAMPLE.COM ')).toBe(
      'student@example.com',
    );

    expect(() => user.validateName(' ')).toThrow();
    expect(() => user.validateEmail('invalid')).toThrow();
  });

  test('exports role, status, and language allowlists', () => {
    expect(Array.isArray(user.USER_ROLES)).toBe(true);
    expect(user.USER_ROLES.length).toBeGreaterThan(0);
    expect(Array.isArray(user.USER_STATUSES)).toBe(true);
    expect(user.USER_STATUSES.length).toBeGreaterThan(0);
    expect(Array.isArray(user.SUPPORTED_LANGUAGES)).toBe(true);
    expect(user.SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
  });

  test('rejects unsupported user fields', () => {
    expect(() =>
      user.validateCreate({
        name: 'Student Name',
        email: 'student@example.com',
        password: 'valid-password-123',
        isAdmin: true,
      }),
    ).toThrow();
  });
});

describe('verification.validator', () => {
  test('normalizes verification email addresses', () => {
    expect(verification.validateEmail(' STUDENT@EXAMPLE.COM ')).toBe(
      'student@example.com',
    );
  });

  test('validates phone numbers, codes, and purposes', () => {
    expect(verification.validatePhone('+91 9876543210')).toBe(
      '+91 9876543210',
    );

    expect(verification.validatePurpose('registration')).toBe('registration');

    expect(() => verification.validatePhone('not-a-phone')).toThrow();
    expect(() => verification.validatePurpose('admin')).toThrow();
    expect(() => verification.validateCode('')).toThrow();
  });

  test('exports the supported verification purposes', () => {
    expect(verification.ALLOWED_PURPOSES).toContain('registration');
    expect(verification.ALLOWED_PURPOSES).toContain('password_reset');
  });
});

describe('payment.validator', () => {
  test('validates payment amount and currency', () => {
    expect(payment.validateAmount(100)).toBe(100);
    expect(payment.validateCurrency('INR')).toBe('INR');

    expect(() => payment.validateAmount(0)).toThrow();
    expect(() => payment.validateAmount(-1)).toThrow();
    expect(() => payment.validateCurrency('XYZ')).toThrow();
  });

  test('validates return URLs', () => {
    expect(
      payment.validateReturnUrl('https://medorbits.in/payment/return'),
    ).toBe('https://medorbits.in/payment/return');

    expect(() => payment.validateReturnUrl('javascript:alert(1)')).toThrow();
  });

  test('exports supported payment statuses and methods', () => {
    expect(Array.isArray(payment.PAYMENT_METHODS)).toBe(true);
    expect(Array.isArray(payment.PAYMENT_STATUSES)).toBe(true);
    expect(Array.isArray(payment.SUPPORTED_CURRENCIES)).toBe(true);
    expect(payment.SUPPORTED_CURRENCIES).toContain('INR');
  });
});

describe('subscription.validator', () => {
  test('exports billing cycles and subscription statuses', () => {
    expect(Array.isArray(subscription.BILLING_CYCLES)).toBe(true);
    expect(subscription.BILLING_CYCLES.length).toBeGreaterThan(0);
    expect(Array.isArray(subscription.SUBSCRIPTION_STATUSES)).toBe(true);
    expect(subscription.SUBSCRIPTION_STATUSES.length).toBeGreaterThan(0);
  });

  test('validates currency and dates', () => {
    expect(subscription.validateCurrency('INR')).toBe('INR');
    expect(subscription.validateDate('2026-10-16')).toBeInstanceOf(Date);

    expect(() => subscription.validateCurrency('XYZ')).toThrow();
    expect(() => subscription.validateDate('not-a-date')).toThrow();
  });

  test('validates metadata objects', () => {
    expect(
      subscription.validateMetadata({
        source: 'website',
        campaign: 'admissions',
      }),
    ).toEqual({
      source: 'website',
      campaign: 'admissions',
    });

    expect(() => subscription.validateMetadata('not-an-object')).toThrow();
  });
});

describe('document.validator', () => {
  test('exports upload size and MIME type restrictions', () => {
    expect(Number.isInteger(documentValidator.MAX_FILE_SIZE)).toBe(true);
    expect(documentValidator.MAX_FILE_SIZE).toBeGreaterThan(0);
    expect(Array.isArray(documentValidator.ALLOWED_MIME_TYPES)).toBe(true);
    expect(documentValidator.ALLOWED_MIME_TYPES).toContain('application/pdf');
  });

  test('rejects unsupported document MIME types', () => {
    expect(() =>
      documentValidator.validateCreate({
        user_id: 1,
        document_type: 'identity',
        mime_type: 'application/x-executable',
        file_size: 1024,
      }),
    ).toThrow();
  });
});

describe('job.validator', () => {
  test('exports job enum allowlists', () => {
    expect(Array.isArray(job.ALLOWED_EMPLOYMENT_TYPES)).toBe(true);
    expect(Array.isArray(job.ALLOWED_WORK_MODES)).toBe(true);
    expect(Array.isArray(job.ALLOWED_EDUCATION_LEVELS)).toBe(true);
    expect(Array.isArray(job.ALLOWED_STATUSES)).toBe(true);
  });

  test('rejects unsupported job fields', () => {
    expect(() =>
      job.validateCreate({
        title: 'Software Engineer',
        company: 'Example',
        unsupportedField: true,
      }),
    ).toThrow();
  });
});

describe('admission, college, candidate, and employer validators', () => {
  test('expose non-empty supported enum lists', () => {
    expect(admission.ALLOWED_STATUSES.length).toBeGreaterThan(0);
    expect(college.ALLOWED_TYPES.length).toBeGreaterThan(0);
    expect(candidate.ALLOWED_AVAILABILITY.length).toBeGreaterThan(0);
    expect(employer.ALLOWED_ORGANIZATION_TYPES.length).toBeGreaterThan(0);
  });

  test('rejects unknown fields in each domain', () => {
    expect(() => admission.pickAllowed({ unexpected: true })).toThrow();
    expect(() => college.pickAllowed({ unexpected: true })).toThrow();
    expect(() => candidate.pickAllowed({ unexpected: true })).toThrow();
    expect(() => employer.pickAllowed({ unexpected: true })).toThrow();
  });
});