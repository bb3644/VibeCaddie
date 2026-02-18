import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import {
  getPlayerClubDistances,
  upsertPlayerClubDistance,
} from "@/lib/db/players";

export async function GET() {
  try {
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
