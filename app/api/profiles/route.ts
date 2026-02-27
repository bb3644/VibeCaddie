import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { upsertPlayerProfile } from "@/lib/db/players";
import { randomUUID } from "crypto";

/** 获取所有 profiles 列表 */
export async function GET() {
  try {
    const result = await query<{ user_id: string; name: string }>(
      "SELECT user_id, name FROM player_profiles ORDER BY name"
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/** 创建新 profile */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const userId = randomUUID();
    const profile = await upsertPlayerProfile(userId, { name: name.trim() });

    return NextResponse.json(profile, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
