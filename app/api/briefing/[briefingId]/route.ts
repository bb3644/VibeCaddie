import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getBriefingById, deleteBriefing } from "@/lib/db/briefings";

interface RouteContext {
  params: Promise<{ briefingId: string }>;
}

/** DELETE /api/briefing/[briefingId] — 删除简报 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = await getUserId();
    const { briefingId } = await context.params;
    const deleted = await deleteBriefing(userId, briefingId);
    if (!deleted) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** GET /api/briefing/[briefingId] — 获取特定简报 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = await getUserId();
    const { briefingId } = await context.params;

    const briefing = await getBriefingById(userId, briefingId);
    if (!briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }

    return NextResponse.json(briefing);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
