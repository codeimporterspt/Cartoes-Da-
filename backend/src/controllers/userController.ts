import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { emailService } from '../services/emailService';

function parseList(raw: string): string[] {
  return raw ? raw.split(',').filter(Boolean) : [];
}

function serializeList(arr: unknown): string {
  if (!Array.isArray(arr)) return '';
  return arr.filter(Boolean).join(',');
}

async function fetchConcessoes(idsStr: string) {
  const ids = parseList(idsStr);
  if (!ids.length) return [];
  return prisma.concessao.findMany({ where: { id: { in: ids } } });
}

function userShape(
  u: {
    id: string; name: string; email: string; role: string; status: string;
    brands: string; pendingBrands: string; concessaoIds: string; nif: string | null;
    concessao: unknown; createdAt: Date; deactivatedAt?: Date | null;
  },
  concessoes: unknown[] = [],
) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    brands: parseList(u.brands),
    pendingBrands: parseList(u.pendingBrands),
    concessaoIds: parseList(u.concessaoIds),
    concessoes,
    nif: u.nif,
    concessao: u.concessao,
    createdAt: u.createdAt,
    deactivatedAt: u.deactivatedAt ?? null,
  };
}

export const userController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const { search, concessaoId, role, brand, status, hasPendingBrands } = req.query;
    const isImportador = req.user!.role === 'IMPORTADOR';

    // Always read IMPORTADOR brands from DB to avoid stale JWT
    let importadorBrands: string[] = [];
    if (isImportador) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { brands: true } });
      importadorBrands = parseList(dbUser?.brands ?? '');
      if (importadorBrands.length === 0) {
        res.json([]);
        return;
      }
    }

    const effectiveBrand = brand ? String(brand) : null;
    const brandsToFilter = effectiveBrand
      ? [effectiveBrand]
      : isImportador && importadorBrands.length > 0 ? importadorBrands : null;

    const brandConcessaoIds = brandsToFilter && hasPendingBrands !== 'true'
      ? await prisma.concessao.findMany({ where: { brand: { in: brandsToFilter } }, select: { id: true } })
          .then(cs => cs.map(c => c.id))
      : null;

    const andConditions: object[] = [];

    if (hasPendingBrands === 'true') {
      // Pending brands query: filter users who still have brands awaiting approval
      if (isImportador && importadorBrands.length) {
        andConditions.push({ OR: importadorBrands.map(b => ({ pendingBrands: { contains: b } })) });
      } else {
        andConditions.push({ pendingBrands: { not: '' } });
      }
    } else if (brandsToFilter) {
      // For IMPORTADOR (or explicit brand filter): show only users who share at least one brand
      const brandMatchers = brandsToFilter.map(b => ({ brands: { contains: b } }));
      const concessaoMatchers = brandConcessaoIds
        ? [
            { concessaoId: { in: brandConcessaoIds } },
            ...brandConcessaoIds.map(id => ({ concessaoIds: { contains: id } })),
          ]
        : [];
      andConditions.push({ OR: [...brandMatchers, ...concessaoMatchers] });
    }

    if (search) {
      andConditions.push({ OR: [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
        { nif: { contains: String(search) } },
      ]});
    }

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        AND: andConditions,
        ...(concessaoId && { concessaoId: String(concessaoId) }),
        ...(role && { role: role as string }),
        ...(status && { status: String(status) }),
      },
      include: { concessao: true },
      orderBy: { name: 'asc' },
    });

    // Batch-fetch all concessões referenced in concessaoIds
    const allIds = [...new Set(users.flatMap(u => parseList(u.concessaoIds)))];
    const allConcessoes = allIds.length
      ? await prisma.concessao.findMany({ where: { id: { in: allIds } } })
      : [];
    const concessaoMap = Object.fromEntries(allConcessoes.map(c => [c.id, c]));

    res.json(users.map(u =>
      userShape(u, parseList(u.concessaoIds).map(id => concessaoMap[id]).filter(Boolean))
    ));
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { concessao: true },
    });

    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    const concessoes = await fetchConcessoes(user.concessaoIds);
    res.json(userShape(user, concessoes));
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, email, password, role, nif, brands, concessaoIds } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: 'Email já registado' });
      return;
    }

    if (nif) {
      const nifTaken = await prisma.user.findFirst({ where: { nif, deletedAt: null, status: { not: 'REJECTED' } } });
      if (nifTaken) {
        res.status(409).json({ message: 'NIF já registado' });
        return;
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const ids = Array.isArray(concessaoIds) ? concessaoIds.filter(Boolean) : [];

    const user = await prisma.user.create({
      data: {
        name, email, password: hashed,
        role: role || 'USER',
        status: 'ACTIVE',
        brands: serializeList(brands),
        concessaoIds: ids.join(','),
        nif: nif || null,
        concessaoId: ids[0] || null,
      },
      include: { concessao: true },
    });

    const concessoes = await fetchConcessoes(user.concessaoIds);
    res.status(201).json(userShape(user, concessoes));
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    const { name, email, role, nif, brands, concessaoIds } = req.body;
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ message: 'Email já em uso' });
        return;
      }
    }

    if (nif && nif !== user.nif) {
      const nifTaken = await prisma.user.findFirst({ where: { nif, deletedAt: null, status: { not: 'REJECTED' }, NOT: { id } } });
      if (nifTaken) {
        res.status(409).json({ message: 'NIF já em uso' });
        return;
      }
    }

    const ids = Array.isArray(concessaoIds) ? concessaoIds.filter(Boolean) : undefined;

    // Only ADMIN can assign ADMIN role
    const effectiveRole = (role === 'ADMIN' && req.user!.role !== 'ADMIN') ? user.role : role;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name, email, role: effectiveRole,
        nif: nif || null,
        ...(brands !== undefined && { brands: serializeList(brands) }),
        ...(ids !== undefined && {
          concessaoIds: ids.join(','),
          concessaoId: ids[0] || null,
        }),
      },
      include: { concessao: true },
    });

    const concessoes = await fetchConcessoes(updated.concessaoIds);
    res.json(userShape(updated, concessoes));
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    await prisma.$transaction([
      prisma.card.updateMany({
        where: { userId: id, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Utilizador eliminado com sucesso' });
  },

  async resetPassword(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    res.json({ message: 'Password redefinida com sucesso' });
  },

  async approve(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { brands: newBrands, concessaoIds: newConcessaoIds, role } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    const canGrantAdmin = req.user!.role === 'ADMIN';
    const allowedRoles = canGrantAdmin ? ['ADMIN', 'IMPORTADOR', 'VALIDADOR', 'USER'] : ['IMPORTADOR', 'VALIDADOR', 'USER'];
    const newRole = allowedRoles.includes(role) ? role : 'USER';

    const brandsToApprove: string[] = Array.isArray(newBrands) ? newBrands.filter(Boolean) : [];
    const idsToApprove: string[] = Array.isArray(newConcessaoIds) ? newConcessaoIds.filter(Boolean) : [];

    // Merge brands; replace concessões for approved brands (approver selection overrides registration)
    const mergedBrands = [...new Set([...parseList(user.brands), ...brandsToApprove])];

    const existingConcessaoIds = parseList(user.concessaoIds);
    const existingConcessoes = existingConcessaoIds.length
      ? await prisma.concessao.findMany({ where: { id: { in: existingConcessaoIds } }, select: { id: true, brand: true } })
      : [];
    const keptConcessaoIds = existingConcessoes
      .filter(c => !brandsToApprove.includes(c.brand))
      .map(c => c.id);
    const finalConcessaoIds = [...new Set([...keptConcessaoIds, ...idsToApprove])];

    // Remove approved brands from pendingBrands
    const remainingPending = parseList(user.pendingBrands).filter(b => !brandsToApprove.includes(b));

    const wasFirstApproval = user.status === 'PENDING';

    await prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        role: newRole,
        brands: mergedBrands.join(','),
        pendingBrands: remainingPending.join(','),
        concessaoIds: finalConcessaoIds.join(','),
        concessaoId: finalConcessaoIds[0] || null,
      },
    });

    if (wasFirstApproval) {
      emailService.accountApproved(user.email, user.name).catch(() => {});
    }

    res.json({ message: 'Utilizador aprovado com sucesso' });
  },

  async reject(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    await prisma.user.update({ where: { id }, data: { status: 'REJECTED', pendingBrands: '' } });
    res.json({ message: 'Utilizador rejeitado' });
  },

  async deactivate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE', deactivatedAt: new Date() },
    });
    res.json({ message: 'Utilizador desativado' });
  },

  async reactivate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'Utilizador não encontrado' });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', deactivatedAt: null },
    });
    res.json({ message: 'Utilizador reativado' });
  },
};
