import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Querying database members to verify birthdates...');

  const members = await prisma.member.findMany({
    orderBy: { nickname: 'asc' }
  });

  console.log(`📋 Total members found in database: ${members.length}`);
  console.log('------------------------------------------------------------');
  console.log('| Nickname             | Birthdate   | Status   | Discord ID         |');
  console.log('------------------------------------------------------------');

  for (const m of members) {
    console.log(
      `| ${m.nickname.padEnd(20)} | ${(m.birthdate || 'ND').padEnd(11)} | ${m.status.padEnd(8)} | ${String(m.discordId).padEnd(18)} |`
    );
  }
  console.log('------------------------------------------------------------');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
