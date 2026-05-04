import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const defs = [
  { name: 'Novos',      area: 'Vendas',      estado: 'S', matricula: 'S', modelo: 'N' },
  { name: 'Usados',     area: 'Vendas',      estado: 'S', matricula: 'S', modelo: 'N' },
  { name: 'Blue',       area: 'Vendas',      estado: 'S', matricula: 'N', modelo: 'N' },
  { name: 'Após-Venda', area: 'Após-Venda',  estado: 'S', matricula: 'S', modelo: 'N' },
  { name: 'Bónus',      area: 'Após-Venda',  estado: 'S', matricula: 'N', modelo: 'N' },
  { name: 'xtraFLEX',   area: 'xtraFLEX',    estado: 'S', matricula: 'N', modelo: 'N' },
];

async function main() {
  for (const o of defs) {
    await prisma.origin.upsert({ where: { name: o.name }, update: o, create: o });
  }
  const all = await prisma.origin.findMany({ orderBy: { area: 'asc' } });
  console.log(`${all.length} origens na base de dados:`);
  all.forEach(o => console.log(`  [${o.area}] ${o.name} — E:${o.estado} M:${o.matricula} Mo:${o.modelo}`));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
