import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

/**
 * Initializes and returns a PrismaClient instance.
 * Guarded to prevent "process is not defined" errors in browser environments.
 */
export const prisma = (() => {
  // Browser guard: Return null if 'process' is not defined (typical in browser bundles)
  if (typeof process === 'undefined') {
    return null as unknown as PrismaClient;
  }

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
