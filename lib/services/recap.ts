// 赛后回顾生成服务

import { callLLM, RECAP_SYSTEM_PROMPT } from './llm';
import { updateLearningAfterRound } from './learning';
import { getRoundById, getRoundHoles, getPlayerRounds, saveRecapText } from '@/lib/db/rounds';
import { getBriefingForRound } from '@/lib/db/briefings';
import { getPlayerHoleHistory } from '@/lib/db/players';
import { getCourseHoles } from '@/lib/db/courses';
import { getAllKnowledge } from './knowledge';
import type { RoundHole, CourseHole, PlayerHoleHistory, BriefingJson } from '@/lib/db/types';

// ---------- 主函数 ----------

export async function generateRecap(
  userId: string,
  roundId: string,
): Promise<string> {
  // 1. Get current round + holes
  const round = await getRoundById(userId, roundId);
  if (!round) throw new Error('Round not found');
  const roundHoles = await getRoundHoles(roundId);

  // 2. Course hole info (par etc.)
  const courseHoles = await getCourseHoles(round.course_tee_id);

  // 3. Pre-round briefing for plan vs actual
  const briefing = await getBriefingForRound(userId, round.course_tee_id, round.played_date);

  // 4. Aggregated hole history for this course
  const history = await getPlayerHoleHistory(userId, round.course_tee_id);

  // 5. All previous rounds on this course (for score trend + notes + recap texts)
  const allRounds = await getPlayerRounds(userId);
  const prevRoundsOnCourse = allRounds
    .filter(r => r.course_tee_id === round.course_tee_id && r.id !== roundId);

  // Load per-hole details for up to last 3 previous rounds (for notes patterns)
  const prevRoundDetails = await Promise.all(
    prevRoundsOnCourse.slice(0, 3).map(async (r) => ({
      ...r,
      holes: await getRoundHoles(r.id),
    }))
  );

  // 6. Build prompt
  const totalScore = round.total_score || roundHoles.reduce((sum, h) => sum + (h.score || 0), 0);
  const fwCount = roundHoles.filter(h => h.tee_result === 'FW').length;
  const penCount = roundHoles.filter(h => h.tee_result === 'OB').length;
  const girCount = roundHoles.filter(h => h.approach_distance === 'GIR').length;
  const holesPlayed = round.holes_played ?? 18;

  let prompt = `Generate a post-round recap.\n\n`;
  prompt += `## This Round (${round.played_date})\n`;
  prompt += `${holesPlayed === 9 ? '9-hole' : '18-hole'} round\n`;
  prompt += `Total score: ${totalScore}\n`;
  prompt += `Fairways hit: ${fwCount}/${roundHoles.length}\n`;
  prompt += `Greens in regulation: ${girCount}/${roundHoles.length}\n`;
  if (penCount > 0) prompt += `OB/penalties: ${penCount}\n`;
  if (round.round_notes) prompt += `Player's notes about this round: "${round.round_notes}"\n`;
  prompt += '\n';

  prompt += `## Per-Hole Results\n`;
  for (const hole of roundHoles) {
    const courseHole = courseHoles.find(ch => ch.hole_number === hole.hole_number);
    prompt += `Hole ${hole.hole_number}: Par ${courseHole?.par || '?'}, Tee: ${hole.tee_club} (${hole.tee_result}), Score: ${hole.score || '?'}`;
    if (hole.approach_distance) {
      const dir = hole.approach_direction ? `/${hole.approach_direction}` : '';
      const yds = hole.approach_yardage ? ` ${hole.approach_yardage}yds` : '';
      prompt += `, Approach: ${hole.approach_distance}${dir}${yds}`;
      if (hole.approach_club) prompt += ` (${hole.approach_club})`;
    }
    if (hole.up_down !== null && hole.up_down !== undefined) {
      prompt += `, U&D: ${hole.up_down ? 'Yes' : 'No'}`;
    }
    if (hole.putts !== null) prompt += `, Putts: ${hole.putts}`;
    if (hole.recovery_club) prompt += `, Recovery: ${hole.recovery_club}`;
    const penalties: string[] = [];
    if (hole.bunker_count > 0) penalties.push(`${hole.bunker_count} bunker`);
    if (hole.water_count > 0) penalties.push(`${hole.water_count} water`);
    if (hole.penalty_count > 0) penalties.push(`${hole.penalty_count} penalty`);
    if (penalties.length > 0) prompt += `, Hazards: ${penalties.join(', ')}`;
    if (hole.hole_notes) prompt += `\n  Notes: "${hole.hole_notes}"`;
    prompt += '\n';
  }

  // Plan vs actual
  if (briefing?.briefing_json?.hole_strategies?.length) {
    const comparison = buildComparison(briefing.briefing_json.hole_strategies, roundHoles, courseHoles);
    if (comparison) prompt += `\n## Pre-Round Plan vs Actual\n${comparison}\n`;
  }

  // Previous rounds history on this course
  if (prevRoundsOnCourse.length > 0) {
    prompt += `\n## Previous Rounds on This Course\n`;

    // Score trend (all previous rounds, most recent first)
    const scoreLine = prevRoundsOnCourse
      .filter(r => r.total_score != null)
      .map(r => `${r.played_date}: ${r.total_score}`)
      .join(' → ');
    if (scoreLine) prompt += `Score history (oldest to newest): ${[...prevRoundsOnCourse.filter(r => r.total_score != null).map(r => `${r.played_date}: ${r.total_score}`)].reverse().join(' → ')}\n`;

    // Today's score in context
    prompt += `Today: ${totalScore}\n`;

    // Compute trend direction
    const scores = [...prevRoundsOnCourse.filter(r => r.total_score != null)]
      .reverse()
      .map(r => r.total_score as number);
    if (scores.length >= 2) {
      const first = scores[0];
      const latest = scores[scores.length - 1];
      if (latest < first) prompt += `Trend: scores have been improving (${first} → ${latest})\n`;
      else if (latest > first) prompt += `Trend: scores have been getting worse (${first} → ${latest})\n`;
      else prompt += `Trend: scores have been flat (no change)\n`;
    }

    // Previous recap texts (what advice was given before)
    const recapsWithText = prevRoundDetails.filter(r => r.recap_text);
    if (recapsWithText.length > 0) {
      prompt += `\n### Previous Recap Advice\n`;
      for (const r of recapsWithText.slice(0, 2)) {
        prompt += `Round ${r.played_date}:\n${r.recap_text}\n\n`;
      }
    }

    // Recurring hole notes from previous rounds
    const allPrevNotes: Array<{ holeNumber: number; note: string; date: string }> = [];
    for (const r of prevRoundDetails) {
      for (const h of r.holes) {
        if (h.hole_notes) allPrevNotes.push({ holeNumber: h.hole_number, note: h.hole_notes, date: r.played_date });
      }
    }
    if (allPrevNotes.length > 0) {
      prompt += `\n### Notes from Previous Rounds\n`;
      for (const n of allPrevNotes) {
        prompt += `Hole ${n.holeNumber} (${n.date}): "${n.note}"\n`;
      }
    }
  }

  // Aggregated hole trends
  const maxRounds = history.length > 0 ? Math.max(...history.map(h => h.rounds_played), 0) : 0;
  if (maxRounds >= 2) {
    prompt += `\n## Aggregated Hole Stats (${maxRounds} rounds)\n`;
    prompt += buildTrendsSection(history);
    prompt += '\n';
  }

  // Knowledge base
  const knowledge = getAllKnowledge();
  if (knowledge.length > 0) {
    prompt += `\n## Golf Course Management Principles\n`;
    for (const k of knowledge) {
      prompt += `- [${k.source}] ${k.principle}\n`;
    }
  }

  // 7. Call LLM
  const response = await callLLM(RECAP_SYSTEM_PROMPT, prompt);

  // 8. Save recap
  await saveRecapText(userId, roundId, response.content);

  // 9. Trigger learning update
  await updateLearningAfterRound(userId, roundId);

  return response.content;
}

// ---------- Helpers ----------

function buildComparison(
  strategies: NonNullable<BriefingJson['hole_strategies']>,
  roundHoles: RoundHole[],
  courseHoles: CourseHole[],
): string {
  if (strategies.length === 0) return '';
  const lines: string[] = [];
  for (const strategy of strategies) {
    const actual = roundHoles.find(h => h.hole_number === strategy.hole_number);
    if (!actual) continue;
    const courseHole = courseHoles.find(ch => ch.hole_number === strategy.hole_number);
    const plannedClub = strategy.decision.includes('control') ? 'Control club' : 'Driver';
    const actualClub = actual.tee_club === 'D' ? 'Driver' : actual.tee_club;
    let line = `Hole ${strategy.hole_number} (Par ${courseHole?.par || '?'}): Planned ${plannedClub}, Used ${actualClub}. Result: ${actual.tee_result}`;
    if (actual.score !== null) line += `, Score: ${actual.score}`;
    lines.push(line);
  }
  return lines.join('\n');
}

function buildTrendsSection(history: PlayerHoleHistory[]): string {
  const lines: string[] = [];

  const totalPenalties = history.reduce((sum, h) => sum + h.penalties, 0);
  const totalDriverUsed = history.reduce((sum, h) => sum + h.driver_used, 0);
  const totalControlUsed = history.reduce((sum, h) => sum + h.control_used, 0);

  lines.push(`Driver used: ${totalDriverUsed} times, Control club: ${totalControlUsed} times`);

  if (totalPenalties > 0) {
    const troubleHoles = history
      .filter(h => h.penalties > 0)
      .sort((a, b) => b.penalties - a.penalties)
      .slice(0, 3);
    lines.push(`Penalty holes: ${troubleHoles.map(h => `Hole ${h.hole_number} (${h.penalties}x in ${h.rounds_played} rounds)`).join(', ')}`);
  }

  const holesWithAvg = history.filter(h => h.avg_score !== null && h.rounds_played >= 2);
  if (holesWithAvg.length > 0) {
    const sorted = [...holesWithAvg].sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));
    const hardest = sorted[0];
    const easiest = sorted[sorted.length - 1];
    if (hardest) lines.push(`Hardest hole: Hole ${hardest.hole_number} (avg ${Number(hardest.avg_score).toFixed(1)})`);
    if (easiest && easiest.hole_number !== hardest?.hole_number) {
      lines.push(`Easiest hole: Hole ${easiest.hole_number} (avg ${Number(easiest.avg_score).toFixed(1)})`);
    }
  }

  return lines.join('\n');
}
