'use strict';

/**
 * MedOrbits central API router.
 *
 * Mounted by server.js at:
 *   /api/v1
 *
 * Individual route files should export an Express Router:
 *   module.exports = router;
 */

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const router = express.Router();

const ROUTES_DIR = __dirname;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/*
 * Keep route prefixes and filenames aligned with the existing project.
 * Do not add a route here until its corresponding module exists.
 */
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
  ['/search', 'search.routes.js'],
  ['/notifications', 'notification.routes.js'],
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
    `${filename} must export an Express Router.`
  );
}

function mountRoutes() {
  const missing = [];

  for (const [prefix, filename] of routeDefinitions) {
    const absolutePath = path.join(ROUTES_DIR, filename);

    if (!fs.existsSync(absolutePath)) {
      missing.push(filename);
      continue;
    }

    let exported;

    try {
      exported = require(absolutePath);
    } catch (error) {
      error.message =
        `Unable to load route module "${filename}": ${error.message}`;
      throw error;
    }

    const route = resolveRouter(exported, filename);

    router.use(prefix, route);

    console.log(
      `[MedOrbits][Routes] Mounted /api/v1${prefix} -> ${filename}`
    );
  }

  if (missing.length > 0) {
    const message =
      `Missing route modules: ${missing.join(', ')}`;

    if (IS_PRODUCTION) {
      throw new Error(message);
    }

    console.warn(`[MedOrbits][Routes] ${message}`);
  }
}

mountRoutes();

/*
 * Router-level fallback for unmatched API requests.
 * The server's API 404 handler handles requests that reach the end
 * of the mounted central router.
 */
module.exports = router;