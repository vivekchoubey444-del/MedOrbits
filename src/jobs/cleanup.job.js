'use strict';
const QUEUE_NAME = 'cleanup';
async function runCleanupJob(deps = {}, options = {}) {
  if (!deps.queue || typeof deps.queue.add !== 'function') throw new TypeError('queue.add is required.');
  if (!deps.cleanupService || typeof deps.cleanupService.buildPlan !== 'function') throw new TypeError('cleanupService.buildPlan is required.');
  const dryRun = options.dryRun !== false;
  if (!dryRun && options.allowDestructive !== true) throw new Error('Destructive cleanup requires allowDestructive: true.');
  const plan = await deps.cleanupService.buildPlan({
    dryRun, retentionDays: options.retentionDays, limit: options.batchSize || 500, asOf: options.asOf || new Date(),
  });
  const jobId = options.jobId || `cleanup:${new Date().toISOString().slice(0, 10)}:${dryRun ? 'dry-run' : 'execute'}`;
  await deps.queue.add(QUEUE_NAME, { plan, dryRun, requestedAt: new Date().toISOString() }, { jobId, attempts: options.attempts || 3 });
  if (deps.logger && deps.logger.info) deps.logger.info({ event: 'cleanup_job_enqueued', dryRun, jobId });
  return { enqueued: true, dryRun, jobId };
}
module.exports = { QUEUE_NAME, runCleanupJob };
