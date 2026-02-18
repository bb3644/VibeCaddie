import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getRoundById, upsertRoundHole } from "@/lib/db/rounds";

interface RouteContext {
  params: Promise<{ roundId: string }>;
}

/** PUT /api/rounds/[roundId]/holes — 插入或更新某一洞数据 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = await getUserId();
    const { roundId } = await context.params;

    // 校验轮次属于当前用户
    const round = await getRoundById(userId, roundId);
    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const body = await request.json();
    const { hole_number, tee_club, tee_result, score, putts, gir } = body as {
      hole_number: number;
      tee_club: string;
      tee_result: "FW" | "L" | "R" | "PEN";
      score?: number;
      putts?: number;
      gir?: boolean;
    };

    if (!hole_number || !tee_club || !tee_result) {
      return NextResponse.json(
        { error: "hole_number, tee_club, and tee_result are required" },
        { status: 400 }
      );
    }

    const hole = await upsertRoundHole({
      round_id: roundId,
      hole_number,
      tee_club,
      tee_result,
      score,
      putts,
      gir,
    });

    return NextResponse.json(hole);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Upsert hole error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
