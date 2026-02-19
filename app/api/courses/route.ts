import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { listCourses, createCourse, searchCourses } from "@/lib/db/courses";
import { normalizeName } from "@/lib/services/course";

/** GET /api/courses — 列出所有球场（含 tee 数量） */
export async function GET() {
  try {
    // TODO: 移除 preview mock
    if (process.env.SKIP_AUTH === "true") {
      return NextResponse.json([
        { id: "demo-c1", name: "Pebble Beach Golf Links", location_text: "Pebble Beach, CA", tee_count: 4 },
        { id: "demo-c2", name: "Torrey Pines South", location_text: "La Jolla, CA", tee_count: 3 },
        { id: "demo-c3", name: "Bethpage Black", location_text: "Farmingdale, NY", tee_count: 3 },
      ]);
    }
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

    // TODO: 移除 preview mock
    if (process.env.SKIP_AUTH === "true") {
      const mockId = `preview-${Date.now()}`;
      return NextResponse.json(
        {
          id: mockId,
          name: name.trim(),
          location_text: location_text?.trim() || null,
          course_note: null,
          created_at: new Date().toISOString(),
        },
        { status: 201 }
      );
    }

    await getUserId();

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
