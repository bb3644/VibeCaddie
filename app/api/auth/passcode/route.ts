import { NextRequest, NextResponse } from "next/server";

/** 验证 site passcode，设置 httpOnly cookie */
export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();

    const sitePasscode = process.env.SITE_PASSCODE ?? process.env.SITE_PASSWORD;
    if (!passcode || passcode !== sitePasscode) {
      return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
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
