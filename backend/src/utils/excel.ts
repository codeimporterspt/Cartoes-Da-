import ExcelJS from 'exceljs';
import { Response } from 'express';

export async function exportToExcel(
  res: Response,
  filename: string,
  columns: { header: string; key: string; width?: number }[],
  data: Record<string, unknown>[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dados');

  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }));

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF002C5F' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  data.forEach(row => worksheet.addRow(row));

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    if (column.values) {
      const maxLength = column.values.reduce((max: number, val) => {
        const len = val ? String(val).length : 0;
        return Math.max(max, len);
      }, 10);
      column.width = Math.min(maxLength + 2, 50);
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}
