import prisma from '../../config/prisma.js';

// Repo = only DB access. No business rules, no HTTP.

export const create = (data) => prisma.note.create({ data, omit: { embedding: true } });

export const findById = (id) => prisma.note.findUnique({ where: { id }, omit: { embedding: true } });

export const findMany = async ({ skip, take, search, sortBy, order }) => {
  const where = search
    ? {
      OR: [
        { title: { contains: search } },
        { content: { contains: search } },
      ],
    }
    : {};

  // One transaction: list + total count for pagination
  const [items, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: order },
    }),
    prisma.note.count({ where }),
  ]);

  return { items, total };
};

export const update = (id, data) =>
  prisma.note.update({ where: { id }, data, omit: { embedding: true } });

export const deleteById = (id) => prisma.note.delete({ where: { id } });

// Writes the summary ONLY if the content is still what the AI summarized.
// Returns true if saved, false if the note changed in the meantime.
export const setSummaryIfContentUnchanged = async (id, content, summary) => {
  const { count } = await prisma.note.updateMany({
    where: { id, content },
    data: { summary },
  });
  return count > 0;
};


// Same "only if unchanged" guard as the summary
export const setEmbeddingIfContentUnchanged = async (id, content, embedding) => {
  const { count } = await prisma.note.updateMany({
    where: { id, content },
    data: { embedding },
  });
  return count > 0;
};

// Learning version: load all vectors, compare in Node.
// Replace with a vector DB when you have thousands of notes.
export const findAllEmbedded = async () => {
  const notes = await prisma.note.findMany({
    select: { id: true, title: true, content: true, summary: true, embedding: true },
  });
  return notes.filter((n) => Array.isArray(n.embedding));
};