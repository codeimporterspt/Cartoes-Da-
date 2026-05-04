import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { exportToExcel } from '../utils/excel';

export const originController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    const { search } = req.query;

    const origins = await prisma.origin.findMany({
      where: search ? {
        OR: [
          { name: { contains: String(search) } },
          { area: { contains: String(search) } },
          { description: { contains: String(search) } },
        ],
      } : undefined,
      orderBy: { area: 'asc' },
    });

    res.json(origins);
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, area = '', estado = 'S', matricula = 'S', modelo = 'N', description } = req.body;

    const existing = await prisma.origin.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ message: 'Origem já existe' });
      return;
    }

    const origin = await prisma.origin.create({ data: { name, area, estado, matricula, modelo, description } });
    res.status(201).json(origin);
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, area, estado, matricula, modelo, description } = req.body;

    const origin = await prisma.origin.findUnique({ where: { id } });
    if (!origin) {
      res.status(404).json({ message: 'Origem não encontrada' });
      return;
    }

    const updated = await prisma.origin.update({
      where: { id },
      data: { name, area, estado, matricula, modelo, description },
    });
    res.json(updated);
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const origin = await prisma.origin.findUnique({ where: { id } });
    if (!origin) {
      res.status(404).json({ message: 'Origem não encontrada' });
      return;
    }

    await prisma.origin.delete({ where: { id } });
    res.json({ message: 'Origem eliminada' });
  },

  async exportExcel(req: AuthRequest, res: Response): Promise<void> {
    const origins = await prisma.origin.findMany({ orderBy: { area: 'asc' } });

    await exportToExcel(
      res,
      'origens',
      [
        { header: 'Área',      key: 'area',      width: 20 },
        { header: 'Origem',    key: 'name',      width: 25 },
        { header: 'Estado',    key: 'estado',    width: 10 },
        { header: 'Matrícula', key: 'matricula', width: 12 },
        { header: 'Modelo',    key: 'modelo',    width: 10 },
      ],
      origins.map(o => ({
        area:      o.area || '',
        name:      o.name,
        estado:    o.estado,
        matricula: o.matricula,
        modelo:    o.modelo,
      }))
    );
  },
};
