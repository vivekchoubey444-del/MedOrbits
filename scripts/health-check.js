#!/usr/bin/env node
'use strict';

async function main() {
  const url = process.env.HEALTH_CHECK_URL;
  if (!url) {
    throw new Error('Set HEALTH_CHECK_URL to the actual health endpoint before running this check.');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('HEALTH_CHECK_URL must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('HEALTH_CHECK_URL must use HTTP or HTTPS.');
  }

  const timeoutMs = Number.parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '5000', 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsed, {
      method: 'GET',
      signal: controller.signal,
      headers: { accept: 'application/json, text/plain, */*' },
    });

    if (!response.ok) {
      throw new Error(`Health endpoint returned HTTP ${response.status}.`);
    }

    console.log(`Health check passed (HTTP ${response.status}).`);
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  console.error(`Health check failed: ${error.message}`);
  process.exitCode = 1;
});
