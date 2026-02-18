// Chat 消息处理服务 — 组装上下文后调用 LLM

import { callLLM, CHAT_SYSTEM_PROMPT } from './llm';
import { getPlayerProfile } from '@/lib/db/players';
import { getPlayerRounds, getRoundHoles } from '@/lib/db/rounds';
import { getPlayerBriefings } from '@/lib/db/briefings';
import { getRelevantKnowledge } from './knowledge';
import type { RoundHole } from '@/lib/db/types';

export async function handleChatMessage(
  userId: string,
  message: string,
): Promise<string> {
  // 1. 并行获取球员上下文
  const [profile, rounds, briefings] = await Promise.all([
    getPlayerProfile(userId),
    getPlayerRounds(userId),
    getPlayerBriefings(userId),
  ]);

  // 2. 获取最近 3 轮的洞详情
  const recentRounds = rounds.slice(0, 3);
  const roundDetails = await Promise.all(
    recentRounds.map(async (r) => {
      const holes = await getRoundHoles(r.id);
      return { ...r, holes };
    })
  );

  // 3. 根据消息推断话题，检索知识库
  const topics = inferTopicsFromMessage(message);
  const knowledge = getRelevantKnowledge(topics, 3);

  // 4. 拼装上下文 prompt
  let contextPrompt = '';

  if (profile) {
    contextPrompt += `Player: ${profile.name}`;
    if (profile.handicap_index) contextPrompt += `, Handicap: ${profile.handicap_index}`;
    contextPrompt += '\n\n';
  }

  if (roundDetails.length > 0) {
    contextPrompt += `Recent rounds:\n`;
    for (const r of roundDetails) {
      const fwCount = r.holes.filter((h: RoundHole) => h.tee_result === 'FW').length;
      contextPrompt += `- ${r.course_name || 'Unknown'} (${r.tee_name || '?'}) on ${r.played_date}: Score ${r.total_score || '?'}, ${fwCount} fairways\n`;
    }
    contextPrompt += '\n';
  }

  if (briefings.length > 0) {
    const latestBriefing = briefings[0];
    contextPrompt += `Latest briefing (${latestBriefing.play_date}):\n`;
    const bj = latestBriefing.briefing_json;
    if (bj) {
      contextPrompt += `Control holes: ${bj.control_holes?.join(', ') || 'none'}\n`;
      contextPrompt += `Driver OK: ${bj.driver_ok_holes?.join(', ') || 'none'}\n`;
    }
    contextPrompt += '\n';
  }

  if (knowledge.length > 0) {
    contextPrompt += `Relevant golf knowledge:\n`;
    for (const k of knowledge) {
      contextPrompt += `- ${k.principle} (${k.source})\n`;
    }
    contextPrompt += '\n';
  }

  const fullPrompt = contextPrompt + `Player's question: ${message}`;

  // 5. 调用 LLM
  const response = await callLLM(CHAT_SYSTEM_PROMPT, fullPrompt);
  return response.content;
}

/**
 * 根据用户消息推断相关话题，用于知识库检索
 */
function inferTopicsFromMessage(message: string): string[] {
  const lower = message.toLowerCase();
  const topics: string[] = [];

  if (lower.includes('driver') || lower.includes('tee')) topics.push('tee_strategy');
  if (lower.includes('green') || lower.includes('approach')) topics.push('green_approach');
  if (lower.includes('hazard') || lower.includes('water') || lower.includes('bunker')) topics.push('hazard_placement');
  if (lower.includes('score') || lower.includes('scoring')) topics.push('scoring');
  if (lower.includes('par 3') || lower.includes('par-3')) topics.push('par3_strategy');
  if (lower.includes('par 5') || lower.includes('par-5')) topics.push('par5_strategy');
  if (lower.includes('wind') || lower.includes('rain') || lower.includes('weather')) topics.push('wind_weather');
  if (lower.includes('mental') || lower.includes('confidence') || lower.includes('nervous')) topics.push('mental_game');
  if (lower.includes('risk') || lower.includes('aggressive') || lower.includes('safe')) topics.push('risk_reward');

  if (topics.length === 0) topics.push('course_management');

  return topics;
}
