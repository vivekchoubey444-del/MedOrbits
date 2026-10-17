'use strict';

/**

* MedOrbits -- S3 Storage Provider
* File: src/integrations/storage/s3.provider.js
* Implements private object storage using AWS S3 or a compatible service.
* API:
* put({ key, body, contentType })
* get(key)
* delete(key)
    */

const { loadStorageConfig } = require('./storage.config');

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
const MAX_KEY_LENGTH = 1024;

class S3StorageProvider {
constructor({
client,
commands,
bucket,
prefix = '',
maxFileBytes,
serverSideEncryption = 'AES256',
} = {}) {
if (!client || typeof client.send !== 'function') {
throw new TypeError('A valid S3 client is required.');
}

if (!commands || typeof commands.PutObjectCommand !== 'function' ||
    typeof commands.GetObjectCommand !== 'function' ||
    typeof commands.DeleteObjectCommand !== 'function') {
  throw new TypeError('Valid S3 command constructors are required.');
}
if (typeof bucket !== 'string' || !bucket.trim()) {
  throw new TypeError('An S3 bucket is required.');
}
if (
  !Number.isSafeInteger(maxFileBytes) ||
  maxFileBytes <= 0
) {
  throw new TypeError('maxFileBytes must be a positive safe integer.');
}
if (typeof prefix !== 'string') {
  throw new TypeError('S3 prefix must be a string.');
}
this.client = client;
this.commands = commands;
this.bucket = bucket.trim();
this.prefix = this.normalizePrefix(prefix);
this.maxFileBytes = maxFileBytes;
this.serverSideEncryption = serverSideEncryption;

}

static fromEnv(environment = process.env) {
const config = loadStorageConfig(environment);

if (config.driver !== 's3') {
  throw new Error('S3 storage is not the configured storage driver.');
}
if (!config.s3.bucket) {
  throw new Error('S3_BUCKET is required.');
}
if (!config.s3.region) {
  throw new Error('S3_REGION is required.');
}
let sdk;
try {
  sdk = require('@aws-sdk/client-s3');
} catch {
  throw new Error(
    'S3 storage requires @aws-sdk/client-s3. Install the dependency.'
  );
}
const clientOptions = {
  region: config.s3.region,
  forcePathStyle: config.s3.forcePathStyle === true,
};
if (config.s3.endpoint) {
  clientOptions.endpoint = config.s3.endpoint;
}
const client = new sdk.S3Client(clientOptions);
return new S3StorageProvider({
  client,
  commands: sdk,
  bucket: config.s3.bucket,
  prefix: config.s3.prefix || '',
  maxFileBytes: config.maxFileBytes,
  serverSideEncryption: config.s3.serverSideEncryption || 'AES256',
});

}

normalizePrefix(prefix) {
const trimmed = prefix.replace(/^\/+|\/+$/g, '');

if (!trimmed) {
  return '';
}
this.validateKey(trimmed);
return `${trimmed}/`;

}

validateKey(key) {
if (
typeof key !== 'string' ||
key.length === 0 ||
key.length > MAX_KEY_LENGTH ||
key.startsWith('/') ||
key.includes('\\') ||
key.includes('\0')
) {
throw new TypeError('Invalid object key.');
}

const segments = key.split('/');
if (
  segments.some(
    (segment) =>
      !segment ||
      segment === '.' ||
      segment === '..' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(segment)
  )
) {
  throw new TypeError('Invalid object key segment.');
}
return key;

}

key(key) {
return `${this.prefix}${this.validateKey(key)}`;
}

normalizeBody(body) {
if (Buffer.isBuffer(body)) {
return body;
}

if (body instanceof Uint8Array) {
  return Buffer.from(body);
}
throw new TypeError('body must be a Buffer or Uint8Array.');

}

validateContentType(contentType) {
if (
typeof contentType !== 'string' ||
contentType.length === 0 ||
contentType.length > 255 ||
/[\r\n\0]/.test(contentType) ||
!/^[a-zA-Z0-9!#$&^.+-]+\/[a-zA-Z0-9!#$&^.+-]+(?:\s*;\s*[a-zA-Z0-9!#$&^.+-]+=[a-zA-Z0-9!#$&^.+-]+)*$/.test(contentType)
) {
throw new TypeError('Invalid content type.');
}

return contentType;

}

async put({
key,
body,
contentType = DEFAULT_CONTENT_TYPE,
} = {}) {
const data = this.normalizeBody(body);
const normalizedContentType = this.validateContentType(contentType);
const objectKey = this.key(key);

if (data.length > this.maxFileBytes) {
  throw new RangeError('File exceeds the configured size limit.');
}
const params = {
  Bucket: this.bucket,
  Key: objectKey,
  Body: data,
  ContentLength: data.length,
  ContentType: normalizedContentType,
};
if (this.serverSideEncryption) {
  params.ServerSideEncryption = this.serverSideEncryption;
}
await this.client.send(
  new this.commands.PutObjectCommand(params)
);
return {
  key,
  size: data.length,
  contentType: normalizedContentType,
};

}

async get(key) {
const objectKey = this.key(key);

const response = await this.client.send(
  new this.commands.GetObjectCommand({
    Bucket: this.bucket,
    Key: objectKey,
  })
);
if (!response.Body) {
  throw new Error('S3 returned an empty object stream.');
}
if (
  Number.isFinite(response.ContentLength) &&
  (
    response.ContentLength < 0 ||
    response.ContentLength > this.maxFileBytes
  )
) {
  response.Body.destroy?.();
  throw new RangeError('Stored object exceeds the configured size limit.');
}
const chunks = [];
let totalBytes = 0;
try {
  for await (const chunk of response.Body) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > this.maxFileBytes) {
      response.Body.destroy?.();
      throw new RangeError(
        'Downloaded object exceeds the configured size limit.'
      );
    }
    chunks.push(buffer);
  }
} catch (error) {
  response.Body.destroy?.();
  throw error;
}
return {
  key,
  body: Buffer.concat(chunks, totalBytes),
  size: totalBytes,
  contentType: response.ContentType || DEFAULT_CONTENT_TYPE,
};

}

async delete(key) {
const objectKey = this.key(key);

await this.client.send(
  new this.commands.DeleteObjectCommand({
    Bucket: this.bucket,
    Key: objectKey,
  })
);
return {
  key,
  deleted: true,
};

}

async close() {
if (typeof this.client.destroy === 'function') {
this.client.destroy();
}
}
}

module.exports = {
S3StorageProvider,
};