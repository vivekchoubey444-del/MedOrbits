‘use strict’;

/**

* MedOrbits -- Structured Application Logger
* File: src/config/logger.js
* Features:
* ●	Structured JSON logging with Pino.
* ●	Environment-aware log levels.
* ●	Sensitive-field redaction.
* ●	Optional file output.
* ●	Safe initialization and configurable output destination.
* Note:
* File rotation is not implemented by this module. Use an approved
* rotation strategy or logging platform for production file retention.
    */

const pino = require(‘pino’);
const path = require(‘node:path’);
const fs = require(‘node:fs’);
const { env } = require(’./env’);

const VALID_LOG_LEVELS = new Set([
‘fatal’,
‘error’,
‘warn’,
‘info’,
‘debug’,
‘trace’,
‘silent’,
]);

const configuredLevel =
typeof env.LOG_LEVEL === ‘string’
? env.LOG_LEVEL.trim().toLowerCase()
: ‘info’;

if (!VALID_LOG_LEVELS.has(configuredLevel)) {
throw new Error(
Invalid LOG_LEVEL "${configuredLevel}". Allowed values: ${[ ...VALID_LOG_LEVELS, ].join(', ')}.
);
}

const redactPaths = [
‘req.headers.authorization’,
‘req.headers.cookie’,
‘req.headers["set-cookie"]’,
‘headers.authorization’,
‘headers.cookie’,
‘headers["set-cookie"]’,
‘password’,
‘.password’,
’..password’,
‘currentPassword’,
‘newPassword’,
‘confirmPassword’,
’.currentPassword’,
‘.newPassword’,
‘token’,
’.token’,
‘..token’,
‘accessToken’,
‘refreshToken’,
‘.accessToken’,
’.refreshToken’,
‘secret’,
‘.secret’,
‘sessionSecret’,
’.sessionSecret’,
‘apiKey’,
‘.apiKey’,
‘api_key’,
’.api_key’,
‘authorization’,
‘.authorization’,
‘clientSecret’,
’.clientSecret’,
‘smtpPassword’,
‘*.smtpPassword’,
‘DB_PASSWORD’,
‘SMTP_PASSWORD’,
‘SESSION_SECRET’,
‘DATABASE_URL’,
];

const options = {
level: configuredLevel,

base: {
service: ‘medorbits’,
environment: env.NODE_ENV,
},

timestamp: pino.stdTimeFunctions.isoTime,

redact: {
paths: redactPaths,
censor: ‘[REDACTED]’,
},

// Prevent accidental serialization of arbitrary request/response objects.
// Add explicit serializers when request-level logging is introduced.
};

function createDestination() {
if (!env.LOG_TO_FILE) {
return undefined;
}

if (
typeof env.LOG_DIRECTORY !== ‘string’ ||
env.LOG_DIRECTORY.trim() === ‘’
) {
throw new Error(
‘LOG_DIRECTORY must be configured when LOG_TO_FILE=true.’
);
}

const logDirectory = path.resolve(
process.cwd(),
env.LOG_DIRECTORY
);

fs.mkdirSync(logDirectory, {
recursive: true,
mode: 0o750,
});

const logFile = path.join(logDirectory, ‘application.log’);

// Reject a symbolic link at the log-file path to avoid unintentionally
// writing logs through an existing linked file.
try {
if (fs.lstatSync(logFile).isSymbolicLink()) {
throw new Error(
‘The configured application log file must not be a symbolic link.’
);
}
} catch (error) {
if (error.code !== ‘ENOENT’) {
throw error;
}
}

return pino.destination({
dest: logFile,
append: true,
mkdir: false,
sync: false,
});
}

const destination = createDestination();

const logger = pino(options, destination);

module.exports = logger;