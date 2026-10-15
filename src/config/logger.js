'use strict';

const pino = require('pino');
const path = require('node:path');
const fs = require('node:fs');
const { env } = require('./env');

const options = {
  level: env.LOG_LEVEL,
  base: {
    service: 'medorbits',
    environment: env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'token',
      '*.token',
      'secret',
      '*.secret',
      'apiKey',
      '*.apiKey',
    ],
    censor: '[REDACTED]',
  },
};

let destination;

if (env.LOG_TO_FILE) {
  const logDirectory = path.resolve(process.cwd(), env.LOG_DIRECTORY);
  fs.mkdirSync(logDirectory, { recursive: true });
  destination = pino.destination(path.join(logDirectory, 'application.log'));
}

const logger = pino(options, destination);

module.exports = logger;
