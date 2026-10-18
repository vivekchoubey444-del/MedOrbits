'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const { loadStorageConfig } = require('./storage.config');

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
const CONTENT_TYPE_MAX_LENGTH = 255;

class LocalStorageProvider {
constructor(config = loadStorageConfig()) {
if (!config || typeof config !== 'object') {
throw new TypeError('Storage configuration is required.');
}

if (typeof config.root !== 'string' || !config.root.trim()) {
  throw new TypeError('Storage root must be a non-empty path.');
}
if (
  !Number.isSafeInteger(config.maxFileBytes) ||
  config.maxFileBytes <= 0
) {
  throw new TypeError(
    'maxFileBytes must be a positive safe integer.'
  );
}
this.root = path.resolve(config.root);
this.maxFileBytes = config.maxFileBytes;

}

resolveKey(key) {
if (
typeof key !== 'string' ||
key.length === 0 ||
key.length > 1024 ||
key.includes('\0') ||
key.includes('\\') ||
key.startsWith('/') ||
path.posix.isAbsolute(key)
) {
throw new TypeError('Invalid storage key.');
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
  throw new TypeError('Invalid storage key segment.');
}
const target = path.resolve(this.root, ...segments);
const relative = path.relative(this.root, target);
if (
  !relative ||
  relative === '..' ||
  relative.startsWith(`..${path.sep}`) ||
  path.isAbsolute(relative)
) {
  throw new Error('Storage key escapes the storage root.');
}
return target;

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
contentType.length > CONTENT_TYPE_MAX_LENGTH ||
/[\r\n\0]/.test(contentType) ||
!/^[a-zA-Z0-9!#$&^.+-]+\/[a-zA-Z0-9!#$&^.+-]+(?:\s*;\s*[a-zA-Z0-9!#$&^.+-]+=[a-zA-Z0-9!#$&^.+-]+)*$/.test(contentType)
) {
throw new TypeError('Invalid content type.');
}

return contentType;

}

async assertSafeDirectory(directory) {
const relative = path.relative(this.root, directory);

if (
  relative === '..' ||
  relative.startsWith(`..${path.sep}`) ||
  path.isAbsolute(relative)
) {
  throw new Error('Directory escapes the storage root.');
}
// Inspect the root and each existing path component without following
// symlinks. This reduces risk but cannot eliminate filesystem races.
const rootParent = path.dirname(this.root);
const rootName = path.basename(this.root);
const rootParentReal = await fs.realpath(rootParent);
const resolvedRoot = path.join(rootParentReal, rootName);
let current = resolvedRoot;
const segments = relative ? relative.split(path.sep) : [];
const rootStat = await fs.lstat(current).catch((error) => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
if (rootStat?.isSymbolicLink()) {
  throw new Error('Storage root must not be a symbolic link.');
}
if (rootStat && !rootStat.isDirectory()) {
  throw new Error('Storage root is not a directory.');
}
for (const segment of segments) {
  current = path.join(current, segment);
  const stat = await fs.lstat(current).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) {
    continue;
  }
  if (stat.isSymbolicLink()) {
    throw new Error('Symbolic links are not allowed in storage paths.');
  }
  if (!stat.isDirectory()) {
    throw new Error('A storage path component is not a directory.');
  }
}

}

async put({
key,
body,
contentType = DEFAULT_CONTENT_TYPE,
} = {}) {
const target = this.resolveKey(key);
const data = this.normalizeBody(body);
const normalizedContentType = this.validateContentType(contentType);

if (data.length > this.maxFileBytes) {
  throw new RangeError('File exceeds the configured size limit.');
}
const directory = path.dirname(target);
await fs.mkdir(this.root, {
  recursive: true,
  mode: 0o700,
});
await this.assertSafeDirectory(directory);
await fs.mkdir(directory, {
  recursive: true,
  mode: 0o700,
});
await this.assertSafeDirectory(directory);
// wx prevents reuse of an existing temporary filename.
const temporaryPath = path.join(
  directory,
  `.upload-${crypto.randomUUID()}.tmp`
);
let handle;
try {
  handle = await fs.open(temporaryPath, 'wx', 0o600);
  await handle.writeFile(data);
  await handle.sync();
  await handle.close();
  handle = undefined;
  // Do not overwrite an existing object. This operation requires
  // generated, unique keys and a provider-compatible collision policy.
  await fs.link(temporaryPath, target);
  await fs.unlink(temporaryPath);
} catch (error) {
  if (handle) {
    await handle.close().catch(() => {});
  }
  await fs.unlink(temporaryPath).catch(() => {});
  throw error;
}
return {
  key,
  size: data.length,
  contentType: normalizedContentType,
  sha256: crypto.createHash('sha256').update(data).digest('hex'),
};

}

async get(key) {
const target = this.resolveKey(key);

await this.assertSafeDirectory(path.dirname(target));
const handle = await fs.open(target, 'r');
try {
  const stat = await handle.stat();
  if (!stat.isFile()) {
    throw new Error('Storage object is not a regular file.');
  }
  if (stat.size > this.maxFileBytes) {
    throw new RangeError('Stored object exceeds the configured size limit.');
  }
  const body = await handle.readFile();
  return {
    key,
    body,
    size: body.length,
  };
} finally {
  await handle.close();
}

}

async delete(key) {
const target = this.resolveKey(key);

await this.assertSafeDirectory(path.dirname(target));
try {
  const stat = await fs.lstat(target);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error('Storage object is not a regular file.');
  }
  await fs.unlink(target);
  return {
    key,
    deleted: true,
  };
} catch (error) {
  if (error.code === 'ENOENT') {
    return {
      key,
      deleted: false,
    };
  }
  throw error;
}

}
}

module.exports = {
LocalStorageProvider,
};