import { Router } from 'express';
import notesRoutes from '../modules/notes/notes.routes.js';
// import usersRoutes from '../modules/users/users.routes.js';

const router = Router();

router.use('/notes', notesRoutes);
// router.use('/users', usersRoutes);

export default router;