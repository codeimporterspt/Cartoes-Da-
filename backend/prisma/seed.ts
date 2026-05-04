import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const brands = [
  { slug: 'byd',      name: 'BYD' },
  { slug: 'dongfeng', name: 'Dongfeng' },
  { slug: 'farizon',  name: 'Farizon' },
  { slug: 'geely',    name: 'Geely' },
  { slug: 'honda',    name: 'Honda' },
  { slug: 'hyundai',  name: 'Hyundai' },
  { slug: 'nissan',   name: 'Nissan' },
  { slug: 'xpeng',    name: 'Xpeng' },
  { slug: 'zeekr',    name: 'Zeekr' },
];

const cities = ['Lisboa', 'Porto'];

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin único partilhado
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cartoes-da.pt' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@cartoes-da.pt',
      password: hashedPassword,
      role: 'ADMIN',
      nif: '500000001',
    },
  });

  const originDefs = [
    { name: 'Novos',       area: 'Vendas',      estado: 'S', matricula: 'S', modelo: 'N' },
    { name: 'Usados',      area: 'Vendas',      estado: 'S', matricula: 'S', modelo: 'N' },
    { name: 'Blue',        area: 'Vendas',      estado: 'S', matricula: 'N', modelo: 'N' },
    { name: 'Após-Venda',  area: 'Após-Venda',  estado: 'S', matricula: 'S', modelo: 'N' },
    { name: 'Bónus',       area: 'Após-Venda',  estado: 'S', matricula: 'N', modelo: 'N' },
    { name: 'xtraFLEX',    area: 'xtraFLEX',    estado: 'S', matricula: 'N', modelo: 'N' },
  ];
  const origins = await Promise.all(
    originDefs.map(o =>
      prisma.origin.upsert({
        where: { name: o.name },
        update: { area: o.area, estado: o.estado, matricula: o.matricula, modelo: o.modelo },
        create: o,
      })
    )
  );

  for (const brand of brands) {
    const prefix = brand.slug.toUpperCase().slice(0, 3);

    // 2 concessões por marca
    const concessoes = [];
    for (let i = 0; i < 2; i++) {
      const city = cities[i];
      const dealerCode = `${prefix}00${i + 1}`;
      const c = await prisma.concessao.upsert({
        where: { dealerCode },
        update: { name: `${brand.name} ${city}`, brand: brand.slug },
        create: { name: `${brand.name} ${city}`, dealerCode, brand: brand.slug },
      });
      concessoes.push(c);
    }

    // 1 utilizador de teste por marca
    const email = `utilizador@${brand.slug}.pt`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `Utilizador ${brand.name}`,
        email,
        password: hashedPassword,
        role: 'USER',
        nif: `2000000${brands.indexOf(brand) + 10}`,
        concessaoId: concessoes[0].id,
      },
    });

    // Prémio de exemplo
    await prisma.prize.create({
      data: {
        userId: user.id,
        concessaoId: concessoes[0].id,
        originId: origins[0].id,
        area: 'Comercial',
        value: 250.00,
        period: '2025-01',
        status: 'CARREGADO',
        importDate: new Date('2025-01-15'),
        validationDate: new Date('2025-01-20'),
        paymentDate: new Date('2025-01-25'),
      },
    });

    // Cartão de exemplo
    const card = await prisma.card.create({
      data: {
        userId: user.id,
        concessaoId: concessoes[0].id,
        cardNumber: `${prefix}${String(brands.indexOf(brand) + 1).padStart(12, '0')}`,
        seriesNumber: `SER-${prefix}-001`,
        status: 'ACTIVE',
        balance: 250.00,
        validatedAt: new Date('2025-01-10'),
      },
    });

    await prisma.cardBalanceHistory.create({
      data: {
        cardId: card.id,
        balanceValue: 250.00,
        movementValue: 250.00,
        updatedById: admin.id,
        notes: 'Carregamento inicial',
      },
    });
  }

  console.log('Seed concluído!');
  console.log('Admin: admin@cartoes-da.pt / password123');
  brands.forEach(b => console.log(`  ${b.name}: utilizador@${b.slug}.pt / password123`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
