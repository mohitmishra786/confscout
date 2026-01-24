const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in .env');
    process.exit(1);
}

// Log connection info (masking password)
const dbUrl = process.env.DATABASE_URL;
const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
console.log(`Connecting to: ${maskedUrl}`);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    preferences JSONB DEFAULT '{}',
    frequency VARCHAR(50) DEFAULT 'weekly',
    verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const addFrequencyColumn = `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='frequency') THEN
      ALTER TABLE subscribers ADD COLUMN frequency VARCHAR(50) DEFAULT 'weekly';
    END IF;
  END
  $$;
`;

async function initDB() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected.');

        console.log('Creating table if not exists...');
        await client.query(createTableQuery);

        console.log('Ensuring frequency column exists...');
        await client.query(addFrequencyColumn);

        console.log('Success: subscribers table ready.');

        // Test query
        const res = await client.query('SELECT count(*) FROM subscribers');
        console.log(`Current subscriber count: ${res.rows[0].count}`);

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('Error initializing DB:', err);
        process.exit(1);
    }
}

initDB();
