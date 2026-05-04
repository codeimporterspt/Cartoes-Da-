import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

function makeToken(payload: { id: string; email: string; role: string; name: string; brands?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' } as any);
}

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email e password são obrigatórios' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { concessao: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: 'Credenciais inválidas' });
      return;
    }

    if (user.status === 'PENDING') {
      res.status(403).json({ message: 'A tua conta aguarda aprovação de um administrador.' });
      return;
    }

    if (user.status === 'REJECTED') {
      res.status(403).json({ message: 'A tua conta foi rejeitada. Contacta o administrador.' });
      return;
    }

    if (user.status === 'INACTIVE') {
      res.status(403).json({ message: 'A tua conta foi desativada. Contacta o administrador.' });
      return;
    }

    const token = makeToken({ id: user.id, email: user.email, role: user.role, name: user.name, brands: user.brands || '' });

    const concessaoIds = user.concessaoIds ? user.concessaoIds.split(',').filter(Boolean) : [];
    const concessoes = concessaoIds.length
      ? await prisma.concessao.findMany({ where: { id: { in: concessaoIds } } })
      : [];

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        brands: user.brands ? user.brands.split(',').filter(Boolean) : [],
        concessaoIds,
        nif: user.nif,
        concessao: user.concessao,
        concessoes,
      },
    });
  },

  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, nif, concessaoIds, brands } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Nome, email e password são obrigatórios' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'A password deve ter pelo menos 6 caracteres' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.status !== 'REJECTED') {
        res.status(409).json({ message: 'Este email já está registado' });
        return;
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const brandsStr = Array.isArray(brands) ? brands.filter(Boolean).join(',') : '';
    const ids = Array.isArray(concessaoIds) ? concessaoIds.filter(Boolean) : [];

    if (nif) {
      const nifTaken = await prisma.user.findFirst({
        where: {
          nif, deletedAt: null, status: { not: 'REJECTED' },
          ...(existing ? { NOT: { id: existing.id } } : {}),
        },
      });
      if (nifTaken) {
        res.status(409).json({ message: 'Este NIF já está registado' });
        return;
      }
    }

    if (existing) {
      // Reactivate rejected account with fresh data
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          password: hashed,
          role: 'USER',
          status: 'PENDING',
          brands: '',
          pendingBrands: brandsStr,
          concessaoIds: ids.join(','),
          concessaoId: ids[0] || null,
          nif: nif || null,
          deletedAt: null,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashed,
          role: 'USER',
          status: 'PENDING',
          brands: '',
          pendingBrands: brandsStr,
          concessaoIds: ids.join(','),
          concessaoId: ids[0] || null,
          nif: nif || null,
        },
      });
    }

    res.status(201).json({
      pending: true,
      message: 'Registo efetuado com sucesso. A tua conta aguarda aprovação de um administrador.',
    });
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { concessao: true },
    });

    if (!user) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    const concessaoIds = user.concessaoIds ? user.concessaoIds.split(',').filter(Boolean) : [];
    const concessoes = concessaoIds.length
      ? await prisma.concessao.findMany({ where: { id: { in: concessaoIds } } })
      : [];

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      brands: user.brands ? user.brands.split(',').filter(Boolean) : [],
      concessaoIds,
      nif: user.nif,
      concessao: user.concessao,
      concessoes,
    });
  },

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json({ message: 'Password atual incorreta' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ message: 'Password alterada com sucesso' });
  },
};
