import { query } from './client';
import pool from './client';
import { Op36Progress, Op36Round, SaveOp36RoundData } from './types';

/**
 * Delete an Op36 round and recalculate the player's current level.
 */
export async function deleteOp36Round(userId: string, roundId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM op36_rounds WHERE id = $1 AND user_id = $2`,
      [roundId, userId]
    );

    // Recalculate current level from remaining rounds (latest level_after), default to 1
    const result = await client.query<{ level_after: number }>(
      `SELECT level_after FROM op36_rounds WHERE user_id = $1 ORDER BY played_at DESC, created_at DESC LIMIT 1`,
      [userId]
    );
    const newLevel = result.rows[0]?.level_after ?? 1;

    await client.query(
      `INSERT INTO op36_progress (user_id, current_level, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET current_level = $2, updated_at = NOW()`,
      [userId, newLevel]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Save AI feedback text for an Op36 round.
 */
export async function saveOp36Feedback(userId: string, roundId: string, feedback: string): Promise<void> {
  await query(
    `UPDATE op36_rounds SET feedback = $1 WHERE id = $2 AND user_id = $3`,
    [feedback, roundId, userId]
  );
}

/**
 * Get a player's current Op36 level.
 * Returns { currentLevel: 1 } if no progress row exists yet (first visit).
 */
export async function getOp36Progress(
  userId: string
): Promise<{ currentLevel: number }> {
  const result = await query<Op36Progress>(
    'SELECT current_level FROM op36_progress WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) return { currentLevel: 1 };
  return { currentLevel: result.rows[0].current_level };
}

/**
 * Get all Op36 rounds for a player, newest first.
 */
export async function getOp36History(userId: string): Promise<Op36Round[]> {
  const result = await query<Op36Round>(
    `SELECT *
     FROM op36_rounds
     WHERE user_id = $1
     ORDER BY played_at DESC, created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Save a completed Op36 round and upsert the player's current level.
 * Both writes run inside a single transaction.
 */
export async function saveOp36Round(
  userId: string,
  data: SaveOp36RoundData
): Promise<Op36Round> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const roundResult = await client.query<Op36Round>(
      `INSERT INTO op36_rounds (
         user_id, played_at, level, distance_label, nines,
         front_holes, back_holes, front_score, back_score,
         total_score, total_putts, girs, uds, birdies, three_putts,
         points, mastery, result, level_after, notes
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15,
         $16, $17, $18, $19, $20
       )
       RETURNING *`,
      [
        userId,
        data.played_at,
        data.level,
        data.distance_label,
        data.nines,
        data.front_holes ? JSON.stringify(data.front_holes) : null,
        data.back_holes ? JSON.stringify(data.back_holes) : null,
        data.front_score ?? null,
        data.back_score ?? null,
        data.total_score,
        data.total_putts ?? null,
        data.girs ?? null,
        data.uds ?? null,
        data.birdies ?? null,
        data.three_putts ?? null,
        data.points,
        data.mastery,
        data.result,
        data.level_after,
        data.notes ?? null,
      ]
    );

    await client.query(
      `INSERT INTO op36_progress (user_id, current_level, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET current_level = $2, updated_at = NOW()`,
      [userId, data.level_after]
    );

    await client.query('COMMIT');
    return roundResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
