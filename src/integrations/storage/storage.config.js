'use strict';

const path = require('node:path');

const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_S3_REGION = 'ap-south-1';
const DEFAULT_S3_PREFIX = 'private/';

function parsePositiveInteger(value, variableName, fallback) {
if (value === undefined || value === null || value === '') {
return fallback;
}

const parsed = typeof value === 'number' ? value : Number(value);

if (!Number.isSafeInteger(parsed) || parsed <= 0) {
throw new Error(
`${variableName} must be a positive safe integer.`
);
}

return parsed;
}

function parseBoolean(value, variableName, fallback = false) {
if (value === undefined || value === null || value === '') {
return fallback;
}

if (typeof value === 'boolean') {
return value;
}

if (typeof value !== 'string') {
throw new Error(`${variableName} must be true or false.`);
}

switch (value.trim().toLowerCase()) {
case 'true':
return true;
case 'false':
return false;
default:
throw new Error(`${variableName} must be true or false.`);
}
}

function normalizePrefix(value) {
if (typeof value !== 'string') {
throw new Error('S3_PREFIX must be a string.');
}

const prefix = value.trim().replace(/^\/+|\/+$/g, '');

if (!prefix) {
return '';
}

const segments = prefix.split('/');

if (
segments.some(
(segment) =>
!segment ||
segment === '.' ||
segment === '..' ||
!/^[a-zA-Z0-9]*$/.test(segment)
)
) {
throw new Error('S3_PREFIX contains an invalid path segment.');
}

return `${prefix}/`;
}

function validateEndpoint(value) {
if (!value) {
return '';
}

let parsed;

try {
parsed = new URL(value);
} catch {
throw new Error('S3_ENDPOINT must be a valid URL.');
}

if (
!['https:', 'http:'].includes(parsed.protocol) ||
parsed.username ||
parsed.password ||
parsed.search ||
parsed.hash
) {
throw new Error(
'S3_ENDPOINT must be an HTTP(S) URL without credentials, query, or fragment.'
);
}

if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
throw new Error('S3_ENDPOINT must use HTTPS in production.');
}

return parsed.origin.replace(/\/+$/, '') +
parsed.pathname.replace(/\/+$/, '');
}

function loadStorageConfig(env = process.env) {
if (!env || typeof env !== 'object') {
throw new TypeError('Storage environment configuration is required.');
}

const driver = String(env.STORAGE_DRIVER || 'local')
.trim()
.toLowerCase();

if (!['local', 's3'].includes(driver)) {
throw new Error('STORAGE_DRIVER must be local or s3.');
}

const rootValue =
env.STORAGE_LOCAL_ROOT || path.join('storage', 'private');

if (
typeof rootValue !== 'string' ||
!rootValue.trim() ||
rootValue.includes('\0')
) {
throw new Error('STORAGE_LOCAL_ROOT must be a valid path.');
}

const maxFileBytes = parsePositiveInteger(
env.STORAGE_MAX_FILE_BYTES,
'STORAGE_MAX_FILE_BYTES',
DEFAULT_MAX_FILE_BYTES
);

const region = String(env.S3_REGION || DEFAULT_S3_REGION).trim();
const bucket = String(env.S3_BUCKET || '').trim();

if (!region) {
throw new Error('S3_REGION must not be empty.');
}

if (driver === 's3' && !bucket) {
throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3.');
}

const endpoint = validateEndpoint(env.S3_ENDPOINT || '');

const forcePathStyle = parseBoolean(
env.S3_FORCE_PATH_STYLE,
'S3_FORCE_PATH_STYLE',
false
);

const prefix = normalizePrefix(
env.S3_PREFIX === undefined
? DEFAULT_S3_PREFIX
: env.S3_PREFIX
);

return Object.freeze({
driver,
root: path.resolve(rootValue.trim()),
maxFileBytes,
s3: Object.freeze({
region,
bucket,
endpoint,
forcePathStyle,
prefix,
serverSideEncryption: 'AES256',
}),
});
}

module.exports = {
loadStorageConfig,
};