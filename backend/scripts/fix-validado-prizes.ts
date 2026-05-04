import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find all prizes stuck in VALIDADO where the user has at least one card loading entry
  const prizes = await prisma.prize.findMany({
    where: { status: 'VALIDADO' },
    include: {
      user: {
        include: {
          cards: {
            include: {
              loadingHistory: { orderBy: { loadedAt: 'desc' }, take: 1 },
            },
          },
        },
      },
    },
  });

  let updated = 0;

  for (const prize of prizes) {
    // Collect the most recent loading date across all the user's cards
    const latestLoading = prize.user.cards
      .flatMap(c => c.loadingHistory)
      .sort((a, b) => new Date(b.loadedAt).getTime() - new Date(a.loadedAt).getTime())[0];

    if (!latestLoading) continue; // no topup ever done for this user — skip

    await prisma.prize.update({
      where: { id: prize.id },
      data: {
        status: 'CARREGADO',
        paymentDate: latestLoading.loadedAt,
      },
    });

    console.log(
      `Prémio ${prize.id} (${prize.user.name}, ${Number(prize.value).toFixed(2)} €) → CARREGADO (data: ${latestLoading.loadedAt.toISOString().slice(0, 10)})`
    );
    updated++;
  }

  console.log(`\nTotal atualizado: ${updated} prémio(s)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
