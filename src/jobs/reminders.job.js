‘use strict’;

const QUEUE_NAME = ‘reminders’;

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 1000;
const DEFAULT_ATTEMPTS = 5;
const MAX_ATTEMPTS = 10;

function validatePositiveInteger(value, name, fallback, maximum) {
const resolved = value === undefined ? fallback : value;

if (
!Number.isSafeInteger(resolved) ||
resolved < 1 ||
resolved > maximum
) {
throw new RangeError(
${name} must be an integer between 1 and ${maximum}.
);
}

return resolved;
}

function validateDependencies(deps) {
if (!deps || typeof deps !== ‘object’ || Array.isArray(deps)) {
throw new TypeError(‘dependencies must be an object.’);
}

if (!deps.queue || typeof deps.queue.add !== ‘function’) {
throw new TypeError(‘queue.add is required.’);
}

if (
!deps.reminderService ||
typeof deps.reminderService.getDue !== ‘function’
) {
throw new TypeError(‘reminderService.getDue is required.’);
}
}

function log(logger, level, fields) {
if (logger && typeof logger[level] === ‘function’) {
loggerlevel;
}
}

function getReminderId(item) {
if (!item || item.id === undefined || item.id === null) {
return null;
}

const id = String(item.id).trim();

return id.length > 0 && id.length <= 200 ? id : null;
}

async function runRemindersJob(deps = {}, options = {}) {
validateDependencies(deps);

if (!options || typeof options !== ‘object’ || Array.isArray(options)) {
throw new TypeError(‘options must be an object.’);
}

const batchSize = validatePositiveInteger(
options.batchSize,
‘batchSize’,
DEFAULT_BATCH_SIZE,
MAX_BATCH_SIZE
);

const attempts = validatePositiveInteger(
options.attempts,
‘attempts’,
DEFAULT_ATTEMPTS,
MAX_ATTEMPTS
);

const now = options.asOf === undefined
? new Date()
: new Date(options.asOf);

if (Number.isNaN(now.getTime())) {
throw new TypeError(‘asOf must be a valid date.’);
}

const scheduledAt = now.toISOString();

log(deps.logger, ‘info’, {
event: ‘reminders_job_started’,
queue: QUEUE_NAME,
batchSize,
scheduledAt
});

const due = await deps.reminderService.getDue({
limit: batchSize,
asOf: now
});

if (!Array.isArray(due)) {
throw new TypeError(
‘reminderService.getDue must return an array.’
);
}

if (due.length > batchSize) {
throw new Error(
‘reminderService.getDue returned more items than requested.’
);
}

let enqueued = 0;
let skipped = 0;

for (const item of due) {
const reminderId = getReminderId(item);

if (!reminderId) {
  skipped++;
  log(deps.logger, 'warn', {
    event: 'reminder_job_item_skipped',
    reason: 'invalid_reminder_id'
  });
  continue;
}
const jobId = `reminder:${reminderId}`;
await deps.queue.add(
  QUEUE_NAME,
  {
    reminderId,
    scheduledAt
  },
  {
    jobId,
    attempts
  }
);
enqueued++;

}

const result = {
scanned: due.length,
enqueued,
skipped,
queue: QUEUE_NAME,
scheduledAt
};

log(deps.logger, ‘info’, {
event: ‘reminders_job_completed’,
…result
});

return result;
}

module.exports = {
QUEUE_NAME,
runRemindersJob
};