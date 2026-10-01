import { z } from 'zod';

const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const createNoteSchema = {
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(255),
    content: z.string().trim().min(1, 'Content is required'),
    summary: z.string().trim().max(500).optional(),
  }),
};

export const updateNoteSchema = {
  params: idParam,
  // partial() makes all fields optional (PATCH semantics)
  body: createNoteSchema.body
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
};

export const noteIdSchema = {
  params: idParam,
};

export const listNotesSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
};


export const semanticSearchSchema = {
  query: z.object({
    q: z.string().trim().min(2).max(300),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
};

export const askNotesSchema = {
  body: z.object({
    question: z.string().trim().min(3).max(500),
  }),
};