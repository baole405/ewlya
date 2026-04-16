import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('--- All Checks ---');
  const all = await prisma.progressionCheck.findMany();
  console.log(all.map((c) => ({ id: c.id, title: c.title, deletedAt: c.deletedAt })));

  console.log('\n--- Trash Checks ({ not: null }) ---');
  const trash = await prisma.progressionCheck.findMany({
    where: { deletedAt: { not: null } },
  });
  console.log(trash.map((c) => ({ id: c.id, title: c.title, deletedAt: c.deletedAt })));

  await prisma.$disconnect();
}

main();
