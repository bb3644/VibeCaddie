import { query } from './client';
import { TrainingJournal } from './types';

export async function getTrainingJournals(userId: string): Promise<TrainingJournal[]> {
  const result = await query<TrainingJournal>(
    `SELECT * FROM training_journal WHERE user_id = $1 ORDER BY session_date DESC, created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getTrainingJournalById(userId: string, id: string): Promise<TrainingJournal | null> {
  const result = await query<TrainingJournal>(
    `SELECT * FROM training_journal WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function createTrainingJournal(
  userId: string,
  data: { session_date: string; location?: string; focus_area: string; plan: string }
): Promise<TrainingJournal> {
  const result = await query<TrainingJournal>(
    `INSERT INTO training_journal (user_id, session_date, location, focus_area, plan, status)
     VALUES ($1, $2, $3, $4, $5, 'planned')
     RETURNING *`,
    [userId, data.session_date, data.location ?? null, data.focus_area, data.plan]
  );
  return result.rows[0];
}

export async function updateTrainingJournal(
  userId: string,
  id: string,
  data: Partial<Pick<TrainingJournal, 'session_date' | 'location' | 'focus_area' | 'plan' | 'reflection' | 'status'>>
): Promise<TrainingJournal | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.session_date !== undefined) { fields.push(`session_date = $${idx++}`); values.push(data.session_date); }
  if (data.location !== undefined) { fields.push(`location = $${idx++}`); values.push(data.location); }
  if (data.focus_area !== undefined) { fields.push(`focus_area = $${idx++}`); values.push(data.focus_area); }
  if (data.plan !== undefined) { fields.push(`plan = $${idx++}`); values.push(data.plan); }
  if (data.reflection !== undefined) { fields.push(`reflection = $${idx++}`); values.push(data.reflection); }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }

  if (fields.length === 0) return getTrainingJournalById(userId, id);

  fields.push(`updated_at = now()`);
  values.push(id, userId);

  const result = await query<TrainingJournal>(
    `UPDATE training_journal SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function saveAiFeedback(
  userId: string,
  id: string,
  feedback: string
): Promise<TrainingJournal | null> {
  const result = await query<TrainingJournal>(
    `UPDATE training_journal
     SET ai_feedback = $1, ai_feedback_at = now(), status = 'reviewed', updated_at = now()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [feedback, id, userId]
  );
  return result.rows[0] ?? null;
}

export async function deleteTrainingJournal(userId: string, id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM training_journal WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
