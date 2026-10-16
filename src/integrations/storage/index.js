‘use strict’;

const {
StorageClient,
} = require(’./storage.client’);

const {
LocalStorageProvider,
} = require(’./local.provider’);

const {
S3StorageProvider,
} = require(’./s3.provider’);

const {
loadStorageConfig,
} = require(’./storage.config’);

const SUPPORTED_DRIVERS = new Set([‘local’, ‘s3’]);

function assertStorageProvider(provider) {
if (!provider || typeof provider !== ‘object’) {
throw new TypeError(‘A valid storage provider is required.’);
}

for (const method of [‘put’, ‘get’, ‘delete’]) {
if (typeof provider[method] !== ‘function’) {
throw new TypeError(
Storage provider must implement ${method}().
);
}
}

return provider;
}

function createStorageClient(options = {}) {
if (
!options ||
typeof options !== ‘object’ ||
Array.isArray(options)
) {
throw new TypeError(‘Storage options must be an object.’);
}

// Dependency injection supports unit tests and custom providers.
if (options.provider !== undefined) {
return new StorageClient(
assertStorageProvider(options.provider)
);
}

const environment = options.env || process.env;
const config = options.config || loadStorageConfig(environment);

if (!config || typeof config !== ‘object’) {
throw new TypeError(‘Storage configuration is invalid.’);
}

if (!SUPPORTED_DRIVERS.has(config.driver)) {
throw new Error(
Unsupported storage driver: ${String(config.driver)}
);
}

let provider;

switch (config.driver) {
case ‘local’:
provider = new LocalStorageProvider(config);
break;

case 's3':
  provider = S3StorageProvider.fromEnv(environment);
  break;
default:
  // Defensive fallback if supported drivers change later.
  throw new Error('No storage provider is configured.');

}

return new StorageClient(assertStorageProvider(provider));
}

module.exports = {
createStorageClient,
StorageClient,
LocalStorageProvider,
S3StorageProvider,
loadStorageConfig,
};