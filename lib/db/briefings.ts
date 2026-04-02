import { query } from './client';
import { PreRoundBriefing, BriefingJson } from './types';

/**
 * 创建赛前简报
 */
export async function createBriefing(
  userId: string,
  data: { course_tee_id: string; play_date: string; briefing_json: BriefingJson }
): Promise<PreRoundBriefing> {
  const result = await query<PreRoundBriefing>(
    `INSERT INTO pre_round_briefings (user_id, course_tee_id, play_date, briefing_json)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, data.course_tee_id, data.play_date, JSON.stringify(data.briefing_json)]
  );
  return result.rows[0];
}

/**
 * 根据 ID 获取简报（校验 user_id），JOIN 球场和 tee 名称
 */
export async function getBriefingById(
  userId: string,
  briefingId: string
): Promise<BriefingWithCourse | null> {
  const result = await query<BriefingWithCourse>(
    `SELECT b.*, c.name AS course_name, ct.tee_name, ct.course_id
     FROM pre_round_briefings b
     JOIN course_tees ct ON ct.id = b.course_tee_id
     JOIN courses c ON c.id = ct.course_id
     WHERE b.id = $1 AND b.user_id = $2`,
    [briefingId, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * 简报 + 球场/tee 名称
 */
export interface BriefingWithCourse extends PreRoundBriefing {
  course_name: string;
  tee_name: string;
  course_id: string;
}

/**
 * 获取球员的所有简报（按日期倒序，同日按创建时间倒序），JOIN 球场和 tee 名称
 */
export async function getPlayerBriefings(userId: string): Promise<BriefingWithCourse[]> {
  const result = await query<BriefingWithCourse>(
    `SELECT b.*, c.name AS course_name, ct.tee_name, ct.course_id
     FROM pre_round_briefings b
     JOIN course_tees ct ON ct.id = b.course_tee_id
     JOIN courses c ON c.id = ct.course_id
     WHERE b.user_id = $1
     ORDER BY b.play_date DESC, b.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * 删除简报（校验 user_id）
 */
export async function deleteBriefing(userId: string, briefingId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM pre_round_briefings WHERE id = $1 AND user_id = $2`,
    [briefingId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * 获取某次打球对应的简报（按创建时间取最新的一条）
 */
export async function getBriefingForRound(
  userId: string,
  courseTeeId: string,
  date: string
): Promise<PreRoundBriefing | null> {
  const result = await query<PreRoundBriefing>(
    `SELECT * FROM pre_round_briefings
     WHERE user_id = $1 AND course_tee_id = $2 AND play_date = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, courseTeeId, date]
  );
  return result.rows[0] ?? null;
}
