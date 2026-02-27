import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { lookupCourseScorecard } from '@/lib/services/scorecard-lookup';

/** POST /api/courses/lookup — 在线查找球场记分卡 */
export async function POST(request: NextRequest) {
  try {
    await getUserId();

    const body = await request.json();
    const { name, location } = body as { name: string; location?: string };
    console.log('[lookup-route] request:', { name, location });

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 },
      );
    }

    const result = await lookupCourseScorecard(name.trim(), location?.trim());
    console.log('[lookup-route] success:', result.course_name, '—', result.tees.length, 'tees');

    return NextResponse.json(result);
  } catch (error) {
    const message = (error as Error).message;
    console.error('[lookup-route] caught error:', message);

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 已知的用户可见错误 — 直接透传
    const userFacingPrefixes = [
      'Course not found',
      'No search results',
      'No tee data',
      'No complete tee data',
      'Failed to parse scorecard',
      'Google Search',
    ];
    if (userFacingPrefixes.some((p) => message.startsWith(p))) {
      return NextResponse.json(
        { error: message },
        { status: 404 },
      );
    }

    // 未预期的错误 — 日志记录完整信息，前端显示摘要
    console.error('[lookup-route] unexpected error:', error);
    return NextResponse.json(
      { error: `Lookup failed: ${message.slice(0, 120)}` },
      { status: 500 },
    );
  }
}
