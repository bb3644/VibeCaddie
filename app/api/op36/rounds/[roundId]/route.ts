import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { deleteOp36Round } from "@/lib/db/op36";

/** DELETE /api/op36/rounds/[roundId] — delete an Op36 round */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const userId = await getUserId();
    const { roundId } = await params;
    await deleteOp36Round(userId, roundId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete Op36 round error:", error);
    return NextResponse.json({ error: "Failed to delete round" }, { status: 500 });
  }
}
