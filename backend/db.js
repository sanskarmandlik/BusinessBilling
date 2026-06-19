import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Support both cloud (DATABASE_URL) and local (individual vars) configurations.
// Cloud providers like Neon, Supabase, and Render provide a DATABASE_URL connection string.
let poolConfig;

if (process.env.DATABASE_URL) {
  // Cloud mode: use single connection string with SSL
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for most cloud PG providers
    },
  };
  console.log('Database: Using cloud DATABASE_URL connection.');
} else {
  // Local mode: use individual environment variables
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'family_business_db',
  };
  console.log(`Database: Using local connection at ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);
}

const pool = new pg.Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg pool client:', err);
});

export const query = (text, params) => pool.query(text, params);

export default pool;
