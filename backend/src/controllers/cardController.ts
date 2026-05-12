import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { emailService } from '../services/emailService';
import { exportToExcel } from '../utils/excel';

export const cardController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const { userId, concessaoId, status, search, brand } = req.query;
    const isAdmin = req.user!.role === 'ADMIN';
    const isImportador = req.user!.role === 'IMPORTADOR';
    const isElevated = isAdmin || isImportador;
    const importadorBrands = isImportador && req.user!.brands ? req.user!.brands.split(',').filter(Boolean) : [];
    const filterUserId = isElevated ? (userId ? String(userId) : undefined) : req.user!.id;
    const brandWhere = brand
      ? { concessao: { brand: String(brand) } }
      : isImportador && importadorBrands.length > 0
        ? { concessao: { brand: { in: importadorBrands } } }
        : {};

    const cards = await prisma.card.findMany({
      where: {
        ...(filterUserId && { userId: filterUserId }),
        ...(isElevated && brandWhere),
        ...(concessaoId && { concessaoId: String(concessaoId) }),
        ...(status && { status: status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' }),
        ...(search && {
          OR: [
            { cardNumber: { contains: String(search) } },
            { user: { name: { contains: String(search) } } },
            { user: { email: { contains: String(search) } } },
          ],
        }),
      },
      include: {
        user: { include: { concessao: true } },
        concessao: true,
        balanceHistory: {
          include: { updatedBy: { select: { name: true, role: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        },
        loadingHistory: {
          orderBy: { loadedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(cards);
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const card = await prisma.card.findUnique({
      where: { id: req.params.id },
      include: {
        user: { include: { concessao: true } },
        concessao: true,
        balanceHistory: {
          include: { updatedBy: { select: { name: true } } },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const isElevated = req.user!.role === 'ADMIN' || req.user!.role === 'IMPORTADOR';
    if (!isElevated && card.userId !== req.user!.id) {
      res.status(403).json({ message: 'Acesso negado' });
      return;
    }

    res.json(card);
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { concessaoId, cardNumber, seriesNumber } = req.body;
    const isElevated = req.user!.role === 'ADMIN' || req.user!.role === 'IMPORTADOR';
    const userId = isElevated && req.body.userId ? req.body.userId : req.user!.id;

    if (!isElevated) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { concessaoIds: true } });
      const allowed = dbUser?.concessaoIds ? dbUser.concessaoIds.split(',').filter(Boolean) : [];
      if (!allowed.includes(concessaoId)) {
        res.status(403).json({ message: 'Não tem acesso a esta concessão' });
        return;
      }
    }

    if (!cardNumber || !/^\d{19}$/.test(cardNumber)) {
      res.status(400).json({ message: 'O número de cartão deve ter exatamente 19 dígitos numéricos' });
      return;
    }

    if (!seriesNumber || !/^\d{10}$/.test(seriesNumber)) {
      res.status(400).json({ message: 'O número de série deve ter exatamente 10 dígitos numéricos' });
      return;
    }

    const existing = await prisma.card.findFirst({ where: { cardNumber } });
    if (existing) {
      res.status(409).json({ message: 'Número de cartão já registado' });
      return;
    }

    const declarationUrl = req.file
      ? `uploads/declarations/${req.file.filename}`
      : undefined;

    const card = await prisma.card.create({
      data: { userId, concessaoId, cardNumber, seriesNumber, declarationUrl, status: 'PENDING' },
      include: { user: true, concessao: true },
    });

    try {
      await emailService.cardDeclarationSubmitted(card.user.name, cardNumber);
    } catch (err) {
      console.error('Email notification failed:', err);
    }

    res.status(201).json(card);
  },

  async validate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const updated = await prisma.card.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        validatedBy: req.user!.id,
        validatedAt: new Date(),
      },
    });

    try {
      if (status === 'ACTIVE') {
        await emailService.cardApproved(card.user.email, card.user.name, card.cardNumber);
      } else if (status === 'REJECTED') {
        await emailService.cardRejected(card.user.email, card.user.name, card.cardNumber, rejectionReason);
      }
    } catch (err) {
      console.error('Email notification failed:', err);
    }

    res.json(updated);
  },

  async updateBalance(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { movementValue, notes } = req.body;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const isElevated = req.user!.role === 'ADMIN' || req.user!.role === 'IMPORTADOR';
    if (!isElevated && card.userId !== req.user!.id) {
      res.status(403).json({ message: 'Acesso negado' });
      return;
    }

    if (card.status !== 'ACTIVE') {
      res.status(400).json({ message: 'Apenas cartões ativos podem ter o saldo atualizado' });
      return;
    }

    const newBalance = Number(card.balance) + Number(movementValue);

    await prisma.$transaction([
      prisma.card.update({ where: { id }, data: { balance: newBalance } }),
      prisma.cardBalanceHistory.create({
        data: {
          cardId: id,
          balanceValue: newBalance,
          movementValue: Number(movementValue),
          updatedById: req.user!.id,
          notes,
        },
      }),
    ]);

    try {
      await emailService.cardBalanceUpdated(
        card.user.email,
        card.user.name,
        card.cardNumber,
        Number(movementValue),
        newBalance
      );
    } catch (err) {
      console.error('Email notification failed:', err);
    }

    res.json({ message: 'Saldo atualizado', balance: newBalance });
  },

  async inactivate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const isElevated = req.user!.role === 'ADMIN' || req.user!.role === 'IMPORTADOR';
    if (!isElevated && card.userId !== req.user!.id) {
      res.status(403).json({ message: 'Acesso negado' });
      return;
    }

    await prisma.card.update({ where: { id }, data: { status: 'INACTIVE' } });

    res.json({ message: 'Cartão inativado com sucesso' });
  },

  async reactivate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const card = await prisma.card.findUnique({ where: { id }, include: { user: true } });
    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const isElevated = req.user!.role === 'ADMIN' || req.user!.role === 'IMPORTADOR';
    if (!isElevated && card.userId !== req.user!.id) {
      res.status(403).json({ message: 'Acesso negado' });
      return;
    }

    if (card.status !== 'INACTIVE') {
      res.status(400).json({ message: 'Apenas cartões inativos podem ser reativados' });
      return;
    }

    await prisma.card.update({ where: { id }, data: { status: 'ACTIVE' } });

    res.json({ message: 'Cartão reativado com sucesso' });
  },

  async transfer(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { newUserId } = req.body;

    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const newUser = await prisma.user.findUnique({ where: { id: newUserId } });
    if (!newUser) {
      res.status(404).json({ message: 'Utilizador destino não encontrado' });
      return;
    }

    await prisma.card.update({ where: { id }, data: { userId: newUserId } });

    res.json({ message: 'Cartão transferido com sucesso' });
  },

  async exportExcel(req: AuthRequest, res: Response): Promise<void> {
    const { userId, concessaoId, status, brand, view } = req.query;
    const isAdmin = req.user!.role === 'ADMIN';
    const isImportador = req.user!.role === 'IMPORTADOR';
    const isElevated = isAdmin || isImportador;
    const importadorBrands = isImportador && req.user!.brands ? req.user!.brands.split(',').filter(Boolean) : [];
    const filterUserId = isElevated ? (userId ? String(userId) : undefined) : req.user!.id;

    const cardStatusPT: Record<string, string> = {
      PENDING: 'Pendente', ACTIVE: 'Ativo', INACTIVE: 'Inativo', REJECTED: 'Rejeitado',
    };

    const effectiveBrands = brand ? [String(brand)] : isImportador ? importadorBrands : null;
    const brandConcessaoIds = effectiveBrands && isElevated
      ? await prisma.concessao.findMany({ where: { brand: { in: effectiveBrands } }, select: { id: true } })
          .then(cs => cs.map(c => c.id))
      : null;

    if (view === 'admin') {
      const cards = await prisma.card.findMany({
        where: {
          ...(filterUserId && { userId: filterUserId }),
          ...(brandConcessaoIds && { concessaoId: { in: brandConcessaoIds } }),
          ...(concessaoId && { concessaoId: String(concessaoId) }),
          ...(status && { status: status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' }),
        },
        include: { user: { include: { concessao: true } }, concessao: true },
        orderBy: { createdAt: 'desc' },
      });
      await exportToExcel(
        res, 'cartoes',
        [
          { header: 'Utilizador',   key: 'utilizador', width: 30 },
          { header: 'Email',        key: 'email',      width: 30 },
          { header: 'Concessão',    key: 'concessao',  width: 25 },
          { header: 'Nº Cartão',   key: 'cardNumber', width: 20 },
          { header: 'Estado',       key: 'status',     width: 15 },
          { header: 'Declaração',   key: 'declaracao', width: 10 },
          { header: 'Data Criação', key: 'createdAt',  width: 18 },
        ],
        cards.map(c => ({
          utilizador: c.user.name,
          email:      c.user.email,
          concessao:  c.concessao.name,
          cardNumber: c.cardNumber,
          status:     cardStatusPT[c.status] || c.status,
          declaracao: c.declarationUrl ? 'Sim' : 'Não',
          createdAt:  c.createdAt.toLocaleDateString('pt-PT'),
        }))
      );
    } else {
      const cards = await prisma.card.findMany({
        where: {
          ...(filterUserId && { userId: filterUserId }),
          ...(brandConcessaoIds && { concessaoId: { in: brandConcessaoIds } }),
          ...(concessaoId && { concessaoId: String(concessaoId) }),
          ...(status && { status: status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' }),
        },
        include: {
          user: { include: { concessao: true } },
          concessao: true,
          balanceHistory: {
            include: { updatedBy: { select: { role: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          },
          loadingHistory: { orderBy: { loadedAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });

      function latestImportadorDate(c: typeof cards[0]): string {
        const manual = c.balanceHistory.find(h => h.updatedBy.role === 'IMPORTADOR' || h.updatedBy.role === 'ADMIN')?.updatedAt;
        const imported = c.loadingHistory[0]?.loadedAt;
        const latest = manual && imported
          ? (manual > imported ? manual : imported)
          : manual ?? imported;
        return latest ? latest.toLocaleDateString('pt-PT') : '';
      }

      await exportToExcel(
        res, 'saldo_cartoes',
        [
          { header: 'Utilizador',               key: 'utilizador',         width: 30 },
          { header: 'Email',                     key: 'email',              width: 30 },
          { header: 'NIF',                       key: 'nif',                width: 15 },
          { header: 'Dealer Code',               key: 'dealerCode',         width: 15 },
          { header: 'Concessão',                 key: 'concessao',          width: 25 },
          { header: 'Nº Cartão',                key: 'cardNumber',         width: 20 },
          { header: 'Nº Série',                 key: 'seriesNumber',       width: 18 },
          { header: 'Saldo Atual',               key: 'balance',            width: 12 },
          { header: 'Estado',                    key: 'status',             width: 15 },
          { header: 'Data Atualiz. Utilizador',  key: 'dateUser',           width: 22 },
          { header: 'Data Atualiz. Importador',  key: 'dateImportador',     width: 22 },
        ],
        cards.map(c => ({
          utilizador:      c.user.name,
          email:           c.user.email,
          nif:             c.user.nif || '',
          dealerCode:      c.user.concessao?.dealerCode || '',
          concessao:       c.concessao.name,
          cardNumber:      c.cardNumber,
          seriesNumber:    c.seriesNumber,
          balance:         Number(c.balance).toFixed(2),
          status:          cardStatusPT[c.status] || c.status,
          dateUser:        c.balanceHistory.find(h => h.updatedBy.role === 'USER')?.updatedAt?.toLocaleDateString('pt-PT') || '',
          dateImportador:  latestImportadorDate(c),
        }))
      );
    }
  },
};
