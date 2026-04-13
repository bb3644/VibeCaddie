import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { getPlayerNotesByCourseHole } from "@/lib/db/courses";

interface RouteContext {
  params: Promise<{ courseId: string; holeNumber: string }>;
}

/** GET /api/courses/[courseId]/holes/[holeNumber]/player-notes
 *  Returns all player notes for a hole across all tees of this course.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getRequiredSession();
    const { courseId, holeNumber } = await context.params;
    const num = parseInt(holeNumber, 10);
    if (isNaN(num) || num < 1 || num > 18) {
      return NextResponse.json({ error: "Invalid hole number" }, { status: 400 });
    }
    const notes = await getPlayerNotesByCourseHole(courseId, num, session.user.id);
    return NextResponse.json(notes);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
