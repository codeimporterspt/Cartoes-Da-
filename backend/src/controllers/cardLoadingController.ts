import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { exportToExcel } from '../utils/excel';

export const cardLoadingController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const { userId, startDate, endDate, originId, search, brand } = req.query;

    const history = await prisma.cardLoadingHistory.findMany({
      where: {
        ...(userId && { userId: String(userId) }),
        ...(brand && { user: { concessao: { brand: String(brand) } } }),
        ...(originId && { originId: String(originId) }),
        ...(startDate || endDate ? {
          loadedAt: {
            ...(startDate && { gte: new Date(String(startDate)) }),
            ...(endDate && { lte: new Date(String(endDate) + 'T23:59:59') }),
          },
        } : {}),
        ...(search && {
          OR: [
            { user: { name: { contains: String(search) } } },
            { card: { cardNumber: { contains: String(search) } } },
          ],
        }),
      },
      include: {
        user: { include: { concessao: true } },
        card: { select: { cardNumber: true } },
        origin: true,
      },
      orderBy: { loadedAt: 'desc' },
    });

    res.json(history);
  },

  async exportExcel(req: AuthRequest, res: Response): Promise<void> {
    const { userId, startDate, endDate, originId, brand } = req.query;

    const brandConcessaoIds = brand
      ? await prisma.concessao.findMany({ where: { brand: String(brand) }, select: { id: true } })
          .then(cs => cs.map(c => c.id))
      : null;

    const history = await prisma.cardLoadingHistory.findMany({
      where: {
        ...(userId && { userId: String(userId) }),
        ...(brandConcessaoIds && { user: { concessaoId: { in: brandConcessaoIds } } }),
        ...(originId && { originId: String(originId) }),
        ...(startDate || endDate ? {
          loadedAt: {
            ...(startDate && { gte: new Date(String(startDate)) }),
            ...(endDate && { lte: new Date(String(endDate) + 'T23:59:59') }),
          },
        } : {}),
      },
      include: {
        user: { include: { concessao: true } },
        card: { select: { cardNumber: true } },
        origin: true,
      },
      orderBy: { loadedAt: 'desc' },
    });

    await exportToExcel(
      res,
      'historico_carregamentos',
      [
        { header: 'Utilizador',      key: 'user',          width: 30 },
        { header: 'Concessão',       key: 'concessao',     width: 25 },
        { header: 'Origem',          key: 'origin',        width: 20 },
        { header: 'Login',           key: 'extranetLogin', width: 30 },
        { header: 'NIF',             key: 'nif',           width: 15 },
        { header: 'Nº Cartão',      key: 'cardNumber',    width: 20 },
        { header: 'Valor Movimento', key: 'movementValue', width: 20 },
        { header: 'Valor Saldo',     key: 'balanceValue',  width: 18 },
        { header: 'Data',            key: 'loadedAt',      width: 18 },
      ],
      history.map(h => ({
        user:          h.user.name,
        concessao:     h.user.concessao?.name || '',
        origin:        h.origin?.name || '',
        extranetLogin: h.extranetLogin || h.user.email,
        nif:           h.user.nif || '',
        cardNumber:    h.card.cardNumber,
        movementValue: Number(h.movementValue).toFixed(2),
        balanceValue:  Number(h.balanceValue).toFixed(2),
        loadedAt:      h.loadedAt.toLocaleDateString('pt-PT'),
      }))
    );
  },
};
