import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'USER', deletedAt: null },
    include: { concessao: true },
  });

  const origin = await prisma.origin.findFirst({ where: { name: 'Vendas' } });

  const periods = ['2025-02', '2025-03'];
  const areas = ['Comercial', 'Pós-Venda'];
  const values = [180, 320, 220, 275];

  let count = 0;
  for (const user of users) {
    if (!user.concessao) continue;
    for (let p = 0; p < periods.length; p++) {
      await prisma.prize.create({
        data: {
          userId: user.id,
          concessaoId: user.concessao.id,
          originId: origin?.id ?? null,
          area: areas[p % areas.length],
          value: values[(users.indexOf(user) + p) % values.length],
          period: periods[p],
          status: 'PENDING',
          importDate: new Date(`2025-0${p + 2}-10`),
        },
      });
      count++;
    }
  }
  console.log(`${count} prémios pendentes criados`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
