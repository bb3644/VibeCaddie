import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getPlayerNotesForCourse } from "@/lib/db/courses";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/** GET /api/courses/[courseId]/player-notes — all player notes keyed by hole_number */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getRequiredSession();
    const { courseId } = await context.params;
    const notes = await getPlayerNotesForCourse(courseId, session.user.id);
    return NextResponse.json(notes);
  } catch (error) {
    const msg = (error as Error).message ?? "Unknown error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[course player-notes GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
