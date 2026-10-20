
'use strict';

/**
 * MedOrbits central API router.
 *
 * Mounted by server.js at /api/v1.
 *
 * Every route module must export an Express Router:
 *   module.exports = router;
 */

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const router = express.Router();

const ROUTES_DIR = __dirname;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const routeDefinitions = [
  ['/auth', 'auth.routes.js'],
  ['/sessions', 'session.routes.js'],
  ['/verification', 'verification.routes.js'],
  ['/password', 'password.routes.js'],
  ['/users', 'user.routes.js'],
  ['/courses', 'course.routes.js'],
  ['/colleges', 'college.routes.js'],
  ['/universities', 'university.routes.js'],
  ['/admissions', 'admission.routes.js'],
  ['/applications', 'application.routes.js'],
  ['/counselling', 'counselling.routes.js'],
  ['/documents', 'document.routes.js'],
  ['/jobs', 'job.routes.js'],
  ['/internships', 'internship.routes.js'],
  ['/candidates', 'candidate.routes.js'],
  ['/employers', 'employer.routes.js'],
  ['/recruitment', 'recruitment.routes.js'],
  ['/services', 'service.routes.js'],
  ['/public-data', 'public-data.routes.js'],
  ['/search', 'search.routes.js'],
  ['/site-search', 'site-search.routes.js'],
  ['/notifications', 'notification.routes.js'],
  ['/public-releases', 'public-release.routes.js'],
  ['/payments', 'payment.routes.js'],
  ['/uploads', 'upload.routes.js'],
  ['/contact', 'contact.routes.js'],
  ['/faqs', 'faq.routes.js'],
  ['/subscriptions', 'subscription.routes.js'],
  ['/admin', 'admin.routes.js'],
];

function resolveRouter(exported, filename) {
  const candidates = [
    exported,
    exported && exported.router,
    exported && exported.default,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === 'function' &&
      typeof candidate.use === 'function' &&
      typeof candidate.handle === 'function'
    ) {
      return candidate;
    }
  }

  throw new TypeError(
    `Route module "${filename}" must export an Express Router. ` +
    'Expected module.exports = router.'
  );
}

function validateDefinitions() {
  const prefixes = new Set();
  const filenames = new Set();

  for (const [prefix, filename] of routeDefinitions) {
    if (
      typeof prefix !== 'string' ||
      !prefix.startsWith('/') ||
      prefix === '/'
    ) {
      throw new Error(`Invalid route prefix: ${String(prefix)}`);
    }

    if (
      typeof filename !== 'string' ||
      filename.length === 0 ||
      path.basename(filename) !== filename
    ) {
      throw new Error(`Invalid route filename: ${String(filename)}`);
    }

    if (prefixes.has(prefix)) {
      throw new Error(`Duplicate route prefix: ${prefix}`);
    }

    if (filenames.has(filename)) {
      throw new Error(`Duplicate route module: ${filename}`);
    }

    prefixes.add(prefix);
    filenames.add(filename);
  }
}

function mountRoutes() {
  validateDefinitions();

  const missing = [];
  const mounted = [];

  for (const [prefix, filename] of routeDefinitions) {
    const absolutePath = path.join(ROUTES_DIR, filename);

    if (!fs.existsSync(absolutePath)) {
      missing.push(`${prefix} -> ${filename}`);
      continue;
    }

    let exported;

    try {
      // Resolve modules relative to this route directory.
      exported = require(absolutePath);
    } catch (cause) {
      throw new Error(
        `[MedOrbits][Routes] Failed to load "${filename}" ` +
        `for prefix "${prefix}": ${cause.message}`,
        { cause }
      );
    }

    let route;

    try {
      route = resolveRouter(exported, filename);
    } catch (cause) {
      throw new Error(
        `[MedOrbits][Routes] Invalid export for "${filename}" ` +
        `at prefix "${prefix}": ${cause.message}`,
        { cause }
      );
    }

    try {
      router.use(prefix, route);
    } catch (cause) {
      throw new Error(
        `[MedOrbits][Routes] Failed to mount "${filename}" ` +
        `at prefix "${prefix}": ${cause.message}`,
        { cause }
      );
    }

    mounted.push(prefix);

    console.log(
      `[MedOrbits][Routes] Mounted /api/v1${prefix} -> ${filename}`
    );
  }

  if (missing.length > 0) {
    const message =
      `Missing route modules:\n- ${missing.join('\n- ')}`;

    if (IS_PRODUCTION) {
      throw new Error(
        `[MedOrbits][Routes] Production startup aborted.\n${message}`
      );
    }

    console.warn(`[MedOrbits][Routes] ${message}`);
  }

  console.log(
    `[MedOrbits][Routes] Mounted ${mounted.length} route module(s).`
  );
}

mountRoutes();

module.exports = router;
