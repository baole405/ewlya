import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'darkstar-admin-2026'; // Default password for both
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('--- SEEDING ADMIN ACCOUNTS ---');

  // AI Admin
  const aiAdmin = await prisma.user.upsert({
    where: { username: 'ai-admin' },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
    },
    create: {
      username: 'ai-admin',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created/Updated: ai-admin');

  // Developer Admin
  const devAdmin = await prisma.user.upsert({
    where: { username: 'dev-admin' },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
    },
    create: {
      username: 'dev-admin',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created/Updated: dev-admin');

  console.log('-------------------------------');
  console.log('CRITICAL: Initial Admin Password is: ', password);
  console.log('Please change this after first login.');
  console.log('-------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
