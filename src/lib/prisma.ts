import { PrismaClient } from '@prisma/client';
import { securityLogger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'info', emit: 'event' },
  ],
});

// @ts-ignore
prisma.$on('error', (e) => {
  securityLogger.error('Prisma Error', e);
});

// @ts-ignore
prisma.$on('warn', (e) => {
  securityLogger.warn('Prisma Warning', e);
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
