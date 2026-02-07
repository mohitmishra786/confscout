import { PrismaClient, Prisma } from '@prisma/client';
import { securityLogger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'info', emit: 'event' },
  ],
});

// Use type assertion to access $on with event emitters
const prismaWithEvents = prismaInstance as PrismaClient<Prisma.PrismaClientOptions, 'error' | 'warn' | 'info'>;

prismaWithEvents.$on('error', (e) => {
  securityLogger.error('Prisma Error', e);
});

prismaWithEvents.$on('warn', (e) => {
  securityLogger.warn('Prisma Warning', e);
});

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
