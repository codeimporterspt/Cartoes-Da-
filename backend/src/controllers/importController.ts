import { Response } from 'express';
import ExcelJS from 'exceljs';
import fs from 'fs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { emailService } from '../services/emailService';
import path from 'path';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/imports');

function saveLastFile(type: string, filePath: string) {
  try {
    fs.copyFileSync(filePath, path.join(UPLOADS_DIR, `last_${type}.xlsx`));
  } catch { /* non-critical */ }
}

type PrizeRow = { originSeqId: string; dealerCode: string; nif: string; value: number };

async function processPrizeImport(
  req: AuthRequest,
  res: Response,
  fileType: string,
  parseRows: (worksheet: ExcelJS.Worksheet) => { rows: PrizeRow[]; errors: string[] }
): Promise<void> {
  if (!req.file) {
    res.status(400).json({ message: 'Ficheiro não fornecido' });
    return;
  }

  const prizeImport = await prisma.prizeImport.create({
    data: { importedById: req.user!.id, fileUrl: req.file.path.replace(/\\/g, '/'), status: 'PROCESSING', importType: fileType },
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(req.file.path);
  const { rows: prizeData, errors } = parseRows(workbook.worksheets[0]);

  if (errors.length > 0) {
    await prisma.prizeImport.update({ where: { id: prizeImport.id }, data: { status: 'ERROR', errorDetails: errors.join('\n') } });
    const importer = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (importer) {
      try { await emailService.prizeImportError(importer.email, importer.name, errors); } catch { /* non-critical */ }
    }
    res.status(400).json({ message: 'Erros na importação', errors });
    return;
  }

  const now = new Date();
  const autoPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const allOrigins = await prisma.origin.findMany({ orderBy: { area: 'asc' } });
  let importedCount = 0;

  for (const item of prizeData) {
    const concessao = await prisma.concessao.findFirst({ where: { dealerCode: item.dealerCode } });
    if (!concessao) continue;
    const user = await prisma.user.findFirst({ where: { nif: item.nif, deletedAt: null } });
    if (!user) continue;

    let origin = null;
    if (item.originSeqId) {
      const seqId = parseInt(item.originSeqId, 10);
      if (!isNaN(seqId) && seqId >= 1 && seqId <= allOrigins.length) origin = allOrigins[seqId - 1];
    }

    await prisma.prize.create({
      data: {
        userId: user.id, concessaoId: concessao.id, originId: origin?.id,
        area: origin?.area || null, value: item.value, period: autoPeriod,
        status: 'PENDENTE', importedById: req.user!.id, prizeImportId: prizeImport.id,
      },
    });
    importedCount++;
  }

  await prisma.prizeImport.update({ where: { id: prizeImport.id }, data: { status: 'SUCCESS' } });
  const importer = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (importer) {
    try { await emailService.prizeImportSuccess(importer.email, importer.name, importedCount); } catch { /* non-critical */ }
  }

  saveLastFile(fileType, req.file.path);
  res.json({ message: `${importedCount} prémio(s) importado(s) com sucesso`, importedCount });
}

export const importController = {
  async importPrizes(req: AuthRequest, res: Response): Promise<void> {
    await processPrizeImport(req, res, 'prizes', (worksheet) => {
      const rows: PrizeRow[] = [];
      const errors: string[] = [];
      worksheet.eachRow((row, rowIndex) => {
        if (rowIndex === 1) return;
        const originSeqId = String(row.getCell(1).value || '').trim();
        // col 2 (VIN) and col 3 (Matrícula) — informational, not stored
        const dealerCode  = String(row.getCell(4).value || '').trim();
        const nif         = String(row.getCell(5).value || '').trim();
        const value       = parseFloat(String(row.getCell(6).value || '0'));
        if (!dealerCode) errors.push(`Linha ${rowIndex}: Dealer Code em falta`);
        if (!nif)        errors.push(`Linha ${rowIndex}: NIF em falta`);
        if (!value || isNaN(value)) errors.push(`Linha ${rowIndex}: Valor inválido`);
        if (dealerCode && nif && value) rows.push({ originSeqId, dealerCode, nif, value });
      });
      return { rows, errors };
    });
  },

  async importPrizesAftersales(req: AuthRequest, res: Response): Promise<void> {
    await processPrizeImport(req, res, 'prizes-aftersales', (worksheet) => {
      const rows: PrizeRow[] = [];
      const errors: string[] = [];
      worksheet.eachRow((row, rowIndex) => {
        if (rowIndex === 1) return;
        const originSeqId = String(row.getCell(1).value || '').trim();
        // col 2 (Matrícula) — informational, not stored
        const dealerCode  = String(row.getCell(3).value || '').trim();
        const nif         = String(row.getCell(4).value || '').trim();
        const value       = parseFloat(String(row.getCell(5).value || '0'));
        // col 6 (Modelo) — informational, not stored
        if (!dealerCode) errors.push(`Linha ${rowIndex}: Dealer Code em falta`);
        if (!nif)        errors.push(`Linha ${rowIndex}: NIF em falta`);
        if (!value || isNaN(value)) errors.push(`Linha ${rowIndex}: Valor inválido`);
        if (dealerCode && nif && value) rows.push({ originSeqId, dealerCode, nif, value });
      });
      return { rows, errors };
    });
  },

  async importCardTopup(req: AuthRequest, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ message: 'Ficheiro não fornecido' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    const errors: string[] = [];
    let updatedCount = 0;

    const rows: { nif: string; seriesNumber: string; cardNumber: string; amount: number }[] = [];

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;

      const nif          = String(row.getCell(1).value || '').trim();
      const seriesNumber = String(row.getCell(2).value || '').trim();
      const cardNumber   = String(row.getCell(3).value || '').trim();
      const amount       = parseFloat(String(row.getCell(4).value || '0'));

      if (!nif)        errors.push(`Linha ${rowIndex}: NIF em falta`);
      if (!cardNumber) errors.push(`Linha ${rowIndex}: Número do cartão em falta`);
      if (!amount || isNaN(amount)) errors.push(`Linha ${rowIndex}: Valor inválido`);

      if (nif && cardNumber && amount) {
        rows.push({ nif, seriesNumber, cardNumber, amount });
      }
    });

    for (const row of rows) {
      const card = await prisma.card.findFirst({
        where: {
          cardNumber: row.cardNumber,
          status: 'ACTIVE',
          ...(row.seriesNumber && { seriesNumber: row.seriesNumber }),
          user: { nif: row.nif },
        },
        include: { user: true },
      });

      if (!card) {
        errors.push(`Cartão ${row.cardNumber}: não encontrado, inativo ou NIF/série não corresponde`);
        continue;
      }

      const newBalance = Number(card.balance) + row.amount;
      const paymentDate = new Date();

      await prisma.$transaction([
        prisma.card.update({ where: { id: card.id }, data: { balance: newBalance } }),
        prisma.cardBalanceHistory.create({
          data: {
            cardId: card.id,
            balanceValue: newBalance,
            movementValue: row.amount,
            updatedById: req.user!.id,
            notes: 'Importação de carregamento',
          },
        }),
        prisma.cardLoadingHistory.create({
          data: {
            cardId: card.id,
            userId: card.userId,
            originId: undefined,
            movementValue: row.amount,
            balanceValue: newBalance,
            loadedById: req.user!.id,
            extranetLogin: card.user.email,
          },
        }),
        prisma.prize.updateMany({
          where: {
            userId: card.userId,
            status: 'VALIDADO',
          },
          data: {
            status: 'CARREGADO',
            paymentDate,
          },
        }),
      ]);

      try {
        await emailService.cardBalanceUpdated(
          card.user.email,
          card.user.name,
          card.cardNumber,
          row.amount,
          newBalance
        );
      } catch (err) {
        console.error('Email notification failed:', err);
      }

      updatedCount++;
    }

    saveLastFile('topup', req.file.path);
    res.json({
      message: `${updatedCount} cartão(ões) atualizado(s)`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  },

  async importOrigins(req: AuthRequest, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ message: 'Ficheiro não fornecido' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    let count = 0;

    for (let i = 2; i <= (worksheet.rowCount || 0); i++) {
      const row = worksheet.getRow(i);
      // col 1 = ID (display only, skip)
      const area      = String(row.getCell(2).value || '').trim();
      const name      = String(row.getCell(3).value || '').trim();
      const estado    = String(row.getCell(4).value || 'S').trim().toUpperCase() === 'N' ? 'N' : 'S';
      const matricula = String(row.getCell(5).value || 'S').trim().toUpperCase() === 'N' ? 'N' : 'S';
      const modelo    = String(row.getCell(6).value || 'N').trim().toUpperCase() === 'S' ? 'S' : 'N';

      if (!name) continue;

      await prisma.origin.upsert({
        where: { name },
        update: { area, estado, matricula, modelo },
        create: { name, area, estado, matricula, modelo },
      });

      count++;
    }

    saveLastFile('origins', req.file.path);
    res.json({ message: `${count} origem(ns) importada(s)/atualizada(s)` });
  },

  async importConcessoes(req: AuthRequest, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ message: 'Ficheiro não fornecido' });
      return;
    }

    const brand = (req.body.brand as string) || 'hyundai';

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    const errors: string[] = [];
    let count = 0;

    for (let i = 2; i <= (worksheet.rowCount || 0); i++) {
      const row = worksheet.getRow(i);
      const name = String(row.getCell(1).value || '').trim();
      const dealerCode = String(row.getCell(2).value || '').trim();

      if (!name && !dealerCode) continue;
      if (!name) { errors.push(`Linha ${i}: Nome da instalação em falta`); continue; }
      if (!dealerCode) { errors.push(`Linha ${i}: Dealer Code em falta`); continue; }

      await prisma.concessao.upsert({
        where: { dealerCode },
        update: { name, brand },
        create: { name, dealerCode, brand },
      });

      count++;
    }

    saveLastFile('concessoes', req.file.path);
    res.json({
      message: `${count} concessão(ões) importada(s)/atualizada(s)`,
      count,
      errors: errors.length > 0 ? errors : undefined,
    });
  },

  async downloadLastFile(req: AuthRequest, res: Response): Promise<void> {
    const { type } = req.params;
    const allowed = ['prizes', 'prizes-aftersales', 'topup', 'origins', 'concessoes'];
    if (!allowed.includes(type)) {
      res.status(400).json({ message: 'Tipo inválido' });
      return;
    }
    const filePath = path.join(UPLOADS_DIR, `last_${type}.xlsx`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Nenhum ficheiro carregado ainda para esta categoria' });
      return;
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ultimo_${type}.xlsx"`);
    fs.createReadStream(filePath).pipe(res);
  },

  async downloadTemplate(req: AuthRequest, res: Response): Promise<void> {
    const { type } = req.params;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    const templates: Record<string, { headers: string[]; sample: (string | number)[] }> = {
      prizes: {
        headers: ['ID', 'VIN', 'Matrícula', 'Dealer Code', 'NIF', 'Valor', 'Modelo'],
        sample: [1, 'WVWZZZ1KZ8W123456', 'AA-00-AA', 'HYD001', '123456789', 250.00, 'Tucson'],
      },
      'prizes-aftersales': {
        headers: ['ID', 'Matrícula', 'Dealer Code', 'NIF', 'Valor', 'Modelo'],
        sample: [1, 'AA-00-AA', 'HYD001', '123456789', 250.00, 'Tucson'],
      },
      topup: {
        headers: ['NIF', 'Número de série', 'Número do cartão', 'Valor'],
        sample: ['123456789', 'SER001', '1234567890123456', 100.00],
      },
      origins: {
        headers: ['ID', 'Área', 'Origem', 'Estado', 'Matrícula', 'Modelo'],
        sample: [1, 'Comercial', 'Vendas', 'S', 'S', 'N'],
      },
      concessoes: {
        headers: ['Nome da Instalação', 'Dealer Code'],
        sample: ['Hyundai Lisboa Norte', 'HYD001'],
      },
    };

    const template = templates[type];
    if (!template) {
      res.status(400).json({ message: 'Tipo de template inválido' });
      return;
    }

    worksheet.columns = template.headers.map((h, i) => ({
      header: h,
      key: `col${i}`,
      width: 25,
    }));

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002C5F' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.addRow(template.sample);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="template_${type}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  },

  async listImports(req: AuthRequest, res: Response): Promise<void> {
    const { startDate, endDate } = req.query;

    const imports = await prisma.prizeImport.findMany({
      where: {
        ...(startDate || endDate ? {
          importedAt: {
            ...(startDate && { gte: new Date(String(startDate)) }),
            ...(endDate && { lte: new Date(String(endDate) + 'T23:59:59') }),
          },
        } : {}),
      },
      include: {
        importedBy: { select: { name: true, email: true } },
        prizes: { select: { id: true } },
      },
      orderBy: { importedAt: 'desc' },
    });

    res.json(imports.map(i => ({ ...i, prizeCount: i.prizes.length })));
  },
};
