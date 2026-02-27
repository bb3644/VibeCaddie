import { NextRequest, NextResponse } from "next/server";
import { getPlayerProfile } from "@/lib/db/players";

/** 选择 profile，设置 user_id cookie */
export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // 验证 profile 存在
    const profile = await getPlayerProfile(user_id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("user_id", user_id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 天
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
