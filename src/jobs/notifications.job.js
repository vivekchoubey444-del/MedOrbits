'use strict';
const QUEUE_NAME = 'notifications';
async function runNotificationsJob(deps = {}, options = {}) {
  if (!deps.queue || typeof deps.queue.add !== 'function') throw new TypeError('queue.add is required.');
  if (!deps.notificationService || typeof deps.notificationService.getPending !== 'function') throw new TypeError('notificationService.getPending is required.');
  const batchSize = Number(options.batchSize || 100);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new RangeError('batchSize must be 1-1000.');
  const items = await deps.notificationService.getPending({ limit: batchSize });
  let enqueued = 0;
  for (const item of items || []) {
    if (!item || !item.id) continue;
    await deps.queue.add(QUEUE_NAME, { notificationId: item.id }, { jobId: `notification:${item.id}`, attempts: options.attempts || 5 });
    enqueued++;
  }
  if (deps.logger && deps.logger.info) deps.logger.info({ event: 'notifications_job_enqueued', count: enqueued });
  return { scanned: (items || []).length, enqueued };
}
module.exports = { QUEUE_NAME, runNotificationsJob };
