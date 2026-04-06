// Chat 消息处理服务 — 组装上下文后调用 LLM

import { CHAT_SYSTEM_PROMPT } from './llm';
import { getPlayerProfile } from '@/lib/db/players';
import { getPlayerRounds, getRoundHoles } from '@/lib/db/rounds';
import { getPlayerBriefings } from '@/lib/db/briefings';
import { getAllKnowledge } from './knowledge';
import type { RoundHole } from '@/lib/db/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function handleChatMessage(
  userId: string,
  message: string,
  history?: ChatMessage[],
): Promise<string> {
  // 1. Load player profile + all rounds + briefings in parallel
  const [profile, allRounds, briefings] = await Promise.all([
    getPlayerProfile(userId),
    getPlayerRounds(userId),
    getPlayerBriefings(userId),
  ]);

  // 2. Load per-hole details (including notes and recap text) for last 5 rounds
  const recentRounds = allRounds.slice(0, 5);
  const roundDetails = await Promise.all(
    recentRounds.map(async (r) => ({
      ...r,
      holes: await getRoundHoles(r.id),
    }))
  );

  // 3. Full knowledge base
  const knowledge = getAllKnowledge();

  // 4. Build context prompt
  let contextPrompt = '';

  // Player identity
  if (profile) {
    contextPrompt += `## Player\n`;
    contextPrompt += `Name: ${profile.name}`;
    if (profile.handicap_index) contextPrompt += `, Handicap Index: ${profile.handicap_index}`;
    if (profile.sex) contextPrompt += `, ${profile.sex}`;
    contextPrompt += '\n\n';
  }

  // Full score history (all rounds — just dates + scores for trend)
  if (allRounds.length > 0) {
    contextPrompt += `## Score History (all rounds, newest first)\n`;
    for (const r of allRounds) {
      contextPrompt += `${r.played_date} — ${r.course_name || 'Unknown'} (${r.tee_name || '?'} tee): Score ${r.total_score ?? '?'}\n`;
    }

    // Overall trend
    const withScores = allRounds.filter(r => r.total_score != null);
    if (withScores.length >= 3) {
      const oldest = withScores[withScores.length - 1].total_score as number;
      const newest = withScores[0].total_score as number;
      if (newest < oldest) contextPrompt += `Overall trend: improving (${oldest} → ${newest})\n`;
      else if (newest > oldest) contextPrompt += `Overall trend: getting worse (${oldest} → ${newest})\n`;
      else contextPrompt += `Overall trend: flat\n`;
    }
    contextPrompt += '\n';
  }

  // Detailed recent rounds: hole-by-hole including notes and recap
  if (roundDetails.length > 0) {
    contextPrompt += `## Recent Round Details (last ${roundDetails.length} rounds)\n`;
    for (const r of roundDetails) {
      const fwCount = r.holes.filter((h: RoundHole) => h.tee_result === 'FW').length;
      const girCount = r.holes.filter((h: RoundHole) => h.approach_distance === 'GIR').length;
      contextPrompt += `\n### ${r.played_date} — ${r.course_name || 'Unknown'} (${r.tee_name || '?'} tee), Score: ${r.total_score ?? '?'}\n`;
      contextPrompt += `Fairways: ${fwCount}/${r.holes.length}, GIR: ${girCount}/${r.holes.length}\n`;

      // Hole notes from this round
      const notedHoles = r.holes.filter((h: RoundHole) => h.hole_notes);
      if (notedHoles.length > 0) {
        contextPrompt += `Hole notes:\n`;
        for (const h of notedHoles) {
          contextPrompt += `  Hole ${h.hole_number}: "${h.hole_notes}"\n`;
        }
      }

      // Per-hole score summary (compact)
      const holeScores = r.holes
        .filter((h: RoundHole) => h.score != null)
        .map((h: RoundHole) => `H${h.hole_number}:${h.score}`)
        .join(' ');
      if (holeScores) contextPrompt += `Scores: ${holeScores}\n`;

      // Previous recap text
      if (r.recap_text) {
        contextPrompt += `Recap from that round:\n${r.recap_text}\n`;
      }
    }
    contextPrompt += '\n';
  }

  // Latest briefing
  if (briefings.length > 0) {
    const b = briefings[0];
    contextPrompt += `## Latest Pre-Round Briefing (${b.play_date})\n`;
    const bj = b.briefing_json;
    if (bj) {
      contextPrompt += `Control holes: ${bj.control_holes?.join(', ') || 'none'}\n`;
      contextPrompt += `Driver OK: ${bj.driver_ok_holes?.join(', ') || 'none'}\n`;
      if (bj.display_text) contextPrompt += `Briefing text:\n${bj.display_text}\n`;
    }
    contextPrompt += '\n';
  }

  // Knowledge base
  if (knowledge.length > 0) {
    contextPrompt += `## Golf Course Management Knowledge Base\n`;
    for (const k of knowledge) {
      contextPrompt += `- [${k.source}] ${k.principle}\n`;
    }
    contextPrompt += '\n';
  }

  // 5. Build multi-turn messages
  const systemPrompt = CHAT_SYSTEM_PROMPT + '\n\n' + contextPrompt;
  const llmMessages: Array<{ role: string; content: string }> = [];

  if (history && history.length > 0) {
    for (const msg of history.slice(-20)) {
      llmMessages.push({ role: msg.role, content: msg.content });
    }
  }
  if (message) llmMessages.push({ role: 'user', content: message });

  // 6. Call LLM
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'Vibe Caddie',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...llmMessages,
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} — ${errorText}`);
  }

  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('OpenRouter returned empty response');
  }

  return data.choices[0].message.content;
}
