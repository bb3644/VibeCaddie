import architectureData from '@/lib/knowledge/architecture.json';
import anatomyData from '@/lib/knowledge/anatomy.json';
import foundationsData from '@/lib/knowledge/foundations.json';

export interface KnowledgeChunk {
  id: string;
  source: string;
  topic: string;
  principle: string;
  application: string;
}

const allChunks: KnowledgeChunk[] = [
  ...architectureData.chunks.map(c => ({ ...c, source: architectureData.source })),
  ...anatomyData.chunks.map(c => ({ ...c, source: anatomyData.source })),
  ...foundationsData.chunks.map(c => ({ ...c, source: foundationsData.source })),
];

/**
 * 根据话题列表检索相关知识块，跨来源做 round-robin 保证多样性
 */
export function getRelevantKnowledge(
  topics: string[],
  maxChunks: number = 5,
): KnowledgeChunk[] {
  const matched = allChunks.filter(chunk =>
    topics.some(topic =>
      chunk.topic === topic ||
      chunk.topic.includes(topic) ||
      topic.includes(chunk.topic)
    )
  );

  // 按来源分组，保证多样性
  const bySource = new Map<string, KnowledgeChunk[]>();
  for (const chunk of matched) {
    const arr = bySource.get(chunk.source) || [];
    arr.push(chunk);
    bySource.set(chunk.source, arr);
  }

  // Round-robin 从各来源轮流取
  const result: KnowledgeChunk[] = [];
  const iterators = [...bySource.values()].map(arr => arr[Symbol.iterator]());
  while (result.length < maxChunks && iterators.length > 0) {
    for (let i = iterators.length - 1; i >= 0; i--) {
      const next = iterators[i].next();
      if (next.done) {
        iterators.splice(i, 1);
      } else {
        result.push(next.value);
        if (result.length >= maxChunks) break;
      }
    }
  }

  return result;
}

/**
 * 根据洞的参数和障碍物推断相关知识话题
 */
export function getTopicsForHole(
  par: number,
  hazards: Array<{ type: string }>,
): string[] {
  const topics: string[] = ['course_management'];

  if (par === 3) topics.push('par3_strategy', 'green_approach');
  if (par === 5) topics.push('par5_strategy', 'risk_reward');
  if (hazards.length > 0) topics.push('hazard_placement');
  if (hazards.some(h => h.type === 'water')) topics.push('risk_reward');

  return topics;
}
