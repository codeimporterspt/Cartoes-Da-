import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "User"
    SET "pendingBrands" = "brands", "brands" = ''
    WHERE "status" = 'PENDING' AND ("pendingBrands" = '' OR "pendingBrands" IS NULL)
  `;
  console.log(`Migrated ${result} pending users`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
