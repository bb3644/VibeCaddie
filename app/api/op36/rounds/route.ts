import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getOp36History, saveOp36Round } from "@/lib/db/op36";
import {
  LEVEL_DISTANCES,
  MAX_LEVEL,
  PASS_MARK_9,
  PASS_MARK_18,
  HoleInput,
  calcTotals,
} from "@/lib/op36";
import type { SaveOp36RoundData } from "@/lib/db/types";

/** GET /api/op36/rounds — get all Op36 rounds, newest first */
export async function GET() {
  try {
    const userId = await getUserId();
    const rounds = await getOp36History(userId);
    return NextResponse.json(rounds);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** POST /api/op36/rounds — submit a completed Op36 round */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();

    const body = await request.json() as {
      played_at: string;
      level: number;
      nines: "front" | "back" | "both";
      front_holes?: HoleInput[];
      back_holes?: HoleInput[];
      notes?: string;
    };

    const { played_at, level, nines, front_holes, back_holes, notes } = body;

    if (!played_at || !level || !nines) {
      return NextResponse.json({ error: "played_at, level, and nines are required" }, { status: 400 });
    }
    if (level < 1 || level > MAX_LEVEL) {
      return NextResponse.json({ error: `level must be 1–${MAX_LEVEL}` }, { status: 400 });
    }

    // Collect all holes
    const allHoles: HoleInput[] = [];
    if (nines === "front" || nines === "both") allHoles.push(...(front_holes ?? []));
    if (nines === "back" || nines === "both") allHoles.push(...(back_holes ?? []));

    if (allHoles.length === 0) {
      return NextResponse.json({ error: "No hole data provided" }, { status: 400 });
    }

    const totals = calcTotals(allHoles);
    const frontTotals = front_holes ? calcTotals(front_holes) : null;
    const backTotals = back_holes ? calcTotals(back_holes) : null;

    // Pass mark depends on nines
    const passMark = nines === "both" ? PASS_MARK_18 : PASS_MARK_9;
    const passed = totals.totalScore <= passMark;

    // Mastery: score ≤ pass mark AND points ≥ 18 (9-hole) or ≥ 36 (18-hole)
    const masteryPoints = nines === "both" ? 36 : 18;
    const mastery = passed && totals.points >= masteryPoints;

    // Determine result
    let result: "advance" | "demote" | "stay" | "graduate";
    let level_after: number;

    if (passed && level === MAX_LEVEL) {
      result = "graduate";
      level_after = MAX_LEVEL;
    } else if (passed) {
      result = "advance";
      level_after = level + 1;
    } else if (level === 1) {
      result = "stay";
      level_after = 1;
    } else {
      result = "demote";
      level_after = level - 1;
    }

    const data: SaveOp36RoundData = {
      played_at,
      level,
      distance_label: LEVEL_DISTANCES[level],
      nines,
      front_holes: (front_holes as Record<string, unknown>[] | undefined) ?? null,
      back_holes: (back_holes as Record<string, unknown>[] | undefined) ?? null,
      front_score: frontTotals?.totalScore ?? null,
      back_score: backTotals?.totalScore ?? null,
      total_score: totals.totalScore,
      total_putts: totals.totalPutts,
      girs: totals.girs,
      uds: totals.uds,
      birdies: totals.birdies,
      pars: totals.pars,
      three_putts: totals.threePutts,
      four_putts: totals.fourPutts,
      double_bogey_plus: totals.doubleBogeyPlus,
      points: totals.points,
      mastery,
      result,
      level_after,
      notes: notes ?? null,
    };

    const round = await saveOp36Round(userId, data);
    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Save Op36 round error:", error);
    return NextResponse.json({ error: "Failed to save round" }, { status: 500 });
  }
}
