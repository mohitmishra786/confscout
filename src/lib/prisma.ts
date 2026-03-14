import { PrismaClient, Prisma } from '@prisma/client';
import { securityLogger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton pattern — must apply in ALL environments, not just development.
//
// On Vercel each serverless function instance is long-lived within a single
// execution context (the global scope persists across requests on the same
// instance). Without this guard every module evaluation creates a new
// PrismaClient, exhausting the Postgres connection pool and causing the
// +32% slowdown seen on specific server nodes (cold-start connection init).
//
// Previously the guard was `if (NODE_ENV !== 'production')` which meant
// production never reused the singleton — this is now fixed.
const prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Persist the singleton on the global object unconditionally.
globalForPrisma.prisma = prismaInstance;

// Use type assertion to access $on with event emitters
const prismaWithEvents = prismaInstance as PrismaClient<Prisma.PrismaClientOptions, 'error' | 'warn'>;

prismaWithEvents.$on('error', (e) => {
  securityLogger.error('Prisma Error', e);
});

prismaWithEvents.$on('warn', (e) => {
  securityLogger.warn('Prisma Warning', e);
});

export const prisma = prismaInstance;
