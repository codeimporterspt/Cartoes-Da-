import { Router } from 'express';
import { cardLoadingController } from '../controllers/cardLoadingController';
import { authenticate, requireElevated } from '../middleware/auth';

export const cardLoadingRoutes = Router();

cardLoadingRoutes.get('/', authenticate, requireElevated, cardLoadingController.list);
cardLoadingRoutes.get('/export', authenticate, requireElevated, cardLoadingController.exportExcel);
