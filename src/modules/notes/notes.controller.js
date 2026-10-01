import * as notesService from './notes.service.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';

// Controller = translate HTTP → service call → HTTP.
// Reads only from req.validated (already parsed & typed).

export const createNote = asyncHandler(async (req, res) => {
  const note = await notesService.createNote(req.validated.body);
  res.status(201).json({ success: true, data: note });
});

export const getNoteById = asyncHandler(async (req, res) => {
  const note = await notesService.getNoteById(req.validated.params.id);
  res.status(200).json({ success: true, data: note });
});

export const listNotes = asyncHandler(async (req, res) => {
  const { items, meta } = await notesService.listNotes(req.validated.query);
  res.status(200).json({ success: true, data: items, meta });
});

export const updateNote = asyncHandler(async (req, res) => {
  const note = await notesService.updateNote(
    req.validated.params.id,
    req.validated.body
  );
  res.status(200).json({ success: true, data: note });
});

export const deleteNote = asyncHandler(async (req, res) => {
  await notesService.deleteNote(req.validated.params.id);
  res.status(204).send();
});


export const semanticSearch = asyncHandler(async (req, res) => {
  const { q, limit } = req.validated.query;
  const data = await notesService.semanticSearch(q, limit);
  res.status(200).json({ success: true, data });
});

export const askNotes = asyncHandler(async (req, res) => {
  const data = await notesService.askNotes(req.validated.body.question);
  res.status(200).json({ success: true, data });
});