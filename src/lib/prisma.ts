import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { securityLogger } from '@/lib/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma ORM v7 requires a driver adapter for all databases.
 * SSL mirrors src/lib/db.ts for Vercel Postgres self-signed certs.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Allow modules to load during CI/typecheck without a live DB.
    // Runtime queries will fail clearly if DATABASE_URL is missing.
    securityLogger.warn(
      'DATABASE_URL missing — PrismaClient adapter will use placeholder URL'
    );
  }

  const adapter = new PrismaPg({
    connectionString:
      connectionString ??
      'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder',
    // Vercel Postgres uses certificates that Node may not trust by default.
    ...(process.env.NODE_ENV === 'production'
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });

  return new PrismaClient({
    adapter,
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
}

// Singleton pattern — must apply in ALL environments, not just development.
//
// On Vercel each serverless function instance is long-lived within a single
// execution context (the global scope persists across requests on the same
// instance). Without this guard every module evaluation creates a new
// PrismaClient, exhausting the Postgres connection pool.
const prismaInstance = globalForPrisma.prisma ?? createPrismaClient();

// Persist the singleton on the global object unconditionally.
globalForPrisma.prisma = prismaInstance;

// Use type assertion to access $on with event emitters
const prismaWithEvents = prismaInstance as PrismaClient<
  Prisma.PrismaClientOptions,
  'error' | 'warn'
>;

prismaWithEvents.$on('error', (e) => {
  securityLogger.error('Prisma Error', e);
});

prismaWithEvents.$on('warn', (e) => {
  securityLogger.warn('Prisma Warning', e);
});

export const prisma = prismaInstance;
