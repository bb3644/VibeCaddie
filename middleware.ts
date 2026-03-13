import { NextRequest, NextResponse } from "next/server";

/**
 * 双层 cookie 守卫：
 * 1. site_passcode — 网站访问凭证
 * 2. user_id — 选定的球员 profile
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const passcode = req.cookies.get("site_passcode")?.value;
  const userId = req.cookies.get("user_id")?.value;

  // /select-profile 只需 passcode，不需 user_id
  const isSelectProfile = pathname === "/select-profile";

  // 检查 passcode
  const sitePasscode = process.env.SITE_PASSCODE ?? process.env.SITE_PASSWORD;
  if (passcode !== sitePasscode) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 有 passcode 但无 user_id → 去选 profile（除非已经在选择页）
  if (!userId && !isSelectProfile) {
    const selectUrl = new URL("/select-profile", req.url);
    return NextResponse.redirect(selectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/courses/:path*",
    "/rounds/:path*",
    "/briefing/:path*",
    "/chat/:path*",
    "/select-profile",
  ],
};
