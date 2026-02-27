import { NextRequest, NextResponse } from "next/server";

/** 验证 site passcode，设置 httpOnly cookie */
export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();

    if (!passcode || passcode !== process.env.SITE_PASSCODE) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("site_passcode", passcode, {
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
