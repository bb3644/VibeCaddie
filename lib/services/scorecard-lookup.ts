// 球场记分卡查找服务
// Google Custom Search + LLM 提取完整记分卡数据（数字 + 描述）

import { callLLM, SCORECARD_EXTRACTION_PROMPT } from './llm';

// ---------- Types ----------

export interface LookupHole {
  hole_number: number;
  par: number;
  yardage: number;
  si: number;
  hole_note?: string;
}

export interface LookupTee {
  tee_name: string;
  tee_color: string;
  par_total: number;
  course_rating?: number;
  slope_rating?: number;
  holes: LookupHole[];
}

export interface LookupResult {
  course_name: string;
  location: string;
  tees: LookupTee[];
  confidence: 'high' | 'medium' | 'low';
  source: 'google_search' | 'photo_ocr' | 'manual';
  source_url?: string;
}

// ---------- HTML → Text ----------

function stripHtmlToText(html: string): string {
  return html
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Google Custom Search ----------

interface SearchItem {
  link: string;
  title: string;
  snippet: string;
}

async function googleSearch(query: string, numResults = 5): Promise<SearchItem[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !cx) {
    console.error('[scorecard-lookup] ❌ Google Search keys missing — GOOGLE_SEARCH_API_KEY:', !!apiKey, 'GOOGLE_SEARCH_ENGINE_ID:', !!cx);
    throw new Error('Google Search is not configured (missing API key or engine ID).');
  }

  const url =
    `https://www.googleapis.com/customsearch/v1` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&cx=${encodeURIComponent(cx)}` +
    `&q=${encodeURIComponent(query)}` +
    `&num=${numResults}`;

  try {
    console.log('[scorecard-lookup] Google search query:', query);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      const body = await res.text().catch(() => '(empty)');
      console.error('[scorecard-lookup] Google Search error', res.status, ':', body.slice(0, 200));
      throw new Error(`Google Search API error (${res.status}). Check API key and quota.`);
    }
    const data = await res.json();
    console.log('[scorecard-lookup] Google Search returned', (data.items ?? []).length, 'results');
    return (data.items ?? []) as SearchItem[];
  } catch (err) {
    // 重新抛出我们自己的错误
    if (err instanceof Error && err.message.startsWith('Google Search')) throw err;
    console.error('[scorecard-lookup] Google Search fetch error:', err);
    throw new Error('Google Search request failed — check network or API key.');
  }
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VibeCaddie/1.0 (golf scorecard lookup)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return stripHtmlToText(html).slice(0, 15000);
  } catch {
    return '';
  }
}

// ---------- Main Entry ----------

/** Google Search + LLM 提取完整球场记分卡（数字 + 洞描述） */
export async function lookupCourseScorecard(
  name: string,
  location?: string,
): Promise<LookupResult> {
  const loc = location || '';
  console.log('[scorecard-lookup] searching for:', name, loc ? `(${loc})` : '');

  // 1. Google Search
  const items = await googleSearch(
    `${name} ${loc} scorecard yardage`.trim(),
    5,
  );

  if (items.length === 0) {
    throw new Error('No search results found — please try a different name or add manually.');
  }

  // 2. 取前 3 个 URL 抓取页面内容
  const topUrls = [...new Set(items.map((i) => i.link))].slice(0, 3);
  const sourceUrl = topUrls[0];
  console.log('[scorecard-lookup] fetching pages:', topUrls);

  const snippets = items.map((i) => `[${i.title}]\n${i.snippet}`).join('\n\n');
  const pageResults = await Promise.allSettled(topUrls.map(fetchPageText));
  const pageTexts = pageResults
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter(Boolean);

  const webContent = [
    '=== SEARCH SNIPPETS ===',
    snippets,
    ...pageTexts.map((t, i) => `=== PAGE ${i + 1}: ${topUrls[i]} ===\n${t}`),
  ].join('\n\n');

  // 3. LLM 一次调用提取全部数据
  console.log('[scorecard-lookup] calling LLM to extract scorecard...');
  const response = await callLLM(
    SCORECARD_EXTRACTION_PROMPT,
    `Golf course: ${name}${loc ? ` (${loc})` : ''}\n\nWeb content:\n${webContent}`,
    { max_tokens: 4000, temperature: 0 },
  );

  // 4. 解析 JSON
  let jsonStr = response.content.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('[scorecard-lookup] LLM returned invalid JSON:', jsonStr.slice(0, 500));
    throw new Error('Failed to parse scorecard data — please try again or add manually.');
  }

  // 错误响应
  if (parsed.error) {
    throw new Error(`Course not found — ${parsed.error}`);
  }

  // 5. 验证并返回
  const tees = parsed.tees as LookupTee[] | undefined;
  if (!Array.isArray(tees) || tees.length === 0) {
    throw new Error('No tee data found for this course — please add manually.');
  }

  // 验证每个 tee 有 18 洞
  const validTees = tees.filter((t) => {
    if (!Array.isArray(t.holes) || t.holes.length !== 18) {
      console.warn(`[scorecard-lookup] skipping tee "${t.tee_name}" — ${t.holes?.length ?? 0} holes (expected 18)`);
      return false;
    }
    return true;
  });

  if (validTees.length === 0) {
    throw new Error('No complete tee data found (need 18 holes) — please add manually.');
  }

  // 确保 par_total 一致
  for (const tee of validTees) {
    tee.par_total = tee.holes.reduce((s, h) => s + h.par, 0);
  }

  const confidence = (parsed.confidence as LookupResult['confidence']) || 'medium';
  console.log(`[scorecard-lookup] success: ${parsed.course_name} — ${validTees.length} tees, confidence: ${confidence}`);

  return {
    course_name: (parsed.course_name as string) || name,
    location: (parsed.location as string) || loc,
    tees: validTees,
    confidence,
    source: 'google_search',
    source_url: sourceUrl,
  };
}
