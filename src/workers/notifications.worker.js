'use strict';
const QUEUE_NAME = 'notifications';
const loggerOf = (logger) => logger || { info() {}, error() {} };

async function processNotificationJob(job, deps = {}) {
  if (!job || !job.id || !job.data) throw new TypeError('Notification job requires id and data.');
  if (!deps.notificationService || typeof deps.notificationService.send !== 'function') {
    throw new Error('notificationService.send is required.');
  }
  const logger = loggerOf(deps.logger);
  try {
    const result = await deps.notificationService.send(job.data, { idempotencyKey: String(job.id) });
    logger.info({ event: 'notification_job_completed', jobId: String(job.id) });
    return result;
  } catch (error) {
    logger.error({ event: 'notification_job_failed', jobId: String(job.id), message: error.message });
    throw error;
  }
}
function createNotificationsWorker(deps = {}) { return (job) => processNotificationJob(job, deps); }
function startNotificationsWorker(options = {}) {
  return require('./worker-runtime').startPollingWorker({ ...options, queueName: options.queueName || QUEUE_NAME, handler: createNotificationsWorker(options) });
}
module.exports = { QUEUE_NAME, processNotificationJob, createNotificationsWorker, startNotificationsWorker };
