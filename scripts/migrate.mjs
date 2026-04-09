import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const __dirname = dirname(fileURLToPath(import.meta.url));

await pool.query('ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS approach_yardage INT, ADD COLUMN IF NOT EXISTS up_down BOOLEAN');
console.log('Migration done: approach_yardage and up_down added to round_holes');

await pool.query('ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS hole_notes TEXT');
console.log('Migration done: hole_notes added to round_holes');

const op36Sql = readFileSync(join(__dirname, '../lib/db/migrations/add_op36.sql'), 'utf8');
await pool.query(op36Sql);
console.log('Migration done: op36_progress and op36_rounds tables created');

const op36NotesSql = readFileSync(join(__dirname, '../lib/db/migrations/add_op36_notes.sql'), 'utf8');
await pool.query(op36NotesSql);
console.log('Migration done: notes column added to op36_rounds');

const op36FeedbackSql = readFileSync(join(__dirname, '../lib/db/migrations/add_op36_feedback.sql'), 'utf8');
await pool.query(op36FeedbackSql);
console.log('Migration done: feedback column added to op36_rounds');

await pool.end();
