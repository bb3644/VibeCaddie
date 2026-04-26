import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { callLLM } from "@/lib/services/llm";

const SYSTEM_PROMPT = `You are an experienced golf coach creating a structured training plan for a player.
Write a clear, practical plan the player can follow today.
Use simple formatting: sections with a label followed by bullet points or short paragraphs.
Be specific — include drills, rep counts, time splits, and targets where appropriate.
Do not use markdown headers (no #). Use plain section labels like "Warm-up:", "Main work:", etc.
Keep it focused and achievable. No fluff.`;

export async function POST(request: NextRequest) {
  try {
    await getUserId();
    const body = await request.json() as {
      focus_areas: string[];
      duration: "half-day" | "full-day";
      activity: "range" | "practice-round" | "both";
    };

    const { focus_areas, duration, activity } = body;
    if (!focus_areas?.length || !duration || !activity) {
      return NextResponse.json({ error: "focus_areas, duration, and activity are required" }, { status: 400 });
    }

    const durationLabel = duration === "full-day" ? "Full day (~4 hours)" : "Half day (~2 hours)";
    const activityLabel =
      activity === "range" ? "Range & practice only"
      : activity === "practice-round" ? "Practice round on course"
      : "Range/practice session + practice round";

    const userPrompt = `Create a golf training plan for today.

Duration: ${durationLabel}
Activity: ${activityLabel}
Focus areas: ${focus_areas.join(", ")}

Write a structured plan the player can follow step by step. Include time allocations for each section. Be practical and specific.`;

    const { content } = await callLLM(SYSTEM_PROMPT, userPrompt, { max_tokens: 700, temperature: 0.6 });
    return NextResponse.json({ plan: content });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Generate plan error:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
