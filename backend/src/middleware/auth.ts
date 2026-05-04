import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Acesso restrito a administradores' });
    return;
  }
  next();
};

export const requireAdminOrImportador = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'IMPORTADOR') {
    res.status(403).json({ message: 'Acesso restrito a administradores e importadores' });
    return;
  }
  next();
};

export const requireElevated = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const allowed = ['ADMIN', 'IMPORTADOR', 'VALIDADOR'];
  if (!allowed.includes(req.user?.role ?? '')) {
    res.status(403).json({ message: 'Acesso restrito' });
    return;
  }
  next();
};

export const requireValidation = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'VALIDADOR') {
    res.status(403).json({ message: 'Acesso restrito a administradores e validadores' });
    return;
  }
  next();
};
