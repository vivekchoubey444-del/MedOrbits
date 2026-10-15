'use strict';

function createUpload(options = {}) {
  let multer;
  try {
    multer = require('multer');
  } catch (error) {
    throw new Error('Upload middleware requires `multer`. Install it before enabling uploads.');
  }

  const maxFileSize = options.maxFileSize ?? 5 * 1024 * 1024;
  const maxFiles = options.maxFiles ?? 5;
  const maxFields = options.maxFields ?? 30;
  const allowedMimeTypes = new Set(options.allowedMimeTypes || [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ]);

  if (!Number.isInteger(maxFileSize) || maxFileSize < 1) {
    throw new TypeError('maxFileSize must be a positive integer.');
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fields: maxFields,
      parts: maxFiles + maxFields,
      fieldNameSize: 100,
      fieldSize: options.maxFieldSize ?? 64 * 1024,
    },
    fileFilter(req, file, callback) {
      if (!allowedMimeTypes.has(file.mimetype)) {
        const error = new Error('This file type is not allowed.');
        error.status = 415;
        error.code = 'UNSUPPORTED_FILE_TYPE';
        error.publicMessage = error.message;
        return callback(error);
      }
      return callback(null, true);
    },
  });

  function handleUploadError(error, req, res, next) {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      error.status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      error.code = `UPLOAD_${error.code}`;
      error.publicMessage = error.status === 413
        ? 'The uploaded file exceeds the allowed size.'
        : 'The upload request exceeds the allowed limits.';
    }
    return next(error);
  }

  return { upload, handleUploadError };
}

module.exports = createUpload;
module.exports.createUpload = createUpload;
