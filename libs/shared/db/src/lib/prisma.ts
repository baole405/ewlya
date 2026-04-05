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
    const databaseUrl = typeof process !== 'undefined' ? process.env['DATABASE_URL'] : undefined;

    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }
  return prismaInstance;
})() as PrismaClient;

export default prisma;
