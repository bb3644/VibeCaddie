// 球场记分卡在线查找服务
// DuckDuckGo 搜索 + LLM 结构化提取

import { callLLM, SCORECARD_EXTRACTION_PROMPT } from './llm';

// ---------- Types ----------

export interface LookupHole {
  hole_number: number;
  par: number;
  yardage: number;
  si: number;
}

export interface LookupTee {
  tee_name: string;
  tee_color: string;
  par_total: number;
  holes: LookupHole[];
}

export interface LookupResult {
  course_name: string;
  location: string;
  tees: LookupTee[];
  source_url?: string;
  confidence: 'high' | 'medium' | 'low';
}

// ---------- HTML → Text ----------

/** 简单 HTML 转文本，保留表格结构中的空格分隔 */
function stripHtmlToText(html: string): string {
  return html
    // 表格单元格加分隔符
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    // 段落/换行
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // 移除所有其他标签
    .replace(/<[^>]+>/g, '')
    // HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    // 整理空白
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Web Search ----------

/** 通过 DuckDuckGo Lite 搜索球场记分卡，返回前两个结果页面的文本 */
async function fetchScorecardContent(
  name: string,
  location?: string,
): Promise<{ text: string; sourceUrl?: string }> {
  const searchQuery = `${name} ${location || ''} golf scorecard hole by hole yardage`.trim();
  const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(searchQuery)}`;

  try {
    const searchRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'VibeCaddie/1.0 (golf scorecard lookup)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) return { text: '' };

    const searchHtml = await searchRes.text();

    // 从 DuckDuckGo Lite 结果中提取链接
    const linkRegex = /href="(https?:\/\/[^"]+)"/gi;
    const urls: string[] = [];
    let match;
    while ((match = linkRegex.exec(searchHtml)) !== null) {
      const url = match[1];
      // 过滤掉 DuckDuckGo 自身的链接
      if (!url.includes('duckduckgo.com') && !url.includes('duck.co')) {
        urls.push(url);
      }
      if (urls.length >= 2) break;
    }

    if (urls.length === 0) return { text: '' };

    // 并行获取前两个结果页面
    const pageTexts = await Promise.allSettled(
      urls.map(async (url) => {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'VibeCaddie/1.0 (golf scorecard lookup)' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return '';
        const html = await res.text();
        // 只取前 15000 字符避免 token 过长
        return stripHtmlToText(html).slice(0, 15000);
      }),
    );

    const combinedText = pageTexts
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter(Boolean)
      .join('\n\n---\n\n');

    return { text: combinedText, sourceUrl: urls[0] };
  } catch {
    // 网络错误，降级到纯 LLM
    return { text: '' };
  }
}

// ---------- LLM Extraction ----------

/** 调用 LLM 提取结构化记分卡数据 */
async function extractScorecardFromLLM(
  name: string,
  location?: string,
  webContent?: string,
): Promise<LookupResult> {
  let userPrompt = `Golf course: ${name}`;
  if (location) userPrompt += `\nLocation: ${location}`;

  if (webContent) {
    userPrompt += `\n\nWeb-sourced content about this course:\n${webContent}`;
  } else {
    userPrompt += '\n\nNo web content available — use your training data only.';
  }

  const response = await callLLM(SCORECARD_EXTRACTION_PROMPT, userPrompt, {
    max_tokens: 4000,
    temperature: 0,
  });

  // 从响应中提取 JSON（可能包含 markdown code block）
  let jsonStr = response.content.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return parsed as LookupResult;
}

// ---------- Validation ----------

interface ValidationError {
  tee: string;
  issues: string[];
}

/** 验证记分卡数据完整性 */
function validateScorecardData(data: LookupResult): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const tee of data.tees) {
    const issues: string[] = [];

    // 必须有 18 个洞
    if (tee.holes.length !== 18) {
      issues.push(`Expected 18 holes, got ${tee.holes.length}`);
    }

    // 检查洞号 1-18
    const holeNumbers = tee.holes.map((h) => h.hole_number).sort((a, b) => a - b);
    const expected = Array.from({ length: 18 }, (_, i) => i + 1);
    if (JSON.stringify(holeNumbers) !== JSON.stringify(expected)) {
      issues.push('Hole numbers must be 1-18');
    }

    for (const hole of tee.holes) {
      // Par 必须是 3/4/5
      if (![3, 4, 5].includes(hole.par)) {
        issues.push(`Hole ${hole.hole_number}: invalid par ${hole.par}`);
      }
      // Yardage 合理范围
      if (hole.yardage <= 0 || hole.yardage > 700) {
        issues.push(`Hole ${hole.hole_number}: invalid yardage ${hole.yardage}`);
      }
      // SI 范围
      if (hole.si < 1 || hole.si > 18) {
        issues.push(`Hole ${hole.hole_number}: SI ${hole.si} out of range`);
      }
    }

    // SI 唯一性
    const siValues = tee.holes.map((h) => h.si);
    const uniqueSI = new Set(siValues);
    if (uniqueSI.size !== tee.holes.length && tee.holes.length === 18) {
      issues.push('Stroke index values must be unique (1-18)');
    }

    if (issues.length > 0) {
      errors.push({ tee: tee.tee_name, issues });
    }
  }

  return errors;
}

// ---------- Main Entry ----------

/** 查找球场记分卡：web 搜索 + LLM 提取 + 验证 */
export async function lookupCourseScorecard(
  name: string,
  location?: string,
): Promise<LookupResult> {
  // 1. 搜索 web 内容
  const { text: webContent, sourceUrl } = await fetchScorecardContent(name, location);

  // 2. LLM 提取结构化数据
  const result = await extractScorecardFromLLM(name, location, webContent);

  // 3. 填充 source_url
  if (sourceUrl) {
    result.source_url = sourceUrl;
  }

  // 4. 计算每个 tee 的 par_total
  for (const tee of result.tees) {
    tee.par_total = tee.holes.reduce((sum, h) => sum + h.par, 0);
  }

  // 5. 验证
  const errors = validateScorecardData(result);
  if (errors.length > 0 && result.confidence === 'high') {
    // 数据有问题但标记了高可信度，降级
    result.confidence = 'medium';
  }

  return result;
}
