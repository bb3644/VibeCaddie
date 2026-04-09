import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getOp36Progress } from "@/lib/db/op36";

/** GET /api/op36/progress — get player's current Op36 level */
export async function GET() {
  try {
    const userId = await getUserId();
    const progress = await getOp36Progress(userId);
    return NextResponse.json(progress);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
