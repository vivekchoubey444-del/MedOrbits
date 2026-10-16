#!/usr/bin/env node
‘use strict’;

/**

* MedOrbits -- HTTP Health Check
* Purpose:
* Verify that a configured application health endpoint responds successfully.
* Required:
* HEALTH_CHECK_URL
* Optional:
* HEALTH_CHECK_TIMEOUT_MS=5000
* HEALTH_CHECK_EXPECT_STATUS=200
* Example:
* HEALTH_CHECK_URL=https://example.com/health node scripts/health-check.js
* Note:
* An HTTP success response confirms endpoint availability only. It does not
* prove that the database, queues, or every application dependency is healthy.
    */

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_EXPECTED_STATUS = 200;

function parseHealthCheckUrl(value) {
if (typeof value !== ‘string’ || !value.trim()) {
throw new Error(
‘Set HEALTH_CHECK_URL to the actual application health endpoint.’
);
}

let parsed;

try {
parsed = new URL(value.trim());
} catch {
throw new Error(‘HEALTH_CHECK_URL must be a valid absolute URL.’);
}

if (![‘http:’, ‘https:’].includes(parsed.protocol)) {
throw new Error(‘HEALTH_CHECK_URL must use HTTP or HTTPS.’);
}

if (parsed.username || parsed.password) {
throw new Error(
‘HEALTH_CHECK_URL must not contain embedded credentials.’
);
}

return parsed;
}

function parsePositiveInteger(value, name, fallback) {
if (value === undefined || value === ‘’) {
return fallback;
}

if (!/^\d+$/.test(value)) {
throw new Error(${name} must be a positive integer.);
}

const parsed = Number(value);

if (!Number.isSafeInteger(parsed) || parsed <= 0) {
throw new Error(${name} must be a positive safe integer.);
}

return parsed;
}

function getConfiguration() {
return {
url: parseHealthCheckUrl(process.env.HEALTH_CHECK_URL),
timeoutMs: parsePositiveInteger(
process.env.HEALTH_CHECK_TIMEOUT_MS,
‘HEALTH_CHECK_TIMEOUT_MS’,
DEFAULT_TIMEOUT_MS
),
expectedStatus: parsePositiveInteger(
process.env.HEALTH_CHECK_EXPECT_STATUS,
‘HEALTH_CHECK_EXPECT_STATUS’,
DEFAULT_EXPECTED_STATUS
),
};
}

async function checkEndpoint({ url, timeoutMs, expectedStatus }) {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
const response = await fetch(url, {
method: ‘GET’,
signal: controller.signal,
redirect: ‘error’,
headers: {
accept: ‘application/json, text/plain, /’,
},
});

if (response.status !== expectedStatus) {
  throw new Error(
    `Expected HTTP ${expectedStatus}, received HTTP ${response.status}.`
  );
}
// Avoid leaving an unread response body on the connection.
await response.body?.cancel().catch(() => {});
return response.status;

} catch (error) {
if (error.name === ‘AbortError’) {
throw new Error(Request timed out after ${timeoutMs} ms.);
}

if (error.name === 'TypeError') {
  throw new Error(
    'Could not reach the health endpoint. Check the URL, DNS, TLS certificate, and network connectivity.'
  );
}
throw error;

} finally {
clearTimeout(timeout);
}
}

async function main() {
const config = getConfiguration();

console.log(’[MedOrbits Health Check] Starting.’);
console.log([MedOrbits Health Check] Endpoint: ${config.url.origin}${config.url.pathname});
console.log([MedOrbits Health Check] Timeout: ${config.timeoutMs} ms);

const status = await checkEndpoint(config);

console.log(
[MedOrbits Health Check] PASS -- HTTP ${status}; endpoint responded as expected.
);
}

main().catch((error) => {
console.error(
[MedOrbits Health Check] FAIL -- ${error.message}
);

process.exitCode = 1;
});