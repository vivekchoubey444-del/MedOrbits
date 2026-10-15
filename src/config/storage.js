  
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { env } = require('./env');

const projectRoot = path.resolve(__dirname, '..', '..');

function resolveStoragePath(configuredPath, variableName) {
  if (
    typeof configuredPath !== 'string' ||
    configuredPath.trim() === ''
  ) {
    throw new Error(`${variableName} must be a non-empty path.`);
  }

  return path.resolve(projectRoot, configuredPath);
}

const privateStoragePath = resolveStoragePath(
  env.STORAGE_LOCAL_PATH,
  'STORAGE_LOCAL_PATH'
);

const temporaryStoragePath = resolveStoragePath(
  env.STORAGE_TEMP_PATH,
  'STORAGE_TEMP_PATH'
);

function isInsideDirectory(targetPath, directoryPath) {
  const relativePath = path.relative(
    path.resolve(directoryPath),
    path.resolve(targetPath)
  );

  return (
    relativePath === '' ||
    (
      relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath)
    )
  );
}

function ensureLocalStorage() {
  if (env.STORAGE_DRIVER !== 'local') {
    return;
  }

  const publicRoot = path.join(projectRoot, 'public');

  if (
    isInsideDirectory(privateStoragePath, publicRoot) ||
    isInsideDirectory(temporaryStoragePath, publicRoot)
  ) {
    throw new Error(
      'Private and temporary storage must not be located inside public/.'
    );
  }

  if (
    isInsideDirectory(temporaryStoragePath, privateStoragePath)
  ) {
    throw new Error(
      'Temporary storage must be separate from private storage.'
    );
  }

  for (const directory of [
    privateStoragePath,
    temporaryStoragePath,
  ]) {
    fs.mkdirSync(directory, {
      recursive: true,
      mode: 0o700,
    });

    if (!fs.statSync(directory).isDirectory()) {
      throw new Error(`Storage path is not a directory: ${directory}`);
    }
  }
}

function getAllowedMimeTypes() {
  return [...new Set(
    env.UPLOAD_ALLOWED_MIME_TYPES
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter(Boolean)
  )];
}

function getUploadLimits() {
  return Object.freeze({
    maxFileSizeBytes:
      env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,

    maxFiles: env.UPLOAD_MAX_FILES,

    maxTotalSizeBytes:
      env.UPLOAD_MAX_TOTAL_SIZE_MB * 1024 * 1024,

    allowedMimeTypes: getAllowedMimeTypes(),
  });
}

module.exports = {
  projectRoot,
  privateStoragePath,
  temporaryStoragePath,
  ensureLocalStorage,
  getUploadLimits,
};
