'use strict';

const nodeCrypto = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(nodeCrypto.scrypt);

const DEFAULT_TOKEN_BYTES = 32;
const DEFAULT_SCRYPT_KEY_LENGTH = 64;
const DEFAULT_SCRYPT_COST = 16384;
const DEFAULT_SCRYPT_BLOCK_SIZE = 8;
const DEFAULT_SCRYPT_PARALLELIZATION = 1;
const DEFAULT_SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function randomToken(bytes = DEFAULT_TOKEN_BYTES) {
  if (
    !Number.isSafeInteger(bytes) ||
    bytes < 16 ||
    bytes > 1024
  ) {
    throw new RangeError(
      'Token byte length must be between 16 and 1024.'
    );
  }

  return nodeCrypto
    .randomBytes(bytes)
    .toString('base64url');
}

function sha256(value) {
  return nodeCrypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

function hmacSha256(value, secret) {
  if (
    typeof secret !== 'string' ||
    secret.length === 0
  ) {
    throw new TypeError(
      'A non-empty HMAC secret is required.'
    );
  }

  return nodeCrypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('hex');
}

function safeEqual(left, right) {
  if (
    typeof left !== 'string' ||
    typeof right !== 'string'
  ) {
    return false;
  }

  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return nodeCrypto.timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

async function hashPassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < 1
  ) {
    throw new TypeError(
      'A non-empty password is required.'
    );
  }

  /*
   * Avoid silent truncation or accidental excessive input.
   * Apply your password policy in the registration validator.
   */
  if (Buffer.byteLength(password, 'utf8') > 1024) {
    throw new RangeError(
      'Password exceeds the maximum supported byte length.'
    );
  }

  const salt = nodeCrypto.randomBytes(16);

  const derivedKey = await scryptAsync(
    password,
    salt,
    DEFAULT_SCRYPT_KEY_LENGTH,
    {
      N: DEFAULT_SCRYPT_COST,
      r: DEFAULT_SCRYPT_BLOCK_SIZE,
      p: DEFAULT_SCRYPT_PARALLELIZATION,
      maxmem: DEFAULT_SCRYPT_MAX_MEMORY,
    }
  );

  return [
    'scrypt',
    DEFAULT_SCRYPT_COST,
    DEFAULT_SCRYPT_BLOCK_SIZE,
    DEFAULT_SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    Buffer.from(derivedKey).toString('base64url'),
  ].join('$');
}

async function verifyPassword(password, storedHash) {
  if (
    typeof password !== 'string' ||
    typeof storedHash !== 'string'
  ) {
    return false;
  }

  const parts = storedHash.split('$');

  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt'
  ) {
    return false;
  }

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);

  /*
   * Only accept parameters within an explicitly permitted range.
   * Never blindly allocate memory based on an untrusted stored hash.
   */
  if (
    cost !== DEFAULT_SCRYPT_COST ||
    blockSize !== DEFAULT_SCRYPT_BLOCK_SIZE ||
    parallelization !== DEFAULT_SCRYPT_PARALLELIZATION
  ) {
    return false;
  }

  let salt;
  let expectedKey;

  try {
    salt = Buffer.from(parts[4], 'base64url');
    expectedKey = Buffer.from(parts[5], 'base64url');
  } catch {
    return false;
  }

  if (
    salt.length !== 16 ||
    expectedKey.length !== DEFAULT_SCRYPT_KEY_LENGTH
  ) {
    return false;
  }

  try {
    const actualKey = await scryptAsync(
      password,
      salt,
      DEFAULT_SCRYPT_KEY_LENGTH,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: DEFAULT_SCRYPT_MAX_MEMORY,
      }
    );

    return nodeCrypto.timingSafeEqual(
      Buffer.from(actualKey),
      expectedKey
    );
  } catch {
    return false;
  }
}

module.exports = {
  randomToken,
  sha256,
  hmacSha256,
  safeEqual,
  hashPassword,
  verifyPassword,
};