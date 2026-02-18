import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { searchCourses } from "@/lib/db/courses";

/** GET /api/courses/search?q=term — 模糊搜索球场 */
export async function GET(request: NextRequest) {
  try {
    await getUserId();
    const q = request.nextUrl.searchParams.get("q") || "";
    if (!q.trim()) {
      return NextResponse.json([]);
    }
    const courses = await searchCourses(q.trim());
    return NextResponse.json(courses);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
