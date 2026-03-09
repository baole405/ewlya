import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

export const prisma = (() => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: process.env['DATABASE_URL'],
        },
      },
    } as any);
  }
  return prismaInstance;
})() as PrismaClient;

export default prisma;
