'use strict';

/**

* MedOrbits -- HTTP Security Headers
* File: src/config/security.js
* Responsibilities:
* ●	Configure Helmet security headers.
* ●	Apply a configurable Content Security Policy.
* ●	Enable HSTS in production.
* ●	Enforce safe defaults for browser resource loading.
* Requires:
* ●	helmet
* ●	./env
        */

const helmet = require('helmet');
const { env } = require('./env');

const IS_PRODUCTION = env.NODE_ENV === 'production';

function parseDirectiveSources(value, fallback, name) {
if (value === undefined || value === null) {
return fallback;
}

if (!Array.isArray(value)) {
throw new TypeError(`${name} must be an array of CSP sources.`);
}

const sources = value
.filter((item) => typeof item === 'string')
.map((item) => item.trim())
.filter(Boolean);

if (sources.length !== value.length) {
throw new TypeError(`${name} contains invalid CSP source values.`);
}

if (IS_PRODUCTION && sources.includes("'unsafe-eval'")) {
throw new Error(
`${name} must not contain 'unsafe-eval' in production.`
);
}

return [...new Set(sources)];
}

function buildContentSecurityPolicy() {
if (!env.CONTENT_SECURITY_POLICY_ENABLED) {
return false;
}

const directives = {
defaultSrc: ["'self'"],
baseUri: ["'self'"],
objectSrc: ["'none'"],
frameAncestors: ["'self'"],
formAction: ["'self'"],
scriptSrc: ["'self'"],
styleSrc: ["'self'"],
imgSrc: ["'self'", 'data:'],
fontSrc: ["'self'", 'data:'],
connectSrc: ["'self'"],
mediaSrc: ["'self'"],
workerSrc: ["'self'"],
manifestSrc: ["'self'"],
};

/*

* Optional source overrides must be supplied as arrays by env.js.
* Configure only the external origins that MedOrbits actually uses.
* Example:
* CSP_SCRIPT_SRC=["'self'","https://trusted.example"]
    */
    const configurableDirectives = {
    scriptSrc: env.CSP_SCRIPT_SRC,
    styleSrc: env.CSP_STYLE_SRC,
    imgSrc: env.CSP_IMG_SRC,
    fontSrc: env.CSP_FONT_SRC,
    connectSrc: env.CSP_CONNECT_SRC,
    mediaSrc: env.CSP_MEDIA_SRC,
    frameSrc: env.CSP_FRAME_SRC,
    };

for (const [directive, configuredSources] of Object.entries(
configurableDirectives
)) {
if (configuredSources !== undefined && configuredSources !== null) {
directives[directive] = parseDirectiveSources(
configuredSources,
directives[directive] || [],
directive
);
}
}

// Prevent mixed-content requests in production HTTPS deployments.
if (IS_PRODUCTION) {
directives.upgradeInsecureRequests = [];
}

return {
useDefaults: true,
directives,
};
}

function buildHelmetOptions() {
const options = {
contentSecurityPolicy: buildContentSecurityPolicy(),

// Enable only after confirming cross-origin resources remain compatible.
crossOriginEmbedderPolicy: false,
referrerPolicy: {
  policy: 'strict-origin-when-cross-origin',
},
// Disable legacy browser-specific headers.
xPoweredBy: false,

};

if (IS_PRODUCTION) {
options.hsts = {
maxAge: 15_552_000, // 180 days
includeSubDomains: true,
preload: false,
};
} else {
options.hsts = false;
}

return options;
}

const securityHeaders = helmet(buildHelmetOptions());

function securityHeadersMiddleware(req, res, next) {
if (env.HELMET_ENABLED === false) {
return next();
}

return securityHeaders(req, res, next);
}

module.exports = {
securityHeadersMiddleware,
};