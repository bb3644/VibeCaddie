import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import {
  getHoleHazards,
  createHoleHazard,
  deleteHoleHazard,
} from "@/lib/db/courses";

interface RouteContext {
  params: Promise<{ holeId: string }>;
}

/** GET /api/courses/holes/[holeId]/hazards — 列出球洞的所有障碍物 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    await getUserId();
    const { holeId } = await context.params;
    const hazards = await getHoleHazards(holeId);
    return NextResponse.json(hazards);
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

/** POST /api/courses/holes/[holeId]/hazards — 创建障碍物 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await getUserId();
    const { holeId } = await context.params;
    const body = await request.json();
    const { side, type, start_yards, end_yards, note } = body as {
      side: "L" | "R" | "C";
      type: "water" | "bunker" | "trees" | "OOB";
      start_yards?: number;
      end_yards?: number;
      note?: string;
    };

    if (!side || !type) {
      return NextResponse.json(
        { error: "side and type are required" },
        { status: 400 }
      );
    }

    const hazard = await createHoleHazard({
      course_hole_id: holeId,
      side,
      type,
      start_yards: start_yards ?? undefined,
      end_yards: end_yards ?? undefined,
      note: note?.trim() || undefined,
    });

    return NextResponse.json(hazard, { status: 201 });
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

/** DELETE /api/courses/holes/[holeId]/hazards?id=hazardId — 删除障碍物 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await getUserId();
    // holeId 用于路由层级，实际删除用 query param id
    await context.params;
    const { searchParams } = new URL(request.url);
    const hazardId = searchParams.get("id");

    if (!hazardId) {
      return NextResponse.json(
        { error: "id query param is required" },
        { status: 400 }
      );
    }

    await deleteHoleHazard(hazardId);
    return NextResponse.json({ ok: true });
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
