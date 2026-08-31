import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const DEFAULT_CATEGORIES = [
  'Doces e sobremesas',
  'Massas',
  'Saladas',
  'Carnes',
  'Vegetariano',
  'Bebidas',
  'Lanches',
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  for (const name of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Categorias padrão garantidas: ${DEFAULT_CATEGORIES.join(', ')}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
