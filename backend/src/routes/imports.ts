import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { importController } from '../controllers/importController';
import { authenticate, requireElevated } from '../middleware/auth';

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, '../../uploads/imports')),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
});

export const importRoutes = Router();

importRoutes.get('/', authenticate, requireElevated, importController.listImports);
importRoutes.get('/template/:type', authenticate, importController.downloadTemplate);
importRoutes.get('/last-file/:type', authenticate, requireElevated, importController.downloadLastFile);
importRoutes.post('/prizes', authenticate, requireElevated, upload.single('file'), importController.importPrizes);
importRoutes.post('/prizes-aftersales', authenticate, requireElevated, upload.single('file'), importController.importPrizesAftersales);
importRoutes.post('/topup', authenticate, requireElevated, upload.single('file'), importController.importCardTopup);
importRoutes.post('/origins', authenticate, requireElevated, upload.single('file'), importController.importOrigins);
importRoutes.post('/concessoes', authenticate, requireElevated, upload.single('file'), importController.importConcessoes);
