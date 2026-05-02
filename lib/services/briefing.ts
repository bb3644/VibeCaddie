import { computeBriefing, BriefingData, HoleInput, PlayerHistoryInput } from './strategy';
import { callLLM, BRIEFING_SYSTEM_PROMPT } from './llm';
import { getCourseHoles, getHoleHazards, getOfficialNotesForCourse, getPlayerNotesByCourseHole } from '@/lib/db/courses';
import { getPlayerClubDistances, getPlayerHoleHistory, getPlayerProfile } from '@/lib/db/players';
import { getPlayerRounds, getRoundHoles } from '@/lib/db/rounds';
import { createBriefing as saveBriefing } from '@/lib/db/briefings';
import { BriefingJson, OfficialHoleNote, PlayerHoleNote } from '@/lib/db/types';
import { query } from '@/lib/db/client';
import { getAllKnowledge } from './knowledge';

const KNOWLEDGE_PRINCIPLES = getAllKnowledge();

export async function generateBriefing(
  userId: string,
  courseTeeId: string,
  playDate: string,
): Promise<{ id: string; briefingJson: BriefingJson }> {
  // 1. Get holes + courseId + tee ratings + player profile (in parallel)
  const holes = await getCourseHoles(courseTeeId);
  const [teeRow, playerProfile] = await Promise.all([
    query<{ course_id: string; course_rating: number | null; slope_rating: number | null; par_total: number; tee_name: string }>(
      'SELECT course_id, course_rating, slope_rating, par_total, tee_name FROM course_tees WHERE id = $1', [courseTeeId]
    ),
    getPlayerProfile(userId),
  ]);
  const courseId = teeRow.rows[0]?.course_id;
  const teeInfo = teeRow.rows[0] ?? null;

  // 2. Fetch per-hole hazards, official notes, and player notes in parallel
  const [officialNotes, ...holesWithExtras] = await Promise.all([
    courseId ? getOfficialNotesForCourse(courseId) : Promise.resolve({} as Record<number, OfficialHoleNote>),
    ...holes.map(async (h) => {
      const [hazards, playerNotes] = await Promise.all([
        getHoleHazards(h.id),
        getPlayerNotesByCourseHole(courseId, h.hole_number, userId),
      ]);
      return {
        hole: h,
        hazards,
        playerNotes,
      };
    }),
  ]) as [Record<number, OfficialHoleNote>, ...Array<{ hole: typeof holes[0]; hazards: Awaited<ReturnType<typeof getHoleHazards>>; playerNotes: PlayerHoleNote[] }>];

  const holesWithHazards: HoleInput[] = holesWithExtras.map(({ hole, hazards }) => ({
    hole_number: hole.hole_number,
    par: hole.par,
    yardage: hole.yardage,
    hazards: hazards.map(hz => ({
      side: hz.side,
      type: hz.type,
      start_yards: hz.start_yards,
      end_yards: hz.end_yards,
    })),
  }));

  // 3. Player distances
  const distances = await getPlayerClubDistances(userId);
  const driverDist = distances.find(d => d.club_code === 'D');
  const playerDistance = { driver_carry: driverDist?.typical_carry_yards ?? null };

  // 4. Player history (aggregated)
  const histories = await getPlayerHoleHistory(userId, courseTeeId);
  const historyInputs: PlayerHistoryInput[] = histories.map(h => ({
    hole_number: h.hole_number,
    rounds_played: h.rounds_played,
    driver_used: h.driver_used,
    penalties: h.penalties,
  }));

  // 5. Recent rounds on this course (for score trend + previous notes + recap advice)
  const allRounds = await getPlayerRounds(userId);
  const prevRoundsOnCourse = allRounds.filter(r => r.course_tee_id === courseTeeId).slice(0, 3);
  const prevRoundDetails = await Promise.all(
    prevRoundsOnCourse.map(async (r) => ({
      ...r,
      holes: await getRoundHoles(r.id),
    }))
  );

  // 6. Strategy engine
  const briefingData: BriefingData = computeBriefing(holesWithHazards, historyInputs, playerDistance);

  // 7. Compute Playing Handicap — prefer auto-calculated VibeCaddie Index over manual entry
  const effectiveHandicap = playerProfile?.vibecaddie_index ?? playerProfile?.handicap_index ?? null;
  const playingHandicap = computePlayingHandicap(
    effectiveHandicap,
    teeInfo?.course_rating ?? null,
    teeInfo?.slope_rating ?? null,
    teeInfo?.par_total ?? null,
  );

  // 8. Assemble prompt with all context
  const userPrompt = assembleBriefingPrompt(
    briefingData,
    holes,
    holesWithExtras.map(x => x.playerNotes),
    officialNotes,
    historyInputs,
    prevRoundDetails,
    effectiveHandicap,
    teeInfo,
    playingHandicap,
  );

  // 9. Call LLM
  const llmResponse = await callLLM(BRIEFING_SYSTEM_PROMPT, userPrompt);

  // 10. Build briefing JSON
  const briefingJson: BriefingJson = {
    control_holes: briefingData.control_holes,
    driver_ok_holes: briefingData.driver_ok_holes,
    avoid_side: briefingData.avoid_side,
    display_text: llmResponse.content,
    playing_handicap: playingHandicap,
    handicap_index: effectiveHandicap,
    course_rating: teeInfo?.course_rating ?? null,
    slope_rating: teeInfo?.slope_rating ?? null,
    par_total: teeInfo?.par_total ?? null,
    hole_strategies: briefingData.hole_strategies.map(s => ({
      hole_number: s.hole_number,
      decision: s.decision,
      reason: s.reason,
      confidence: s.confidence,
    })),
  };

  // 11. Save
  const saved = await saveBriefing(userId, {
    course_tee_id: courseTeeId,
    play_date: playDate,
    briefing_json: briefingJson,
  });

  return { id: saved.id, briefingJson };
}

type PrevRoundDetail = {
  id: string;
  played_date: string;
  total_score: number | null;
  recap_text: string | null;
  holes: Awaited<ReturnType<typeof getRoundHoles>>;
};

type TeeInfo = {
  tee_name: string;
  course_rating: number | null;
  slope_rating: number | null;
  par_total: number;
} | null;

function computePlayingHandicap(
  handicapIndex: number | null,
  courseRating: number | null,
  slopeRating: number | null,
  par: number | null,
): number | null {
  if (handicapIndex == null || courseRating == null || slopeRating == null || par == null) return null;
  return Math.round(handicapIndex * (slopeRating / 113) + (courseRating - par));
}

function assembleBriefingPrompt(
  data: BriefingData,
  holes: Awaited<ReturnType<typeof getCourseHoles>>,
  allPlayerNotes: PlayerHoleNote[][],
  officialNotes: Record<number, OfficialHoleNote>,
  histories: PlayerHistoryInput[],
  prevRoundDetails: PrevRoundDetail[],
  handicapIndex: number | null,
  teeInfo: TeeInfo,
  playingHandicap: number | null,
): string {
  let prompt = `Generate a pre-round briefing for an ${holes.length}-hole round.\n\n`;

  // Playing Handicap section
  if (handicapIndex != null && teeInfo) {
    prompt += `## Player Handicap & Course Difficulty\n`;
    prompt += `Handicap Index: ${handicapIndex}\n`;
    if (teeInfo.course_rating != null && teeInfo.slope_rating != null) {
      prompt += `Tee: ${teeInfo.tee_name} — CR ${teeInfo.course_rating} / SL ${teeInfo.slope_rating} / Par ${teeInfo.par_total}\n`;
      if (playingHandicap != null) {
        prompt += `Playing Handicap (strokes received today): ${playingHandicap}\n`;
        prompt += `Formula: round(${handicapIndex} × (${teeInfo.slope_rating} ÷ 113) + (${teeInfo.course_rating} − ${teeInfo.par_total})) = ${playingHandicap}\n`;
        const extra = playingHandicap - handicapIndex;
        if (extra > 0) {
          prompt += `The high Slope Rating adds ${extra} extra stroke(s) beyond the bare Index — this course is significantly harder for mid/high-handicappers than scratch golfers.\n`;
        } else if (extra < 0) {
          prompt += `The low Slope Rating reduces strokes by ${Math.abs(extra)} vs bare Index — this course is relatively fair across all handicap levels.\n`;
        }
        prompt += `On the ${playingHandicap} hardest holes (by Stroke Index), the player receives an extra shot — net target on those holes is bogey, not par.\n`;
        if (playingHandicap > 18) {
          prompt += `With ${playingHandicap} strokes, the player receives 2 shots on the ${playingHandicap - 18} easiest holes — net target on those holes is double-bogey (gross), which equals net par.\n`;
        }
      }
    }
    prompt += `\n`;
  }

  prompt += `## Strategy Summary\n`;
  prompt += `Driver OK holes: ${data.driver_ok_holes.join(', ') || 'none'}\n`;
  prompt += `Control club holes: ${data.control_holes.join(', ') || 'none'}\n`;
  prompt += `Avoid side: ${data.avoid_side}\n\n`;

  prompt += `## Scorecard & Per-Hole Details\n`;
  for (let i = 0; i < holes.length; i++) {
    const h = holes[i];
    const strategy = data.hole_strategies.find(s => s.hole_number === h.hole_number);
    const official = officialNotes[h.hole_number];
    const playerNotes = allPlayerNotes[i] ?? [];

    prompt += `Hole ${h.hole_number}: Par ${h.par}, ${h.yardage} yds${h.si ? `, SI ${h.si}` : ''}`;
    if (h.hole_note) prompt += ` — Scorecard note: "${h.hole_note}"`;
    if (strategy) {
      prompt += ` — ${strategy.decision} (${strategy.confidence} confidence). ${strategy.reason}`;
      if (strategy.hazard_notes.length > 0) prompt += ` Hazards: ${strategy.hazard_notes.join(', ')}`;
    }
    if (official?.note) prompt += `\n  Official note: ${official.note}`;
    if (playerNotes.length > 0) {
      prompt += `\n  Player notes: ${playerNotes.map(n => `${n.user_name}: "${n.note}"`).join(' | ')}`;
    }
    prompt += '\n';
  }

  // Previous rounds on this course
  if (prevRoundDetails.length > 0) {
    prompt += `\n## Player's Previous Rounds on This Course\n`;

    const withScores = prevRoundDetails.filter(r => r.total_score != null);
    if (withScores.length > 0) {
      const scoreTrend = [...withScores].reverse().map(r => `${r.played_date}: ${r.total_score}`).join(' → ');
      prompt += `Score history: ${scoreTrend}\n`;
    }

    // Hole notes from previous rounds (patterns)
    const allPrevNotes: Array<{ holeNumber: number; note: string; date: string }> = [];
    for (const r of prevRoundDetails) {
      for (const h of r.holes) {
        if (h.hole_notes) allPrevNotes.push({ holeNumber: h.hole_number, note: h.hole_notes, date: r.played_date });
      }
    }
    if (allPrevNotes.length > 0) {
      prompt += `Hole notes from recent rounds:\n`;
      for (const n of allPrevNotes) {
        prompt += `  Hole ${n.holeNumber} (${n.date}): "${n.note}"\n`;
      }
    }

    // Last recap advice (what did we tell them last time?)
    const lastRecap = prevRoundDetails.find(r => r.recap_text);
    if (lastRecap?.recap_text) {
      prompt += `Last round recap advice:\n${lastRecap.recap_text}\n`;
    }
  }

  // Aggregated trouble holes
  if (histories.length > 0) {
    const troubleHoles = histories.filter(h => h.penalties > 0);
    if (troubleHoles.length > 0) {
      prompt += `\nTrouble holes (all-time penalties): ${troubleHoles.map(h => `Hole ${h.hole_number} (${h.penalties}x in ${h.rounds_played} rounds)`).join(', ')}\n`;
    }
  }

  prompt += `\n## Course Management Principles\n`;
  for (const p of KNOWLEDGE_PRINCIPLES) {
    prompt += `- ${p.principle}\n`;
  }

  return prompt;
}
