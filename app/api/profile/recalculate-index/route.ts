import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { calculateAndSaveVibecaddieIndex } from "@/lib/services/handicap";

/** POST /api/profile/recalculate-index — 手动触发 Indicative Handicap 重新计算 */
export async function POST() {
  try {
    const userId = await getUserId();
    const index = await calculateAndSaveVibecaddieIndex(userId);
    return NextResponse.json({ vibecaddie_index: index });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Recalculate index error:", error);
    return NextResponse.json({ error: "Failed to recalculate" }, { status: 500 });
  }
}
