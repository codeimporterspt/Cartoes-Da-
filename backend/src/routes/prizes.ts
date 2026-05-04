import { Router } from 'express';
import { prizeController } from '../controllers/prizeController';
import { authenticate, requireElevated, requireValidation } from '../middleware/auth';

export const prizeRoutes = Router();

prizeRoutes.get('/', authenticate, prizeController.list);
prizeRoutes.get('/export', authenticate, prizeController.exportExcel);
prizeRoutes.get('/pending', authenticate, requireElevated, prizeController.getPending);
prizeRoutes.post('/approve', authenticate, requireValidation, prizeController.approve);
prizeRoutes.post('/reject', authenticate, requireValidation, prizeController.reject);
prizeRoutes.delete('/:id', authenticate, requireElevated, prizeController.deletePending);
