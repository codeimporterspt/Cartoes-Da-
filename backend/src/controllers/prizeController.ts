import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
// Prisma type alias for SQLite string-based status fields
type PrizeWhere = Prisma.PrizeWhereInput;
import { AuthRequest } from '../types';
import { emailService } from '../services/emailService';
import { exportToExcel } from '../utils/excel';

export const prizeController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const { userId, concessaoId, area, originId, year, month, status, search, brand } = req.query;
    const isAdmin = req.user!.role === 'ADMIN';
    const isImportador = req.user!.role === 'IMPORTADOR';
    const isElevated = isAdmin || isImportador;
    const importadorBrands = isImportador && req.user!.brands ? req.user!.brands.split(',').filter(Boolean) : [];
    const filterUserId = isElevated ? (userId ? String(userId) : undefined) : req.user!.id;

    const where: Prisma.PrizeWhereInput = {};
    if (filterUserId) where.userId = filterUserId;
    if (brand && isElevated) {
      where.concessao = { brand: String(brand) };
    } else if (isImportador && importadorBrands.length > 0) {
      where.concessao = { brand: { in: importadorBrands } };
    }
    if (concessaoId) where.concessaoId = String(concessaoId);
    if (area) where.area = { contains: String(area) };
    if (originId) where.originId = String(originId);
    if (status) where.status = status as string;

    if (year || month) {
      const y = year ? parseInt(String(year)) : undefined;
      const m = month ? parseInt(String(month)) : undefined;
      where.importDate = {
        gte: new Date(y || 2000, (m ? m - 1 : 0), 1),
        lt: m
          ? new Date(y || 2000, m, 1)
          : new Date((y || 2000) + 1, 0, 1),
      };
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: String(search) } } },
        { user: { email: { contains: String(search) } } },
        { area: { contains: String(search) } },
      ];
    }

    const prizes = await prisma.prize.findMany({
      where,
      include: {
        user: { include: { concessao: true } },
        concessao: true,
        origin: true,
      },
      orderBy: { importDate: 'desc' },
    });

    res.json(prizes);
  },

  async getPending(req: AuthRequest, res: Response): Promise<void> {
    const { userId, concessaoId, area, originId, search, brand } = req.query;
    const isImportador = req.user!.role === 'IMPORTADOR';
    const importadorBrands = isImportador && req.user!.brands ? req.user!.brands.split(',').filter(Boolean) : [];
    const brandFilter = brand
      ? { concessao: { brand: String(brand) } }
      : isImportador && importadorBrands.length > 0
        ? { concessao: { brand: { in: importadorBrands } } }
        : {};

    const prizes = await prisma.prize.findMany({
      where: {
        status: 'PENDENTE',
        ...brandFilter,
        ...(userId && { userId: String(userId) }),
        ...(concessaoId && { concessaoId: String(concessaoId) }),
        ...(area && { area: { contains: String(area) } }),
        ...(originId && { originId: String(originId) }),
        ...(search && {
          OR: [
            { user: { name: { contains: String(search) } } },
            { user: { email: { contains: String(search) } } },
            { area: { contains: String(search) } },
          ],
        }),
      },
      include: {
        user: { include: { concessao: true } },
        concessao: true,
        origin: true,
      },
      orderBy: { importDate: 'desc' },
    });

    const total = prizes.reduce((sum, p) => sum + Number(p.value), 0);

    res.json({ prizes, total });
  },

  async approve(req: AuthRequest, res: Response): Promise<void> {
    const { ids } = req.body;
    const now = new Date();

    // Prizes that already have a paymentDate go straight to CARREGADO
    await prisma.prize.updateMany({
      where: { id: { in: ids }, status: 'PENDENTE', paymentDate: { not: null } },
      data: { status: 'CARREGADO', validationDate: now, validatedById: req.user!.id },
    });

    await prisma.prize.updateMany({
      where: { id: { in: ids }, status: 'PENDENTE', paymentDate: null },
      data: { status: 'VALIDADO', validationDate: now, validatedById: req.user!.id },
    });

    const count = ids.length;
    const prizes = await prisma.prize.findMany({
      where: { id: { in: ids } },
      select: { value: true },
    });
    const totalValue = prizes.reduce((sum, p) => sum + Number(p.value), 0);

    try {
      await emailService.prizeValidationApproved(
        [process.env.FINANCE_EMAIL || 'finance@hyundai.pt'],
        count,
        totalValue
      );
    } catch (err) {
      console.error('Email notification failed:', err);
    }

    res.json({ message: `${count} prémio(s) aprovado(s)` });
  },

  async reject(req: AuthRequest, res: Response): Promise<void> {
    const { ids, reason } = req.body;

    if (!reason) {
      res.status(400).json({ message: 'Motivo de rejeição é obrigatório' });
      return;
    }

    const prizes = await prisma.prize.findMany({
      where: { id: { in: ids } },
      include: { user: true },
    });

    await prisma.prize.updateMany({
      where: { id: { in: ids }, status: 'PENDENTE' },
      data: {
        status: 'REJEITADO',
        rejectionReason: reason,
        validatedById: req.user!.id,
      },
    });

    try {
      const uniqueUsers = [...new Map(prizes.map(p => [p.userId, p.user])).values()];
      for (const user of uniqueUsers) {
        await emailService.prizeValidationRejected(user.email, user.name, reason);
      }
    } catch (err) {
      console.error('Email notification failed:', err);
    }

    res.json({ message: `${ids.length} prémio(s) rejeitado(s)` });
  },

  async deletePending(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const prize = await prisma.prize.findUnique({ where: { id } });
    if (!prize) {
      res.status(404).json({ message: 'Prémio não encontrado' });
      return;
    }
    if (prize.status !== 'PENDENTE') {
      res.status(400).json({ message: 'Só é possível eliminar prémios pendentes de validação' });
      return;
    }

    await prisma.prize.delete({ where: { id } });
    res.json({ message: 'Prémio eliminado' });
  },

  async annul(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const prize = await prisma.prize.findUnique({ where: { id } });
    if (!prize) {
      res.status(404).json({ message: 'Prémio não encontrado' });
      return;
    }
    if (prize.status !== 'PENDENTE') {
      res.status(400).json({ message: 'Apenas prémios pendentes podem ser anulados' });
      return;
    }

    await prisma.prize.update({ where: { id }, data: { status: 'ANULADO' } });
    res.json({ message: 'Prémio anulado com sucesso' });
  },

  async exportExcel(req: AuthRequest, res: Response): Promise<void> {
    const { userId, concessaoId, area, originId, year, month, status, brand, view } = req.query;
    const isAdmin = req.user!.role === 'ADMIN';
    const isImportador = req.user!.role === 'IMPORTADOR';
    const isElevated = isAdmin || isImportador;
    const importadorBrands = isImportador && req.user!.brands ? req.user!.brands.split(',').filter(Boolean) : [];
    const filterUserId = isElevated ? (userId ? String(userId) : undefined) : req.user!.id;

    const prizeStatusPT: Record<string, string> = {
      PENDENTE: 'Pendente de Validação', VALIDADO: 'Validado',
      CARREGADO: 'Carregado', REJEITADO: 'Rejeitado',
    };

    const effectiveBrands = brand ? [String(brand)] : isImportador ? importadorBrands : null;
    const brandConcessaoIds = effectiveBrands && isElevated
      ? await prisma.concessao.findMany({ where: { brand: { in: effectiveBrands } }, select: { id: true } })
          .then(cs => cs.map(c => c.id))
      : null;

    const prizes = await prisma.prize.findMany({
      where: {
        ...(filterUserId && { userId: filterUserId }),
        ...(brandConcessaoIds && { concessaoId: { in: brandConcessaoIds } }),
        ...(concessaoId && { concessaoId: String(concessaoId) }),
        ...(area && { area: String(area) }),
        ...(originId && { originId: String(originId) }),
        ...(status && { status: status as string }),
      },
      include: { user: { include: { concessao: true } }, concessao: true, origin: true },
      orderBy: { importDate: 'desc' },
    });

    if (view === 'validation') {
      // ValidationPage: Utilizador, Concessão, Área, Origem, Matrícula, Modelo, Valor, Período, Data Importação, Estado
      await exportToExcel(
        res, 'premios_pendentes',
        [
          { header: 'Utilizador',      key: 'user',       width: 30 },
          { header: 'Concessão',       key: 'concessao',  width: 25 },
          { header: 'Área',            key: 'area',       width: 20 },
          { header: 'Origem',          key: 'origin',     width: 20 },
          { header: 'Matrícula',       key: 'matricula',  width: 15 },
          { header: 'Modelo',          key: 'modelo',     width: 20 },
          { header: 'Valor',           key: 'value',      width: 12 },
          { header: 'Período',         key: 'period',     width: 12 },
          { header: 'Data Importação', key: 'importDate', width: 18 },
          { header: 'Estado',          key: 'status',     width: 22 },
        ],
        prizes.map(p => ({
          user:       p.user.name,
          concessao:  p.concessao.name,
          area:       p.area || '',
          origin:     p.origin?.name || '',
          matricula:  p.origin?.matricula || '',
          modelo:     p.origin?.modelo || '',
          value:      Number(p.value).toFixed(2),
          period:     p.period,
          importDate: p.importDate.toLocaleDateString('pt-PT'),
          status:     prizeStatusPT[p.status] || p.status,
        }))
      );
    } else {
      // PrizesPage: Utilizador, Email, Concessão, Área, Origem, Matrícula, Modelo, Valor, Período, Estado, Data Importação, Data Validação, Data Pagamento
      await exportToExcel(
        res, 'premios',
        [
          { header: 'Utilizador',      key: 'user',            width: 30 },
          { header: 'Email',           key: 'email',           width: 30 },
          { header: 'Concessão',       key: 'concessao',       width: 25 },
          { header: 'Área',            key: 'area',            width: 20 },
          { header: 'Origem',          key: 'origin',          width: 20 },
          { header: 'Matrícula',       key: 'matricula',       width: 15 },
          { header: 'Modelo',          key: 'modelo',          width: 20 },
          { header: 'Valor',           key: 'value',           width: 12 },
          { header: 'Período',         key: 'period',          width: 12 },
          { header: 'Estado',          key: 'status',          width: 22 },
          { header: 'Data Importação', key: 'importDate',      width: 18 },
          { header: 'Data Validação',  key: 'validationDate',  width: 18 },
          { header: 'Data Pagamento',  key: 'paymentDate',     width: 18 },
        ],
        prizes.map(p => ({
          user:           p.user.name,
          email:          p.user.email,
          concessao:      p.concessao.name,
          area:           p.area || '',
          origin:         p.origin?.name || '',
          matricula:      p.origin?.matricula || '',
          modelo:         p.origin?.modelo || '',
          value:          Number(p.value).toFixed(2),
          period:         p.period,
          status:         prizeStatusPT[p.status] || p.status,
          importDate:     p.importDate.toLocaleDateString('pt-PT'),
          validationDate: p.validationDate?.toLocaleDateString('pt-PT') || '',
          paymentDate:    p.paymentDate?.toLocaleDateString('pt-PT') || '',
        }))
      );
    }
  },
};
