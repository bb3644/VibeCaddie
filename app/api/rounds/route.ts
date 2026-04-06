import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getPlayerRounds, createRound } from "@/lib/db/rounds";

/** GET /api/rounds — 获取球员所有轮次（带球场名和 tee 名） */
export async function GET() {
  try {
    const userId = await getUserId();
    const rounds = await getPlayerRounds(userId);
    return NextResponse.json(rounds);
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

/** POST /api/rounds — 创建新一轮 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { course_tee_id, played_date, holes_played } = body as {
      course_tee_id: string;
      played_date: string;
      holes_played?: number;
    };

    if (!course_tee_id || !played_date) {
      return NextResponse.json(
        { error: "course_tee_id and played_date are required" },
        { status: 400 }
      );
    }

    const round = await createRound(userId, { course_tee_id, played_date, holes_played: holes_played ?? 18 });
    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create round error:", error);
    return NextResponse.json(
      { error: "Failed to create round" },
      { status: 500 }
    );
  }
}
