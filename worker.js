import 'dotenv/config';
import prisma from './src/config/prisma.js';
import redisClient from './src/config/redis.js';
import { createNotesWorker } from './src/modules/notes/notes.worker.js';
// import { createEmailWorker } from './src/modules/email/email.worker.js';

const workers = [createNotesWorker() /*, createEmailWorker() */];
console.log(`[worker] started ${workers.length} worker(s)`);

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} received`);

  const forceExit = setTimeout(() => process.exit(1), 15_000);
  forceExit.unref();

  try {
    // close() waits for active jobs to finish, and takes no new ones
    await Promise.all(workers.map((w) => w.close()));

    if (redisClient.isOpen) await redisClient.quit();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[worker] shutdown error:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));