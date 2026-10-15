'use strict';
// Queue adapter: reserve({queueName, visibilityTimeoutMs}), ack(job), retry(job,error), optional deadLetter(job,error).
function startPollingWorker(options = {}) {
  const { queue, queueName, handler, logger = console, pollIntervalMs = 1000, visibilityTimeoutMs = 60000, maxAttempts = 5 } = options;
  if (!queue || !['reserve', 'ack', 'retry'].every((m) => typeof queue[m] === 'function')) {
    throw new TypeError('Queue adapter must implement reserve, ack, and retry.');
  }
  if (typeof handler !== 'function') throw new TypeError('handler is required.');
  for (const [key, value] of Object.entries({ pollIntervalMs, visibilityTimeoutMs })) {
    if (!Number.isInteger(value) || value < 1) throw new TypeError(`${key} must be a positive integer.`);
  }
  let stopped = false, running = false, timer;
  async function tick() {
    if (stopped || running) return;
    running = true;
    let delay = pollIntervalMs;
    try {
      const job = await queue.reserve({ queueName, visibilityTimeoutMs });
      if (!job) delay = Math.max(1000, pollIntervalMs);
      else {
        try { await handler(job); await queue.ack(job); }
        catch (error) {
          (logger.error || (() => {})).call(logger, { event: 'worker_job_failed', queueName, jobId: String(job.id || 'unknown'), message: error.message });
          if (typeof queue.deadLetter === 'function' && Number(job.attempts || 0) >= maxAttempts) await queue.deadLetter(job, error);
          else await queue.retry(job, error);
        }
      }
    } catch (error) {
      (logger.error || (() => {})).call(logger, { event: 'worker_poll_failed', queueName, message: error.message });
    } finally {
      running = false;
      if (!stopped) timer = setTimeout(tick, delay);
    }
  }
  timer = setTimeout(tick, 0);
  return { queueName, async stop() { stopped = true; clearTimeout(timer); while (running) await new Promise((r) => setTimeout(r, 10)); } };
}
module.exports = { startPollingWorker };
