import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        // Use strict SSL validation in production, permissive in development
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
});

export default pool;

