'use strict';

/**

* MedOrbits -- Cleanup Job
* File: src/jobs/cleanup.job.js
* Responsibilities:
* ●	Build a cleanup plan through cleanupService.
* ●	Enqueue cleanup work for a queue worker.
* ●	Default to dry-run mode.
* ●	Require explicit authorization for destructive execution.
* This job schedules cleanup work; it does not delete records itself.
    */

const QUEUE_NAME = 'cleanup';

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 5_000;
const DEFAULT_ATTEMPTS = 3;
const MAX_ATTEMPTS = 10;
const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 3_650;

function positiveInteger(value, name, fallback, maximum) {
const resolved = value == null ? fallback : value;

if (
!Number.isSafeInteger(resolved) ||
resolved < 1 ||
resolved > maximum
) {
throw new RangeError(
`${name} must be an integer between 1 and ${maximum}.`
);
}

return resolved;
}

function normalizeDate(value, name, fallback = new Date()) {
const date = value == null ? new Date(fallback) : new Date(value);

if (Number.isNaN(date.getTime())) {
throw new TypeError(`${name} must be a valid date.`);
}

return date;
}

function validateJobId(value, fallback) {
if (value == null) {
return fallback;
}

if (
typeof value !== 'string' ||
!value.trim() ||
value.length > 200 ||
/[\r\n\0]/.test(value)
) {
throw new TypeError('jobId must be a non-empty string of at most 200 characters.');
}

return value.trim();
}

function log(logger, level, data) {
if (logger && typeof logger[level] === 'function') {
logger[level](data);
}
}

async function runCleanupJob(deps = {}, options = {}) {
if (!deps || typeof deps !== 'object' || Array.isArray(deps)) {
throw new TypeError('Job dependencies must be an object.');
}

if (!options || typeof options !== 'object' || Array.isArray(options)) {
throw new TypeError('Cleanup options must be an object.');
}

if (!deps.queue || typeof deps.queue.add !== 'function') {
throw new TypeError('queue.add is required.');
}

if (
!deps.cleanupService ||
typeof deps.cleanupService.buildPlan !== 'function'
) {
throw new TypeError('cleanupService.buildPlan is required.');
}

const dryRun = options.dryRun !== false;

if (!dryRun && options.allowDestructive !== true) {
throw new Error(
'Destructive cleanup requires allowDestructive: true.'
);
}

const retentionDays = positiveInteger(
options.retentionDays,
'retentionDays',
DEFAULT_RETENTION_DAYS,
MAX_RETENTION_DAYS
);

const batchSize = positiveInteger(
options.batchSize,
'batchSize',
DEFAULT_BATCH_SIZE,
MAX_BATCH_SIZE
);

const attempts = positiveInteger(
options.attempts,
'attempts',
DEFAULT_ATTEMPTS,
MAX_ATTEMPTS
);

const asOf = normalizeDate(options.asOf, 'asOf');
const requestedAt = new Date().toISOString();

const defaultJobId = [
'cleanup',
asOf.toISOString().slice(0, 10),
dryRun ? 'dry-run' : 'execute',
].join(':');

const jobId = validateJobId(options.jobId, defaultJobId);

log(deps.logger, 'info', {
event: 'cleanup_plan_started',
dryRun,
jobId,
retentionDays,
batchSize,
asOf: asOf.toISOString(),
});

const plan = await deps.cleanupService.buildPlan({
dryRun,
retentionDays,
limit: batchSize,
asOf,
});

if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
throw new TypeError(
'cleanupService.buildPlan must return a plan object.'
);
}

const payload = {
plan,
dryRun,
retentionDays,
batchSize,
asOf: asOf.toISOString(),
requestedAt,
};

await deps.queue.add(QUEUE_NAME, payload, {
jobId,
attempts,
});

log(deps.logger, 'info', {
event: 'cleanup_job_enqueued',
queue: QUEUE_NAME,
dryRun,
jobId,
retentionDays,
batchSize,
});

return {
enqueued: true,
dryRun,
jobId,
queue: QUEUE_NAME,
};
}

module.exports = {
QUEUE_NAME,
runCleanupJob,
};