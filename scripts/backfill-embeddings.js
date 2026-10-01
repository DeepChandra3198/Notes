import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import { enqueueEmbedding, notesQueue } from '../src/modules/notes/notes.queue.js';

const notes = await prisma.note.findMany({ select: { id: true } });
for (const { id } of notes) await enqueueEmbedding(id);

console.log(`Queued ${notes.length} notes`);
await notesQueue.close();
await prisma.$disconnect();