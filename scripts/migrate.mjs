import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await pool.query('ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS approach_yardage INT, ADD COLUMN IF NOT EXISTS up_down BOOLEAN');
console.log('Migration done: approach_yardage and up_down added to round_holes');
await pool.query('ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS hole_notes TEXT');
console.log('Migration done: hole_notes added to round_holes');
await pool.end();
