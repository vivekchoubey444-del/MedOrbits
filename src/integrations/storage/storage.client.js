'use strict';

/**

* MedOrbits -- Storage Client
* File: src/integrations/storage/storage.client.js
* Provides a stable interface over local and S3 storage providers.
* API:
* put({ key, body, contentType })
* get(key)
* delete(key)
* close()
    */

const REQUIRED_METHODS = Object.freeze([
'put',
'get',
'delete',
]);

class StorageClient {
constructor(provider) {
if (!provider || typeof provider !== 'object') {
throw new TypeError('A storage provider is required.');
}

for (const method of REQUIRED_METHODS) {
  if (typeof provider[method] !== 'function') {
    throw new TypeError(
      `Storage provider must implement ${method}().`
    );
  }
}
Object.defineProperty(this, 'provider', {
  value: provider,
  enumerable: false,
  writable: false,
  configurable: false,
});

}

async put(input) {
if (
!input ||
typeof input !== 'object' ||
Array.isArray(input)
) {
throw new TypeError('Storage put() requires an options object.');
}

if (typeof input.key !== 'string' || !input.key.trim()) {
  throw new TypeError('A non-empty storage key is required.');
}
if (
  !Buffer.isBuffer(input.body) &&
  !(input.body instanceof Uint8Array)
) {
  throw new TypeError(
    'Storage body must be a Buffer or Uint8Array.'
  );
}
return this.provider.put(input);

}

async get(key) {
this.validateKey(key);
return this.provider.get(key);
}

async delete(key) {
this.validateKey(key);
return this.provider.delete(key);
}

async close() {
if (typeof this.provider.close === 'function') {
await this.provider.close();
}
}

validateKey(key) {
if (typeof key !== 'string' || !key.trim()) {
throw new TypeError('A non-empty storage key is required.');
}
}
}

module.exports = {
StorageClient,
};