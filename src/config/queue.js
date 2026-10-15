'use strict';

const { createClient } = require('redis');
const { env } = require('./env');
const logger = require('./logger');

let client;

function getRedisOptions() {
  if (env.REDIS_URL) {
    return {
      url: env.REDIS_URL,
      socket: env.REDIS_TLS_ENABLED ? { tls: true } : undefined,
      database: env.REDIS_DB,
    };
  }

  return {
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
    database: env.REDIS_DB,
    socket: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      tls: env.REDIS_TLS_ENABLED,
      reconnectStrategy(retries) {
        if (retries > 10) return new Error('Redis reconnect limit exceeded.');
        return Math.min(retries * 250, 3000);
      },
    },
  };
}

async function connectRedis() {
  if (!env.REDIS_ENABLED && !env.QUEUE_ENABLED) {
    return null;
  }

  if (!client) {
    client = createClient(getRedisOptions());
    client.on('error', (error) => {
      logger.error({ err: error }, 'Redis client error');
    });
    client.on('ready', () => logger.info('Redis client ready'));
  }

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

async function closeRedis() {
  if (client && client.isOpen) {
    await client.quit();
    logger.info('Redis connection closed');
  }
  client = undefined;
}

module.exports = { connectRedis, closeRedis };
