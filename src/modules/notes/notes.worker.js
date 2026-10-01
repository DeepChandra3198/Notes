import { Worker, UnrecoverableError } from 'bullmq';
import { createWorkerConnection } from '../../config/bullmq.js';
import { NOTES_QUEUE, JOBS } from './notes.queue.js';
import * as notesService from './notes.service.js';

const processor = async (job) => {
  switch (job.name) {
    case JOBS.GENERATE_SUMMARY:
      return notesService.generateSummary(job.data.noteId);
    case JOBS.EMBED_NOTE:
      return notesService.embedNote(job.data.noteId);
    default:
      throw new UnrecoverableError(`Unknown job: ${job.name}`);
  }
};

export const createNotesWorker = () => {
  const worker = new Worker(NOTES_QUEUE, processor, {
    connection: createWorkerConnection(),
    concurrency: 3,
    limiter: { max: 10, duration: 1000 }, // stay under the AI provider's rate limit
  });

  worker.on('completed', (job) =>
    console.log(`[worker] ${job.name} #${job.id} done`)
  );

  worker.on('active', (job) =>
    console.log(`[worker] ${job.name} #${job.id} started (attempt ${job.attemptsMade + 1})`)
  );

  worker.on('failed', async (job, err) => {
    console.error(
      `[worker] ${job?.name} #${job?.id} failed ` +
      `(attempt ${job?.attemptsMade}/${job?.opts.attempts}):`,
      err.message
    );

    // Final failure (retries exhausted, or unrecoverable): apply the fallback
    const isFinal =
      job &&
      (err instanceof UnrecoverableError ||
        job.attemptsMade >= (job.opts.attempts ?? 1));

    if (isFinal && job.name === JOBS.GENERATE_SUMMARY) {
      await notesService
        .applyFallbackSummary(job.data.noteId)
        .catch((e) => console.error('[worker] fallback failed:', e.message));
    }
  });

  worker.on('error', (err) => console.error('[worker] error:', err.message));

  return worker;
};