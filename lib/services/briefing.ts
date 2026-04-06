import { computeBriefing, BriefingData, HoleInput, PlayerHistoryInput } from './strategy';
import { callLLM, BRIEFING_SYSTEM_PROMPT } from './llm';
import { getCourseHoles, getHoleHazards, getOfficialNotesForCourse, getPlayerNotes } from '@/lib/db/courses';
import { getPlayerClubDistances, getPlayerHoleHistory } from '@/lib/db/players';
import { createBriefing as saveBriefing } from '@/lib/db/briefings';
import { BriefingJson, OfficialHoleNote, PlayerHoleNote } from '@/lib/db/types';
import { query } from '@/lib/db/client';

// Load knowledge books once at module level
import foundationsData from '@/lib/knowledge/foundations.json';
import architectureData from '@/lib/knowledge/architecture.json';
import anatomyData from '@/lib/knowledge/anatomy.json';

const KNOWLEDGE_PRINCIPLES = [
  ...foundationsData.chunks,
  ...architectureData.chunks,
  ...anatomyData.chunks,
].slice(0, 20); // include top 20 principles to keep prompt size reasonable

export async function generateBriefing(
  userId: string,
  courseTeeId: string,
  playDate: string,
): Promise<{ id: string; briefingJson: BriefingJson }> {
  // 1. Get holes + courseId
  const holes = await getCourseHoles(courseTeeId);
  const teeRow = await query<{ course_id: string }>(
    'SELECT course_id FROM course_tees WHERE id = $1', [courseTeeId]
  );
  const courseId = teeRow.rows[0]?.course_id;

  // 2. Fetch per-hole hazards, official notes, and player notes in parallel
  const [officialNotes, ...holesWithExtras] = await Promise.all([
    courseId ? getOfficialNotesForCourse(courseId) : Promise.resolve({} as Record<number, OfficialHoleNote>),
    ...holes.map(async (h) => {
      const [hazards, playerNotes] = await Promise.all([
        getHoleHazards(h.id),
        getPlayerNotes(h.id, userId),
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

  // 4. Player history
  const histories = await getPlayerHoleHistory(userId, courseTeeId);
  const historyInputs: PlayerHistoryInput[] = histories.map(h => ({
    hole_number: h.hole_number,
    rounds_played: h.rounds_played,
    driver_used: h.driver_used,
    penalties: h.penalties,
  }));

  // 5. Strategy engine
  const briefingData: BriefingData = computeBriefing(holesWithHazards, historyInputs, playerDistance);

  // 6. Assemble prompt with all context
  const userPrompt = assembleBriefingPrompt(
    briefingData,
    holes,
    holesWithExtras.map(x => x.playerNotes),
    officialNotes,
    historyInputs,
  );

  // 7. Call LLM
  const llmResponse = await callLLM(BRIEFING_SYSTEM_PROMPT, userPrompt);

  // 8. Build briefing JSON
  const briefingJson: BriefingJson = {
    control_holes: briefingData.control_holes,
    driver_ok_holes: briefingData.driver_ok_holes,
    avoid_side: briefingData.avoid_side,
    display_text: llmResponse.content,
    hole_strategies: briefingData.hole_strategies.map(s => ({
      hole_number: s.hole_number,
      decision: s.decision,
      reason: s.reason,
      confidence: s.confidence,
    })),
  };

  // 9. Save
  const saved = await saveBriefing(userId, {
    course_tee_id: courseTeeId,
    play_date: playDate,
    briefing_json: briefingJson,
  });

  return { id: saved.id, briefingJson };
}

function assembleBriefingPrompt(
  data: BriefingData,
  holes: Awaited<ReturnType<typeof getCourseHoles>>,
  allPlayerNotes: PlayerHoleNote[][],
  officialNotes: Record<number, OfficialHoleNote>,
  histories: PlayerHistoryInput[],
): string {
  let prompt = `Generate a pre-round briefing for an ${holes.length}-hole round.\n\n`;

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

  if (histories.length > 0) {
    prompt += `\n## Player History on This Course\n`;
    prompt += `The player has played ${Math.max(...histories.map(h => h.rounds_played))} rounds here before.\n`;
    const troubleHoles = histories.filter(h => h.penalties > 0);
    if (troubleHoles.length > 0) {
      prompt += `Trouble holes (penalties): ${troubleHoles.map(h => `Hole ${h.hole_number} (${h.penalties} penalties in ${h.rounds_played} rounds)`).join(', ')}\n`;
    }
  }

  prompt += `\n## Course Management Principles\n`;
  prompt += `Apply these principles when giving advice:\n`;
  for (const p of KNOWLEDGE_PRINCIPLES) {
    prompt += `- ${p.principle}\n`;
  }

  return prompt;
}
