import { Queue } from 'bullmq';
import { createQueueConnection } from '../../config/bullmq.js';

export const NOTES_QUEUE = 'notes';

// Job names in one place, so there are no typos between producer and consumer
export const JOBS = {
  GENERATE_SUMMARY: 'generate-summary',
   EMBED_NOTE: 'embed-note'
};

export const notesQueue = new Queue(NOTES_QUEUE, {
  connection: createQueueConnection(),
  defaultJobOptions: {
    attempts: 3,                                   // 1 try + 2 retries
    backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s...
    removeOnComplete: true,                        // don't fill Redis with finished jobs
    removeOnFail: { age: 7 * 24 * 3600 },          // keep failures 7 days for debugging
  },
});

/**
 * Fail-open, like the cache: if Redis is down, the note is still created.
 * jobId dedupes: two quick updates to the same note = one waiting job.
 */
export const enqueueSummary = async (noteId) => {
  try {
    await notesQueue.add(
      JOBS.GENERATE_SUMMARY,
      { noteId },
      { jobId: `summary-${noteId}` } // note: BullMQ ids can't contain ":"
    );
  } catch (err) {
    console.error(`[queue] enqueue failed (note ${noteId}):`, err.message);
  }
};


// No jobId on purpose: embedding is idempotent (same text, same vector),
// so a duplicate job is harmless, and we avoid the stuck-failed-job trap.
export const enqueueEmbedding = async (noteId) => {
  try {
    await notesQueue.add(JOBS.EMBED_NOTE, { noteId });
  } catch (err) {
    console.error(`[queue] embed enqueue failed (note ${noteId}):`, err.message);
  }
};