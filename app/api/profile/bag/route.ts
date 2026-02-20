import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getPlayerBagClubs, upsertPlayerBagClub } from "@/lib/db/players";

export async function GET() {
  try {
    const userId = await getUserId();
    const clubs = await getPlayerBagClubs(userId);
    return NextResponse.json(clubs);
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
    const club = await upsertPlayerBagClub(userId, data);
    return NextResponse.json(club);
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
