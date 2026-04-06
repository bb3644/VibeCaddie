import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:zum3nek2pnv.KPW7unu@database-1.c5g2cq0s8s6t.ap-southeast-2.rds.amazonaws.com:5432/vibecaddie?sslmode=require', ssl: { rejectUnauthorized: false } });
await pool.query('ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS approach_yardage INT, ADD COLUMN IF NOT EXISTS up_down BOOLEAN');
console.log('Migration done: approach_yardage and up_down added to round_holes');
await pool.query('ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS hole_notes TEXT');
console.log('Migration done: hole_notes added to round_holes');
await pool.end();
