import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function setup() {
  if (process.env.DATABASE_URL) {
    console.log('--- Starting PostgreSQL database setup (Cloud Mode) ---');
    console.log('Connecting to database using DATABASE_URL connection string...');
    
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      await client.connect();
      console.log('Connected to cloud PostgreSQL database successfully.');

      const schemaPath = path.join(__dirname, 'schema.sql');
      console.log(`Reading schema script from: ${schemaPath}`);
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      console.log('Executing schema script tables & trigger initialization...');
      await client.query(schemaSql);
      console.log('Database tables, triggers, and procedures setup COMPLETED successfully.');
    } catch (error) {
      console.error('Error executing database schema on cloud DB:', error.message);
      process.exit(1);
    } finally {
      await client.end();
    }
    console.log('--- Database Setup Finished! ---');
    return;
  }

  console.log('--- Starting PostgreSQL database setup (Local Mode) ---');
  console.log(`Connecting to server at ${dbConfig.host}:${dbConfig.port} as user '${dbConfig.user}'...`);

  // First connect to default 'postgres' database
  const client = new pg.Client({
    ...dbConfig,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server successfully.');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'family_business_db';
    const checkDbResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkDbResult.rowCount === 0) {
      console.log(`Database '${dbName}' does not exist. Creating it now...`);
      // CREATE DATABASE cannot be executed in transaction block, so we run directly
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created successfully.`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
  } catch (error) {
    console.error('Error during initial server connection / DB creation:', error.message);
    console.log('\nTIP: Please check if PostgreSQL is running and credentials in .env are correct.');
    process.exit(1);
  } finally {
    await client.end();
  }

  // Now connect to the newly created / existing database to execute schema.sql
  const dbName = process.env.DB_NAME || 'family_business_db';
  console.log(`\nConnecting to target database '${dbName}'...`);
  
  const dbClient = new pg.Client({
    ...dbConfig,
    database: dbName
  });

  try {
    await dbClient.connect();
    console.log(`Connected to database '${dbName}' successfully.`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema script from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema script tables & trigger initialization...');
    await dbClient.query(schemaSql);
    console.log('Database tables, triggers, and procedures setup COMPLETED successfully.');

  } catch (error) {
    console.error('Error executing database schema:', error.message);
    process.exit(1);
  } finally {
    await dbClient.end();
  }

  console.log('--- Database Setup Finished! ---');
}

setup();
