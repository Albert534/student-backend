// src/index.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';

const { Pool } = pkg;

// Decide which database to use
const isProduction = process.env.NODE_ENV === 'production';

const connectionString =
	isProduction ?
		process.env.NEON_DATABASE_URL! // Neon for production
	:	process.env.LOCAL_DATABASE_URL!; // Local for development

const pool = new Pool({
	connectionString,
	ssl: isProduction ? { rejectUnauthorized: false } : false, // SSL only for Neon
});

export const db = drizzle(pool);

console.log(`Database connected to ${isProduction ? 'Neon' : 'Local'}`);
