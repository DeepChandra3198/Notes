import 'dotenv/config'; // must be first: loads .env before other modules read process.env
import app from './app.js';
import prisma from './src/config/prisma.js';
import redisClient from './src/config/redis.js';
import { notesQueue } from './src/modules/notes/notes.queue.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () =>
  console.log(`Server running on :${PORT}`)
);

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received`);

  const forceExit = setTimeout(() => {
    console.error('[shutdown] timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    // 1. Stop accepting new requests, wait for in-flight ones to finish
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );

    // 2. Then close the resources those requests were using
    await notesQueue.close();
    if (redisClient.isOpen) await redisClient.quit();
    await prisma.$disconnect();

    console.log('[shutdown] clean exit');
    process.exit(0);
  } catch (err) {
    console.error('[shutdown] error:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));