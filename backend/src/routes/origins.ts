import { Router } from 'express';
import { originController } from '../controllers/originController';
import { authenticate, requireElevated } from '../middleware/auth';

export const originRoutes = Router();

originRoutes.get('/', authenticate, originController.list);
originRoutes.get('/export', authenticate, requireElevated, originController.exportExcel);
originRoutes.post('/', authenticate, requireElevated, originController.create);
originRoutes.put('/:id', authenticate, requireElevated, originController.update);
originRoutes.delete('/:id', authenticate, requireElevated, originController.delete);
