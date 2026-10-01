import * as notesRepo from './notes.repo.js';
import * as notesCache from './notes.cache.js';
import * as notesQueue from './notes.queue.js';
import { remember } from '../../common/utils/cache.js';
import { NotFoundError } from '../../common/errors/AppError.js';
import * as notesAi from './notes.ai.js';
const SHORT_NOTE_LIMIT = 150;


import { cosineSimilarity } from '../../common/utils/vector.js';
const MIN_SCORE = 0.3; // depends on the embedding model; tune by testing
const embeddingText = (note) => `${note.title}\n${note.content}`;


const getNoteFromDbOrThrow = async (id) => {
  const note = await notesRepo.findById(id);
  if (!note) throw new NotFoundError('Note');
  return note;
};

// Later, replace this with an LLM call. That is what makes it worth queueing.
const buildSummary = (content) =>
  content.length > 150 ? `${content.slice(0, 147)}...` : content;

export const createNote = async (input) => {
  const note = await notesRepo.create({
    ...input,
    summary: input.summary ?? null, // no more inline summary
  });

  await notesCache.invalidateLists();

  // Enqueue AFTER the DB write, so the worker can always find the row
  if (!note.summary) await notesQueue.enqueueSummary(note.id);
  
  await notesQueue.enqueueEmbedding(note.id);


  return note;
};

export const getNoteById = async (id) => {
  const note = await remember(
    notesCache.noteKey(id),
    notesCache.NOTE_TTL,
    () => notesRepo.findById(id)
  );
  if (!note) throw new NotFoundError('Note');
  return note;
};

export const listNotes = async ({ page, limit, search, sortBy, order }) => {
  const version = await notesCache.getListVersion();
  const key = notesCache.listKey(version, { page, limit, search, sortBy, order });

  return remember(key, notesCache.LIST_TTL, async () => {
    const { items, total } = await notesRepo.findMany({
      skip: (page - 1) * limit,
      take: limit,
      search,
      sortBy,
      order,
    });

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
};

export const updateNote = async (id, input) => {
  await getNoteFromDbOrThrow(id);

  // Content changed and no new summary sent: the old summary is stale,
  // so clear it and let the worker regenerate it
  const needsSummary = input.content && input.summary === undefined;
  const data = needsSummary ? { ...input, summary: null } : input;

  const note = await notesRepo.update(id, data);

  await Promise.all([
    notesCache.invalidateNote(id),
    notesCache.invalidateLists(),
  ]);

  if (needsSummary) await notesQueue.enqueueSummary(id);
  if (input.title || input.content) await notesQueue.enqueueEmbedding(id);

  return note;
};

export const deleteNote = async (id) => {
  await getNoteFromDbOrThrow(id);
  await notesRepo.deleteById(id);

  await Promise.all([
    notesCache.invalidateNote(id),
    notesCache.invalidateLists(),
  ]);
};

/**
 * Called by the worker, not by HTTP.
 * Must be IDEMPOTENT: retries and duplicates must be safe to run twice.
 */
const refreshCache = (id) =>
  Promise.all([notesCache.invalidateNote(id), notesCache.invalidateLists()]);

/**
 * Called by the worker. Idempotent: safe to run twice.
 * Important: no DB transaction is open during the slow AI call.
 */
export const generateSummary = async (id) => {
  const note = await notesRepo.findById(id);

  if (!note) return;        // deleted meanwhile: nothing to do
  if (note.summary) return; // already done: no-op, no AI cost

  const summary =
    note.content.length <= SHORT_NOTE_LIMIT
      ? note.content
      : await notesAi.summarize(note.content);

  const saved = await notesRepo.setSummaryIfContentUnchanged(
    id,
    note.content,
    summary
  );

  if (!saved) {
    // The note changed while the AI was working. Throwing makes BullMQ retry
    // the job, which re-reads the fresh content and summarizes that instead.
    throw new Error(`Note ${id} changed during summarization, retrying`);
  }

  await refreshCache(id);
};

/**
 * Last resort when the AI keeps failing: use the cheap truncation.
 * A note with a basic summary is better than one with none.
 */
export const applyFallbackSummary = async (id) => {
  const note = await notesRepo.findById(id);
  if (!note || note.summary) return;

  const saved = await notesRepo.setSummaryIfContentUnchanged(
    id,
    note.content,
    buildSummary(note.content)
  );
  if (saved) await refreshCache(id);
};



/** Called by the worker. Idempotent. */
export const embedNote = async (id) => {
  const note = await notesRepo.findById(id);
  if (!note) return;

  const vector = await notesAi.embed(embeddingText(note));
  const saved = await notesRepo.setEmbeddingIfContentUnchanged(id, note.content, vector);

  if (!saved) throw new Error(`Note ${id} changed during embedding, retrying`);
  // No cache invalidation: the embedding is never returned by the API.
};

// Shared by search and ask: the "R" in RAG
const retrieve = async (query, limit) => {
  const [queryVector, notes] = await Promise.all([
    notesAi.embed(query),
    notesRepo.findAllEmbedded(),
  ]);

  return notes
    .map(({ embedding, ...note }) => ({
      ...note,
      score: cosineSimilarity(queryVector, embedding),
    }))
    .filter((n) => n.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

export const semanticSearch = async (q, limit) => {
  const hits = await retrieve(q, limit);
  return hits.map(({ id, title, summary, score }) => ({ id, title, summary, score }));
};

export const askNotes = async (question) => {
  const hits = await retrieve(question, 4);

  if (hits.length === 0) {
    return { answer: 'I could not find any relevant notes.', sources: [] };
  }

  const answer = await notesAi.answerFromNotes(question, hits);
  return {
    answer,
    sources: hits.map(({ id, title, score }) => ({ id, title, score })),
  };
};