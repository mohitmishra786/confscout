/**
 * Shared Prisma Client factory for Node.js utility scripts.
 *
 * Prisma ORM v7 requires a driver adapter for all databases
 * (mirrors src/lib/prisma.ts). SSL mirrors src/lib/db.ts for
 * Vercel Postgres self-signed certs.
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: '.env' });

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is missing in environment or .env');
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString,
    // Vercel Postgres uses certificates that Node may not trust by default.
    ...(process.env.NODE_ENV === 'production'
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });

  return new PrismaClient({ adapter });
}

module.exports = { createPrismaClient };
