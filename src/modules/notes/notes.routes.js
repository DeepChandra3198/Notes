import { Router } from 'express';
import * as notesController from './notes.controller.js';
import { validate } from '../../common/middlewares/validate.js';
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  listNotesSchema,
  semanticSearchSchema, 
  askNotesSchema
} from './notes.validation.js';

const router = Router();

router.get('/semantic-search', validate(semanticSearchSchema), notesController.semanticSearch);
router.post('/ask', validate(askNotesSchema), notesController.askNotes);

router
  .route('/')
  .get(validate(listNotesSchema), notesController.listNotes)
  .post(validate(createNoteSchema), notesController.createNote);

router
  .route('/:id')
  .get(validate(noteIdSchema), notesController.getNoteById)
  .patch(validate(updateNoteSchema), notesController.updateNote)
  .delete(validate(noteIdSchema), notesController.deleteNote);

export default router;