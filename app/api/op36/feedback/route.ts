import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getOp36History, saveOp36Feedback } from "@/lib/db/op36";
import { getPlayerProfile } from "@/lib/db/players";
import { callLLM, OP36_FEEDBACK_SYSTEM_PROMPT } from "@/lib/services/llm";
import { getRelevantKnowledge } from "@/lib/services/knowledge";
import type { Op36Round } from "@/lib/db/types";

/** POST /api/op36/feedback — generate and save AI coaching feedback for an Op36 round */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const round = await request.json() as Op36Round;

    // Load player name and history in parallel
    const [profile, allRounds] = await Promise.all([
      getPlayerProfile(userId),
      getOp36History(userId),
    ]);
    const prevAtLevel = allRounds.filter(
      (r) => r.level === round.level && r.id !== round.id
    ).slice(0, 5);

    // Op36-specific knowledge
    const knowledge = getRelevantKnowledge([
      "op36", "op36_short_game", "op36_irons", "op36_driver",
      "op36_putting", "op36_scrambling", "op36_scoring",
      "op36_progression", "op36_gir", "op36_graduation", "op36_analysis", "op36_mental",
    ], 8);

    // Build prompt
    const playerName = profile?.name ?? "the player";
    let prompt = `## Player\nName: ${playerName}\n\n## This Round\n`;
    prompt += `Level: ${round.level} (${round.distance_label})\n`;
    prompt += `Nines played: ${round.nines === "both" ? "Full 18" : round.nines === "front" ? "Front 9" : "Back 9"}\n`;
    prompt += `Total score: ${round.total_score} (pass mark: ${round.nines === "both" ? "72" : "36"})\n`;
    prompt += `Result: ${round.result === "advance" ? `PASS — advanced to Level ${round.level_after}` : round.result === "graduate" ? "GRADUATE — completed all 10 levels!" : round.result === "demote" ? `MISS — dropped to Level ${round.level_after}` : `MISS — stays at Level ${round.level}`}\n`;
    prompt += `Points: ${round.points}${round.mastery ? " (MASTERY achieved!)" : ""}\n`;
    if (round.total_putts != null) prompt += `Putts: ${round.total_putts}\n`;
    if (round.girs != null) prompt += `GIRs: ${round.girs}\n`;
    if (round.uds != null) prompt += `Up & Downs: ${round.uds}\n`;
    if (round.birdies != null) prompt += `Birdies: ${round.birdies}\n`;
    if (round.three_putts != null) prompt += `3-putts: ${round.three_putts}\n`;
    if (round.front_score != null) prompt += `Front 9 score: ${round.front_score}\n`;
    if (round.back_score != null) prompt += `Back 9 score: ${round.back_score}\n`;

    // Round notes
    if (round.notes) {
      prompt += `\n## Player's Round Notes\n"${round.notes}"\n`;
    }

    // Previous rounds at this level
    if (prevAtLevel.length > 0) {
      prompt += `\n## Previous Rounds at Level ${round.level}\n`;
      for (const r of prevAtLevel) {
        prompt += `${r.played_at}: Score ${r.total_score}, Points ${r.points}, Result: ${r.result}`;
        if (r.girs != null) prompt += `, GIR: ${r.girs}`;
        if (r.total_putts != null) prompt += `, Putts: ${r.total_putts}`;
        if (r.uds != null) prompt += `, U&D: ${r.uds}`;
        prompt += "\n";
      }
    }

    // Relevant knowledge
    if (knowledge.length > 0) {
      prompt += `\n## Op36 Coaching Knowledge\n`;
      for (const k of knowledge) {
        prompt += `- ${k.principle}\n`;
      }
    }

    const response = await callLLM(OP36_FEEDBACK_SYSTEM_PROMPT, prompt, {
      max_tokens: 600,
      temperature: 0.7,
    });

    // Save feedback to DB
    if (round.id) {
      await saveOp36Feedback(userId, round.id, response.content);
    }

    return NextResponse.json({ feedback: response.content });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Op36 feedback error:", error);
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
  }
}
