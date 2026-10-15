'use strict';
const QUEUE_NAME = 'cleanup';
const loggerOf = (logger) => logger || { info() {}, error() {} };

async function processCleanupJob(job, deps = {}) {
  if (!job || !job.id || !job.data) throw new TypeError('Cleanup job requires id and data.');
  if (!deps.cleanupService || typeof deps.cleanupService.run !== 'function') {
    throw new Error('cleanupService.run is required.');
  }
  const logger = loggerOf(deps.logger);
  try {
    const result = await deps.cleanupService.run(job.data, {
      dryRun: job.data.dryRun !== false,
      idempotencyKey: String(job.id),
    });
    logger.info({ event: 'cleanup_job_completed', jobId: String(job.id) });
    return result;
  } catch (error) {
    logger.error({ event: 'cleanup_job_failed', jobId: String(job.id), message: error.message });
    throw error;
  }
}
function createCleanupWorker(deps = {}) { return (job) => processCleanupJob(job, deps); }
function startCleanupWorker(options = {}) {
  return require('./worker-runtime').startPollingWorker({ ...options, queueName: options.queueName || QUEUE_NAME, handler: createCleanupWorker(options) });
}
module.exports = { QUEUE_NAME, processCleanupJob, createCleanupWorker, startCleanupWorker };
