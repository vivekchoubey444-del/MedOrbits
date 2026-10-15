'use strict';
const QUEUE_NAME = 'reminders';
async function runRemindersJob(deps = {}, options = {}) {
  if (!deps.queue || typeof deps.queue.add !== 'function') throw new TypeError('queue.add is required.');
  if (!deps.reminderService || typeof deps.reminderService.getDue !== 'function') throw new TypeError('reminderService.getDue is required.');
  const batchSize = Number(options.batchSize || 100);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw new RangeError('batchSize must be 1-1000.');
  const due = await deps.reminderService.getDue({ limit: batchSize, asOf: options.asOf || new Date() });
  let enqueued = 0;
  for (const item of due || []) {
    if (!item || !item.id) continue;
    await deps.queue.add(QUEUE_NAME, { reminderId: item.id }, { jobId: `reminder:${item.id}`, attempts: options.attempts || 5 });
    enqueued++;
  }
  if (deps.logger && deps.logger.info) deps.logger.info({ event: 'reminders_job_enqueued', count: enqueued });
  return { scanned: (due || []).length, enqueued };
}
module.exports = { QUEUE_NAME, runRemindersJob };
