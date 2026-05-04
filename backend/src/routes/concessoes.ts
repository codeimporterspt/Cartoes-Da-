import { Router } from 'express';
import { authenticate, requireAdminOrImportador } from '../middleware/auth';
import prisma from '../utils/prisma';

export const concessaoRoutes = Router();

concessaoRoutes.get('/', async (req, res) => {
  const brand = req.query.brand as string | undefined;
  const concessoes = await prisma.concessao.findMany({
    where: brand ? { brand } : undefined,
    orderBy: { name: 'asc' },
  });
  res.json(concessoes);
});

concessaoRoutes.post('/', authenticate, requireAdminOrImportador, async (req, res) => {
  const { name, dealerCode, brand = 'hyundai' } = req.body;
  const existing = await prisma.concessao.findUnique({ where: { dealerCode } });
  if (existing) {
    res.status(409).json({ message: 'Código dealer já existe' });
    return;
  }
  const concessao = await prisma.concessao.create({ data: { name, dealerCode, brand } });
  res.status(201).json(concessao);
});

concessaoRoutes.put('/:id', authenticate, requireAdminOrImportador, async (req, res) => {
  const { name, dealerCode, brand } = req.body;
  const concessao = await prisma.concessao.update({
    where: { id: req.params.id },
    data: { name, dealerCode, ...(brand ? { brand } : {}) },
  });
  res.json(concessao);
});

concessaoRoutes.delete('/:id', authenticate, requireAdminOrImportador, async (req, res) => {
  await prisma.concessao.delete({ where: { id: req.params.id } });
  res.json({ message: 'Concessão eliminada' });
});
