import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getPlayerRounds, createRound } from "@/lib/db/rounds";

/** GET /api/rounds — 获取球员所有轮次（带球场名和 tee 名） */
export async function GET() {
  try {
    // TODO: 移除 preview mock
    if (process.env.SKIP_AUTH === "true") {
      return NextResponse.json([
        { id: "demo-1", course_name: "Pebble Beach", tee_name: "White", played_date: "2025-06-15", total_score: 89 },
        { id: "demo-2", course_name: "Torrey Pines South", tee_name: "Blue", played_date: "2025-06-10", total_score: 92 },
        { id: "demo-3", course_name: "Bethpage Black", tee_name: "White", played_date: "2025-06-05", total_score: 95 },
        { id: "demo-4", course_name: "Pebble Beach", tee_name: "White", played_date: "2025-05-28", total_score: 88 },
        { id: "demo-5", course_name: "Torrey Pines South", tee_name: "Blue", played_date: "2025-05-20", total_score: 91 },
      ]);
    }
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
    const { course_tee_id, played_date } = body as {
      course_tee_id: string;
      played_date: string;
    };

    if (!course_tee_id || !played_date) {
      return NextResponse.json(
        { error: "course_tee_id and played_date are required" },
        { status: 400 }
      );
    }

    const round = await createRound(userId, { course_tee_id, played_date });
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
