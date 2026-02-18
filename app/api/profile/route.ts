import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getPlayerProfile, upsertPlayerProfile } from "@/lib/db/players";

export async function GET() {
  try {
    const userId = await getUserId();
    const profile = await getPlayerProfile(userId);
    return NextResponse.json(profile);
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
    const profile = await upsertPlayerProfile(userId, data);
    return NextResponse.json(profile);
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
