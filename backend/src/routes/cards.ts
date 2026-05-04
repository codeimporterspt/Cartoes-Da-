import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { cardController } from '../controllers/cardController';
import { authenticate, requireElevated } from '../middleware/auth';
import { AuthRequest } from '../types';

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, '../../uploads/declarations')),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (_, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

export const cardRoutes = Router();

cardRoutes.get('/', authenticate, cardController.list);
cardRoutes.get('/export', authenticate, cardController.exportExcel);
cardRoutes.get('/declaration-template', authenticate, (_req: AuthRequest, res: Response) => {
  const file = path.join(__dirname, '../../static/declaracao_template.rtf');
  res.download(file, 'declaracao_cartao_da.rtf');
});
cardRoutes.get('/:id', authenticate, cardController.getById);
cardRoutes.post('/', authenticate, upload.single('declaration'), cardController.create);
cardRoutes.put('/:id/validate', authenticate, requireElevated, cardController.validate);
cardRoutes.put('/:id/balance', authenticate, cardController.updateBalance);
cardRoutes.put('/:id/inactivate', authenticate, cardController.inactivate);
cardRoutes.put('/:id/reactivate', authenticate, cardController.reactivate);
cardRoutes.put('/:id/transfer', authenticate, requireElevated, cardController.transfer);
