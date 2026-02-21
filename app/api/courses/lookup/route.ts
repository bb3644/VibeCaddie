import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { lookupCourseScorecard } from '@/lib/services/scorecard-lookup';

/** POST /api/courses/lookup — 在线查找球场记分卡 */
export async function POST(request: NextRequest) {
  try {
    await getUserId();

    const body = await request.json();
    const { name, location } = body as { name: string; location?: string };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 },
      );
    }

    const result = await lookupCourseScorecard(name.trim(), location?.trim());

    return NextResponse.json(result);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // LLM 未找到球场 or 解析失败
    if (message === 'Course not found') {
      return NextResponse.json(
        { error: 'Could not find scorecard data for this course.' },
        { status: 404 },
      );
    }

    console.error('Scorecard lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to look up course data. Please try again or add manually.' },
      { status: 500 },
    );
  }
}
