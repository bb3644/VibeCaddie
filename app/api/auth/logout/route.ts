import { NextRequest, NextResponse } from "next/server";

/** 清除认证 cookies */
export async function POST(request: NextRequest) {
  const { scope } = await request.json().catch(() => ({ scope: "all" }));

  const res = NextResponse.json({ ok: true });

  if (scope === "profile") {
    // 只清 user_id，保留 passcode
    res.cookies.set("user_id", "", { path: "/", maxAge: 0 });
  } else {
    // 全部清除
    res.cookies.set("site_passcode", "", { path: "/", maxAge: 0 });
    res.cookies.set("user_id", "", { path: "/", maxAge: 0 });
  }

  return res;
}
