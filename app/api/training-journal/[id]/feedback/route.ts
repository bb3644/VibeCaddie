import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getTrainingJournalById, saveAiFeedback } from "@/lib/db/training-journal";
import { callLLM } from "@/lib/services/llm";

const SYSTEM_PROMPT = `You are an experienced golf coach reviewing a player's training session journal.
Your job is to give honest, specific, and encouraging feedback.
Structure your response with these sections:
- **What sounds promising**: highlight what worked or what the player discovered
- **Worth addressing**: flag any technique or mental patterns to watch
- **Focus for next session**: one or two clear, actionable suggestions

Keep your tone like a calm, knowledgeable coach — direct but supportive. Be concise.`;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    const journal = await getTrainingJournalById(userId, id);
    if (!journal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!journal.reflection) {
      return NextResponse.json({ error: "Reflection is required before getting AI feedback" }, { status: 400 });
    }

    const userPrompt = `Session date: ${journal.session_date}
Focus: ${journal.focus_area}
${journal.location ? `Location: ${journal.location}\n` : ""}
Plan: ${journal.plan}

Reflection: ${journal.reflection}

Review this training session. Give honest feedback, highlight what sounds promising, flag anything worth addressing, and suggest what to focus on next session.`;

    const { content } = await callLLM(SYSTEM_PROMPT, userPrompt, { max_tokens: 600 });

    const updated = await saveAiFeedback(userId, id, content);
    return NextResponse.json(updated);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("AI feedback error:", error);
    return NextResponse.json({ error: "Failed to get AI feedback" }, { status: 500 });
  }
}
