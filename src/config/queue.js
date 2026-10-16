‘use strict’;

/**

* MedOrbits -- Redis Configuration
* File: src/config/redis.js
* Responsibilities:
* ●	Create and manage a shared Redis client.
* ●	Support REDIS_URL and individual connection settings.
* ●	Handle connection errors and reconnect attempts.
* ●	Prevent duplicate concurrent connection attempts.
* ●	Support graceful application shutdown.
* Requires:
* ●	redis (node-redis v4 or compatible v5 API)
* ●	./env
* ●	./logger
        */

const { createClient } = require(‘redis’);
const { env } = require(’./env’);
const logger = require(’./logger’);

let client;
let connectPromise;
let closePromise;
let closing = false;

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY_MS = 250;
const RECONNECT_MAX_DELAY_MS = 3000;

function isRedisRequired() {
return env.REDIS_ENABLED === true || env.QUEUE_ENABLED === true;
}

function validateRedisConfiguration() {
if (!isRedisRequired()) {
return;
}

if (env.REDIS_URL) {
let parsedUrl;

try {
  parsedUrl = new URL(env.REDIS_URL);
} catch {
  throw new Error('REDIS_URL must be a valid Redis URL.');
}
if (!['redis:', 'rediss:'].includes(parsedUrl.protocol)) {
  throw new Error('REDIS_URL must use redis:// or rediss://.');
}
if (parsedUrl.protocol === 'rediss:' && env.REDIS_TLS_ENABLED === false) {
  throw new Error(
    'REDIS_URL uses TLS but REDIS_TLS_ENABLED=false. Correct the configuration.'
  );
}
if (parsedUrl.protocol === 'redis:' && env.REDIS_TLS_ENABLED === true) {
  throw new Error(
    'REDIS_TLS_ENABLED=true conflicts with a redis:// REDIS_URL. Use rediss://.'
  );
}
return;

}

if (
typeof env.REDIS_HOST !== ‘string’ ||
!env.REDIS_HOST.trim()
) {
throw new Error(‘REDIS_HOST is required when REDIS_URL is not configured.’);
}

if (
!Number.isInteger(env.REDIS_PORT) ||
env.REDIS_PORT < 1 ||
env.REDIS_PORT > 65535
) {
throw new Error(‘REDIS_PORT must be an integer between 1 and 65535.’);
}

if (
!Number.isInteger(env.REDIS_DB) ||
env.REDIS_DB < 0
) {
throw new Error(‘REDIS_DB must be a non-negative integer.’);
}
}

function getRedisOptions() {
const reconnectStrategy = (retries) => {
if (retries >= MAX_RECONNECT_ATTEMPTS) {
logger.error(
{ retries },
‘Redis reconnect limit exceeded’
);

  return new Error('Redis reconnect limit exceeded.');
}
const delay = Math.min(
  RECONNECT_BASE_DELAY_MS * (2 ** retries),
  RECONNECT_MAX_DELAY_MS
);
// Add limited jitter to reduce synchronized reconnect attempts.
return delay + Math.floor(Math.random() * 100);

};

if (env.REDIS_URL) {
return {
url: env.REDIS_URL,
database: env.REDIS_DB,
socket: {
reconnectStrategy,
},
};
}

return {
username: env.REDIS_USERNAME || undefined,
password: env.REDIS_PASSWORD || undefined,
database: env.REDIS_DB,
socket: {
host: env.REDIS_HOST,
port: env.REDIS_PORT,
tls: env.REDIS_TLS_ENABLED === true,
reconnectStrategy,
},
};
}

function createRedisClient() {
const redisClient = createClient(getRedisOptions());

redisClient.on(‘error’, (error) => {
// Do not log connection URLs or credentials.
logger.error(
{
err: {
name: error.name,
message: error.message,
},
},
‘Redis client error’
);
});

redisClient.on(‘connect’, () => {
logger.info(‘Redis connection established’);
});

redisClient.on(‘ready’, () => {
logger.info(‘Redis client ready’);
});

redisClient.on(‘reconnecting’, () => {
logger.warn(‘Redis client reconnecting’);
});

redisClient.on(‘end’, () => {
logger.info(‘Redis connection ended’);
});

return redisClient;
}

async function connectRedis() {
if (!isRedisRequired()) {
return null;
}

if (closing || closePromise) {
throw new Error(
‘Redis is shutting down. A new connection cannot be started.’
);
}

if (client?.isReady) {
return client;
}

if (connectPromise) {
return connectPromise;
}

validateRedisConfiguration();

if (!client) {
client = createRedisClient();
}

const currentClient = client;

connectPromise = (async () => {
try {
if (!currentClient.isOpen) {
await currentClient.connect();
}

  return currentClient;
} catch (error) {
  // Discard a failed client so a later explicit attempt can create a new one.
  if (client === currentClient) {
    client = undefined;
  }
  if (currentClient.isOpen) {
    try {
      await currentClient.destroy();
    } catch {
      // Preserve the original connection error.
    }
  }
  throw error;
} finally {
  connectPromise = undefined;
}

})();

return connectPromise;
}

async function closeRedis() {
if (closePromise) {
return closePromise;
}

if (!client) {
return;
}

closing = true;
const currentClient = client;

closePromise = (async () => {
try {
// Wait for an in-flight initial connection before shutting down.
if (connectPromise) {
try {
await connectPromise;
} catch {
// The connection attempt failed; continue cleanup.
}
}

  if (currentClient.isOpen) {
    await currentClient.quit();
  }
  logger.info('Redis connection closed');
} catch (error) {
  logger.error(
    {
      err: {
        name: error.name,
        message: error.message,
      },
    },
    'Redis shutdown failed'
  );
  // Force local cleanup if a graceful quit cannot complete.
  if (currentClient.isOpen) {
    try {
      currentClient.destroy();
    } catch {
      // Preserve the shutdown error.
    }
  }
  throw error;
} finally {
  if (client === currentClient) {
    client = undefined;
  }
  closing = false;
  closePromise = undefined;
}

})();

return closePromise;
}

module.exports = {
connectRedis,
closeRedis,
};