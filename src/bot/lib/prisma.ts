import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

let prismaInstance: PrismaClient | null = null;

export const prisma = (() => {
  if (!prismaInstance) {
    console.log('🏗️  Instantiating Prisma Client (Standard Singleton + Runtime URL)...');
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
