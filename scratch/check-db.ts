import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const checks = await prisma.progressionCheck.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { memberStatuses: true }
      }
    }
  });

  console.log('\n=== CURRENT MINES CHECKS IN DATABASE ===');
  if (checks.length === 0) {
    console.log('No active checks found.');
  } else {
    checks.forEach(c => {
      console.log(`ID: ${c.id}`);
      console.log(`Title: ${c.title}`);
      console.log(`Ends At: ${c.endDate}`);
      console.log(`Members Count: ${c._count.memberStatuses}`);
      console.log('-----------------------------------');
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
