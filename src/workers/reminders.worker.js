'use strict';
const QUEUE_NAME = 'reminders';
const loggerOf = (logger) => logger || { info() {}, error() {} };

async function processReminderJob(job, deps = {}) {
  if (!job || !job.id || !job.data) throw new TypeError('Reminder job requires id and data.');
  if (!deps.reminderService || typeof deps.reminderService.deliver !== 'function') {
    throw new Error('reminderService.deliver is required.');
  }
  const logger = loggerOf(deps.logger);
  try {
    const result = await deps.reminderService.deliver(job.data, { idempotencyKey: String(job.id) });
    logger.info({ event: 'reminder_job_completed', jobId: String(job.id) });
    return result;
  } catch (error) {
    logger.error({ event: 'reminder_job_failed', jobId: String(job.id), message: error.message });
    throw error;
  }
}
function createRemindersWorker(deps = {}) { return (job) => processReminderJob(job, deps); }
function startRemindersWorker(options = {}) {
  return require('./worker-runtime').startPollingWorker({ ...options, queueName: options.queueName || QUEUE_NAME, handler: createRemindersWorker(options) });
}
module.exports = { QUEUE_NAME, processReminderJob, createRemindersWorker, startRemindersWorker };
