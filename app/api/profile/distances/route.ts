import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import {
  getPlayerClubDistances,
  upsertPlayerClubDistance,
} from "@/lib/db/players";

export async function GET() {
  try {
    // TODO: 移除 preview mock
    if (process.env.SKIP_AUTH === "true") {
      return NextResponse.json([
        { id: "d1", club_type: "Driver", carry_yards: 230 },
        { id: "d2", club_type: "7 Iron", carry_yards: 155 },
        { id: "d3", club_type: "PW", carry_yards: 120 },
      ]);
    }
    const userId = await getUserId();
    const distances = await getPlayerClubDistances(userId);
    return NextResponse.json(distances);
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

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    const data = await request.json();
    const distance = await upsertPlayerClubDistance(userId, data);
    return NextResponse.json(distance);
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
