import { Pool } from 'pg';
import { securityLogger } from '@/lib/logger';
import { env } from '@/lib/env';

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: {
        // Use strict SSL validation in production, permissive in development
        rejectUnauthorized: env.NODE_ENV === 'production'
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Add error listener to the pool to prevent process crash
pool.on('error', (err) => {
    securityLogger.error('Unexpected error on idle database client', err);
});

export default pool;
