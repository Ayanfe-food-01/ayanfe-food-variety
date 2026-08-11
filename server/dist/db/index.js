import { Pool } from 'pg';
import { env } from '../config/env.js';
export const pool = new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: env.databaseUrl.includes('sslmode=require')
        ? undefined
        : { rejectUnauthorized: false },
});
export async function query(text, values = []) {
    return pool.query(text, values);
}
export async function verifyDatabaseConnection() {
    await pool.query('SELECT 1');
}
export async function closeDatabase() {
    await pool.end();
}
