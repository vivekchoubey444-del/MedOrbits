‘use strict’;

const DEFAULTS = Object.freeze({
baseUrl: ‘https://api.openai.com/v1’,
model: ‘gpt-4o-mini’,
timeoutMs: 20_000,
maxOutputTokens: 800,
maxInputChars: 12_000,
});

const LIMITS = Object.freeze({
timeoutMs: { min: 1_000, max: 120_000 },
maxOutputTokens: { min: 1, max: 8_000 },
maxInputChars: { min: 1, max: 100_000 },
});

function readString(env, key, fallback = ‘’) {
const value = env[key];

if (value == null || value === ‘’) {
return fallback;
}

if (typeof value !== ‘string’) {
throw new TypeError(${key} must be a string.);
}

return value.trim();
}

function readInteger(env, key, fallback, min, max) {
const raw = env[key];

if (raw == null || raw === ‘’) {
return fallback;
}

if (
typeof raw !== ‘string’ &&
typeof raw !== ‘number’
) {
throw new TypeError(${key} must be an integer.);
}

const value = String(raw).trim();

if (!/^-?\d+$/.test(value)) {
throw new TypeError(${key} must be an integer.);
}

const parsed = Number(value);

if (
!Number.isSafeInteger(parsed) ||
parsed < min ||
parsed > max
) {
throw new RangeError(
${key} must be between ${min} and ${max}.
);
}

return parsed;
}

function normalizeBaseUrl(value) {
let parsed;

try {
parsed = new URL(value);
} catch {
throw new Error(‘AI_API_URL must be a valid absolute URL.’);
}

if (
![‘https:’, ‘http:’].includes(parsed.protocol) ||
!parsed.hostname ||
parsed.username ||
parsed.password ||
parsed.search ||
parsed.hash
) {
throw new Error(
‘AI_API_URL must use HTTP(S) and cannot contain credentials, query parameters, or fragments.’
);
}

if (
parsed.protocol === ‘http:’ &&
process.env.NODE_ENV === ‘production’
) {
throw new Error(‘AI_API_URL must use HTTPS in production.’);
}

return parsed.href.replace(//+$/, ‘’);
}

function validateModel(model) {
if (
!model ||
model.length > 128 ||
/[\r\n\0]/.test(model)
) {
throw new Error(‘AI_MODEL is invalid.’);
}

return model;
}

function loadAiConfig(env = process.env) {
if (!env || typeof env !== ‘object’ || Array.isArray(env)) {
throw new TypeError(‘AI environment configuration must be an object.’);
}

const apiKey = readString(env, ‘AI_API_KEY’);
const baseUrl = normalizeBaseUrl(
readString(env, ‘AI_API_URL’, DEFAULTS.baseUrl)
);
const model = validateModel(
readString(env, ‘AI_MODEL’, DEFAULTS.model)
);

const timeoutMs = readInteger(
env,
‘AI_TIMEOUT_MS’,
DEFAULTS.timeoutMs,
LIMITS.timeoutMs.min,
LIMITS.timeoutMs.max
);

const maxOutputTokens = readInteger(
env,
‘AI_MAX_OUTPUT_TOKENS’,
DEFAULTS.maxOutputTokens,
LIMITS.maxOutputTokens.min,
LIMITS.maxOutputTokens.max
);

const maxInputChars = readInteger(
env,
‘AI_MAX_INPUT_CHARS’,
DEFAULTS.maxInputChars,
LIMITS.maxInputChars.min,
LIMITS.maxInputChars.max
);

return Object.freeze({
apiKey,
baseUrl,
model,
timeoutMs,
maxOutputTokens,
maxInputChars,
});
}

module.exports = {
loadAiConfig,
};