‘use strict’;

/**

* MedOrbits -- Storage Configuration
* File: src/config/storage.js
* Responsibilities:
* ●	Resolve private and temporary storage paths.
* ●	Validate storage directory boundaries.
* ●	Create local storage directories securely.
* ●	Expose validated upload limits and MIME types.
* Notes:
* ●	This module does not implement file uploads.
* ●	Uploaded file contents must still be validated by the upload service.
* ●	Local storage should remain outside the public web root.
        */

const fs = require(‘node:fs’);
const path = require(‘node:path’);
const { env } = require(’./env’);

const projectRoot = path.resolve(__dirname, ‘..’, ‘..’);
const publicRoot = path.join(projectRoot, ‘public’);

const STORAGE_DIRECTORY_MODE = 0o700;
const DEFAULT_MIME_TYPES = [
‘application/pdf’,
‘image/jpeg’,
‘image/png’,
‘image/webp’,
];

function resolveStoragePath(configuredPath, variableName) {
if (
typeof configuredPath !== ‘string’ ||
configuredPath.trim() === ‘’
) {
throw new Error(${variableName} must be a non-empty path.);
}

const trimmedPath = configuredPath.trim();

if (trimmedPath.includes(’\0’)) {
throw new Error(${variableName} contains an invalid character.);
}

return path.resolve(projectRoot, trimmedPath);
}

const privateStoragePath = resolveStoragePath(
env.STORAGE_LOCAL_PATH,
‘STORAGE_LOCAL_PATH’
);

const temporaryStoragePath = resolveStoragePath(
env.STORAGE_TEMP_PATH,
‘STORAGE_TEMP_PATH’
);

function isInsideDirectory(targetPath, directoryPath) {
const relativePath = path.relative(
path.resolve(directoryPath),
path.resolve(targetPath)
);

return (
relativePath === ‘’ ||
(
relativePath !== ‘..’ &&
!relativePath.startsWith(..${path.sep}) &&
!path.isAbsolute(relativePath)
)
);
}

function assertStoragePathsAreSafe() {
if (privateStoragePath === temporaryStoragePath) {
throw new Error(
‘Private and temporary storage must use separate directories.’
);
}

if (
isInsideDirectory(privateStoragePath, publicRoot) ||
isInsideDirectory(temporaryStoragePath, publicRoot)
) {
throw new Error(
‘Private and temporary storage must not be located inside public/.’
);
}

if (
isInsideDirectory(temporaryStoragePath, privateStoragePath) ||
isInsideDirectory(privateStoragePath, temporaryStoragePath)
) {
throw new Error(
‘Private and temporary storage directories must not overlap.’
);
}
}

function assertNoSymlinkInExistingPath(targetPath) {
const absolutePath = path.resolve(targetPath);
const parsedPath = path.parse(absolutePath);
const segments = absolutePath
.slice(parsedPath.root.length)
.split(path.sep)
.filter(Boolean);

let currentPath = parsedPath.root;

for (const segment of segments) {
currentPath = path.join(currentPath, segment);

let stat;
try {
  stat = fs.lstatSync(currentPath);
} catch (error) {
  if (error.code === 'ENOENT') {
    // Remaining path components may not exist yet.
    break;
  }
  throw error;
}
if (stat.isSymbolicLink()) {
  throw new Error(
    'Storage paths must not contain symbolic links.'
  );
}
if (!stat.isDirectory()) {
  throw new Error(
    'A storage path component is not a directory.'
  );
}

}
}

function ensureDirectory(directoryPath) {
assertNoSymlinkInExistingPath(directoryPath);

fs.mkdirSync(directoryPath, {
recursive: true,
mode: STORAGE_DIRECTORY_MODE,
});

const stat = fs.lstatSync(directoryPath);

if (stat.isSymbolicLink() || !stat.isDirectory()) {
throw new Error(‘Storage path is not a real directory.’);
}

// On POSIX systems, tighten permissions even when the directory exists.
if (process.platform !== ‘win32’) {
fs.chmodSync(directoryPath, STORAGE_DIRECTORY_MODE);
}
}

function ensureLocalStorage() {
if (env.STORAGE_DRIVER !== ‘local’) {
return;
}

assertStoragePathsAreSafe();

ensureDirectory(privateStoragePath);
ensureDirectory(temporaryStoragePath);
}

function getAllowedMimeTypes() {
const configuredTypes = env.UPLOAD_ALLOWED_MIME_TYPES;

if (
typeof configuredTypes !== ‘string’ ||
configuredTypes.trim() === ‘’
) {
return […DEFAULT_MIME_TYPES];
}

const types = configuredTypes
.split(’,’)
.map((type) => type.trim().toLowerCase())
.filter(Boolean);

for (const type of types) {
// Accept conventional MIME type/subtype values, not wildcards.
if (
type.includes(’*’) ||
!/^[a-z0-9!#$&^.+-]+/[a-z0-9!#$&^.+-]+$/.test(type)
) {
throw new Error(
Invalid upload MIME type configured: ${type}
);
}
}

const uniqueTypes = […new Set(types)];

if (uniqueTypes.length === 0) {
throw new Error(‘At least one upload MIME type must be configured.’);
}

return uniqueTypes;
}

function validatePositiveInteger(value, variableName) {
if (!Number.isSafeInteger(value) || value <= 0) {
throw new Error(
${variableName} must be a positive safe integer.
);
}

return value;
}

function getUploadLimits() {
const maxFileSizeMB = validatePositiveInteger(
env.UPLOAD_MAX_FILE_SIZE_MB,
‘UPLOAD_MAX_FILE_SIZE_MB’
);

const maxFiles = validatePositiveInteger(
env.UPLOAD_MAX_FILES,
‘UPLOAD_MAX_FILES’
);

const maxTotalSizeMB = validatePositiveInteger(
env.UPLOAD_MAX_TOTAL_SIZE_MB,
‘UPLOAD_MAX_TOTAL_SIZE_MB’
);

const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
const maxTotalSizeBytes = maxTotalSizeMB * 1024 * 1024;

if (
!Number.isSafeInteger(maxFileSizeBytes) ||
!Number.isSafeInteger(maxTotalSizeBytes)
) {
throw new Error(‘Configured upload size exceeds the safe integer range.’);
}

if (maxFileSizeBytes > maxTotalSizeBytes) {
throw new Error(
‘UPLOAD_MAX_FILE_SIZE_MB cannot exceed UPLOAD_MAX_TOTAL_SIZE_MB.’
);
}

return Object.freeze({
maxFileSizeBytes,
maxFiles,
maxTotalSizeBytes,
allowedMimeTypes: Object.freeze(getAllowedMimeTypes()),
});
}

module.exports = {
projectRoot,
privateStoragePath,
temporaryStoragePath,
ensureLocalStorage,
getAllowedMimeTypes,
getUploadLimits,
};