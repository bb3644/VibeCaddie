import { query } from './client';
import { Round, RoundHole, PlayerHoleHistory } from './types';

/**
 * 获取球员的所有轮次（带球场名和 tee 名）
 */
export async function getPlayerRounds(
  userId: string
): Promise<(Round & { course_name?: string; tee_name?: string })[]> {
  const result = await query<Round & { course_name?: string; tee_name?: string }>(
    `SELECT r.*, c.name AS course_name, ct.tee_name
     FROM rounds r
     JOIN course_tees ct ON r.course_tee_id = ct.id
     JOIN courses c ON ct.course_id = c.id
     WHERE r.user_id = $1
     ORDER BY r.played_date DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * 根据 ID 获取单个轮次（校验 user_id）
 */
export async function getRoundById(userId: string, roundId: string): Promise<Round | null> {
  const result = await query<Round>(
    'SELECT * FROM rounds WHERE id = $1 AND user_id = $2',
    [roundId, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * 创建新的一轮
 */
export async function createRound(
  userId: string,
  data: { course_tee_id: string; played_date: string; holes_played?: number }
): Promise<Round> {
  const result = await query<Round>(
    `INSERT INTO rounds (user_id, course_tee_id, played_date, holes_played)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, data.course_tee_id, data.played_date, data.holes_played ?? 18]
  );
  return result.rows[0];
}

/**
 * 获取某一轮的所有洞数据
 */
export async function getRoundHoles(roundId: string): Promise<RoundHole[]> {
  const result = await query<RoundHole>(
    'SELECT * FROM round_holes WHERE round_id = $1 ORDER BY hole_number',
    [roundId]
  );
  return result.rows;
}

/**
 * 插入或更新某一洞的数据
 */
export async function upsertRoundHole(data: {
  round_id: string;
  hole_number: number;
  tee_club: string;
  tee_result: 'FW' | 'LEFT' | 'RIGHT' | 'SHORT' | 'OB';
  approach_club?: string;
  approach_distance?: 'GIR' | 'SHORT' | 'LONG';
  approach_direction?: 'CENTER' | 'LEFT' | 'RIGHT';
  approach_yardage?: number;
  up_down?: boolean;
  recovery_club?: string;
  hole_notes?: string;
  score?: number;
  putts?: number;
  bunker_count?: number;
  water_count?: number;
  penalty_count?: number;
  approach_x?: number | null;
  approach_y?: number | null;
  drive_x?: number | null;
  drive_y?: number | null;
}): Promise<RoundHole> {
  const result = await query<RoundHole>(
    `INSERT INTO round_holes
       (round_id, hole_number, tee_club, tee_result, approach_club, approach_distance, approach_direction, approach_yardage, up_down, recovery_club, hole_notes, score, putts, bunker_count, water_count, penalty_count, approach_x, approach_y, drive_x, drive_y)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     ON CONFLICT (round_id, hole_number)
     DO UPDATE SET
       tee_club = EXCLUDED.tee_club,
       tee_result = EXCLUDED.tee_result,
       approach_club = EXCLUDED.approach_club,
       approach_distance = EXCLUDED.approach_distance,
       approach_direction = EXCLUDED.approach_direction,
       approach_yardage = EXCLUDED.approach_yardage,
       up_down = EXCLUDED.up_down,
       recovery_club = EXCLUDED.recovery_club,
       hole_notes = EXCLUDED.hole_notes,
       score = EXCLUDED.score,
       putts = EXCLUDED.putts,
       bunker_count = EXCLUDED.bunker_count,
       water_count = EXCLUDED.water_count,
       penalty_count = EXCLUDED.penalty_count,
       approach_x = COALESCE(EXCLUDED.approach_x, round_holes.approach_x),
       approach_y = COALESCE(EXCLUDED.approach_y, round_holes.approach_y),
       drive_x = COALESCE(EXCLUDED.drive_x, round_holes.drive_x),
       drive_y = COALESCE(EXCLUDED.drive_y, round_holes.drive_y)
     RETURNING *`,
    [
      data.round_id,
      data.hole_number,
      data.tee_club,
      data.tee_result,
      data.approach_club ?? null,
      data.approach_distance ?? null,
      data.approach_direction ?? null,
      data.approach_yardage ?? null,
      data.up_down ?? null,
      data.recovery_club ?? null,
      data.hole_notes ?? null,
      data.score ?? null,
      data.putts ?? null,
      data.bunker_count ?? 0,
      data.water_count ?? 0,
      data.penalty_count ?? 0,
      data.approach_x ?? null,
      data.approach_y ?? null,
      data.drive_x ?? null,
      data.drive_y ?? null,
    ]
  );
  return result.rows[0];
}

/**
 * 删除一轮（校验 user_id）
 */
export async function deleteRound(userId: string, roundId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM rounds WHERE id = $1 AND user_id = $2',
    [roundId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * 更新轮次总杆数
 */
export async function updateRoundTotalScore(
  userId: string,
  roundId: string,
  totalScore: number
): Promise<void> {
  await query(
    'UPDATE rounds SET total_score = $1 WHERE id = $2 AND user_id = $3',
    [totalScore, roundId, userId]
  );
}

/**
 * 保存轮次备注
 */
export async function saveRoundNotes(
  userId: string,
  roundId: string,
  roundNotes: string,
): Promise<void> {
  await query(
    'UPDATE rounds SET round_notes = $1 WHERE id = $2 AND user_id = $3',
    [roundNotes, roundId, userId],
  );
}

/**
 * 保存 recap 文本到轮次
 */
export async function saveRecapText(
  userId: string,
  roundId: string,
  recapText: string
): Promise<void> {
  await query(
    'UPDATE rounds SET recap_text = $1 WHERE id = $2 AND user_id = $3',
    [recapText, roundId, userId]
  );
}

/**
 * 获取球员最近 20 场有总分的轮次（含评级和 par，用于 handicap 计算）
 * 不强制要求 course_rating/slope_rating，允许 par-based fallback
 */
export interface RoundWithRatings extends Round {
  course_rating: number | null;
  slope_rating: number | null;
  par_total: number;
}

export async function getPlayerRoundsWithRatings(userId: string): Promise<RoundWithRatings[]> {
  const result = await query<RoundWithRatings>(
    `SELECT r.*, ct.course_rating, ct.slope_rating, ct.par_total
     FROM rounds r
     JOIN course_tees ct ON r.course_tee_id = ct.id
     WHERE r.user_id = $1
       AND r.total_score IS NOT NULL
     ORDER BY r.played_date DESC
     LIMIT 20`,
    [userId]
  );
  return result.rows;
}

/**
 * 更新球员某一洞的历史统计（upsert）
 */
export async function updatePlayerHoleHistory(
  userId: string,
  courseTeeId: string,
  holeNumber: number,
  data: Partial<Omit<PlayerHoleHistory, 'user_id' | 'course_tee_id' | 'hole_number'>>
): Promise<void> {
  await query(
    `INSERT INTO player_hole_history (user_id, course_tee_id, hole_number, rounds_played, driver_used, control_used, penalties, avg_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, course_tee_id, hole_number)
     DO UPDATE SET
       rounds_played = COALESCE($4, player_hole_history.rounds_played),
       driver_used = COALESCE($5, player_hole_history.driver_used),
       control_used = COALESCE($6, player_hole_history.control_used),
       penalties = COALESCE($7, player_hole_history.penalties),
       avg_score = COALESCE($8, player_hole_history.avg_score)`,
    [
      userId,
      courseTeeId,
      holeNumber,
      data.rounds_played ?? 0,
      data.driver_used ?? 0,
      data.control_used ?? 0,
      data.penalties ?? 0,
      data.avg_score ?? null,
    ]
  );
}
