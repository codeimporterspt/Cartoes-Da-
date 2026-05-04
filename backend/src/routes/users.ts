import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, requireElevated } from '../middleware/auth';

export const userRoutes = Router();

userRoutes.get('/', authenticate, requireElevated, userController.list);
userRoutes.get('/:id', authenticate, userController.getById);
userRoutes.post('/', authenticate, requireElevated, userController.create);
userRoutes.put('/:id', authenticate, requireElevated, userController.update);
userRoutes.delete('/:id', authenticate, requireElevated, userController.delete);
userRoutes.put('/:id/reset-password', authenticate, requireElevated, userController.resetPassword);
userRoutes.put('/:id/approve', authenticate, requireElevated, userController.approve);
userRoutes.put('/:id/reject', authenticate, requireElevated, userController.reject);
userRoutes.put('/:id/deactivate', authenticate, requireElevated, userController.deactivate);
userRoutes.put('/:id/reactivate', authenticate, requireElevated, userController.reactivate);
