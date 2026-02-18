import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { listCourses, createCourse, searchCourses } from "@/lib/db/courses";
import { normalizeName } from "@/lib/services/course";

/** GET /api/courses — 列出所有球场（含 tee 数量） */
export async function GET() {
  try {
    await getUserId();
    const courses = await listCourses();
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

/** POST /api/courses — 创建球场（自动查重） */
export async function POST(request: NextRequest) {
  try {
    await getUserId();
    const body = await request.json();
    const { name, location_text, force } = body as {
      name: string;
      location_text?: string;
      force?: boolean;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Course name is required" },
        { status: 400 }
      );
    }

    // 查重：用标准化名称搜索相似球场
    if (!force) {
      const normalized = normalizeName(name);
      const duplicates = await searchCourses(normalized);
      if (duplicates.length > 0) {
        return NextResponse.json({ duplicates }, { status: 409 });
      }
    }

    const course = await createCourse({
      name: name.trim(),
      location_text: location_text?.trim() || undefined,
    });
    return NextResponse.json(course, { status: 201 });
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
