import { NextRequest, NextResponse } from "next/server";

/**
 * Cookie guard: user_id — selected player profile
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const userId = req.cookies.get("user_id")?.value;

  // /select-profile doesn't need user_id
  if (pathname === "/select-profile") return NextResponse.next();

  if (!userId) {
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
