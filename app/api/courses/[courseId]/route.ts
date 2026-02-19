import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getCourseById, updateCourse, getCourseTees } from "@/lib/db/courses";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/** GET /api/courses/[courseId] — 球场详情 + tee 列表 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { courseId } = await context.params;

    // TODO: 移除 preview mock
    if (process.env.SKIP_AUTH === "true") {
      const mockCourses: Record<string, object> = {
        "demo-c1": {
          id: "demo-c1",
          name: "Pebble Beach Golf Links",
          location_text: "Pebble Beach, CA",
          course_note: "Stunning ocean views. Wind picks up in the afternoon — club up on exposed holes.",
          tees: [
            { id: "t1", course_id: "demo-c1", tee_name: "White", tee_color: "White", par_total: 72 },
            { id: "t2", course_id: "demo-c1", tee_name: "Blue", tee_color: "Blue", par_total: 72 },
            { id: "t3", course_id: "demo-c1", tee_name: "Gold", tee_color: "Gold", par_total: 72 },
            { id: "t4", course_id: "demo-c1", tee_name: "Black", tee_color: "Black", par_total: 72 },
          ],
        },
        "demo-c2": {
          id: "demo-c2",
          name: "Torrey Pines South",
          location_text: "La Jolla, CA",
          course_note: null,
          tees: [
            { id: "t5", course_id: "demo-c2", tee_name: "White", tee_color: "White", par_total: 72 },
            { id: "t6", course_id: "demo-c2", tee_name: "Blue", tee_color: "Blue", par_total: 72 },
            { id: "t7", course_id: "demo-c2", tee_name: "Gold", tee_color: "Gold", par_total: 72 },
          ],
        },
        "demo-c3": {
          id: "demo-c3",
          name: "Bethpage Black",
          location_text: "Farmingdale, NY",
          course_note: "Tough course — bring extra balls. Rough is punishing.",
          tees: [
            { id: "t8", course_id: "demo-c3", tee_name: "White", tee_color: "White", par_total: 71 },
            { id: "t9", course_id: "demo-c3", tee_name: "Blue", tee_color: "Blue", par_total: 71 },
            { id: "t10", course_id: "demo-c3", tee_name: "Black", tee_color: "Black", par_total: 71 },
          ],
        },
      };

      const mock = mockCourses[courseId];
      if (mock) {
        return NextResponse.json(mock);
      }
      // 动态创建的 preview course — 返回基本结构
      if (courseId.startsWith("preview-")) {
        return NextResponse.json({
          id: courseId,
          name: "New Course",
          location_text: null,
          course_note: null,
          tees: [],
        });
      }
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    await getUserId();
    const [course, tees] = await Promise.all([
      getCourseById(courseId),
      getCourseTees(courseId),
    ]);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ ...course, tees });
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

/** PUT /api/courses/[courseId] — 更新球场 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await getUserId();
    const { courseId } = await context.params;
    const body = await request.json();
    const { name, location_text, course_note } = body as {
      name?: string;
      location_text?: string;
      course_note?: string;
    };

    const updated = await updateCourse(courseId, {
      name: name?.trim(),
      location_text: location_text?.trim(),
      course_note: course_note?.trim(),
    });

    if (!updated) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
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
