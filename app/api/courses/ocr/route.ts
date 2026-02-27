import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { callLLMWithImage, SCORECARD_OCR_PROMPT } from '@/lib/services/llm';
import type { LookupResult } from '@/lib/types/scorecard';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/** POST /api/courses/ocr — 上传记分卡照片 → OCR 提取 */
export async function POST(request: NextRequest) {
  try {
    await getUserId();

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported image type. Use JPEG, PNG, or WebP.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 },
      );
    }

    // 转 base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    console.log('[ocr-route] processing image:', file.name, file.type, `${(file.size / 1024).toFixed(0)}KB`);

    // 调 LLM Vision
    const response = await callLLMWithImage(
      SCORECARD_OCR_PROMPT,
      'Extract the scorecard data from this photo.',
      base64,
      file.type,
      { max_tokens: 4000, temperature: 0 },
    );

    // 解析 JSON
    let jsonStr = response.content.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[ocr-route] LLM returned invalid JSON:', jsonStr.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse scorecard from photo. Try a clearer image.' },
        { status: 422 },
      );
    }

    if (parsed.error) {
      return NextResponse.json(
        { error: parsed.error as string },
        { status: 422 },
      );
    }

    const tees = parsed.tees as LookupResult['tees'] | undefined;
    if (!Array.isArray(tees) || tees.length === 0) {
      return NextResponse.json(
        { error: 'No scorecard data found in photo.' },
        { status: 422 },
      );
    }

    // 确保 par_total 一致
    for (const tee of tees) {
      if (Array.isArray(tee.holes)) {
        tee.par_total = tee.holes.reduce((s, h) => s + h.par, 0);
      }
    }

    const result: LookupResult = {
      course_name: (parsed.course_name as string) || '',
      location: (parsed.location as string) || '',
      tees,
      confidence: (parsed.confidence as LookupResult['confidence']) || 'medium',
      source: 'photo_ocr',
    };

    console.log('[ocr-route] success:', result.course_name || '(unnamed)', '—', tees.length, 'tees');
    return NextResponse.json(result);
  } catch (error) {
    const message = (error as Error).message;
    console.error('[ocr-route] error:', message);

    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to process scorecard photo. Please try again.' },
      { status: 500 },
    );
  }
}
