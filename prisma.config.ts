import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma ORM v7 CLI configuration.
 * Datasource URLs are no longer allowed in schema.prisma — configure them here.
 *
 * Fallback URL lets `prisma generate` (postinstall) succeed in CI jobs that
 * only typecheck/lint and do not set DATABASE_URL. Migrate/push still need a
 * real connection string.
 */
const datasourceUrl =
  process.env.DATABASE_URL ??
  'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: datasourceUrl,
  },
});
